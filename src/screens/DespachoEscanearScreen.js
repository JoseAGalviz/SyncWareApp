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

// Texto plano de lo que le falta a un pedido, para que el operador lo lea de un vistazo.
// Devuelve null si el pedido está completo.
const pendienteTexto = (f) => {
  if (!f) return null;
  if (esNotaCredito(f.status)) return null; // N/C y N/D no llevan cajas ni factura
  const partes = [];
  const esc = Number(f.cajas_escaneadas) || 0;
  const esp = Number(f.cajas_esperadas) || 0;
  if (esp >= 1 && esc < esp) partes.push(`${esp - esc} caja${esp - esc === 1 ? '' : 's'}`);
  if (!f.factura_verificada) {
    partes.push(
      f.factura && f.factura !== f.nota
        ? `escanear FACTURA ${f.factura}`
        : 'la FACTURA (aún sin generar)'
    );
  }
  return partes.length ? partes.join(' · ') : null;
};

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

const RenglonItem = React.memo(({ item, onPress, onDescartar }) => {
  const falta = pendienteTexto(item);
  const completo = !falta;
  return (
  <View style={[styles.itemRow, completo && styles.itemRowCompleto]}>
    <TouchableOpacity style={styles.itemInfo} onPress={() => onPress(item)} activeOpacity={0.6}>
      <Text style={styles.itemNota}>
        NOTA {item.nota}{item.factura && item.factura !== item.nota ? ` · FACTURA ${item.factura}` : ''}
      </Text>
      <Text style={styles.itemDetalle}>{item.descrip}</Text>
      <View style={{ flexDirection: 'row', gap: Theme.spacing.xs, marginTop: Theme.spacing.xs }}>
        <CajasPill item={item} />
        <FacturaPill item={item} />
      </View>
      <Text style={{ marginTop: Theme.spacing.xs, fontWeight: '800', color: falta ? Theme.colors.warning : Theme.colors.success }}>
        {falta ? `PENDIENTE: ${falta}` : 'COMPLETO ✓'}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.itemAccion} onPress={() => onDescartar(item.id)}>
      <Text style={{ color: Theme.colors.error, fontWeight: '700' }}>Quitar</Text>
    </TouchableOpacity>
  </View>
  );
});

