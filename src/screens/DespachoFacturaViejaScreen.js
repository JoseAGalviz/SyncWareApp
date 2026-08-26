import React, { useState, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

// Mismo cálculo que api-app/src/utils/helpers.js:transformarNumFactura y que
// DespachoVerificarScreen — duplicado a propósito, siguiendo el patrón del resto
// del código (cada pantalla resuelve el código de barras por su cuenta).
const LETRA_MAS_DIGITOS = /^[AB]\d{7}$/i;
function normalizarFactura(raw) {
  const limpio = String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!LETRA_MAS_DIGITOS.test(limpio)) return limpio;
  if (limpio[0] === 'A') {
    return limpio.startsWith('A2') ? '7' + limpio.slice(1) : String(Number(limpio.slice(1)));
  }
  const serie = limpio.slice(1);
  return (serie < '0050000' ? '8' : '5') + serie;
}

// Mismas reglas que FacturasScreen (formatoFacturaValido): letra+7 dígitos o hasta 8 dígitos
// solos. El lector dispara varias lecturas por segundo mientras el operador todavía está
// apuntando — sin este filtro, cada frame de ruido (código a medio leer) se procesa como si
// fuera una factura real y no deja terminar de apuntar.
const SOLO_DIGITOS = /^\d{1,8}$/;
const formatoFacturaValido = (valor) => LETRA_MAS_DIGITOS.test(valor) || SOLO_DIGITOS.test(valor);

const AgregadaItem = React.memo(({ item, onQuitar }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>Factura {item.factura}</Text>
      <Text style={styles.itemDetalle}>{item.cliente || 'Sin nombre'}</Text>
    </View>
    <TouchableOpacity style={styles.itemAccion} onPress={() => onQuitar(item.id)}>
      <Text style={{ color: Theme.colors.error, fontWeight: '700' }}>Quitar</Text>
    </TouchableOpacity>
  </View>
));

