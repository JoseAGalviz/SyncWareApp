import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useModoEscaneo } from '../hooks/useModoEscaneo';
import EscanerInput from '../components/EscanerInput';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';
import SoundManager from '../utils/SoundManager';

// Mismo criterio que DespachoEscanearScreen: limpia el código y descarta lecturas que no
// son nota/factura (ruido de la cámara, otros códigos de la caja).
const limpiarCodigo = (raw) => String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
const FORMATO_VALIDO = /^([AB]\d{7}|\d{1,10})$/i;
const COOLDOWN_MS = 900;

// Cada renglón pide nota Y factura (salvo valijas/legado, `pide_factura` false): se muestra
// cuál de los dos falta, igual que en el despacho.
const etiquetaRenglon = (item) => {
  if (item.recibido) return 'RECIBIDO';
  if (item.nota_ok) return 'FALTA FACTURA';
  if (item.factura_ok && item.pide_factura) return 'FALTA NOTA';
  return 'PENDIENTE';
};

const RenglonItem = React.memo(({ item }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>
        Nota {item.nota}{item.nota_ok ? ' ✓' : ''}
        {item.factura && item.pide_factura ? ` · Factura ${item.factura}${item.factura_ok ? ' ✓' : ''}` : ''}
      </Text>
      <Text style={styles.itemDetalle}>{item.descrip}</Text>
    </View>
    <View style={[styles.statusPill, item.recibido ? styles.statusVerificada : styles.statusPendiente]}>
      <Text style={[styles.statusPillText, item.recibido ? styles.statusTextVerificada : styles.statusTextPendiente]}>
        {etiquetaRenglon(item)}
      </Text>
    </View>
  </View>
));

