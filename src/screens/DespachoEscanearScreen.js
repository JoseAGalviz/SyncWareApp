import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSalidaConfirmada } from '../hooks/useSalidaConfirmada';
import { useModoEscaneo, MODO_CAMARA } from '../hooks/useModoEscaneo';
import EscanerInput from '../components/EscanerInput';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const PendienteItem = React.memo(({ item, onPress }) => {
  const tieneFactura = !!item.factura_generada;
  return (
    <TouchableOpacity style={styles.itemRow} onPress={() => onPress(item)} activeOpacity={0.6}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemNota}>Nota de Entrega {item.fact_num}</Text>
        <Text style={styles.itemDetalle}>{item.cli_des}</Text>
        <View style={[styles.statusPill, tieneFactura ? styles.statusVerificada : styles.statusEscaneada, { alignSelf: 'flex-start', marginTop: Theme.spacing.xs }]}>
          <Text style={[styles.statusPillText, tieneFactura ? styles.statusTextVerificada : styles.statusTextEscaneada]}>
            {tieneFactura ? `FACTURA ${item.factura_generada}` : 'SIN FACTURA'}
          </Text>
        </View>
      </View>
      <View style={[styles.statusPill, item.ya_escaneada ? styles.statusVerificada : styles.statusPendiente]}>
        <Text style={[styles.statusPillText, item.ya_escaneada ? styles.statusTextVerificada : styles.statusTextPendiente]}>
          {item.ya_escaneada ? 'ESCANEADA' : 'PENDIENTE'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const EscaneadoItem = React.memo(({ item, onPress, onDescartar }) => (
  <View style={styles.itemRow}>
    <TouchableOpacity style={styles.itemInfo} onPress={() => onPress(item)} activeOpacity={0.6}>
      <Text style={styles.itemNota}>{item.nota} — {item.escaneados}/{item.paquetes}</Text>
      <Text style={styles.itemDetalle}>{item.descrip}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.itemAccion} onPress={() => onDescartar(item.id)}>
      <Text style={{ color: Theme.colors.error, fontWeight: '700' }}>Quitar</Text>
    </TouchableOpacity>
  </View>
));

// Etiquetas legibles para los campos que puede traer cada renglón — cualquier
// campo no listado igual se muestra, con el nombre de la clave formateado.
const ETIQUETAS_CAMPO = {
  fact_num: 'Nota de Entrega',
  factura_generada: 'Nº Factura Profit',
  cli_des: 'Cliente',
  co_cli: 'Código cliente',
  ya_escaneada: 'Escaneada',
  nota: 'Nota',
  descrip: 'Descripción',
  escaneados: 'Cajas escaneadas',
  paquetes: 'Total de cajas',
  peso: 'Peso',
  id: 'ID',
};
const CAMPOS_OCULTOS = new Set([
  'id', 'procesada', 'impresa',
  'status', 'status1', 'status2', 'responsable', 'orden', 'recepcion', 'observacion',
]);

const formatearEtiqueta = (clave) =>
  ETIQUETAS_CAMPO[clave] || clave.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const formatearValor = (valor, clave) => {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (valor == null || valor === '') return clave === 'factura' ? 'Sin factura aún' : 'N/D';
  return String(valor);
};

const DetalleRenglonModal = ({ item, onClose }) => (
  <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackground}>
      <View style={styles.modalCard}>
        <Text style={styles.listaTitulo}>Detalle</Text>
        <ScrollView>
          {item && Object.entries(item)
            .filter(([clave]) => !CAMPOS_OCULTOS.has(clave))
            .map(([clave, valor]) => (
              <View key={clave} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{formatearEtiqueta(clave)}</Text>
                <Text style={styles.detailValue}>{formatearValor(valor, clave)}</Text>
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

export default function DespachoEscanearScreen({ route, navigation }) {
  const { rutagramaId, usuarioId, rutaDesc } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { modo, setModo, cargado } = useModoEscaneo();

  const [pendientes, setPendientes] = useState([]);
  const [detalle, setDetalle] = useState({ items: [], totales: { cantidad: 0, peso: 0 } });
  const [cargando, setCargando] = useState(true);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [procesandoManual, setProcesandoManual] = useState(false);
  const [detalleRenglon, setDetalleRenglon] = useState(null);
  const [filtroFactura, setFiltroFactura] = useState('todas'); // 'todas' | 'con' | 'sin'
  const ultimoEscaneoRef = useRef({ codigo: '', ts: 0 });

  useSalidaConfirmada(navigation);

  const cargarTodo = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([
        DespachoService.pendientes(rutagramaId, usuarioId),
        DespachoService.listarDetalle(rutagramaId, usuarioId),
      ]);
      setPendientes(Array.isArray(p) ? p : []);
      setDetalle(d || { items: [], totales: { cantidad: 0, peso: 0 } });
    } catch (error) {
      console.error('Error cargando pendientes/detalle', error);
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId]);

  // isFocused en deps: sin esto, volver de Verificar/FacturaVieja dejaba detalle.items
  // viejo (la pantalla no se desmonta al navegar, React Navigation la deja atrás en el
  // stack) — procesarCodigo calculaba el próximo número de caja contra ese caché
  // desactualizado y repetía una caja ya grabada en servidor (doble conteo / rechazo).
  useEffect(() => { if (isFocused) cargarTodo(); }, [isFocused, cargarTodo]);

  // Escaneo directo, sin modal de confirmación: busca la nota entre lo ya
  // cargado en este rutagrama (detalle.items) para calcular el número de
  // caja siguiente solo — primera vez que aparece esa nota = caja 1, si ya
  // tiene N cajas escaneadas = N+1 — y graba de una vez. El toast avisa el
  // resultado sin bloquear; cámara y lector quedan listos para el próximo
  // código apenas se dispara este.
  const procesarCodigo = useCallback(async (notaRaw) => {
    const nota = String(notaRaw || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!nota) return;
    const yaCargada = detalle.items.find((i) => String(i.nota) === nota);
    const caja = (yaCargada?.escaneados || 0) + 1;
    try {
      await DespachoService.escanearCaja(rutagramaId, { usuario_id: usuarioId, nota, caja });
      showMessage({ message: 'Escaneado', description: `Nota ${nota} · caja ${caja} escaneada correctamente`, type: 'success', duration: 1800 });
      await cargarTodo();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo registrar el escaneo.';
      showMessage({ message: 'Error al escanear', description: `${nota}: ${msg}`, type: 'danger', duration: 2800 });
    }
  }, [detalle.items, rutagramaId, usuarioId, cargarTodo]);

  // Lector dispara varias lecturas por segundo mientras el código sigue en cuadro —
  // sin este cooldown, apuntar a la misma caja ya registrada reintenta decenas de
  // veces por segundo y satura de toasts sin dejar apuntar a la siguiente.
  const COOLDOWN_MISMO_CODIGO_MS = 2500;
  const handleEscaneo = useCallback((dataRaw) => {
    const nota = String(dataRaw || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!nota) return;
    const ahora = Date.now();
    if (nota === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MISMO_CODIGO_MS) return;
    ultimoEscaneoRef.current = { codigo: nota, ts: ahora };
    procesarCodigo(nota);
  }, [procesarCodigo]);

  const abrirManual = useCallback(() => {
    setManualValor('');
    setManualVisible(true);
  }, []);

  const confirmarManual = useCallback(async () => {
    if (!manualValor.trim()) return;
    setProcesandoManual(true);
    await procesarCodigo(manualValor);
    setProcesandoManual(false);
    setManualVisible(false);
  }, [manualValor, procesarCodigo]);

  const descartarRenglon = useCallback(async (detalleId) => {
    try {
      await DespachoService.descartarDetalle(rutagramaId, detalleId);
      await cargarTodo();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo descartar el renglón.';
      Alert.alert('Error', msg);
    }
  }, [rutagramaId, cargarTodo]);

  const pendientesFiltrados = pendientes.filter((p) => {
    if (filtroFactura === 'con') return !!p.factura_generada;
    if (filtroFactura === 'sin') return !p.factura_generada;
    return true;
  });

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
      <Text style={styles.title}>Escanear cajas</Text>
      <View style={styles.activeHeader}>
        <Text style={styles.activeRuta}>{rutaDesc}</Text>
        <View style={styles.countersRow}>
          <View style={styles.counterPill}>
            <Text style={styles.counterLabel}>Notas</Text>
            <Text style={styles.counterValue}>{detalle.totales.cantidad}</Text>
          </View>
          <View style={styles.counterPill}>
            <Text style={styles.counterLabel}>Peso</Text>
            <Text style={styles.counterValue}>{Number(detalle.totales.peso).toFixed(2)}</Text>
          </View>
          <View style={styles.counterPill}>
            <Text style={styles.counterLabel}>Pendientes Profit</Text>
            <Text style={styles.counterValue}>{pendientes.filter(p => !p.ya_escaneada).length}</Text>
          </View>
        </View>
      </View>

      <EscanerInput modo={modo} setModo={setModo} isFocused={isFocused} onScan={handleEscaneo} />

      <TouchableOpacity style={styles.secondaryButton} onPress={abrirManual} activeOpacity={0.85}>
        <Text style={styles.secondaryButtonText}>Escribir nota manualmente</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoFacturaVieja', { rutagramaId, usuarioId, rutaDesc })}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Factura vieja / perdida</Text>
      </TouchableOpacity>

      <Text style={styles.listaTitulo}>Cargadas en este rutagrama ({detalle.items.length})</Text>
      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : detalle.items.length === 0 ? (
        <Text style={styles.emptyListText}>Todavía no escaneaste nada.</Text>
      ) : (
        <FlatList
          data={detalle.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EscaneadoItem item={item} onPress={setDetalleRenglon} onDescartar={descartarRenglon} />}
          scrollEnabled={false}
        />
      )}

      <Text style={[styles.listaTitulo, { marginTop: Theme.spacing.lg }]}>Pendientes de Profit ({pendientesFiltrados.length})</Text>
      <View style={styles.filterRow}>
        {[
          { key: 'todas', label: 'Todas' },
          { key: 'con', label: 'Con factura' },
          { key: 'sin', label: 'Sin factura' },
        ].map((op) => (
          <TouchableOpacity
            key={op.key}
            style={[styles.filterChip, filtroFactura === op.key && styles.filterChipActive]}
            onPress={() => setFiltroFactura(op.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filtroFactura === op.key && styles.filterChipTextActive]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {pendientesFiltrados.length === 0 ? (
        <Text style={styles.emptyListText}>
          {pendientes.length === 0 ? 'No hay notas pendientes en esta ruta.' : 'Ninguna nota pendiente coincide con el filtro.'}
        </Text>
      ) : (
        <FlatList
          data={pendientesFiltrados}
          keyExtractor={(item) => String(item.fact_num)}
          renderItem={({ item }) => <PendienteItem item={item} onPress={setDetalleRenglon} />}
          scrollEnabled={false}
        />
      )}

      <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Escribir nota</Text>
            <Text style={styles.label}>Nº Nota</Text>
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
              {procesandoManual ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Guardar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} disabled={procesandoManual} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DetalleRenglonModal item={detalleRenglon} onClose={() => setDetalleRenglon(null)} />
    </ScrollView>

    <View style={styles.footerBar}>
      <TouchableOpacity
        style={[styles.primaryButton, styles.footerButton]}
        onPress={() => navigation.navigate('DespachoVerificar', { rutagramaId, usuarioId, rutaDesc })}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Continuar a verificar por factura</Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}
