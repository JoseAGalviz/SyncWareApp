import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  RefreshControl
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/FacturasScreen.styles';
import COLORS from '../constants/Colors';
import {
  obtenerFacturas,
  contarPendientes,
  encolarFactura,
  limpiarHistorialResuelto,
  sincronizarPendientes,
  iniciarAutoSync,
  hayConexion,
  consultarFactura,
} from '../services/facturasSync';

const ESTADO_LABEL = {
  pendiente: 'Pendiente de sincronizar',
  no_encontrada: 'Aún no disponible en el sistema — se reintentará',
  error: 'Error al sincronizar — se reintentará',
  duplicada: 'Ya estaba registrada (descartada)',
  sincronizada: 'Sincronizada',
};

// Motivo real de por qué el servidor NO modificó fec_venc, aunque el escaneo sí se sincronizó.
// Sin esto, "Vence: N/D" es indistinguible de una falla para el vendedor.
const MOTIVO_FECHA_LABEL = {
  fuera_de_rango: 'sin cambios — factura fuera de rango de días desde su emisión',
  sin_dias_credito: 'sin cambios — cliente sin días de crédito configurados',
};

// Componente para mostrar filas en el modal
const ModalRow = ({ label, value }) => (
  <View style={styles.modalRow}>
    <Text style={styles.modalRowLabel}>{label}:</Text>
    <Text style={styles.modalRowValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
  </View>
);

// Componente para ítem de factura en la lista
const FacturaItem = ({ factura }) => (
  <View style={styles.facturaItem}>
    <Text style={styles.facturaNumero}>#{factura.fact_num}</Text>
    {factura.cli_des ? (
      <Text style={styles.facturaDescripcion} numberOfLines={1} ellipsizeMode="tail">
        {factura.cli_des}
      </Text>
    ) : null}
    <Text style={styles.facturaDetalle}>
      Escaneada: {factura.fecha_escaneo ? new Date(factura.fecha_escaneo).toLocaleString() : 'N/D'}
    </Text>
    <Text style={styles.facturaDetalle}>
      Estado: {ESTADO_LABEL[factura.status] || factura.status}
    </Text>
    {factura.status === 'sincronizada' && (
      <Text style={styles.facturaDetalle}>
        Vence: {factura.fec_venc_despues || MOTIVO_FECHA_LABEL[factura.motivo_fecha_no_modificada] || 'N/D'}
      </Text>
    )}
    {factura.status === 'sincronizada' && factura.ultimoError && (
      <Text style={[styles.facturaDetalle, { color: COLORS.WARNING }]}>
        Aviso: {factura.ultimoError}
      </Text>
    )}
    {factura.status === 'error' && factura.ultimoError && (
      <Text style={[styles.facturaDetalle, { color: COLORS.ERROR }]}>
        {factura.ultimoError}
      </Text>
    )}
  </View>
);

// Modal de facturas guardadas con scroll adecuado
const FacturasModal = ({ visible, onClose, facturasLocales }) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Facturas guardadas ({facturasLocales.length})
          </Text>
          <View style={styles.modalDivider} />

          {facturasLocales.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No hay facturas guardadas</Text>
            </View>
          ) : (
            <View style={{ maxHeight: 300, marginBottom: 10 }}>
              <FlatList
                data={facturasLocales}
                renderItem={({ item }) => <FacturaItem factura={item} />}
                keyExtractor={(item) => item.id_local}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.facturasListContent}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={10}
                removeClippedSubviews={true}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.modalButton, styles.modalCloseButton]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.modalButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Cartel de confirmación del número leído. Editable — el usuario puede corregir
