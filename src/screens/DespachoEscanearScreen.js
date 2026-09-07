import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSalidaConfirmada } from '../hooks/useSalidaConfirmada';
import { useModoEscaneo, MODO_CAMARA } from '../hooks/useModoEscaneo';
import EscanerInput from '../components/EscanerInput';
import DespachoFinalizarModal from '../components/DespachoFinalizarModal';
import { quitarActivo } from './DespachoIniciarScreen';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

// Un solo módulo de escaneo: se escanea nota o factura, sin orden fijo. El backend
// clasifica el código y devuelve el estado del renglón. Cada pedido = una fila con dos
// progresos independientes: 📦 cajas y 🧾 factura.

const FILTROS = [
  { key: 'todas', label: 'Todas' },
  { key: 'sin_cajas', label: 'Faltan cajas' },
  { key: 'sin_factura', label: 'Falta factura' },
  { key: 'completas', label: 'Completas' },
];

// Acepta el código tal cual (con o sin letra de serie). El backend hace la conversión
// del código de barras; acá solo se limpia para el cooldown y el envío.
const limpiarCodigo = (raw) => String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
const FORMATO_VALIDO = /^([AB]\d{7}|\d{1,10})$/i;

const esNotaCredito = (s) => s === 'NCR' || s === 'NDB';

const CajasPill = ({ item }) => {
  if (!item.espera_carga) return null;
  const completo = item.cajas_completas;
  const vacio = item.cajas_escaneadas < 1;
  const estilo = completo ? styles.statusVerificada : vacio ? styles.statusPendiente : styles.statusEscaneada;
  const texto = completo ? styles.statusTextVerificada : vacio ? styles.statusTextPendiente : styles.statusTextEscaneada;
  return (
    <View style={[styles.statusPill, estilo]}>
      <Text style={[styles.statusPillText, texto]}>📦 {item.cajas_escaneadas}/{item.cajas_esperadas}</Text>
    </View>
  );
};

const FacturaPill = ({ item }) => {
  if (esNotaCredito(item.status)) {
    return (
      <View style={[styles.statusPill, styles.statusVerificada]}>
        <Text style={[styles.statusPillText, styles.statusTextVerificada]}>{item.status === 'NCR' ? 'N/CR' : 'N/DB'}</Text>
      </View>
    );
  }
  const ok = item.factura_verificada;
  const lista = item.factura_pendiente_escaneo; // factura ya generada, falta escanearla
  const estilo = ok ? styles.statusVerificada : lista ? styles.statusEscaneada : styles.statusPendiente;
  const txt = ok ? styles.statusTextVerificada : lista ? styles.statusTextEscaneada : styles.statusTextPendiente;
  return (
    <View style={[styles.statusPill, estilo]}>
      <Text style={[styles.statusPillText, txt]}>🧾 {ok ? 'OK' : lista ? 'lista, escaneá' : 'falta'}</Text>
    </View>
  );
};

const CAMPOS_OCULTOS = new Set(['id', 'id_ca', 'reglon', 'status1', 'status2', 'responsable', 'orden', 'recepcion', 'observacion', 'fecha']);
const ETIQUETAS = {
  nota: 'Nota', factura: 'Factura', descrip: 'Cliente', vendedor: 'Vendedor', peso: 'Peso',
  cajas_escaneadas: 'Cajas escaneadas', cajas_esperadas: 'Cajas esperadas', status: 'Estado',
};
const DetalleRenglonModal = ({ item, onClose }) => (
  <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackground}>
      <View style={styles.modalCard}>
        <Text style={styles.listaTitulo}>Detalle del pedido</Text>
        <ScrollView>
          {item && Object.entries(item)
            .filter(([k, v]) => !CAMPOS_OCULTOS.has(k) && typeof v !== 'object')
            .map(([k, v]) => (
              <View key={k} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{ETIQUETAS[k] || k.replace(/_/g, ' ')}</Text>
                <Text style={styles.detailValue}>{typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v ?? '—')}</Text>
              </View>
            ))}
        </ScrollView>
        <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Nota de Profit todavía no cargada en este rutagrama (referencia de lo que falta escanear).
