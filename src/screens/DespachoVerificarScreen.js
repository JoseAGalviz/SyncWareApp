import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';
import DespachoFinalizarModal from '../components/DespachoFinalizarModal';
import { quitarActivo } from './DespachoIniciarScreen';
import { useSalidaConfirmada } from '../hooks/useSalidaConfirmada';
import { useModoEscaneo, MODO_CAMARA } from '../hooks/useModoEscaneo';
import EscanerInput from '../components/EscanerInput';

const ESTADOS_VERIFICADO = new Set(['***', '****', 'FAT*', 'NCR', 'NDB', 'REFR', 'REP*']);

// Código de barras real de factura = letra de serie (A/B) + 7 dígitos. Mismo cálculo que
// api-app/src/utils/helpers.js:transformarNumFactura — hace falta replicarlo acá para poder
// matchear el escaneo contra item.factura (que ya viene resuelto sin letra) sin ida y vuelta
// al backend. Entrada solo-dígitos (tipeo manual) no tiene esta ambigüedad: se usa tal cual.
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

const RenglonItem = React.memo(({ item, verificado }) => {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemNota}>{item.nota}{item.factura ? ` · Fact. ${item.factura}` : ''}</Text>
        <Text style={styles.itemDetalle}>{item.descrip}</Text>
      </View>
      <View style={[styles.statusPill, verificado ? styles.statusVerificada : styles.statusEscaneada]}>
        <Text style={[styles.statusPillText, verificado ? styles.statusTextVerificada : styles.statusTextEscaneada]}>
          {verificado ? 'VERIFICADO' : item.status || 'PENDIENTE'}
        </Text>
      </View>
    </View>
  );
});

