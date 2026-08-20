import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSalidaConfirmada } from '../hooks/useSalidaConfirmada';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const PendienteItem = React.memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={() => onPress(item)} activeOpacity={0.6}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>Factura {item.fact_num}</Text>
      <Text style={styles.itemDetalle}>{item.cli_des}</Text>
    </View>
    <View style={[styles.statusPill, item.ya_escaneada ? styles.statusVerificada : styles.statusPendiente]}>
      <Text style={[styles.statusPillText, item.ya_escaneada ? styles.statusTextVerificada : styles.statusTextPendiente]}>
        {item.ya_escaneada ? 'ESCANEADA' : 'PENDIENTE'}
      </Text>
    </View>
  </TouchableOpacity>
));

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
  fact_num: 'Factura',
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
const CAMPOS_OCULTOS = new Set(['id']);

const formatearEtiqueta = (clave) =>
  ETIQUETAS_CAMPO[clave] || clave.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const formatearValor = (valor) => {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (valor == null || valor === '') return 'N/D';
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
                <Text style={styles.detailValue}>{formatearValor(valor)}</Text>
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

  const [pendientes, setPendientes] = useState([]);
  const [detalle, setDetalle] = useState({ items: [], totales: { cantidad: 0, peso: 0 } });
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null); // { nota, caja } | null
  const [guardando, setGuardando] = useState(false);
  const [detalleRenglon, setDetalleRenglon] = useState(null);

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

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanned) return;
    setScanned(true);
    setConfirmacion({ nota: (data || '').replace(/\s+/g, ''), caja: '1' });
  }, [scanned]);

  const cerrarConfirmacion = useCallback(() => {
    setConfirmacion(null);
    setScanned(false);
  }, []);

  const escribirManualmente = useCallback(() => {
    setScanned(true);
    setConfirmacion({ nota: '', caja: '1' });
  }, []);

  const confirmarEscaneo = useCallback(async () => {
    if (!confirmacion?.nota || !confirmacion?.caja) return;
    setGuardando(true);
    try {
      await DespachoService.escanearCaja(rutagramaId, {
        usuario_id: usuarioId,
        nota: confirmacion.nota,
        caja: Number(confirmacion.caja),
      });
      setConfirmacion(null);
      setScanned(false);
      await cargarTodo();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo registrar el escaneo.';
      Alert.alert('Error al escanear', msg);
    } finally {
      setGuardando(false);
    }
  }, [confirmacion, rutagramaId, usuarioId, cargarTodo]);

  const descartarRenglon = useCallback(async (detalleId) => {
    try {
      await DespachoService.descartarDetalle(rutagramaId, detalleId);
      await cargarTodo();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo descartar el renglón.';
      Alert.alert('Error', msg);
    }
  }, [rutagramaId, cargarTodo]);

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

      <View style={styles.cameraContainer}>
        {isFocused ? (
          <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={styles.cameraBox} facing="back" />
        ) : null}
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={escribirManualmente} activeOpacity={0.85}>
        <Text style={styles.secondaryButtonText}>Escribir nota/caja manualmente</Text>
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

      <Text style={[styles.listaTitulo, { marginTop: Theme.spacing.lg }]}>Pendientes de Profit ({pendientes.length})</Text>
      {pendientes.length === 0 ? (
        <Text style={styles.emptyListText}>No hay notas pendientes en esta ruta.</Text>
      ) : (
        <FlatList
          data={pendientes}
          keyExtractor={(item) => String(item.fact_num)}
          renderItem={({ item }) => <PendienteItem item={item} onPress={setDetalleRenglon} />}
          scrollEnabled={false}
          style={{ maxHeight: 260 }}
        />
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('DespachoVerificar', { rutagramaId, usuarioId, rutaDesc })}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Continuar a verificar por factura</Text>
      </TouchableOpacity>

      <Modal visible={!!confirmacion} transparent animationType="fade" onRequestClose={cerrarConfirmacion}>
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Confirmar caja escaneada</Text>
            <Text style={styles.label}>Nº Nota</Text>
            <TextInput
              style={styles.input}
              value={confirmacion?.nota || ''}
              onChangeText={(v) => setConfirmacion(prev => ({ ...prev, nota: v }))}
              autoCapitalize="characters"
              selectTextOnFocus
            />
            <Text style={styles.label}>Nº de caja</Text>
            <TextInput
              style={styles.input}
              value={confirmacion?.caja || ''}
              onChangeText={(v) => setConfirmacion(prev => ({ ...prev, caja: v.replace(/[^0-9]/g, '') }))}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, guardando && styles.buttonDisabled]}
              onPress={confirmarEscaneo}
              disabled={guardando}
              activeOpacity={0.85}
            >
              {guardando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Guardar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={cerrarConfirmacion} disabled={guardando} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Volver a escanear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DetalleRenglonModal item={detalleRenglon} onClose={() => setDetalleRenglon(null)} />
    </ScrollView>
  );
}