// Módulo separado del flujo real de escaneo/verificación: agrega facturas viejas
// que ya no aparecen en "pendientes" de Profit (fuera de la ventana de 3 días, o
// marcadas CARGADO por un intento fallido). Aislado a propósito para que un error
// de tipeo acá no contamine el rutagrama real (Escanear/Verificar).
export default function DespachoFacturaViejaScreen({ route, navigation }) {
  const { rutagramaId, usuarioId, rutaDesc } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();

  const [scanned, setScanned] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [agregadas, setAgregadas] = useState([]);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const ultimoEscaneoRef = useRef({ codigo: '', ts: 0 });
  const ultimoFalloRef = useRef({ codigo: '', ts: 0 });
  // Ref, no el state `scanned`: setState es async, así que entre el primer frame
  // detectado y el re-render que deshabilita la cámara (onBarcodeScanned={scanned
  // ? undefined : ...}) pasan varios frames más — cada uno con lectura parcial/
  // borrosa distinta del mismo código físico. El chequeo por código (abajo) no lo
  // frena porque cada lectura decodifica dígitos distintos. Este ref sí bloquea
  // sincrónicamente, en el mismo tick del primer evento.
  const escaneandoRef = useRef(false);

  const agregarFactura = useCallback(async (codigoRaw) => {
    const codigo = normalizarFactura(codigoRaw);
    if (!codigo) return;
    setProcesando(true);
    try {
      const resultado = await DespachoService.verificarFactura(rutagramaId, {
        usuario_id: usuarioId,
        factura: codigo,
        solo_factura: true,
      });
      setAgregadas((prev) => [{ id: resultado?.id, factura: codigo, cliente: resultado?.cliente }, ...prev]);
      showMessage({ message: 'Factura vieja agregada', description: `${codigo} agregada al rutagrama.`, type: 'success', duration: 1800 });
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo agregar la factura.';
      showMessage({ message: 'Error al agregar', description: msg, type: 'danger', duration: 2500 });
      ultimoFalloRef.current = { codigo, ts: Date.now() };
    } finally {
      setProcesando(false);
    }
  }, [rutagramaId, usuarioId]);

  const quitarFactura = useCallback(async (detalleId) => {
    if (!detalleId) return;
    try {
      await DespachoService.descartarDetalle(rutagramaId, detalleId);
      setAgregadas((prev) => prev.filter((a) => a.id !== detalleId));
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo quitar la factura.';
      showMessage({ message: 'Error al quitar', description: msg, type: 'danger', duration: 2500 });
    }
  }, [rutagramaId]);

  const COOLDOWN_MISMO_CODIGO_MS = 2500;
  // Cooldown más largo tras un fallo: operador suele seguir apuntando la cámara
  // a la misma factura inválida, y el cooldown corto de arriba solo evita duplicar
  // el request en el mismo instante — sin esto reintenta solo cada 2.5s y satura
  // de errores idénticos mientras la factura sigue en cuadro.
  const COOLDOWN_TRAS_FALLO_MS = 10000;
  const handleBarCodeScanned = useCallback(({ data }) => {
    if (escaneandoRef.current) return;
    const limpio = String(data || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!formatoFacturaValido(limpio)) return; // ruido del lector, se ignora sin avisar
    const codigo = normalizarFactura(limpio);
    const ahora = Date.now();
    if (codigo === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MISMO_CODIGO_MS) return;
    if (codigo === ultimoFalloRef.current.codigo && ahora - ultimoFalloRef.current.ts < COOLDOWN_TRAS_FALLO_MS) return;
    escaneandoRef.current = true;
    ultimoEscaneoRef.current = { codigo, ts: ahora };
    setScanned(true);
    agregarFactura(limpio).finally(() => {
      escaneandoRef.current = false;
      setScanned(false);
    });
  }, [agregarFactura]);

  const abrirManual = useCallback(() => {
    setManualValor('');
    setManualVisible(true);
  }, []);

  const confirmarManual = useCallback(async () => {
    const valor = manualValor.trim().toUpperCase();
    if (!valor) return;
    if (!formatoFacturaValido(valor)) {
      showMessage({ message: 'Formato no reconocido', description: `"${valor}" debería ser hasta 8 dígitos, con o sin letra al inicio (ej. 392208 o A0392208).`, type: 'warning', duration: 3000 });
      return;
    }
    await agregarFactura(valor);
    setManualVisible(false);
  }, [manualValor, agregarFactura]);

  if (!permission) return <Text>Solicitando permiso de cámara...</Text>;
  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={styles.subtitle}>No se concedió acceso a la cámara.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Facturas viejas</Text>
        <View style={styles.activeHeader}>
          <Text style={styles.activeRuta}>{rutaDesc}</Text>
        </View>

        <Text style={styles.toggleLabel}>Escaneá el código de la factura física</Text>

        <View style={styles.cameraContainer}>
          {isFocused ? (
            <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={styles.cameraBox} facing="back" />
          ) : null}
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={abrirManual} activeOpacity={0.85} disabled={procesando}>
          <Text style={styles.secondaryButtonText}>Escribir factura manualmente</Text>
        </TouchableOpacity>

        {procesando && <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginTop: Theme.spacing.sm }} />}

        <Text style={styles.listaTitulo}>Agregadas en esta sesión ({agregadas.length})</Text>
        {agregadas.length === 0 ? (
          <Text style={styles.emptyListText}>Todavía no agregaste ninguna.</Text>
        ) : (
          <FlatList
            data={agregadas}
            keyExtractor={(item, index) => `${item.id ?? item.factura}-${index}`}
            renderItem={({ item }) => <AgregadaItem item={item} onQuitar={quitarFactura} />}
            scrollEnabled={false}
          />
        )}

        <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.card}>
              <Text style={styles.listaTitulo}>Escribir factura</Text>
              <Text style={styles.label}>Nº Factura</Text>
              <TextInput
                style={styles.input}
                value={manualValor}
                onChangeText={setManualValor}
                autoCapitalize="characters"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryButton, procesando && styles.buttonDisabled]}
                onPress={confirmarManual}
                disabled={procesando}
                activeOpacity={0.85}
              >
                {procesando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Agregar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} disabled={procesando} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <View style={styles.footerBar}>
        <TouchableOpacity
          style={[styles.primaryButton, styles.footerButton]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