export default function DespachoVerificarScreen({ route, navigation }) {
  const { rutagramaId, usuarioId, rutaDesc } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { modo, setModo, cargado } = useModoEscaneo();

  const [detalle, setDetalle] = useState({ items: [], totales: { cantidad: 0, peso: 0 } });
  const [resumen, setResumen] = useState({ verificados: 0, listados: 0, completo: false, puede_cerrar: false, notas_anuladas: [], facturas_anuladas: [] });
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [verificadosOptimistas, setVerificadosOptimistas] = useState(() => new Set());
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [procesandoManual, setProcesandoManual] = useState(false);
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const ultimoEscaneoRef = useRef({ codigo: '', ts: 0 });

  useSalidaConfirmada(navigation);

  const cargarTodo = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        DespachoService.listarDetalle(rutagramaId, usuarioId),
        DespachoService.resumenCierre(rutagramaId, usuarioId),
      ]);
      setDetalle(d || { items: [], totales: { cantidad: 0, peso: 0 } });
      setResumen(r || { verificados: 0, listados: 0, completo: false, puede_cerrar: false, notas_anuladas: [], facturas_anuladas: [] });
    } catch (error) {
      console.error('Error cargando resumen de verificación', error);
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId]);

  // isFocused en deps: mismo motivo que DespachoEscanearScreen — sin esto, volver de
  // FacturaVieja dejaba detalle/resumen desactualizados hasta el próximo escaneo.
  useEffect(() => { if (isFocused) cargarTodo(); }, [isFocused, cargarTodo]);

  // Escaneo de una sola factura: matchea contra los renglones ya cargados en
  // pantalla y pinta verde al instante; el POST a /verificar-factura corre
  // en paralelo para dejar el estado real guardado (contador y cierre de ruta
  // dependen de ese estado en base, no solo del pintado local).
  // El match local contra detalle.items.factura es solo para pintado optimista: esa columna
  // se graba en el escaneo de caja (fase 1) y queda '' si la nota todavía no tenía factura en
  // ese momento — no se refresca sola después. Si no matchea localmente igual hay que llamar
  // al backend: verificarFactura ya resuelve nota<->factura vía reng_fac cuando el snapshot
  // local está vacío (ver comentario en despacho.controller.js). Cortar acá antes de ese caso
  // era el bug: la factura generada después del escaneo nunca aparecía al verificar.
  const procesarCodigo = useCallback(async (codigoRaw) => {
    const codigo = normalizarFactura(codigoRaw);
    if (!codigo) return;

    const item = detalle.items.find((i) => String(i.factura) === codigo);
    if (item) {
      if (ESTADOS_VERIFICADO.has(item.status) || verificadosOptimistas.has(item.id)) {
        showMessage({ message: 'Ya verificada', description: `La factura ${codigo} ya está verificada.`, type: 'info', duration: 2000 });
        return;
      }
      setVerificadosOptimistas((prev) => new Set(prev).add(item.id));
      showMessage({ message: 'Factura verificada', description: `${codigo} · ${item.nota}`, type: 'success', duration: 1500 });
    }

    try {
      await DespachoService.verificarFactura(rutagramaId, {
        usuario_id: usuarioId,
        factura: codigo,
        solo_factura: true,
      });
      if (!item) {
        showMessage({ message: 'Factura verificada', description: codigo, type: 'success', duration: 1500 });
      }
      await cargarTodo();
    } catch (error) {
      if (item) {
        setVerificadosOptimistas((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
      const msg = error.data?.error || error.message || 'No se pudo verificar la factura.';
      showMessage({ message: 'Error al verificar', description: msg, type: 'danger', duration: 2500 });
    }
  }, [detalle.items, verificadosOptimistas, rutagramaId, usuarioId, cargarTodo]);

  // Lector dispara múltiples lecturas por segundo mientras el código sigue en cuadro —
  // sin esto, apuntar la cámara a la misma factura ya escaneada (o a una inexistente)
  // reabre el toast decenas de veces por segundo y no se alcanza a leer ninguno.
  const COOLDOWN_MISMO_CODIGO_MS = 2500;
  const handleEscaneo = useCallback((data) => {
    if (scanned) return;
    const limpio = String(data || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!formatoFacturaValido(limpio)) return; // ruido del lector, se ignora sin avisar
    const codigo = normalizarFactura(limpio);
    const ahora = Date.now();
    if (codigo === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MISMO_CODIGO_MS) return;
    ultimoEscaneoRef.current = { codigo, ts: ahora };
    setScanned(true);
    procesarCodigo(limpio).finally(() => setScanned(false));
  }, [scanned, procesarCodigo]);

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
    setProcesandoManual(true);
    await procesarCodigo(valor);
    setProcesandoManual(false);
    setManualVisible(false);
  }, [manualValor, procesarCodigo]);

  const abrirFinalizar = useCallback(() => {
    if (!resumen.puede_cerrar) {
      const motivos = [];
      if (resumen.notas_anuladas.length) motivos.push(`${resumen.notas_anuladas.length} nota(s) anulada(s)`);
      if (resumen.facturas_anuladas.length) motivos.push(`${resumen.facturas_anuladas.length} factura(s) anulada(s)`);
      Alert.alert('No se puede cerrar todavía', motivos.join(', ') || 'No hay renglones en este rutagrama.');
      return;
    }
    if (!resumen.completo) {
      const faltan = resumen.listados - resumen.verificados;
      Alert.alert(
        'Renglones sin verificar',
        `${faltan} renglón(es) sin verificar quedarán pendientes para escanearse en otro rutagrama. ¿Cerrar de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar igual', style: 'destructive', onPress: () => setMostrarFinalizar(true) },
        ],
      );
      return;
    }
    setMostrarFinalizar(true);
  }, [resumen]);

  const confirmarFinalizar = useCallback(async ({ chofer, carro, ayudantes, responsable }) => {
    setFinalizando(true);
    try {
      const resultado = await DespachoService.finalizar(rutagramaId, { usuario_id: usuarioId, chofer, carro, ayudantes, responsable });
      await quitarActivo(rutagramaId);
      setMostrarFinalizar(false);
      const generados = resultado?.rutagramas_generados || 1;
      const numeros = (resultado?.rutagramas || []).map(r => `#${r.cargado_id}`).join(', ');
      const mensaje = generados > 1
        ? `El rutagrama se separó automáticamente en ${generados} rutagramas: ${numeros}.`
        : `El rutagrama #${resultado?.cargado_id ?? rutagramaId} se cerró correctamente.`;
      Alert.alert('Ruta cerrada', mensaje, [
        { text: 'Ver historial', onPress: () => navigation.navigate('DespachoHistorial') },
        { text: 'OK', onPress: () => navigation.navigate('DespachoIniciar') },
      ]);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo finalizar el rutagrama.';
      if (/ya está cerrado/i.test(msg)) {
        // Backend ya lo cerró en un intento previo (ej. respuesta perdida por conexión lenta/USB);
        // el estado deseado ya existe, no es un fallo real. Tratar como cierre exitoso.
        await quitarActivo(rutagramaId);
        setMostrarFinalizar(false);
        Alert.alert('Ruta ya cerrada', `El rutagrama #${rutagramaId} ya se había cerrado (probablemente por un intento anterior). No hace falta repetirlo.`, [
          { text: 'Ver historial', onPress: () => navigation.navigate('DespachoHistorial') },
          { text: 'OK', onPress: () => navigation.navigate('DespachoIniciar') },
        ]);
        return;
      }
      Alert.alert('Error', msg);
    } finally {
      setFinalizando(false);
    }
  }, [rutagramaId, usuarioId, navigation]);

  if (!cargado) return null;
  if (modo === MODO_CAMARA) {
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
  }

  return (
    <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Verificar por factura</Text>
      <View style={styles.activeHeader}>
        <Text style={styles.activeRuta}>{rutaDesc}</Text>
        <View style={styles.countersRow}>
          <View style={styles.counterPill}>
            <Text style={styles.counterLabel}>Verificados</Text>
            <Text style={styles.counterValue}>{resumen.verificados}/{resumen.listados}</Text>
          </View>
        </View>
      </View>

      {(resumen.notas_anuladas.length > 0 || resumen.facturas_anuladas.length > 0) && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerErrorTexto}>
            Hay documentos anulados pendientes de descartar: {[...resumen.notas_anuladas, ...resumen.facturas_anuladas].join(', ')}
          </Text>
        </View>
      )}

      <Text style={styles.toggleLabel}>Escaneá el código de la factura</Text>

      <EscanerInput modo={modo} setModo={setModo} isFocused={isFocused} disabled={scanned} onScan={handleEscaneo} />

      <TouchableOpacity style={styles.secondaryButton} onPress={abrirManual} activeOpacity={0.85}>
        <Text style={styles.secondaryButtonText}>Escribir factura manualmente</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoFacturaVieja', { rutagramaId, usuarioId, rutaDesc })}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Factura vieja / perdida</Text>
      </TouchableOpacity>

      <Text style={styles.listaTitulo}>Renglones ({detalle.items.length})</Text>
      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : detalle.items.length === 0 ? (
        <Text style={styles.emptyListText}>No hay renglones cargados todavía.</Text>
      ) : (
        <FlatList
          data={detalle.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RenglonItem item={item} verificado={ESTADOS_VERIFICADO.has(item.status) || verificadosOptimistas.has(item.id)} />
          )}
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
              style={[styles.primaryButton, procesandoManual && styles.buttonDisabled]}
              onPress={confirmarManual}
              disabled={procesandoManual}
              activeOpacity={0.85}
            >
              {procesandoManual ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Verificar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} disabled={procesandoManual} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DespachoFinalizarModal
        visible={mostrarFinalizar}
        guardando={finalizando}
        onCancelar={() => setMostrarFinalizar(false)}
        onConfirmar={confirmarFinalizar}
      />
    </ScrollView>

    <View style={styles.footerBar}>
      <TouchableOpacity
        style={[styles.dangerButton, styles.footerButton, !resumen.puede_cerrar && styles.buttonDisabled]}
        onPress={abrirFinalizar}
        activeOpacity={0.85}
      >
        <Text style={styles.dangerButtonText}>Finalizar y cerrar ruta</Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}
