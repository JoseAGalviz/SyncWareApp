import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const RenglonItem = React.memo(({ item }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>Nota {item.nota}{item.factura ? ` · Factura ${item.factura}` : ''}</Text>
      <Text style={styles.itemDetalle}>{item.descrip}</Text>
    </View>
    <View style={[styles.statusPill, item.recibido ? styles.statusVerificada : styles.statusPendiente]}>
      <Text style={[styles.statusPillText, item.recibido ? styles.statusTextVerificada : styles.statusTextPendiente]}>
        {item.recibido ? 'RECIBIDO' : 'PENDIENTE'}
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

  const confirmarCodigo = useCallback(async (codigo) => {
    if (!codigo) return;
    setGuardando(true);
    try {
      await DespachoService.escanearEnlace(rutagramaId, { usuario_id: usuarioId, codigo });
      setCodigoManual(null);
      setScanned(false);
      await cargarDetalle();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo confirmar el código.';
      Alert.alert('Error al escanear', msg);
    } finally {
      setGuardando(false);
    }
  }, [rutagramaId, usuarioId, cargarDetalle]);

  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanned) return;
    setScanned(true);
    confirmarCodigo((data || '').replace(/\s+/g, ''));
  }, [scanned, confirmarCodigo]);

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
      <Text style={styles.title}>Recibir enlace #{rutagramaId}</Text>
      <View style={styles.activeHeader}>
        <Text style={styles.activeRuta}>{cargado?.conductor} · {cargado?.vehiculo}</Text>
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
          <View style={styles.cameraContainer}>
            {isFocused ? (
              <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={styles.cameraBox} facing="back" />
            ) : null}
          </View>
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
              onPress={() => confirmarCodigo(codigoManual)}
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
