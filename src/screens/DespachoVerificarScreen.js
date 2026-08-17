import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';
import DespachoFinalizarModal from '../components/DespachoFinalizarModal';
import { STORAGE_KEY_DESPACHO_ACTIVO } from './DespachoIniciarScreen';

const ESTADOS_VERIFICADO = new Set(['***', '****', 'FAT*', 'NCR', 'NDB', 'REFR', 'REP*']);

const RenglonItem = React.memo(({ item }) => {
  const verificado = ESTADOS_VERIFICADO.has(item.status);
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

  const [detalle, setDetalle] = useState({ items: [], totales: { cantidad: 0, peso: 0 } });
  const [resumen, setResumen] = useState({ verificados: 0, listados: 0, puede_cerrar: false, notas_anuladas: [], facturas_anuladas: [] });
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [soloFactura, setSoloFactura] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null); // { factura } | null
  const [guardando, setGuardando] = useState(false);
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const cargarTodo = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        DespachoService.listarDetalle(rutagramaId, usuarioId),
        DespachoService.resumenCierre(rutagramaId, usuarioId),
      ]);
      setDetalle(d || { items: [], totales: { cantidad: 0, peso: 0 } });
      setResumen(r || { verificados: 0, listados: 0, puede_cerrar: false, notas_anuladas: [], facturas_anuladas: [] });
    } catch (error) {
      console.error('Error cargando resumen de verificación', error);
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanned) return;
    setScanned(true);
    setConfirmacion({ factura: (data || '').replace(/\s+/g, '') });
  }, [scanned]);

  const cerrarConfirmacion = useCallback(() => {
    setConfirmacion(null);
    setScanned(false);
  }, []);

  const confirmarVerificacion = useCallback(async () => {
    if (!confirmacion?.factura) return;
    setGuardando(true);
    try {
      await DespachoService.verificarFactura(rutagramaId, {
        usuario_id: usuarioId,
        factura: confirmacion.factura,
        solo_factura: soloFactura,
      });
      setConfirmacion(null);
      setScanned(false);
      await cargarTodo();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo verificar la factura.';
      Alert.alert('Error al verificar', msg);
    } finally {
      setGuardando(false);
    }
  }, [confirmacion, soloFactura, rutagramaId, usuarioId, cargarTodo]);

  const abrirFinalizar = useCallback(() => {
    if (!resumen.puede_cerrar) {
      const motivos = [];
      if (resumen.verificados !== resumen.listados) motivos.push(`${resumen.listados - resumen.verificados} renglón(es) sin verificar`);
      if (resumen.notas_anuladas.length) motivos.push(`${resumen.notas_anuladas.length} nota(s) anulada(s)`);
      if (resumen.facturas_anuladas.length) motivos.push(`${resumen.facturas_anuladas.length} factura(s) anulada(s)`);
      Alert.alert('No se puede cerrar todavía', motivos.join(', ') || 'Faltan renglones por verificar.');
      return;
    }
    setMostrarFinalizar(true);
  }, [resumen]);

  const confirmarFinalizar = useCallback(async ({ chofer, carro, ayudantes }) => {
    setFinalizando(true);
    try {
      await DespachoService.finalizar(rutagramaId, { usuario_id: usuarioId, chofer, carro, ayudantes });
      await AsyncStorage.removeItem(STORAGE_KEY_DESPACHO_ACTIVO);
      setMostrarFinalizar(false);
      Alert.alert('Ruta cerrada', 'El rutagrama se cerró correctamente.', [
        { text: 'OK', onPress: () => navigation.navigate('DespachoIniciar') },
      ]);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo finalizar el rutagrama.';
      Alert.alert('Error', msg);
    } finally {
      setFinalizando(false);
    }
  }, [rutagramaId, usuarioId, navigation]);

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

      <View style={styles.toggleRow}>
        <Switch value={soloFactura} onValueChange={setSoloFactura} trackColor={{ true: Theme.colors.primary }} />
        <Text style={styles.toggleLabel}>Solo factura (sin nota previa)</Text>
      </View>

      <View style={styles.cameraContainer}>
        {isFocused ? (
          <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={styles.cameraBox} facing="back" />
        ) : null}
      </View>

      <Text style={styles.listaTitulo}>Renglones ({detalle.items.length})</Text>
      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : detalle.items.length === 0 ? (
        <Text style={styles.emptyListText}>No hay renglones cargados todavía.</Text>
      ) : (
        <FlatList
          data={detalle.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <RenglonItem item={item} />}
          scrollEnabled={false}
        />
      )}

      <TouchableOpacity
        style={[styles.dangerButton, !resumen.puede_cerrar && styles.buttonDisabled]}
        onPress={abrirFinalizar}
        activeOpacity={0.85}
      >
        <Text style={styles.dangerButtonText}>Finalizar y cerrar ruta</Text>
      </TouchableOpacity>

      <Modal visible={!!confirmacion} transparent animationType="fade" onRequestClose={cerrarConfirmacion}>
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Confirmar factura escaneada</Text>
            <Text style={styles.label}>Nº Factura</Text>
            <TextInput
              style={styles.input}
              value={confirmacion?.factura || ''}
              onChangeText={(v) => setConfirmacion({ factura: v })}
              autoCapitalize="characters"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, guardando && styles.buttonDisabled]}
              onPress={confirmarVerificacion}
              disabled={guardando}
              activeOpacity={0.85}
            >
              {guardando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Verificar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={cerrarConfirmacion} disabled={guardando} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Volver a escanear</Text>
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
  );
}
