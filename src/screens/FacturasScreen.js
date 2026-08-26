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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/FacturasScreen.styles';
import COLORS from '../constants/Colors';
import { api } from '../services/api';
import { API_ENDPOINTS } from '../constants/Config';

// Consulta en vivo de solo lectura (no marca la factura ni escribe nada) — se usa para
// mostrarle al vendedor los datos reales antes de comprometer el escaneo.
const consultarFactura = (fact_num) => api.post(API_ENDPOINTS.FACTURAS_SCAN, { num_factura: String(fact_num) });

const ESTADO_LABEL = {
  no_encontrada: 'No se encontró en el sistema — volvé a intentar',
  error: 'Error al registrar — volvé a intentar',
  invalido: 'Número de factura inválido — corregir y volver a escanear',
  ambiguo: 'Número ambiguo (coincide con serie A y B) — reingresar con la letra o escanear',
  duplicada: 'Ya estaba registrada',
  sincronizada: 'Registrada',
};

// Motivo real de por qué el servidor NO modificó fec_venc, aunque el escaneo sí se sincronizó.
// Sin esto, "Vence: N/D" es indistinguible de una falla para el vendedor.
const MOTIVO_FECHA_LABEL = {
  fuera_de_rango: 'sin cambios — factura fuera de rango de días desde su emisión',
  sin_dias_credito: 'sin cambios — cliente sin días de crédito configurados',
  cliente_no_encontrado: 'sin cambios — cliente de la factura no encontrado en el sistema',
};

