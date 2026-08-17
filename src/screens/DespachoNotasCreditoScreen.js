import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const RUTAS_CRUZADAS = [
  { codigo: 'barquisimeto1', label: 'ENVIOS BARQUISIMETO (BQTO → S/C)' },
  { codigo: 'barquisimeto2', label: 'ENVIOS S/C (S/C → BQTO)' },
];

const NotaItem = React.memo(({ item }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>{item.nota} — {item.status}</Text>
      <Text style={styles.itemDetalle}>{item.descrip} · Fact. afectada: {item.factura || '—'}</Text>
    </View>
  </View>
));

export default function DespachoNotasCreditoScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [segmentos, setSegmentos] = useState([]);

  useEffect(() => {
    const cargarUsuario = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) setUserData(JSON.parse(userDataStr));
    };
    cargarUsuario();
  }, []);

  useEffect(() => {
    if (!userData?.id) return;
    DespachoService.segmentos(userData.id)
      .then(setSegmentos)
      .catch(e => console.error('Error cargando catálogo de rutas', e));
  }, [userData?.id]);

  // Catálogo abierto, igual que DespachoIniciarScreen — sin asignación fija por usuario.
  const opcionesRuta = [
    ...segmentos.map(s => ({ codigo: s.codigo, label: `${s.codigo} - ${s.descripcion}` })),
    ...RUTAS_CRUZADAS,
  ];

  const cargarPendientes = useCallback(async () => {
    if (!userData?.id || !rutaSeleccionada) return;
    setCargando(true);
    try {
      const resultado = await DespachoService.ncPendientes(userData.id, rutaSeleccionada);
      setItems(resultado?.items || []);
    } catch (error) {
      console.error('Error cargando notas C/D pendientes', error);
    } finally {
      setCargando(false);
    }
  }, [userData, rutaSeleccionada]);

  useEffect(() => { cargarPendientes(); }, [cargarPendientes]);

  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanned || !rutaSeleccionada) return;
    setScanned(true);
    setConfirmacion({ nota: (data || '').replace(/\s+/g, '') });
  }, [scanned, rutaSeleccionada]);

  const cerrarConfirmacion = useCallback(() => {
    setConfirmacion(null);
    setScanned(false);
  }, []);

  const confirmarEscaneo = useCallback(async () => {
    if (!confirmacion?.nota) return;
    setGuardando(true);
    try {
      await DespachoService.ncEscanear({ usuario_id: userData.id, ruta_codigo: rutaSeleccionada, nota: confirmacion.nota });
      setConfirmacion(null);
      setScanned(false);
      await cargarPendientes();
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo registrar la nota.';
      Alert.alert('Error', msg);
    } finally {
      setGuardando(false);
    }
  }, [confirmacion, userData, rutaSeleccionada, cargarPendientes]);

  const finalizar = useCallback(async () => {
    setCerrando(true);
    try {
      const resultado = await DespachoService.ncFinalizar({ usuario_id: userData.id, ruta_codigo: rutaSeleccionada });
      Alert.alert('Comprobante', `${resultado.total} nota(s) de crédito/débito registradas para esta ruta.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo finalizar.';
      Alert.alert('Error', msg);
    } finally {
      setCerrando(false);
    }
  }, [userData, rutaSeleccionada, navigation]);

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
      <Text style={styles.title}>Notas de Crédito / Débito</Text>

      {!rutaSeleccionada ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Elegí la ruta.</Text>
          {opcionesRuta.map(opcion => (
            <TouchableOpacity key={opcion.codigo} style={styles.rutaOption} onPress={() => setRutaSeleccionada(opcion.codigo)} activeOpacity={0.8}>
              <Text style={styles.rutaOptionText}>{opcion.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.cameraContainer}>
            {isFocused ? (
              <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={styles.cameraBox} facing="back" />
            ) : null}
          </View>

          <Text style={styles.listaTitulo}>Escaneadas ({items.length})</Text>
          {cargando ? (
            <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyListText}>Todavía no escaneaste ninguna nota.</Text>
          ) : (
            <FlatList data={items} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <NotaItem item={item} />} scrollEnabled={false} />
          )}

          <TouchableOpacity
            style={[styles.dangerButton, (items.length === 0 || cerrando) && styles.buttonDisabled]}
            onPress={finalizar}
            disabled={items.length === 0 || cerrando}
            activeOpacity={0.85}
          >
            {cerrando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.dangerButtonText}>Finalizar</Text>}
          </TouchableOpacity>
        </>
      )}

      <Modal visible={!!confirmacion} transparent animationType="fade" onRequestClose={cerrarConfirmacion}>
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Confirmar nota C/D escaneada</Text>
            <Text style={styles.label}>Nº Nota</Text>
            <TextInput
              style={styles.input}
              value={confirmacion?.nota || ''}
              onChangeText={(v) => setConfirmacion({ nota: v })}
              autoCapitalize="characters"
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
    </ScrollView>
  );
}