// antes de guardar (el escaneo/tipeo pueden fallar y esto es lo único que se
// puede validar sin conexión, ya que el resto lo resuelve el servidor).
const ConfirmarNumeroModal = ({ visible, valor, onChangeValor, onConfirmar, onCancelar }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Confirmar número de factura</Text>
        <View style={styles.modalDivider} />

        <Text style={styles.confirmSubtext}>¿Está seguro que el número de factura es?</Text>
        <Text style={styles.confirmBigNumber}>{valor}</Text>

        <Text style={styles.confirmSubtext}>Si no es correcto, corrígelo aquí:</Text>
        <TextInput
          style={styles.confirmInput}
          value={valor}
          onChangeText={onChangeValor}
          keyboardType="numeric"
          autoFocus={false}
          selectTextOnFocus
        />

        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={onConfirmar}
          activeOpacity={0.85}
        >
          <Text style={styles.modalButtonText}>Sí, es correcto — Guardar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.closeButton]}
          onPress={onCancelar}
          activeOpacity={0.85}
        >
          <Text style={styles.modalButtonText}>Volver a escanear</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Muestra los datos reales de la factura (consulta solo-lectura) para que el vendedor
// corrobore antes de guardar — se usa cuando hay conexión al momento de escanear.
const CorroborarFacturaModal = ({ visible, datos, onConfirmar, onCancelar }) => {
  if (!datos) return null;
  const fmtFecha = (v) => {
    if (!v) return 'N/D';
    try { return new Date(v).toLocaleDateString(); } catch { return v; }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Factura #{datos.fact_num}</Text>
          <View style={styles.modalDivider} />
          <ModalRow label="Cliente" value={datos.cli_des || 'N/D'} />
          <ModalRow label="Emisión" value={fmtFecha(datos.fec_emis)} />
          <ModalRow label="Vence actual" value={fmtFecha(datos.fec_venc_antes)} />
          <ModalRow label="Vence nuevo" value={datos.fec_venc_despues || 'N/D'} />
          <ModalRow label="Días crédito" value={datos.dias_credito ?? 'N/D'} />
          <ModalRow label="Zona" value={datos.zon_des || 'N/D'} />
          <ModalRow label="Segmento" value={datos.seg_des || 'N/D'} />
          {datos.estado_rango ? (
            <ModalRow label="Rango" value={datos.estado_rango} />
          ) : null}

          <Text style={styles.confirmSubtext}>¿Corresponde a la factura escaneada?</Text>

          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={onConfirmar}
            activeOpacity={0.85}
          >
            <Text style={styles.modalButtonText}>Sí, guardar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.closeButton]}
            onPress={onCancelar}
            activeOpacity={0.85}
          >
            <Text style={styles.modalButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Aviso grande de "sin conexión" — a propósito muy visible, para usuarios que
// no leen letra chica: confirma que la factura quedó guardada en el teléfono.
const AvisoOfflineModal = ({ visible, factNum, onCerrar }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
    <View style={styles.modalBackground}>
      <View style={[styles.modalContent, styles.offlineCard]}>
        <Text style={styles.offlineIcono}>📴</Text>
        <Text style={styles.offlineTitulo}>SIN CONEXIÓN</Text>
        <Text style={styles.offlineNumero}>Factura #{factNum}</Text>
        <Text style={styles.offlineTexto}>
          Se guardó en el teléfono. Se subirá sola cuando tengas wifi o datos.
        </Text>
        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={onCerrar}
          activeOpacity={0.85}
        >
          <Text style={styles.modalButtonText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Fila de resultado de sincronización — un ícono/color por tipo, solo se muestran
// las categorías con conteo > 0 (nada de ceros aburridos en pantalla).
const FilaResultado = ({ icono, color, etiqueta, cantidad }) => (
  <View style={styles.resultadoFila}>
    <Text style={styles.resultadoIcono}>{icono}</Text>
    <Text style={[styles.resultadoEtiqueta, { color }]}>{etiqueta}</Text>
    <Text style={[styles.resultadoCantidad, { color }]}>{cantidad}</Text>
  </View>
);

const ResultadoSyncModal = ({ visible, resumen, onCerrar }) => {
  if (!resumen) return null;
  const { ok, duplicadas, no_encontradas, errores, sinConexion, enviados } = resumen;
  const todoBien = enviados > 0 && ok === enviados;
  const sinPendientes = enviados === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.modalBackground}>
        <View style={[styles.modalContent, styles.syncCard]}>
          <Text style={styles.syncIconoGrande}>
            {sinPendientes ? '📭' : todoBien ? '✅' : '⚠️'}
          </Text>
          <Text style={styles.syncTitulo}>
            {sinPendientes ? 'Todo al día' : 'Sincronización completa'}
          </Text>

          {sinPendientes ? (
            <Text style={styles.syncTexto}>No había facturas pendientes por enviar.</Text>
          ) : (
            <View style={styles.resultadoLista}>
              {ok > 0 && (
                <FilaResultado icono="✅" color={COLORS.SUCCESS} etiqueta="Sincronizadas" cantidad={ok} />
              )}
              {duplicadas > 0 && (
                <FilaResultado icono="ℹ️" color={COLORS.INFO} etiqueta="Ya estaban registradas" cantidad={duplicadas} />
              )}
              {no_encontradas > 0 && (
                <FilaResultado icono="⏳" color={COLORS.WARNING} etiqueta="Aún no disponibles (se reintentan)" cantidad={no_encontradas} />
              )}
              {errores > 0 && (
                <FilaResultado icono="❌" color={COLORS.ERROR} etiqueta="Con error (se reintentan)" cantidad={errores} />
              )}
              {sinConexion > 0 && (
                <FilaResultado icono="📴" color={COLORS.MUTED} etiqueta="Sin conexión durante el envío" cantidad={sinConexion} />
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={onCerrar}
            activeOpacity={0.85}
          >
            <Text style={styles.modalButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function FacturasScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [manualFactura, setManualFactura] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [currentUserCoVend, setCurrentUserCoVend] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); // { valor } | null
  const [avisoOffline, setAvisoOffline] = useState(null); // { fact_num } | null
  const [resultadoSync, setResultadoSync] = useState(null); // resumen de sincronizarPendientes | null
  const [corroborar, setCorroborar] = useState(null); // { numero, datos } | null

  const isFocused = useIsFocused();
  const scanCooldown = useRef(false);

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
    Location.requestForegroundPermissionsAsync();
  }, []);

  const cargarRegistros = useCallback(async () => {
    const lista = await obtenerFacturas();
    setRegistros(lista);
  }, []);

  useEffect(() => {
    if (isFocused) cargarRegistros();
  }, [isFocused, cargarRegistros]);

  // Sync automático al recuperar conexión (wifi o datos)
  useEffect(() => {
    const unsubscribe = iniciarAutoSync((resumen) => {
      if (resumen.enviados > 0) {
        cargarRegistros();
      }
    });
    return unsubscribe;
  }, [cargarRegistros]);

  // Ubicación best-effort: nunca bloquea ni interrumpe el escaneo con alertas.
  const obtenerCoordenadas = useCallback(async () => {
    try {
      const lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation) {
        return `${lastLocation.coords.latitude},${lastLocation.coords.longitude}`;
      }
      const locationPromise = Location.getCurrentPositionAsync({});
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 4000));
      const location = await Promise.race([locationPromise, timeoutPromise]);
      return location ? `${location.coords.latitude},${location.coords.longitude}` : null;
    } catch {
      return null;
    }
  }, []);

  // Termina el ciclo de escaneo y reabre la cámara (se llama al confirmar o cancelar).
  const liberarEscaneo = useCallback(() => {
    scanCooldown.current = false;
    setScanned(false);
  }, []);

  const registrarEscaneo = useCallback(async (fact_num) => {
    const coords = await obtenerCoordenadas();
    const resultado = await encolarFactura({ fact_num, coordenadas: coords, co_ven: currentUserCoVend });

    if (!resultado.ok) {
      setAviso(`Factura ${fact_num} ya estaba en la lista.`);
      return;
    }

    await cargarRegistros();

    // Sin conexión: aviso grande e inmediato, ni se intenta sincronizar.
    if (!(await hayConexion())) {
      setAvisoOffline({ fact_num });
      return;
    }

    // Con conexión: intenta sincronizar ya mismo — mismo efecto "tiempo real" que antes.
    // Si falla igual (señal débil / timeout), se trata como offline: queda pendiente y se avisa.
    try {
      await sincronizarPendientes();
      const actualizados = await obtenerFacturas();
      setRegistros(actualizados);
      const item = actualizados.find(f => f.fact_num === String(fact_num));
      if (item?.status === 'sincronizada') {
        setAviso(`Factura ${fact_num} sincronizada. Cliente: ${item.cli_des || 'N/D'} — Vence: ${item.fec_venc_despues || 'N/D'}`);
      } else if (item?.status === 'duplicada') {
        setAviso(`Factura ${fact_num} ya estaba registrada en el servidor.`);
      } else if (item?.status === 'no_encontrada') {
        setAviso(`Factura ${fact_num} en cola: aún no disponible en el sistema, se reintentará.`);
      }
    } catch {
      setAvisoOffline({ fact_num });
    }
  }, [obtenerCoordenadas, currentUserCoVend, cargarRegistros]);

  // Escaneo de código de barras — abre confirmación, no guarda todavía.
  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setScanned(true);
    setConfirmacion({ valor: data });
  }, []);

  const abrirConfirmacionManual = useCallback(() => {
    const num = manualFactura.trim();
    if (!num) {
      Alert.alert('Debes ingresar un número de factura.');
      return;
    }
    scanCooldown.current = true;
    setScanned(true);
    setConfirmacion({ valor: num });
  }, [manualFactura]);

  const confirmarNumero = useCallback(async () => {
    const numero = (confirmacion?.valor || '').trim();
    setConfirmacion(null);
    setManualFactura('');
    if (!numero) {
      liberarEscaneo();
      return;
    }

    // Con conexión: corroborar datos reales antes de comprometer el escaneo (marca en Profit).
    // Cualquier falla que no sea "ya escaneada" cae al flujo normal — nunca se bloquea ni se
    // pierde el escaneo por un problema de la consulta previa.
    if (await hayConexion()) {
      try {
        const datos = await consultarFactura(numero);
        setCorroborar({ numero, datos });
        return; // espera decisión del usuario en el modal; no libera cámara todavía
      } catch (err) {
        if (err?.status === 400) {
          Alert.alert('Factura ya escaneada', err?.data?.error || 'Esta factura ya fue escaneada previamente.');
          liberarEscaneo();
          return;
        }
        if (err?.status === 404) {
          Alert.alert('Aún no disponible', 'La factura no se encontró todavía. Se guardó para reintentar automáticamente.');
        }
        // 500 / timeout / etc.: seguir al flujo normal (guardar y sincronizar como siempre).
      }
    }

    await registrarEscaneo(numero);
    liberarEscaneo();
  }, [confirmacion, registrarEscaneo, liberarEscaneo]);

  const confirmarCorroboracion = useCallback(async () => {
    const numero = corroborar?.numero;
    setCorroborar(null);
    if (numero) await registrarEscaneo(numero);
    liberarEscaneo();
  }, [corroborar, registrarEscaneo, liberarEscaneo]);

  const cancelarCorroboracion = useCallback(() => {
    setCorroborar(null);
    liberarEscaneo();
  }, [liberarEscaneo]);

  const cancelarConfirmacion = useCallback(() => {
    setConfirmacion(null);
    liberarEscaneo();
  }, [liberarEscaneo]);

  const sincronizarAhora = useCallback(async () => {
    setSincronizando(true);
    try {
      const r = await sincronizarPendientes();
      await cargarRegistros();
      setResultadoSync(r);
    } catch {
      Alert.alert('Error', 'No se pudo completar la sincronización.');
    } finally {
      setSincronizando(false);
    }
  }, [cargarRegistros]);

  const pendientesCount = contarPendientes(registros);

  if (!permission) {
    return <Text>Solicitando permiso de cámara...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>No se concedió acceso a la cámara.</Text>
        <TouchableOpacity style={styles.scanButton} onPress={requestPermission}>
          <Text style={styles.scanButtonText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Gestión de Facturas</Text>
      <Text style={styles.subtitle}>
        Escanea el código de barras de tu factura. Funciona sin conexión: se sincroniza sola al recuperar wifi o datos.
      </Text>

      <View style={styles.cameraContainer}>
        {isFocused && permission?.granted ? (
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.cameraBox}
            facing="back"
          />
        ) : (
          <TouchableOpacity style={styles.scanButton} onPress={requestPermission}>
            <Text style={styles.scanButtonText}>Permitir cámara</Text>
          </TouchableOpacity>
        )}
      </View>

      {aviso && (
        <View style={styles.facturaDataContainer}>
          <ModalRow label="Aviso" value={aviso} />
          <TouchableOpacity
            style={[styles.modalButton, styles.closeButton]}
            onPress={() => setAviso(null)}
            activeOpacity={0.85}
          >
            <Text style={styles.modalButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.tableButton}
          onPress={() => {
            if (!registros.length) {
              Alert.alert('Facturas guardadas', 'No hay facturas guardadas.');
              return;
            }
            setShowModal(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.tableButtonText}>
            Ver facturas guardadas ({registros.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tableButton, pendientesCount === 0 && { opacity: 0.5 }]}
          onPress={sincronizarAhora}
          disabled={sincronizando || pendientesCount === 0}
          activeOpacity={0.85}
        >
          {sincronizando ? (
            <ActivityIndicator size="small" color={COLORS.INFO} />
          ) : (
            <Text style={styles.tableButtonText}>
              Sincronizar ahora ({pendientesCount} pendientes)
            </Text>
          )}
        </TouchableOpacity>

        {registros.some(f => f.status === 'sincronizada' || f.status === 'duplicada') && (
          <TouchableOpacity
            style={[styles.tableButton, styles.cleanButton]}
            onPress={async () => {
              Alert.alert(
                'Limpiar historial',
                'Se eliminará el historial de facturas ya sincronizadas. Las pendientes de sincronizar se conservan.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Limpiar',
                    style: 'destructive',
                    onPress: async () => {
                      await limpiarHistorialResuelto();
                      await cargarRegistros();
                    }
                  }
                ]
              );
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.tableButtonText}>Limpiar historial</Text>
          </TouchableOpacity>
        )}
      </View>

      <FacturasModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        facturasLocales={registros}
      />

      <ConfirmarNumeroModal
        visible={!!confirmacion}
        valor={confirmacion?.valor || ''}
        onChangeValor={(v) => setConfirmacion({ valor: v })}
        onConfirmar={confirmarNumero}
        onCancelar={cancelarConfirmacion}
      />

      <CorroborarFacturaModal
        visible={!!corroborar}
        datos={corroborar?.datos}
        onConfirmar={confirmarCorroboracion}
        onCancelar={cancelarCorroboracion}
      />

      <AvisoOfflineModal
        visible={!!avisoOffline}
        factNum={avisoOffline?.fact_num}
        onCerrar={() => setAvisoOffline(null)}
      />

      <ResultadoSyncModal
        visible={!!resultadoSync}
        resumen={resultadoSync}
        onCerrar={() => setResultadoSync(null)}
      />

      <View style={styles.manualInputContainer}>
        <Text style={styles.manualInputLabel}>
          Ingresar factura manualmente
        </Text>
        <View style={styles.manualInputRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Número de factura"
            value={manualFactura}
            onChangeText={setManualFactura}
            keyboardType="numeric"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.consultButton}
            onPress={abrirConfirmacionManual}
            activeOpacity={0.85}
          >
            <Text style={styles.consultButtonText}>Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