// Componente para mostrar filas en el modal
const ModalRow = ({ label, value }) => (
  <View style={styles.modalRow}>
    <Text style={styles.modalRowLabel}>{label}:</Text>
    <Text style={styles.modalRowValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
  </View>
);

// Componente para ítem de factura en la lista
const FacturaItem = React.memo(({ factura }) => (
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
    {(factura.status === 'error' || factura.status === 'invalido' || factura.status === 'ambiguo') && factura.ultimoError && (
      <Text style={[styles.facturaDetalle, { color: COLORS.ERROR }]}>
        {factura.ultimoError}
      </Text>
    )}
  </View>
));

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
// El número de factura real es letra (A/B) + 7 dígitos (ver transformarNumFactura en el
// server) — un valor que no matchea es casi siempre un mal escaneo, no un caso válido nuevo.
// FORMATO_SOLO_DIGITOS cubre la entrada manual: el campo "Ingresar factura manualmente"
// tiene teclado numérico (sin letras), así que ahí el vendedor solo puede escribir los
// dígitos — la letra la resuelve el server contra Profit (/facturas/scan, /facturas/batch-scan),
// nunca hace falta que el vendedor la sepa ni la tipee. Acepta de 1 a 7 dígitos (no exige el
// cero inicial) para que el vendedor tipee el número tal como lo ve impreso en la factura
// (ej. "392208" en vez de "0392208") — el server rellena con ceros antes de resolver
// (candidatosSinLetra, mismo contrato que SOLO_DIGITOS en helpers.js). 8 dígitos es el otro
// caso real: algunas facturas ya imprimen el fact_num interno directo (ej. "72150775", ver
// el chequeo factNumInt > 72000000 en facturas.controller.js) — sin letra que resolver, el
// server lo usa tal cual (transformarNumFactura lo deja pasar sin tocar cuando no matchea
// el patrón letra+7).
const FORMATO_CON_LETRA = /^[AB]\d{7}$/i;
const FORMATO_SOLO_DIGITOS = /^\d{1,8}$/;
const formatoFacturaValido = (valor) => FORMATO_CON_LETRA.test(valor) || FORMATO_SOLO_DIGITOS.test(valor);

const ConfirmarNumeroModal = ({ visible, valor, onChangeValor, onConfirmar, onCancelar }) => {
  const formatoInvalido = valor && !formatoFacturaValido(valor);
  return (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Confirmar número de factura</Text>
        <View style={styles.modalDivider} />

        <Text style={styles.confirmSubtext}>¿Está seguro que el número de factura es?</Text>
        <Text style={[styles.confirmBigNumber, formatoInvalido && { color: COLORS.ERROR }]}>{valor}</Text>
        {formatoInvalido && (
          <Text style={{ color: COLORS.ERROR, textAlign: 'center', marginBottom: 8 }}>
            Formato no reconocido — revisa antes de guardar (debería ser hasta 8 dígitos, con o sin la letra al inicio, ej. 392208, 72150775 o A0392208).
          </Text>
        )}

        <Text style={styles.confirmSubtext}>Si no es correcto, corrígelo aquí:</Text>
        <TextInput
          style={[styles.confirmInput, formatoInvalido && { borderColor: COLORS.ERROR }]}
          value={valor}
          onChangeText={onChangeValor}
          keyboardType="default"
          autoCapitalize="characters"
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
};

// Muestra los datos reales de la factura (consulta solo-lectura) para que el vendedor
// corrobore antes de guardar — se usa cuando hay conexión al momento de escanear.
const CorroborarFacturaModal = ({ visible, datos, onConfirmar, onCancelar }) => {
  if (!datos) return null;
  const fmtFecha = (v) => {
    if (!v) return 'N/D';
    try { return new Date(v).toLocaleDateString(); } catch { return v; }
  };
  const fmtMonto = (v) => {
    if (v == null) return 'N/D';
    const n = Number(v);
    return Number.isNaN(n) ? 'N/D' : n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Factura #{datos.fact_num}</Text>
          <View style={styles.modalDivider} />
          <Text style={styles.confirmSubtext}>Compará estos datos contra la factura física antes de guardar:</Text>
          <ModalRow label="Cliente" value={datos.cli_des || 'N/D'} />
          <ModalRow label="Código Cliente" value={datos.co_cli || 'N/D'} />
          <ModalRow label="Monto" value={fmtMonto(datos.saldo)} />
          <ModalRow label="Emisión" value={fmtFecha(datos.fec_emis)} />
          <ModalRow label="Vence actual" value={fmtFecha(datos.fec_venc_antes)} />
          <ModalRow label="Vence nuevo" value={datos.fec_venc_despues || 'N/D'} />
          <ModalRow label="Días crédito" value={datos.dias_credito ?? 'N/D'} />
          <ModalRow label="Zona" value={datos.zon_des || 'N/D'} />
          <ModalRow label="Segmento" value={datos.seg_des || 'N/D'} />
          {datos.estado_rango ? (
            <ModalRow label="Rango" value={datos.estado_rango} />
          ) : null}
          {datos.letra_resuelta ? (
            <ModalRow label="Número completo" value={datos.num_factura_completo} />
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

export default function FacturasScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [registros, setRegistros] = useState([]); // historial de la sesión (no persiste — cada intento va online)
  const [manualFactura, setManualFactura] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [currentUserCoVend, setCurrentUserCoVend] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); // { valor } | null
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

  // Registra el escaneo directo contra el servidor — un solo intento, sin cola ni reintento
  // automático. Si falla por conexión, se avisa claro y el vendedor vuelve a escanear.
  const registrarEscaneo = useCallback(async (fact_num) => {
    setEnviando(true);
    const coords = await obtenerCoordenadas();
    const id_local = `${fact_num}-${Date.now()}`;
    const fecha_escaneo = new Date().toISOString();
    try {
      const respuesta = await api.post(API_ENDPOINTS.FACTURAS_BATCH_SCAN, {
        items: [{ id_local, fact_num: String(fact_num), fecha_escaneo, coordenadas: coords }],
      });
      const r = respuesta?.resultados?.[0];
      const status = r?.status === 'ok' ? 'sincronizada' : (r?.status || 'error');
      const registro = {
        id_local,
        fact_num: String(fact_num),
        fecha_escaneo,
        status,
        ultimoError: r?.error || r?.advertencia || null,
        cli_des: r?.cli_des ?? null,
        fec_venc_despues: r?.fec_venc_actualizado ?? null,
        motivo_fecha_no_modificada: r?.motivo_fecha_no_modificada ?? null,
      };
      setRegistros(prev => [registro, ...prev]);

      if (status === 'sincronizada') {
        setAviso(`Factura ${fact_num} sincronizada. Cliente: ${registro.cli_des || 'N/D'} — Vence: ${registro.fec_venc_despues || 'N/D'}`);
      } else if (status === 'duplicada') {
        setAviso(`Factura ${fact_num} ya estaba registrada en el servidor.`);
      } else if (status === 'no_encontrada') {
        setAviso(`Factura ${fact_num} no se encontró en el sistema todavía. Intentá de nuevo en un momento.`);
      } else if (status === 'ambiguo') {
        Alert.alert('Número ambiguo', registro.ultimoError || `"${fact_num}" coincide con más de una factura. Escaneá el código de barras o escribí la letra (A o B) al inicio.`);
      } else {
        Alert.alert('No se pudo registrar', registro.ultimoError || 'La factura quedó marcada como error. Revisá e intentá de nuevo.');
      }
    } catch (err) {
      // Sin status = falla de red/timeout, no una respuesta real del servidor. Nada quedó
      // guardado — hay que decírselo claro al vendedor para que reintente el escaneo.
      Alert.alert('Sin conexión', 'No se pudo registrar la factura. Verificá tu conexión a internet e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }, [obtenerCoordenadas]);

  // Escaneo de código de barras — abre confirmación, no guarda todavía.
  // Espacios internos (ej. "A 392416") son casi siempre ruido del lector, nunca parte
  // real del número — se limpian antes de mostrarle el dato al vendedor.
  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setScanned(true);
    setConfirmacion({ valor: (data || '').replace(/\s+/g, '') });
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

    // Formato inválido: se corta acá, nunca se guarda ni se manda al server. Antes esto
    // solo mostraba un aviso en rojo pero dejaba seguir — si el vendedor no lo notaba,
    // el ítem terminaba en el historial marcado 'invalido' hasta que alguien lo borrara
    // a mano. Ahora directamente no se registra: alerta y vuelve a la cámara.
    if (!formatoFacturaValido(numero)) {
      Alert.alert(
        'Código no reconocido',
        `"${numero}" no tiene el formato de una factura (hasta 8 dígitos, con o sin la letra al inicio). Volvé a escanear.`
      );
      liberarEscaneo();
      return;
    }

    const sinLetra = FORMATO_SOLO_DIGITOS.test(numero);

    // Corroborar datos reales antes de comprometer el escaneo (marca en Profit) — siempre
    // requiere conexión, no hay flujo offline de respaldo. Si "numero" llegó sin letra
    // (entrada manual), el server prueba las series A y B contra Profit y devuelve cuál de
    // las dos es — de acá en adelante se usa esa versión completa (con letra).
    try {
      const datos = await consultarFactura(numero);
      const numeroResuelto = sinLetra && datos?.num_factura_completo ? datos.num_factura_completo : numero;
      setCorroborar({ numero: numeroResuelto, datos });
      return; // espera decisión del usuario en el modal; no libera cámara todavía
    } catch (err) {
      if (err?.status === 400) {
        Alert.alert('Factura ya escaneada', err?.data?.error || 'Esta factura ya fue escaneada previamente.');
        liberarEscaneo();
        return;
      }
      if (err?.status === 409) {
        // Ambiguo de verdad (calza con una factura en la serie A y otra en la B a la vez).
        // No se puede adivinar — el vendedor tiene que escanear el código de barras o
        // escribir el número completo con la letra en este mismo cartel.
        Alert.alert(
          'Número ambiguo',
          err?.data?.error || `"${numero}" coincide con más de una factura. Escaneá el código de barras o escribí la letra (A o B) al inicio del número.`
        );
        liberarEscaneo();
        return;
      }
      if (err?.status === 404) {
        // Puede ser lag de la réplica de lectura, no necesariamente que no exista — se
        // intenta igual el registro directo, que consulta la fuente autoritativa.
        await registrarEscaneo(numero);
        liberarEscaneo();
        return;
      }
      // Sin status = falla de red/timeout: no hay nada más que intentar sin conexión.
      Alert.alert('Sin conexión', 'No se pudo verificar la factura. Verificá tu conexión a internet e intentá de nuevo.');
      liberarEscaneo();
      return;
    }
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
        Escanea el código de barras de tu factura. Necesita conexión a internet — no se guarda nada sin confirmar contra el servidor.
      </Text>

      <View style={styles.cameraContainer}>
        {isFocused && permission?.granted ? (
          <CameraView
            onBarcodeScanned={scanned || enviando ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['code39'] }}
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

        {enviando && (
          <View style={[styles.tableButton, { opacity: 0.7 }]}>
            <ActivityIndicator size="small" color={COLORS.INFO} />
          </View>
        )}

        {registros.length > 0 && (
          <TouchableOpacity
            style={[styles.tableButton, styles.cleanButton]}
            onPress={() => {
              Alert.alert(
                'Limpiar historial',
                'Se eliminará el historial de facturas de esta sesión.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Limpiar', style: 'destructive', onPress: () => setRegistros([]) },
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

      <View style={styles.manualInputContainer}>
        <Text style={styles.manualInputLabel}>
          Ingresar factura manualmente
        </Text>
        <View style={styles.manualInputRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Número tal como aparece en la factura"
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