// Escaneo de nota/factura contra el detalle de UN cargado de enlace, hasta confirmar el
// 100% y cerrar la recepción (estatus 'E' en cargado) — réplica de despachos/lista.php +
// registro.php, ver bloque "Recepción de enlace" en despacho.controller.js.
export default function DespachoRecibirEnlaceDetalleScreen({ route, navigation }) {
  const { rutagramaId, usuarioId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { modo, setModo } = useModoEscaneo();
  const ultimoEscaneoRef = useRef({ codigo: null, ts: 0 });

  const [cargado, setCargado] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [codigoManual, setCodigoManual] = useState(null); // string | null (modal abierto)
  const [guardando, setGuardando] = useState(false);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [responsable, setResponsable] = useState('');
  const [cerrando, setCerrando] = useState(false);

  const cargarDetalle = useCallback(async () => {
    try {
      const resultado = await DespachoService.detalleEnlace(rutagramaId, usuarioId);
      setCargado(resultado?.cargado || null);
      setItems(resultado?.items || []);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo cargar el enlace.';
      Alert.alert('Error', msg);
      navigation.goBack();
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId, navigation]);

  useEffect(() => { cargarDetalle(); }, [cargarDetalle]);

  const recibidos = items.filter(i => i.recibido).length;
  const completo = items.length > 0 && recibidos === items.length;
  const yaRecibido = cargado?.estatus === 'E';

  // Devuelve true si se confirmó. Feedback con showMessage (no Alert): un Alert por cada
  // lectura fallida bloqueaba la pantalla, y `scanned` quedaba en true tras un error, así
  // que la cámara dejaba de leer hasta salir de la pantalla.
  const confirmarCodigo = useCallback(async (codigoRaw) => {
    const codigo = limpiarCodigo(codigoRaw);
    if (!codigo) return false;
    setGuardando(true);
    try {
      const res = await DespachoService.escanearEnlace(rutagramaId, { usuario_id: usuarioId, codigo });
      const doc = res?.documento === 'factura' ? `FACTURA ${res?.factura || codigo}` : `NOTA ${res?.nota || codigo}`;
      const falta = res?.falta === 'factura' ? `Falta escanear la factura ${res?.factura || ''}`.trim()
        : res?.falta === 'nota' ? `Falta escanear la nota ${res?.nota || ''}`.trim() : null;
      showMessage({
        message: falta ? `ESCANEADA ${doc}` : `RECIBIDO PEDIDO — ${doc}`,
        description: [res?.descrip, falta, `Recibidos ${res?.recibidos ?? '?'}/${res?.total ?? '?'}`].filter(Boolean).join('\n'),
        type: falta ? 'info' : 'success',
        duration: falta ? 3000 : 2000,
      });
      await cargarDetalle();
      return true;
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo confirmar el código.';
      SoundManager.playErrorSound();
      if (error.data?.duplicado) {
        showMessage({ message: `⚠ ESCANEO DOBLE — ${codigo}`, description: msg, type: 'warning', duration: 4500 });
      } else {
        showMessage({ message: `NO SE PUDO ESCANEAR — ${codigo}`, description: msg, type: 'danger', duration: 3500 });
      }
      return false;
    } finally {
      setGuardando(false);
    }
  }, [rutagramaId, usuarioId, cargarDetalle]);

  const handleEscaneo = useCallback((dataRaw) => {
    if (scanned) return;
    const codigo = limpiarCodigo(dataRaw);
    if (!codigo || !FORMATO_VALIDO.test(codigo)) return; // ruido del lector
    const ahora = Date.now();
    if (codigo === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MS) return;
    ultimoEscaneoRef.current = { codigo, ts: ahora };
    setScanned(true);
    confirmarCodigo(codigo).finally(() => setScanned(false));
  }, [scanned, confirmarCodigo]);

  const guardarManual = useCallback(async () => {
    const ok = await confirmarCodigo(codigoManual);
    if (ok) {
      setCodigoManual(null);
      setScanned(false);
    }
  }, [codigoManual, confirmarCodigo]);

  const escribirManualmente = useCallback(() => {
    setScanned(true);
    setCodigoManual('');
  }, []);

  const cerrarEnlace = useCallback(async () => {
    if (!responsable.trim()) {
      Alert.alert('Falta el responsable', 'Indicá quién está recibiendo la carga.');
      return;
    }
    setCerrando(true);
    try {
      await DespachoService.recibirEnlace(rutagramaId, { usuario_id: usuarioId, responsable: responsable.trim() });
      setMostrarCierre(false);
      Alert.alert('Enlace recibido', 'La recepción quedó registrada.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo cerrar la recepción.';
      Alert.alert('Error', msg);
    } finally {
      setCerrando(false);
    }
  }, [rutagramaId, usuarioId, responsable, navigation]);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.activeHeader}>
        <Text style={styles.activeRuta}>{cargado?.conductor} · {cargado?.vehiculo}</Text>
        <Text style={styles.itemDetalle}>Encargado: {cargado?.encargado || '—'}</Text>
        {cargado?.recibido_por ? (
          <Text style={styles.itemDetalle}>
            Recibió: {cargado.recibido_por}
            {cargado.fecha_recepcion ? ` · ${new Date(cargado.fecha_recepcion).toLocaleString('es-VE')}` : ''}
          </Text>
        ) : null}
        <View style={styles.countersRow}>
          <View style={styles.counterPill}>
            <Text style={styles.counterLabel}>Recibidos</Text>
            <Text style={styles.counterValue}>{recibidos}/{items.length}</Text>
          </View>
        </View>
      </View>

      {yaRecibido && (
        <View style={styles.bannerOk}>
          <Text style={styles.bannerOkTexto}>Este enlace ya fue recibido por completo.</Text>
        </View>
      )}

      {!yaRecibido && (
        <>
          <EscanerInput
            modo={modo}
            setModo={setModo}
            isFocused={isFocused && codigoManual === null && !mostrarCierre}
            disabled={scanned}
            onScan={handleEscaneo}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={escribirManualmente} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Escribir nota/factura manualmente</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.listaTitulo, { marginTop: Theme.spacing.lg }]}>Renglones ({items.length})</Text>
      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : items.length === 0 ? (
        <Text style={styles.emptyListText}>Este enlace no tiene renglones.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <RenglonItem item={item} />}
          scrollEnabled={false}
        />
      )}

      {!yaRecibido && (
        <TouchableOpacity
          style={[styles.primaryButton, !completo && styles.buttonDisabled]}
          onPress={() => setMostrarCierre(true)}
          disabled={!completo}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {completo ? 'Cerrar recepción' : `Faltan ${items.length - recibidos} renglón(es) por escanear`}
          </Text>
        </TouchableOpacity>
      )}

      <Modal visible={codigoManual !== null} transparent animationType="fade" onRequestClose={() => { setCodigoManual(null); setScanned(false); }}>
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Confirmar código</Text>
            <Text style={styles.label}>Nº Nota o Factura</Text>
            <TextInput
              style={styles.input}
              value={codigoManual || ''}
              onChangeText={setCodigoManual}
              autoCapitalize="characters"
              selectTextOnFocus
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, guardando && styles.buttonDisabled]}
              onPress={guardarManual}
              disabled={guardando}
              activeOpacity={0.85}
            >
              {guardando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Guardar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setCodigoManual(null); setScanned(false); }} disabled={guardando} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mostrarCierre} transparent animationType="fade" onRequestClose={() => setMostrarCierre(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Cerrar recepción</Text>
            <Text style={styles.label}>Responsable que recibe</Text>
            <TextInput
              style={styles.input}
              value={responsable}
              onChangeText={setResponsable}
              autoCapitalize="characters"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, cerrando && styles.buttonDisabled]}
              onPress={cerrarEnlace}
              disabled={cerrando}
              activeOpacity={0.85}
            >
              {cerrando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Confirmar recepción</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setMostrarCierre(false)} disabled={cerrando} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