// Pantalla de revisión antes de cerrar el rutagrama: lista todo lo escaneado, marca lo que
// falta (cajas incompletas / sin factura) y pide confirmación. "Volver al escaneo" no pierde
// nada — el progreso vive en el server (detalle), esto es solo una vista.
const RevisarCierreModal = ({ visible, items, totales, resumen, onVolver, onConfirmar, onVerRenglon, onQuitarRenglon }) => {
  const incompletos = items.filter((i) => pendienteTexto(i));
  const hayFaltantes = incompletos.length > 0;

  // Bloqueos DUROS del server (no se puede cerrar hasta resolverlos).
  const bloqueado = !resumen?.puede_cerrar;
  const motivosBloqueo = [];
  if (Number(resumen?.sin_cajas || 0) > 0) motivosBloqueo.push(`${resumen.sin_cajas} pedido(s) con factura pero SIN cajas escaneadas`);
  if (resumen?.notas_anuladas?.length) motivosBloqueo.push(`${resumen.notas_anuladas.length} nota(s) anulada(s)`);
  if (resumen?.facturas_anuladas?.length) motivosBloqueo.push(`${resumen.facturas_anuladas.length} factura(s) anulada(s)`);
  if (bloqueado && motivosBloqueo.length === 0) motivosBloqueo.push('No hay pedidos escaneados en este rutagrama.');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onVolver}>
      <View style={[styles.container, { flex: 1, paddingTop: Theme.spacing.lg }]}>
        <Text style={styles.title}>Revisá antes de cerrar</Text>

        <View style={styles.card}>
          <Text style={styles.listaTitulo}>
            {items.length} pedido(s) · {Number(totales?.cajas || 0)} caja(s) · {Number(totales?.peso || 0).toFixed(2)} kg
          </Text>
          {bloqueado ? (
            <Text style={{ color: Theme.colors.error, fontWeight: '800', marginTop: Theme.spacing.xs }}>
              ✕ No se puede cerrar todavía
            </Text>
          ) : hayFaltantes ? (
            <Text style={{ color: Theme.colors.warning, fontWeight: '800', marginTop: Theme.spacing.xs }}>
              ⚠ {incompletos.length} pedido(s) con algo pendiente
            </Text>
          ) : (
            <Text style={{ color: Theme.colors.success, fontWeight: '800', marginTop: Theme.spacing.xs }}>
              ✓ Todo escaneado
            </Text>
          )}
          {motivosBloqueo.map((m) => (
            <Text key={m} style={{ color: Theme.colors.error, marginTop: 2 }}>• {m}</Text>
          ))}
          {!bloqueado && Number(resumen?.sin_factura || 0) > 0 && (
            <Text style={styles.itemDetalle}>
              {resumen.sin_factura} pedido(s) sin factura escaneada — se despachan igual
            </Text>
          )}
        </View>

        {items.length === 0 ? (
          <Text style={styles.emptyListText}>No hay pedidos escaneados.</Text>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={items}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
              <RenglonItem item={item} onPress={onVerRenglon} onDescartar={onQuitarRenglon} />
            )}
            initialNumToRender={15}
            windowSize={7}
          />
        )}

        <View style={{ padding: Theme.spacing.md }}>
          {bloqueado ? (
            <Text style={{ color: Theme.colors.error, fontWeight: '700', marginBottom: Theme.spacing.sm, textAlign: 'center' }}>
              Escaneá las cajas que faltan, o tocá "Quitar" en el pedido que no va, para poder cerrar.
            </Text>
          ) : hayFaltantes ? (
            <Text style={{ color: Theme.colors.warning, fontWeight: '700', marginBottom: Theme.spacing.sm, textAlign: 'center' }}>
              Hay pedidos incompletos. ¿Seguro que querés cerrar el rutagrama así?
            </Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.dangerButton,
              bloqueado && styles.buttonDisabled,
              !bloqueado && hayFaltantes && { backgroundColor: Theme.colors.warning },
            ]}
            onPress={bloqueado ? undefined : onConfirmar}
            disabled={bloqueado}
            activeOpacity={0.85}
          >
            <Text style={styles.dangerButtonText}>
              {bloqueado ? 'No se puede cerrar' : hayFaltantes ? 'Sí, cerrar así' : 'Cerrar el rutagrama'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onVolver} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Volver al escaneo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function DespachoEscanearScreen({ route, navigation }) {
  const { rutagramaId, usuarioId, rutaDesc } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { modo, setModo, cargado } = useModoEscaneo();

  const [detalle, setDetalle] = useState({ items: [], totales: { cantidad: 0, peso: 0, cajas: 0 } });
  const [resumen, setResumen] = useState({ listados: 0, sin_cajas: 0, sin_factura: 0, completo: false, puede_cerrar: false, notas_anuladas: [], facturas_anuladas: [] });
  const [pendientes, setPendientes] = useState([]);
  const [pendientesCargados, setPendientesCargados] = useState(false);
  // Arranca en 'con': lo accionable son las notas con factura ya generada (listas para
  // despachar). Reduce la lista al abrir en rutas grandes; el operador cambia a 'todas'/'sin'
  // si necesita ver el resto.
  const [filtroPend, setFiltroPend] = useState('con');
  // Arranca cerrada: "Notas de esta ruta" es la consulta pesada de toda la ruta contra
  // Profit (rutas grandes = 1000+ notas). Se carga recién al abrir la sección.
  const [pendAbierto, setPendAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [filtro, setFiltro] = useState('todas');
  const [detalleRenglon, setDetalleRenglon] = useState(null);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [procesandoManual, setProcesandoManual] = useState(false);
  const [mostrarRevisar, setMostrarRevisar] = useState(false); // pantalla de revisión pre-cierre
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

  // Después de cada escaneo: detalle + resumen (para el gate). `rapido:true` -> el backend
  // NO consulta Profit para autocompletar facturas (facturación no generó nada nuevo en el
  // ínterin); ese lookup lo hace el poll de fondo. NO /pendientes.
  const refrescarPostEscaneo = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        DespachoService.listarDetalle(rutagramaId, usuarioId, { rapido: true }),
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
      setPendientesCargados(true);
    } catch (error) {
      console.error('Error refrescando pendientes', error);
    }
  }, [rutagramaId, usuarioId]);

  // Carga inicial: detalle + resumen. `pendientes` (toda la ruta contra Profit) NO se trae
  // acá — se pide recién al abrir "Notas de esta ruta" (o se re-trae si ya estaba abierta).
  const cargarTodo = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        DespachoService.listarDetalle(rutagramaId, usuarioId),
        DespachoService.resumenCierre(rutagramaId, usuarioId),
      ]);
      setDetalle(d || { items: [], totales: { cantidad: 0, peso: 0, cajas: 0 } });
      if (r && !r.error) setResumen(r);
      if (pendAbierto) refrescarPendientes();
    } catch (error) {
      console.error('Error cargando detalle/resumen', error);
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId, pendAbierto, refrescarPendientes]);

  useEffect(() => { if (isFocused) cargarTodo(); }, [isFocused, cargarTodo]);

  // Mientras el rutagrama esté abierto y queden pedidos escaneados sin factura, refresca
  // /detalle cada 45s — apenas facturación genera la factura, el backend la autocompleta y
  // aparece sola en el renglón. Este SÍ consulta Profit (reng_fac IN <notas escaneadas>),
  // por eso el intervalo es holgado. Se corta cuando ya no falta ninguna.
  useEffect(() => {
    if (!isFocused) return;
    const faltan = detalle.items.some(
      (i) => !i.factura_verificada && !i.factura_pendiente_escaneo && i.status !== 'NCR' && i.status !== 'NDB'
    );
    if (!faltan) return;
    const t = setInterval(() => { refrescarDetalle(); }, 45000);
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
        const falta = pendienteTexto(f);
        showMessage({
          message: `SE ESCANEÓ NOTA ${f.nota}`,
          description: [
            `Cajas ${f.cajas_escaneadas}/${f.cajas_esperadas}`,
            falta ? `PENDIENTE: ${falta}` : 'PEDIDO COMPLETO ✓',
            adv || null,
          ].filter(Boolean).join('\n'),
          type: falta ? 'info' : 'success',
          duration: 3000,
        });
      } else if (res?.accion === 'nota_credito' && f) {
        showMessage({
          message: `SE ESCANEÓ NOTA ${f.status === 'NDB' ? 'DÉBITO' : 'CRÉDITO'} ${f.nota}`,
          description: 'Registrada ✓',
          type: 'success',
          duration: 2400,
        });
      } else if (f) {
        const falta = pendienteTexto(f);
        showMessage({
          message: `SE ESCANEÓ FACTURA ${f.factura || codigo}`,
          description: [
            `Nota ${f.nota}`,
            f.factura_verificada ? 'Factura verificada ✓' : 'Factura registrada',
            falta ? `PENDIENTE: ${falta}` : 'PEDIDO COMPLETO ✓',
            adv || null,
          ].filter(Boolean).join('\n'),
          type: falta ? 'warning' : 'success',
          duration: 3000,
        });
      } else {
        showMessage({ message: 'Escaneado', description: adv || codigo, type: 'info', duration: 1800 });
      }
      await refrescarPostEscaneo();
    } catch (error) {
      const msg = (error.data?.error || error.message || 'No se pudo procesar el escaneo.')
        .replace(/:\s*(POST|GET|PUT|DELETE)\s+\/\S+\s*$/i, '') // cola tecnica ": POST /api/..."
        .replace(/^\d+:\s*/, '')                                // id de traza "497261: "
        .trim();
      if (/se está procesando/i.test(msg)) return; // doble disparo del lector, se ignora sin ruido
      showMessage({ message: `NO SE PUDO ESCANEAR — ${codigo}`, description: msg, type: 'danger', duration: 3500 });
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

  // Siempre abre la pantalla de revisión. Ahí se muestra todo lo escaneado y, si algo
  // bloquea el cierre (pedido sin cajas, anuladas), el botón de cerrar queda deshabilitado
  // con el motivo — pero el operador ve QUÉ pedido es y puede volver a escanear o quitarlo.
  const abrirFinalizar = useCallback(() => {
    setMostrarRevisar(true);
  }, []);

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

  const pendientesFiltradosTodos = pendientes.filter((p) => {
    if (filtroPend === 'con') return !!p.factura_generada;
    if (filtroPend === 'sin') return !p.factura_generada;
    return true;
  });
  // Rutas grandes traen 1000+ notas. Se renderiza un tope; el operador escanea por código,
  // no scrollea la lista entera. Para ver una puntual, están los filtros Con/Sin factura.
  const TOPE_PENDIENTES = 120;
  const pendientesFiltrados = pendientesFiltradosTodos.slice(0, TOPE_PENDIENTES);
  const pendientesOcultos = pendientesFiltradosTodos.length - pendientesFiltrados.length;
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
                {!pendientesCargados
                  ? 'Cargando notas de la ruta...'
                  : pendientes.length === 0
                    ? 'No hay notas pendientes en esta ruta.'
                    : 'Ninguna coincide con el filtro.'}
              </Text>
            ) : (
              <>
                <FlatList
                  data={pendientesFiltrados}
                  keyExtractor={(item) => String(item.fact_num)}
                  renderItem={({ item }) => <PendienteItem item={item} onPress={setDetalleRenglon} />}
                  scrollEnabled={false}
                  initialNumToRender={20}
                  maxToRenderPerBatch={20}
                  windowSize={7}
                  removeClippedSubviews
                />
                {pendientesOcultos > 0 && (
                  <Text style={styles.emptyListText}>
                    +{pendientesOcultos} nota(s) más — usá los filtros Con/Sin factura para acotar.
                  </Text>
                )}
              </>
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

        <RevisarCierreModal
          visible={mostrarRevisar}
          items={detalle.items}
          totales={detalle.totales}
          resumen={resumen}
          onVolver={() => setMostrarRevisar(false)}
          onConfirmar={() => { setMostrarRevisar(false); setMostrarFinalizar(true); }}
          onVerRenglon={setDetalleRenglon}
          onQuitarRenglon={descartarRenglon}
        />

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