const PendienteItem = React.memo(({ item, onPress }) => {
  const tieneFactura = !!item.factura_generada;
  return (
    <TouchableOpacity style={styles.itemRow} onPress={() => onPress(item)} activeOpacity={0.6}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemNota}>Nota {item.fact_num}</Text>
        <Text style={styles.itemDetalle}>{item.cli_des}</Text>
        <View style={{ flexDirection: 'row', gap: Theme.spacing.xs, marginTop: Theme.spacing.xs }}>
          <View style={[styles.statusPill, tieneFactura ? styles.statusVerificada : styles.statusEscaneada]}>
            <Text style={[styles.statusPillText, tieneFactura ? styles.statusTextVerificada : styles.statusTextEscaneada]}>
              {tieneFactura ? `Fact ${item.factura_generada}` : 'sin factura'}
            </Text>
          </View>
          <View style={[styles.statusPill, item.ya_escaneada ? styles.statusVerificada : styles.statusPendiente]}>
            <Text style={[styles.statusPillText, item.ya_escaneada ? styles.statusTextVerificada : styles.statusTextPendiente]}>
              {item.ya_escaneada ? 'escaneada' : 'pendiente'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const RenglonItem = React.memo(({ item, onPress, onDescartar }) => (
  <View style={styles.itemRow}>
    <TouchableOpacity style={styles.itemInfo} onPress={() => onPress(item)} activeOpacity={0.6}>
      <Text style={styles.itemNota}>
        {item.nota}{item.factura && item.factura !== item.nota ? ` · Fact ${item.factura}` : ''}
      </Text>
      <Text style={styles.itemDetalle}>{item.descrip}</Text>
      <View style={{ flexDirection: 'row', gap: Theme.spacing.xs, marginTop: Theme.spacing.xs }}>
        <CajasPill item={item} />
        <FacturaPill item={item} />
      </View>
    </TouchableOpacity>
    <TouchableOpacity style={styles.itemAccion} onPress={() => onDescartar(item.id)}>
      <Text style={{ color: Theme.colors.error, fontWeight: '700' }}>Quitar</Text>
    </TouchableOpacity>
  </View>
));

export default function DespachoEscanearScreen({ route, navigation }) {
  const { rutagramaId, usuarioId, rutaDesc } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { modo, setModo, cargado } = useModoEscaneo();

  const [detalle, setDetalle] = useState({ items: [], totales: { cantidad: 0, peso: 0, cajas: 0 } });
  const [resumen, setResumen] = useState({ listados: 0, sin_cajas: 0, sin_factura: 0, completo: false, puede_cerrar: false, notas_anuladas: [], facturas_anuladas: [] });
  const [pendientes, setPendientes] = useState([]);
  const [filtroPend, setFiltroPend] = useState('todas');
  const [pendAbierto, setPendAbierto] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [filtro, setFiltro] = useState('todas');
  const [detalleRenglon, setDetalleRenglon] = useState(null);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [procesandoManual, setProcesandoManual] = useState(false);
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const ultimoEscaneoRef = useRef({ codigo: '', ts: 0 });

  useSalidaConfirmada(navigation);

  // Refresco liviano: solo /detalle (trae el autocompletado de factura, que es un lookup
  // chico a reng_fac sobre las notas escaneadas sin factura). No toca /pendientes.
  const refrescarDetalle = useCallback(async () => {
    try {
      const d = await DespachoService.listarDetalle(rutagramaId, usuarioId);
      if (d) setDetalle(d);
    } catch (error) {
      console.error('Error refrescando detalle', error);
    }
  }, [rutagramaId, usuarioId]);

  // Después de cada escaneo: detalle + resumen (para el gate). NO /pendientes — esa es la
  // consulta pesada de toda la ruta contra Profit, se refresca solo al enfocar la pantalla
  // o al abrir la sección "Notas de esta ruta".
  const refrescarPostEscaneo = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        DespachoService.listarDetalle(rutagramaId, usuarioId),
        DespachoService.resumenCierre(rutagramaId, usuarioId),
      ]);
      if (d) setDetalle(d);
      if (r && !r.error) setResumen(r);
    } catch (error) {
      console.error('Error refrescando post escaneo', error);
    }
  }, [rutagramaId, usuarioId]);

  const refrescarPendientes = useCallback(async () => {
    try {
      const p = await DespachoService.pendientes(rutagramaId, usuarioId);
      setPendientes(Array.isArray(p) ? p : []);
    } catch (error) {
      console.error('Error refrescando pendientes', error);
    }
  }, [rutagramaId, usuarioId]);

  const cargarTodo = useCallback(async () => {
    try {
      const [d, r, p] = await Promise.all([
        DespachoService.listarDetalle(rutagramaId, usuarioId),
        DespachoService.resumenCierre(rutagramaId, usuarioId),
        DespachoService.pendientes(rutagramaId, usuarioId).catch(() => []),
      ]);
      setDetalle(d || { items: [], totales: { cantidad: 0, peso: 0, cajas: 0 } });
      if (r && !r.error) setResumen(r);
      setPendientes(Array.isArray(p) ? p : []);
    } catch (error) {
      console.error('Error cargando detalle/resumen', error);
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId]);

  useEffect(() => { if (isFocused) cargarTodo(); }, [isFocused, cargarTodo]);

  // Mientras el rutagrama esté abierto y queden pedidos escaneados sin factura, refresca
  // /detalle cada 25s — apenas facturación genera la factura, el backend la autocompleta y
  // aparece sola en el renglón. Es un lookup chico (reng_fac IN <notas escaneadas>), NO la
  // consulta pesada de toda la ruta. Se corta cuando ya no falta ninguna.
  useEffect(() => {
    if (!isFocused) return;
    const faltan = detalle.items.some(
      (i) => !i.factura_verificada && !i.factura_pendiente_escaneo && i.status !== 'NCR' && i.status !== 'NDB'
    );
    if (!faltan) return;
    const t = setInterval(() => { refrescarDetalle(); }, 25000);
    return () => clearInterval(t);
  }, [isFocused, detalle.items, refrescarDetalle]);

  const procesarCodigo = useCallback(async (codigoRaw) => {
    const codigo = limpiarCodigo(codigoRaw);
    if (!codigo) return;
    try {
      const res = await DespachoService.escanear(rutagramaId, { usuario_id: usuarioId, codigo });
      const f = res?.fila;
      const adv = (res?.advertencias || []).join(' · ');
      if (res?.accion === 'caja' && f) {
        showMessage({
          message: `Caja ${f.cajas_escaneadas}/${f.cajas_esperadas}`,
          description: `Nota ${f.nota}${adv ? ` — ${adv}` : ''}`,
          type: f.cajas_completas ? 'success' : 'info',
          duration: 1800,
        });
      } else if (res?.accion === 'nota_credito' && f) {
        showMessage({ message: 'Nota C/D registrada', description: `${f.nota}`, type: 'success', duration: 1800 });
      } else if (f) {
        showMessage({
          message: f.factura_verificada ? 'Factura verificada' : 'Factura registrada',
          description: `Nota ${f.nota}${adv ? ` — ${adv}` : ''}`,
          type: f.factura_verificada ? 'success' : 'warning',
          duration: 1800,
        });
      } else {
        showMessage({ message: 'Escaneado', description: adv || codigo, type: 'info', duration: 1500 });
      }
      await refrescarPostEscaneo();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo procesar el escaneo.';
      if (/se está procesando/i.test(msg)) return; // doble disparo del lector, se ignora sin ruido
      showMessage({ message: 'Error al escanear', description: `${codigo}: ${msg}`, type: 'danger', duration: 2800 });
    }
  }, [rutagramaId, usuarioId, refrescarPostEscaneo]);

  // Corto a propósito: el equipo escanea cajas seguido. Frena la ráfaga de re-lecturas
  // del lector, no el escaneo deliberado de la siguiente caja del mismo pedido. Subir si
  // el lector re-lee más lento que esto y aparecen conteos de más.
  const COOLDOWN_MS = 900;
  const handleEscaneo = useCallback((dataRaw) => {
    if (scanned) return;
    const codigo = limpiarCodigo(dataRaw);
    if (!codigo || !FORMATO_VALIDO.test(codigo)) return; // ruido del lector
    const ahora = Date.now();
    if (codigo === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MS) return;
    ultimoEscaneoRef.current = { codigo, ts: ahora };
    setScanned(true);
    procesarCodigo(codigo).finally(() => setScanned(false));
  }, [scanned, procesarCodigo]);

  const confirmarManual = useCallback(async () => {
    const valor = limpiarCodigo(manualValor);
    if (!valor) return;
    if (!FORMATO_VALIDO.test(valor)) {
      showMessage({ message: 'Formato no reconocido', description: `"${valor}" debería ser hasta 10 dígitos, con o sin letra al inicio.`, type: 'warning', duration: 3000 });
      return;
    }
    setProcesandoManual(true);
    await procesarCodigo(valor);
    setProcesandoManual(false);
    setManualVisible(false);
    setManualValor('');
  }, [manualValor, procesarCodigo]);

  const descartarRenglon = useCallback(async (detalleId) => {
    try {
      await DespachoService.descartarDetalle(rutagramaId, detalleId);
      await refrescarPostEscaneo();
    } catch (error) {
      Alert.alert('Error', error.data?.error || error.message || 'No se pudo descartar el renglón.');
    }
  }, [rutagramaId, refrescarPostEscaneo]);

  const abrirFinalizar = useCallback(() => {
    if (!resumen.puede_cerrar) {
      const motivos = [];
      if (resumen.notas_anuladas?.length) motivos.push(`${resumen.notas_anuladas.length} nota(s) anulada(s)`);
      if (resumen.facturas_anuladas?.length) motivos.push(`${resumen.facturas_anuladas.length} factura(s) anulada(s)`);
      if (resumen.sin_cajas) motivos.push(`${resumen.sin_cajas} pedido(s) sin ninguna caja escaneada`);
      Alert.alert('No se puede cerrar todavía', motivos.join('\n') || 'No hay renglones en este rutagrama.');
      return;
    }
    const avisos = [];
    if (!resumen.completo) avisos.push('Hay pedidos con cajas incompletas.');
    if (resumen.sin_factura) avisos.push(`${resumen.sin_factura} pedido(s) sin factura escaneada (se despachan igual).`);
    if (avisos.length) {
      Alert.alert('Revisá antes de cerrar', `${avisos.join('\n')}\n\n¿Cerrar de todas formas?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar igual', style: 'destructive', onPress: () => setMostrarFinalizar(true) },
      ]);
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
      const numeros = (resultado?.rutagramas || []).map((r) => `#${r.cargado_id}`).join(', ');
      const mensaje = generados > 1
        ? `El rutagrama se separó en ${generados}: ${numeros}.`
        : `El rutagrama #${resultado?.cargado_id ?? rutagramaId} se cerró correctamente.`;
      Alert.alert('Ruta cerrada', mensaje, [
        { text: 'Ver historial', onPress: () => navigation.navigate('DespachoHistorial') },
        { text: 'OK', onPress: () => navigation.navigate('DespachoIniciar') },
      ]);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo finalizar el rutagrama.';
      if (/ya está cerrado/i.test(msg)) {
        await quitarActivo(rutagramaId);
        setMostrarFinalizar(false);
        Alert.alert('Ruta ya cerrada', `El rutagrama #${rutagramaId} ya se había cerrado.`, [
          { text: 'OK', onPress: () => navigation.navigate('DespachoIniciar') },
        ]);
        return;
      }
      Alert.alert('Error', msg);
    } finally {
      setFinalizando(false);
    }
  }, [rutagramaId, usuarioId, navigation]);

  const itemsFiltrados = detalle.items.filter((i) => {
    if (filtro === 'sin_cajas') return i.espera_carga && i.cajas_escaneadas < i.cajas_esperadas;
    if (filtro === 'sin_factura') return !i.factura_verificada && !esNotaCredito(i.status);
    if (filtro === 'completas') return (!i.espera_carga || i.cajas_completas) && (i.factura_verificada || esNotaCredito(i.status));
    return true;
  });

  const pendientesFiltrados = pendientes.filter((p) => {
    if (filtroPend === 'con') return !!p.factura_generada;
    if (filtroPend === 'sin') return !p.factura_generada;
    return true;
  });
  const pendientesSinEscanear = pendientes.filter((p) => !p.ya_escaneada).length;

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
        <Text style={styles.title}>Escaneo de despacho</Text>
        <View style={styles.activeHeader}>
          <Text style={styles.activeRuta}>{rutaDesc}</Text>
          <View style={styles.countersRow}>
            <View style={styles.counterPill}>
              <Text style={styles.counterLabel}>Pedidos</Text>
              <Text style={styles.counterValue}>{detalle.totales.cantidad}</Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterLabel}>Cajas</Text>
              <Text style={styles.counterValue}>{detalle.totales.cajas}</Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterLabel}>Peso</Text>
              <Text style={styles.counterValue}>{Number(detalle.totales.peso).toFixed(2)}</Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterLabel}>Sin factura</Text>
              <Text style={styles.counterValue}>{resumen.sin_factura || 0}</Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterLabel}>Pendientes</Text>
              <Text style={styles.counterValue}>{pendientesSinEscanear}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.toggleLabel}>Escaneá la nota o la factura — en cualquier orden</Text>
        <EscanerInput modo={modo} setModo={setModo} isFocused={isFocused} disabled={scanned} onScan={handleEscaneo} />

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(true)} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Escribir código manualmente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('DespachoFacturaVieja', { rutagramaId, usuarioId, rutaDesc })}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Factura vieja / perdida</Text>
        </TouchableOpacity>

        <Text style={styles.listaTitulo}>Pedidos ({detalle.items.length})</Text>
        <View style={styles.filterRow}>
          {FILTROS.map((op) => (
            <TouchableOpacity
              key={op.key}
              style={[styles.filterChip, filtro === op.key && styles.filterChipActive]}
              onPress={() => setFiltro(op.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filtro === op.key && styles.filterChipTextActive]}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {cargando ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : itemsFiltrados.length === 0 ? (
          <Text style={styles.emptyListText}>
            {detalle.items.length === 0 ? 'Todavía no escaneaste nada.' : 'Ningún pedido coincide con el filtro.'}
          </Text>
        ) : (
          <FlatList
            data={itemsFiltrados}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <RenglonItem item={item} onPress={setDetalleRenglon} onDescartar={descartarRenglon} />}
            scrollEnabled={false}
          />
        )}

        <TouchableOpacity
          style={[styles.regionHeader, { marginTop: Theme.spacing.lg }]}
          onPress={() => {
            const abriendo = !pendAbierto;
            setPendAbierto(abriendo);
            if (abriendo) refrescarPendientes(); // solo consulta la ruta completa al abrir
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.listaTitulo}>
            Notas de esta ruta ({pendientesSinEscanear} sin escanear / {pendientes.length})
          </Text>
          <Ionicons name={pendAbierto ? 'chevron-up' : 'chevron-down'} size={18} color={Theme.colors.text} />
        </TouchableOpacity>
        {pendAbierto && (
          <>
            <View style={styles.filterRow}>
              {[
                { key: 'todas', label: 'Todas' },
                { key: 'con', label: 'Con factura' },
                { key: 'sin', label: 'Sin factura' },
              ].map((op) => (
                <TouchableOpacity
                  key={op.key}
                  style={[styles.filterChip, filtroPend === op.key && styles.filterChipActive]}
                  onPress={() => setFiltroPend(op.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, filtroPend === op.key && styles.filterChipTextActive]}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {pendientesFiltrados.length === 0 ? (
              <Text style={styles.emptyListText}>
                {pendientes.length === 0 ? 'No hay notas pendientes en esta ruta.' : 'Ninguna coincide con el filtro.'}
              </Text>
            ) : (
              <FlatList
                data={pendientesFiltrados}
                keyExtractor={(item) => String(item.fact_num)}
                renderItem={({ item }) => <PendienteItem item={item} onPress={setDetalleRenglon} />}
                scrollEnabled={false}
              />
            )}
          </>
        )}

        <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.card}>
              <Text style={styles.listaTitulo}>Escribir código</Text>
              <Text style={styles.label}>Nº nota o factura</Text>
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
                {procesandoManual ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Registrar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} disabled={procesandoManual} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <DetalleRenglonModal item={detalleRenglon} onClose={() => setDetalleRenglon(null)} />

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
