import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import createStyles from '../styles/LotesScreen.styles';
import Theme from '../constants/Theme';
import { Config, API_ENDPOINTS } from '../constants/Config';
import { getAuthHeader } from '../services/api';

const API_BASE_URL = `${Config.API_BASE_URL}/api`;
const STORAGE_KEY = 'lotes';

const pad = (n) => n.toString().padStart(2, '0');

const fechaHoraActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())} ${pad(hoy.getHours())}:${pad(hoy.getMinutes())}:${pad(hoy.getSeconds())}`;
};

// Extrae solo HH:mm de "YYYY-MM-DD HH:mm:ss" para mostrar en las filas
const horaCorta = (fechaStr) => (fechaStr ? fechaStr.slice(11, 16) : '');

const estadoInfo = (estado, enviado) => {
  if (estado !== 'cerrado') {
    return { label: 'Abierto', color: Theme.colors.warning, icon: 'time-outline' };
  }
  if (enviado) {
    return { label: 'Enviado', color: Theme.colors.success, icon: 'checkmark-done-outline' };
  }
  return { label: 'Cerrado', color: Theme.colors.info, icon: 'lock-closed-outline' };
};

const EstadoBadge = ({ estado, enviado, styles }) => {
  const info = estadoInfo(estado, enviado);
  return (
    <View style={[styles.loteBadge, { backgroundColor: info.color }]}>
      <Ionicons name={info.icon} size={11} color={Theme.colors.white} />
      <Text style={styles.loteBadgeText}>{info.label}</Text>
    </View>
  );
};

// Modal con historial de lotes guardados localmente
const LotesModal = ({ visible, onClose, lotes, onEnviar, enviandoId, styles }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Lotes guardados ({lotes.length})</Text>
        <View style={styles.modalDivider} />

        {lotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={36} color={Theme.colors.light} />
            <Text style={styles.emptyStateText}>Todavía no has creado ningún lote</Text>
          </View>
        ) : (
          <View style={{ maxHeight: 340, marginBottom: 10 }}>
            <FlatList
              data={lotes}
              keyExtractor={(item) => item.localId}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const info = estadoInfo(item.estado, item.enviado);
                return (
                  <View style={[styles.loteItem, { borderLeftColor: info.color }]}>
                    <View style={styles.loteItemHeader}>
                      <Text style={styles.loteItemTitle}>Lote #{item.localId.slice(-6)}</Text>
                      <EstadoBadge estado={item.estado} enviado={item.enviado} styles={styles} />
                    </View>
                    <Text style={styles.loteItemDetalle}>Creado: {item.fecha_creacion}</Text>
                    {!!item.fecha_cierre && (
                      <Text style={styles.loteItemDetalle}>Cerrado: {item.fecha_cierre}</Text>
                    )}
                    <Text style={styles.loteItemDetalle}>
                      {item.facturas.length} factura(s) · Vendedor: {item.co_ven || 'N/D'}
                    </Text>
                    {item.estado === 'cerrado' && !item.enviado && (
                      <TouchableOpacity
                        style={styles.loteEnviarButton}
                        onPress={() => onEnviar(item)}
                        disabled={enviandoId === item.localId}
                        activeOpacity={0.85}
                      >
                        {enviandoId === item.localId ? (
                          <ActivityIndicator size="small" color={Theme.colors.white} />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={14} color={Theme.colors.white} />
                            <Text style={styles.loteEnviarButtonText}>Enviar lote</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}

        <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={onClose} activeOpacity={0.85}>
          <Ionicons name="close-outline" size={18} color={Theme.colors.white} />
          <Text style={styles.modalButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function LotesScreen() {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();

  const [currentUserCoVend, setCurrentUserCoVend] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [enviandoId, setEnviandoId] = useState(null);

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facturaPreview, setFacturaPreview] = useState(null);
  const [error, setError] = useState(null);
  const [manualFactura, setManualFactura] = useState('');

  const loteActual = useMemo(() => lotes.find((l) => l.estado === 'abierto') || null, [lotes]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.co_ven) setCurrentUserCoVend(userData.co_ven);
        }
      } catch (e) {
        console.error('Error cargando datos de usuario', e);
      }
    };
    loadUserData();
  }, []);

  const cargarLotes = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      parsed.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      setLotes(parsed);
    } catch {
      setLotes([]);
    }
  }, []);

  useEffect(() => {
    if (isFocused) cargarLotes();
  }, [isFocused, cargarLotes]);

  const guardarLotes = useCallback(async (nuevos) => {
    const ordenados = [...nuevos].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ordenados));
    setLotes(ordenados);
  }, []);

  const obtenerCoordenadas = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso de ubicación denegado');
        return null;
      }
      const lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation) {
        return `${lastLocation.coords.latitude},${lastLocation.coords.longitude}`;
      }
      const locationPromise = Location.getCurrentPositionAsync({});
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 7000));
      const location = await Promise.race([locationPromise, timeoutPromise]);
      if (!location) {
        Alert.alert('No se pudo obtener la ubicación a tiempo');
        return null;
      }
      return `${location.coords.latitude},${location.coords.longitude}`;
    } catch {
      return null;
    }
  }, []);

  // Endpoint propio de Lotes: no valida contra el escaneo del módulo de Facturas.
  const consultarFactura = useCallback(async (numFactura) => {
    const payload = { num_factura: numFactura };
    const response = await fetch(`${API_BASE_URL}/lotes/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = null;
    }

    if (response.status === 404 && text.includes('No se encontró la factura')) {
      Alert.alert('Factura no encontrada');
      return null;
    }
    if (!response.ok) {
      Alert.alert('Error', 'No se pudo consultar la factura. Verifica tu conexión o intenta más tarde.');
      throw new Error('No se pudo consultar la factura.');
    }
    return result;
  }, []);

  // Evita registrar la misma factura dos veces en cualquier lote local
  const facturaYaEnAlgunLote = useCallback((factNum) => {
    return lotes.some((l) => l.facturas.some((f) => String(f.fact_num) === String(factNum)));
  }, [lotes]);

  const crearLote = useCallback(async () => {
    if (loteActual) {
      Alert.alert('Ya hay un lote abierto', 'Debes cerrarlo antes de crear uno nuevo.');
      return;
    }
    const nuevoLote = {
      localId: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      serverId: null,
      co_ven: currentUserCoVend || null,
      fecha_creacion: fechaHoraActual(),
      fecha_cierre: null,
      estado: 'abierto',
      facturas: [],
      enviado: false,
    };
    await guardarLotes([nuevoLote, ...lotes]);
  }, [loteActual, lotes, currentUserCoVend, guardarLotes]);

  const procesarFactura = useCallback(async (numFactura) => {
    if (!loteActual) {
      Alert.alert('Debes crear un lote primero.');
      return;
    }
    if (facturaYaEnAlgunLote(numFactura)) {
      Alert.alert('Esta factura ya fue registrada en un lote.');
      return;
    }
    setScanned(true);
    setLoading(true);
    setError(null);
    try {
      const result = await consultarFactura(numFactura);
      if (!result) {
        setTimeout(() => setScanned(false), 500);
        return;
      }
      setFacturaPreview(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loteActual, facturaYaEnAlgunLote, consultarFactura]);

  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanned || loading || facturaPreview) return;
    procesarFactura(data);
  }, [scanned, loading, facturaPreview, procesarFactura]);

  const consultarFacturaManual = useCallback(() => {
    if (!manualFactura.trim()) {
      Alert.alert('Debes ingresar un número de factura.');
      return;
    }
    procesarFactura(manualFactura.trim());
  }, [manualFactura, procesarFactura]);

  const cancelarPreview = useCallback(() => {
    setFacturaPreview(null);
    setError(null);
    setScanned(false);
    setManualFactura('');
  }, []);

  const confirmarAgregarFactura = useCallback(async () => {
    if (!loteActual || !facturaPreview) return;
    setLoading(true);
    const coords = await obtenerCoordenadas();
    if (!coords) {
      Alert.alert('No se pudo obtener la ubicación. No se puede agregar la factura al lote.');
      setLoading(false);
      return;
    }

    const entry = {
      fact_num: String(facturaPreview.fact_num),
      co_cli: facturaPreview.co_cli,
      cli_des: facturaPreview.cli_des,
      fecha_escaneo: fechaHoraActual(),
      coordenadas: coords,
    };

    const nuevos = lotes.map((l) =>
      l.localId === loteActual.localId ? { ...l, facturas: [...l.facturas, entry] } : l
    );
    await guardarLotes(nuevos);

    setLoading(false);
    cancelarPreview();
  }, [loteActual, facturaPreview, lotes, obtenerCoordenadas, guardarLotes, cancelarPreview]);

  const cerrarLote = useCallback(() => {
    if (!loteActual) return;
    if (loteActual.facturas.length === 0) {
      Alert.alert('El lote no tiene facturas', 'Escanea al menos una factura antes de cerrar el lote.');
      return;
    }
    Alert.alert(
      'Cerrar lote',
      `¿Cerrar el lote con ${loteActual.facturas.length} factura(s)? Ya no podrás agregar más facturas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar lote',
          style: 'destructive',
          onPress: async () => {
            const nuevos = lotes.map((l) =>
              l.localId === loteActual.localId
                ? { ...l, estado: 'cerrado', fecha_cierre: fechaHoraActual() }
                : l
            );
            await guardarLotes(nuevos);
          },
        },
      ]
    );
  }, [loteActual, lotes, guardarLotes]);

  const enviarLote = useCallback(async (lote) => {
    setEnviandoId(lote.localId);
    try {
      const payload = {
        co_ven: lote.co_ven,
        fecha_creacion: lote.fecha_creacion,
        fecha_cierre: lote.fecha_cierre,
        estado: lote.estado,
        facturas: lote.facturas.map((f) => ({
          fact_num: f.fact_num,
          co_cli: f.co_cli,
          fecha_escaneo: f.fecha_escaneo,
          coordenadas: f.coordenadas,
        })),
      };

      const response = await fetch(`${Config.API_BASE_URL}${API_ENDPOINTS.LOTES}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        Alert.alert('Error', 'No se pudo enviar el lote.');
        return;
      }
      const result = await response.json();

      const nuevos = lotes.map((l) =>
        l.localId === lote.localId ? { ...l, enviado: true, serverId: result.id } : l
      );
      await guardarLotes(nuevos);
      Alert.alert('Lote enviado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el lote. Verifica tu conexión.');
    } finally {
      setEnviandoId(null);
    }
  }, [lotes, guardarLotes]);

  const limpiarLotesEnviados = useCallback(() => {
    const enviados = lotes.filter((l) => l.enviado);
    if (enviados.length === 0) {
      Alert.alert('Sin registros', 'No hay lotes enviados para borrar.');
      return;
    }
    Alert.alert('Limpiar lotes enviados', `¿Eliminar ${enviados.length} lote(s) ya enviados?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const pendientes = lotes.filter((l) => !l.enviado);
          await guardarLotes(pendientes);
        },
      },
    ]);
  }, [lotes, guardarLotes]);

  if (!permission) {
    return <Text>Solicitando permiso de cámara...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={40} color={Theme.colors.muted} style={{ marginBottom: 12 }} />
        <Text style={styles.permissionText}>No se concedió acceso a la cámara.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Ionicons name="camera-outline" size={18} color={Theme.colors.white} />
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hayEnviados = lotes.some((l) => l.enviado);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Ionicons name="layers" size={22} color={Theme.colors.primary} />
          <Text style={styles.title}>Lotes de Facturas</Text>
        </View>
        <Text style={styles.subtitle}>
          Agrupa varias facturas escaneadas dentro de un mismo lote antes de enviarlas.
        </Text>

        {!loteActual ? (
          <>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="layers-outline" size={30} color={Theme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No tienes un lote abierto</Text>
              <Text style={styles.emptyText}>
                Crea un lote nuevo y luego escanea, una por una, las facturas que quieras
                agrupar dentro de él.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={crearLote} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={19} color={Theme.colors.white} />
                <Text style={styles.primaryButtonText}>Crear nuevo lote</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Resumen del lote abierto */}
            <View style={styles.loteSummaryCard}>
              <View style={styles.loteSummaryTop}>
                <Text style={styles.loteSummaryLabel}>Lote en progreso</Text>
                <EstadoBadge estado={loteActual.estado} enviado={loteActual.enviado} styles={styles} />
              </View>
              <View style={styles.loteSummaryBody}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={styles.loteSummaryCountNumber}>{loteActual.facturas.length}</Text>
                  <Text style={styles.loteSummaryCountLabel}>
                    {loteActual.facturas.length === 1 ? 'factura agregada' : 'facturas agregadas'}
                  </Text>
                </View>
                <Text style={styles.loteSummaryMeta}>
                  Desde {horaCorta(loteActual.fecha_creacion)}{'\n'}Vendedor: {loteActual.co_ven || 'N/D'}
                </Text>
              </View>
            </View>

            {/* Sección: escanear */}
            {!facturaPreview && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="scan-outline" size={16} color={Theme.colors.dark} />
                  <Text style={styles.sectionHeaderText}>Escanear factura</Text>
                </View>
                <Text style={styles.sectionHint}>
                  Apunta la cámara al código de barras de la factura.
                </Text>

                {isFocused && permission?.granted ? (
                  <View style={styles.cameraWrap}>
                    <CameraView
                      onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
                      style={styles.cameraFull}
                      facing="back"
                    />
                    <View style={styles.scanHintOverlay}>
                      <Text style={styles.scanHintText}>Buscando código de barras...</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.permissionInlineButton} onPress={requestPermission}>
                    <Ionicons name="camera-outline" size={28} color={Theme.colors.muted} />
                  </TouchableOpacity>
                )}

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o ingresa el número</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.manualInputRow}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="Número de factura"
                    placeholderTextColor={Theme.colors.light}
                    value={manualFactura}
                    onChangeText={setManualFactura}
                    keyboardType="numeric"
                    returnKeyType="done"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.consultButton}
                    onPress={consultarFacturaManual}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="search-outline" size={19} color={Theme.colors.white} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
                <Text style={styles.loadingText}>Consultando factura...</Text>
              </View>
            )}

            {facturaPreview && (
              <View style={[styles.previewCard, error && styles.previewErrorCard]}>
                <View style={styles.previewHeaderRow}>
                  <Ionicons
                    name={error ? 'alert-circle' : 'checkmark-circle'}
                    size={20}
                    color={error ? Theme.colors.error : Theme.colors.success}
                  />
                  <Text style={styles.previewHeaderText}>
                    {error ? 'No se pudo consultar' : 'Factura encontrada'}
                  </Text>
                </View>

                {error ? (
                  <Text style={styles.previewErrorText}>{error}</Text>
                ) : (
                  <>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Número</Text>
                      <Text style={styles.previewValue}>#{facturaPreview.fact_num}</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Cliente</Text>
                      <Text style={styles.previewValue}>{facturaPreview.co_cli}</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Descripción</Text>
                      <Text style={styles.previewValue} numberOfLines={2}>{facturaPreview.cli_des}</Text>
                    </View>
                  </>
                )}

                <View style={styles.previewActionsRow}>
                  {!error && (
                    <TouchableOpacity
                      style={styles.previewConfirmButton}
                      onPress={confirmarAgregarFactura}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={Theme.colors.white} />
                      <Text style={styles.previewButtonTextLight}>Agregar al lote</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.previewCancelButton}
                    onPress={cancelarPreview}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-outline" size={18} color={Theme.colors.dark} />
                    <Text style={styles.previewButtonTextDark}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Facturas ya agregadas */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="list-outline" size={16} color={Theme.colors.dark} />
              <Text style={styles.sectionHeaderText}>
                Facturas en este lote ({loteActual.facturas.length})
              </Text>
            </View>
            <View style={styles.facturasListBox}>
              {loteActual.facturas.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={30} color={Theme.colors.light} />
                  <Text style={styles.emptyStateText}>Aún no has escaneado facturas</Text>
                </View>
              ) : (
                <FlatList
                  data={[...loteActual.facturas].reverse()}
                  keyExtractor={(item) => item.fact_num}
                  scrollEnabled={loteActual.facturas.length > 5}
                  style={{ maxHeight: 260 }}
                  renderItem={({ item }) => (
                    <View style={styles.facturaRow}>
                      <View style={styles.facturaRowIcon}>
                        <Ionicons name="receipt-outline" size={16} color={Theme.colors.primary} />
                      </View>
                      <View style={styles.facturaRowBody}>
                        <Text style={styles.facturaRowTitle}>#{item.fact_num}</Text>
                        <Text style={styles.facturaRowSub} numberOfLines={1}>
                          {item.cli_des || item.co_cli}
                        </Text>
                      </View>
                      <Text style={styles.facturaRowTime}>{horaCorta(item.fecha_escaneo)}</Text>
                    </View>
                  )}
                />
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.closeLoteButton,
                loteActual.facturas.length === 0 && styles.closeLoteButtonDisabled,
              ]}
              onPress={cerrarLote}
              activeOpacity={0.85}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={loteActual.facturas.length === 0 ? Theme.colors.light : Theme.colors.white}
              />
              <Text
                style={[
                  styles.closeLoteButtonText,
                  loteActual.facturas.length === 0 && styles.closeLoteButtonTextDisabled,
                ]}
              >
                Cerrar lote
              </Text>
            </TouchableOpacity>
            {loteActual.facturas.length === 0 && (
              <Text style={styles.closeLoteHint}>Escanea al menos una factura para poder cerrar el lote.</Text>
            )}
          </>
        )}

        <View style={styles.secondaryButtonsRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Ionicons name="albums-outline" size={16} color={Theme.colors.dark} />
            <Text style={styles.secondaryButtonText}>Lotes guardados ({lotes.length})</Text>
          </TouchableOpacity>

          {hayEnviados && (
            <TouchableOpacity
              style={[styles.secondaryButton, styles.dangerOutlineButton]}
              onPress={limpiarLotesEnviados}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={16} color={Theme.colors.error} />
              <Text style={[styles.secondaryButtonText, styles.dangerOutlineText]}>Limpiar enviados</Text>
            </TouchableOpacity>
          )}
        </View>

        <LotesModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          lotes={lotes}
          onEnviar={enviarLote}
          enviandoId={enviandoId}
          styles={styles}
        />
      </View>
    </ScrollView>
  );
}
