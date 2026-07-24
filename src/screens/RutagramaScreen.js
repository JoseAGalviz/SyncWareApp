import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/RutagramaScreen.styles';
import COLORS from '../constants/Colors';
import { RutagramasService } from '../services/rutagramasService';

const ROLES_PERMITIDOS = ['vendedor', 'despachador', 'conductor'];
const STORAGE_KEY_RUTAGRAMA_ACTIVO = 'rutagramaActivo';

// Ubicación best-effort: nunca bloquea la creación del rutagrama por falta de GPS.
async function obtenerCoordenadas() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const last = await Location.getLastKnownPositionAsync();
    if (last) return `${last.coords.latitude},${last.coords.longitude}`;

    const locationPromise = Location.getCurrentPositionAsync({});
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 4000));
    const location = await Promise.race([locationPromise, timeoutPromise]);
    return location ? `${location.coords.latitude},${location.coords.longitude}` : null;
  } catch {
    return null;
  }
}

// El usuario no escribe nombre de ruta — se genera solo, a partir de fecha/hora.
function generarNombreRuta() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `Rutagrama ${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
}

const ESTATUS_LABEL = { abierto: 'ABIERTO', cerrado: 'CERRADO' };

// Mismo criterio que detectarTipoCodigo en rutagramas.controller.js (server): factura es
// letra A/B + 7 dígitos (antes de transformarNumFactura), nota/caja es solo números. Si no
// matchea ninguno, el server lo va a rechazar igual — mejor avisar acá antes de mandarlo.
const FORMATO_CODIGO_OK = /^([AB]\d{7}|\d+)$/;

const ConfirmarCodigoModal = ({ visible, valor, onChangeValor, onConfirmar, onCancelar }) => {
  const formatoInvalido = !!valor && !FORMATO_CODIGO_OK.test(valor);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.modalBackground}>
        <View style={styles.card}>
          <Text style={styles.listaTitulo}>Confirmar código escaneado</Text>
          <Text style={[styles.historialFecha, formatoInvalido && { color: COLORS.ERROR, fontWeight: '700' }]}>
            {valor}
          </Text>
          {formatoInvalido && (
            <Text style={{ color: COLORS.ERROR, textAlign: 'center', marginBottom: 8 }}>
              Formato no reconocido — revisá antes de guardar (factura: letra + 7 dígitos, nota: solo números).
            </Text>
          )}
          <Text style={styles.label}>Si no es correcto, corregilo aquí:</Text>
          <TextInput
            style={[styles.input, formatoInvalido && { borderColor: COLORS.ERROR }]}
            value={valor}
            onChangeText={onChangeValor}
            keyboardType="default"
            autoCapitalize="characters"
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.primaryButton} onPress={onConfirmar} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Sí, es correcto — Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finalizarButton} onPress={onCancelar} activeOpacity={0.85}>
            <Text style={styles.finalizarButtonText}>Volver a escanear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const HistorialItem = ({ item, onPress }) => {
  const cerrado = item.estatus === 'cerrado';
  return (
    <TouchableOpacity style={styles.historialItem} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.historialItemHeader}>
        <Text style={styles.historialRuta} numberOfLines={1}>{item.ruta}</Text>
        <View style={[styles.historialEstatusPill, cerrado ? styles.historialEstatusPillCerrado : styles.historialEstatusPillAbierto]}>
          <Text style={[styles.historialEstatusTexto, cerrado ? styles.historialEstatusTextoCerrado : styles.historialEstatusTextoAbierto]}>
            {ESTATUS_LABEL[item.estatus] || item.estatus}
          </Text>
        </View>
      </View>
      <Text style={styles.historialFecha}>
        Inicio: {item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleString() : 'N/D'}
      </Text>
      {item.fecha_cierre ? (
        <Text style={styles.historialFecha}>
          Cierre: {new Date(item.fecha_cierre).toLocaleString()}
        </Text>
      ) : null}
      {item.comentario ? (
        <Text style={styles.historialComentario} numberOfLines={2}>{item.comentario}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const EscaneoItem = ({ item }) => {
  const esFactura = item.tipo === 'factura';
  return (
    <View style={styles.escaneoItem}>
      <View style={[styles.escaneoTipoPill, esFactura ? styles.escaneoTipoPillFactura : styles.escaneoTipoPillNota]}>
        <Text style={[styles.escaneoTipoTexto, esFactura ? styles.escaneoTipoTextoFactura : styles.escaneoTipoTextoNota]}>
          {esFactura ? 'FACTURA' : 'ELEMENTO'}
        </Text>
      </View>
      <Text style={styles.escaneoCodigo}>{item.codigo}</Text>
      <Text style={styles.escaneoHora}>
        {item.fecha_escaneo ? new Date(item.fecha_escaneo).toLocaleTimeString() : ''}
      </Text>
    </View>
  );
};

export default function RutagramaScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [userData, setUserData] = useState(null);
  const [rutagrama, setRutagrama] = useState(null); // { id, ruta } | null
  const [escaneos, setEscaneos] = useState([]);
  const [creando, setCreando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false);
  const [comentarioFinal, setComentarioFinal] = useState('');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [detalleHistorial, setDetalleHistorial] = useState(null); // { ruta, estatus, comentario, escaneos } | null
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null); // { valor } | null

  const isFocused = useIsFocused();
  const scanCooldown = useRef(false);
  const codigosVistos = useRef(new Set());

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const data = JSON.parse(userDataStr);
          setUserData(data);
        }
      } catch (e) {
        console.error('Error cargando datos de usuario', e);
      }
    };
    loadUserData();
  }, []);

  // Recupera el rutagrama activo si la app se cerró/crasheó a mitad de un recorrido:
  // sin esto, `rutagrama` (solo useState) se perdía y el usuario podía arrancar otro
  // sin darse cuenta, dejando el anterior "abierto" huérfano en el server.
  useEffect(() => {
    const restaurarRutagramaActivo = async () => {
      try {
        const guardadoStr = await AsyncStorage.getItem(STORAGE_KEY_RUTAGRAMA_ACTIVO);
        if (!guardadoStr) return;
        const guardado = JSON.parse(guardadoStr);
        if (!guardado?.id) return;

        const detalle = await RutagramasService.obtener(guardado.id);
        if (detalle?.estatus !== 'abierto') {
          // Ya se cerró (desde otro dispositivo, o no se encontró) — nada que recuperar.
          await AsyncStorage.removeItem(STORAGE_KEY_RUTAGRAMA_ACTIVO);
          return;
        }

        const escaneosRestaurados = (detalle.escaneos || []).map(e => ({
          tipo: e.tipo,
          codigo: e.codigo,
          fecha_escaneo: e.fecha_escaneo,
        }));
        codigosVistos.current = new Set(escaneosRestaurados.map(e => e.codigo));
        setEscaneos(escaneosRestaurados);
        setRutagrama({ id: detalle.id, ruta: detalle.ruta });
      } catch (e) {
        // Sin conexión u otro error transitorio: se deja el rutagrama guardado para
        // reintentar la próxima vez que se abra la pantalla (no se pierde el dato local).
        console.error('No se pudo restaurar el rutagrama activo', e);
      }
    };
    restaurarRutagramaActivo();
  }, []);

  const iniciarRutagrama = useCallback(async () => {
    if (!userData?.id || !userData?.rol || !ROLES_PERMITIDOS.includes(userData.rol)) {
      Alert.alert('Error', 'No se pudo identificar tu usuario o rol. Vuelve a iniciar sesión.');
      return;
    }

    setCreando(true);
    try {
      const ruta = generarNombreRuta();
      const coordenadas = await obtenerCoordenadas();
      const nuevo = await RutagramasService.crear({
        ruta,
        usuario_id: userData.id,
        usuario_nombre: userData.nombre || null,
        rol: userData.rol,
        coordenadas,
      });
      setRutagrama({ id: nuevo.id, ruta });
      setEscaneos([]);
      codigosVistos.current = new Set();
      await AsyncStorage.setItem(STORAGE_KEY_RUTAGRAMA_ACTIVO, JSON.stringify({ id: nuevo.id, ruta }));
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo iniciar el rutagrama.';
      Alert.alert('Error', msg);
    } finally {
      setCreando(false);
    }
  }, [userData]);

  const registrarCodigo = useCallback(async (codigoRaw) => {
    const codigo = String(codigoRaw).trim();
    if (codigosVistos.current.has(codigo)) {
      Alert.alert('Código repetido', `"${codigo}" ya fue escaneado en este rutagrama.`);
      return;
    }

    try {
      const resultado = await RutagramasService.escanear(rutagrama.id, codigo);
      codigosVistos.current.add(codigo);
      setEscaneos(prev => [...prev, resultado]);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo registrar el código.';
      Alert.alert('Error al escanear', msg);
    }
  }, [rutagrama]);

  // Libera cámara/cooldown (se llama al confirmar o cancelar el modal).
  const liberarEscaneo = useCallback(() => {
    scanCooldown.current = false;
    setScanned(false);
  }, []);

  // Escaneo abre confirmación, no guarda todavía — mismo motivo que en FacturasScreen:
  // un mal escaneo (dígito corrido) antes se comprometía directo al server sin ninguna
  // chance de que el vendedor lo notara o corrigiera. Espacios internos se limpian solos.
  const handleBarCodeScanned = useCallback(({ data }) => {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setScanned(true);
    setConfirmacion({ valor: (data || '').replace(/\s+/g, '') });
  }, []);

  const confirmarCodigo = useCallback(async () => {
    const codigo = (confirmacion?.valor || '').trim();
    setConfirmacion(null);
    if (codigo) await registrarCodigo(codigo);
    liberarEscaneo();
  }, [confirmacion, registrarCodigo, liberarEscaneo]);

  const cancelarConfirmacion = useCallback(() => {
    setConfirmacion(null);
    liberarEscaneo();
  }, [liberarEscaneo]);

  const confirmarFinalizar = useCallback(async () => {
    setCerrando(true);
    try {
      await RutagramasService.cerrar(rutagrama.id, comentarioFinal.trim());
      setMostrarModalFinalizar(false);
      setRutagrama(null);
      setEscaneos([]);
      setComentarioFinal('');
      codigosVistos.current = new Set();
      await AsyncStorage.removeItem(STORAGE_KEY_RUTAGRAMA_ACTIVO);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo finalizar el rutagrama.';
      Alert.alert('Error', msg);
    } finally {
      setCerrando(false);
    }
  }, [rutagrama, comentarioFinal]);

  const abrirHistorial = useCallback(async () => {
    if (!userData?.id) {
      Alert.alert('Error', 'No se pudo identificar tu usuario.');
      return;
    }
    setMostrarHistorial(true);
    setCargandoHistorial(true);
    try {
      const lista = await RutagramasService.listarPropios(userData.id);
      setHistorial(Array.isArray(lista) ? lista : []);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo cargar el historial.';
      Alert.alert('Error', msg);
    } finally {
      setCargandoHistorial(false);
    }
  }, [userData]);

  const verDetalleHistorial = useCallback(async (item) => {
    setMostrarDetalle(true);
    setCargandoDetalle(true);
    try {
      const detalle = await RutagramasService.obtener(item.id);
      setDetalleHistorial(detalle);
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo cargar el detalle.';
      Alert.alert('Error', msg);
      setMostrarDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  const cerrarDetalleHistorial = useCallback(() => {
    setMostrarDetalle(false);
    setDetalleHistorial(null);
  }, []);

  const totalFacturas = escaneos.filter(e => e.tipo === 'factura').length;
  const totalNotas = escaneos.filter(e => e.tipo === 'nota').length;

  if (!permission) {
    return <Text>Solicitando permiso de cámara...</Text>;
  }

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
      <Text style={styles.title}>Rutagrama</Text>

      <TouchableOpacity style={styles.historialButton} onPress={abrirHistorial} activeOpacity={0.85}>
        <Text style={styles.historialButtonText}>Ver historial de rutagramas</Text>
      </TouchableOpacity>

      {!rutagrama ? (
        <>
          <Text style={styles.subtitle}>
            Iniciá un rutagrama para la mercancía que vas a llevar. Escaneá facturas y notas/cajas a medida que las cargues.
          </Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={iniciarRutagrama}
              disabled={creando}
              activeOpacity={0.85}
            >
              {creando ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar rutagrama</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.activeHeader}>
            <Text style={styles.activeRuta}>{rutagrama.ruta}</Text>
            <View style={styles.countersRow}>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Facturas</Text>
                <Text style={styles.counterValue}>{totalFacturas}</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Notas</Text>
                <Text style={styles.counterValue}>{totalNotas}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cameraContainer}>
            {isFocused ? (
              <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={styles.cameraBox}
                facing="back"
              />
            ) : null}
          </View>

          <Text style={styles.listaTitulo}>Escaneado en esta sesión ({escaneos.length})</Text>
          {escaneos.length === 0 ? (
            <Text style={styles.emptyListText}>Todavía no escaneaste nada.</Text>
          ) : (
            <FlatList
              data={[...escaneos].reverse()}
              keyExtractor={(item, index) => `${item.codigo}-${index}`}
              renderItem={({ item }) => <EscaneoItem item={item} />}
              scrollEnabled={false}
            />
          )}

          <TouchableOpacity
            style={styles.finalizarButton}
            onPress={() => setMostrarModalFinalizar(true)}
            disabled={cerrando}
            activeOpacity={0.85}
          >
            <Text style={styles.finalizarButtonText}>Finalizar rutagrama</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={mostrarModalFinalizar}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarModalFinalizar(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Finalizar rutagrama</Text>
            <Text style={styles.subtitle}>
              Se registraron {escaneos.length} código(s). Agregá un comentario si hace falta.
            </Text>
            <Text style={styles.label}>Comentario (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Observaciones del recorrido..."
              value={comentarioFinal}
              onChangeText={setComentarioFinal}
              multiline
            />
            <TouchableOpacity
              style={styles.finalizarButton}
              onPress={confirmarFinalizar}
              disabled={cerrando}
              activeOpacity={0.85}
            >
              {cerrando ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.finalizarButtonText}>Confirmar y finalizar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setMostrarModalFinalizar(false)}
              disabled={cerrando}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Volver a escanear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={mostrarHistorial}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarHistorial(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.historialModalContent}>
            <Text style={styles.listaTitulo}>Historial de rutagramas</Text>
            {cargandoHistorial ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginVertical: 20 }} />
            ) : historial.length === 0 ? (
              <Text style={styles.emptyListText}>No hay rutagramas registrados.</Text>
            ) : (
              <FlatList
                data={historial}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <HistorialItem item={item} onPress={verDetalleHistorial} />}
                style={{ flexGrow: 0, maxHeight: 380 }}
              />
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setMostrarHistorial(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={mostrarDetalle}
        transparent
        animationType="fade"
        onRequestClose={cerrarDetalleHistorial}
      >
        <View style={styles.modalBackground}>
          <View style={styles.historialModalContent}>
            {cargandoDetalle ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginVertical: 20 }} />
            ) : detalleHistorial ? (
              <>
                <Text style={styles.listaTitulo}>{detalleHistorial.ruta}</Text>
                <Text style={styles.historialFecha}>
                  Inicio: {detalleHistorial.fecha_creacion ? new Date(detalleHistorial.fecha_creacion).toLocaleString() : 'N/D'}
                </Text>
                {detalleHistorial.fecha_cierre ? (
                  <Text style={styles.historialFecha}>
                    Cierre: {new Date(detalleHistorial.fecha_cierre).toLocaleString()}
                  </Text>
                ) : null}
                {detalleHistorial.comentario ? (
                  <Text style={styles.historialComentario}>{detalleHistorial.comentario}</Text>
                ) : null}
                <Text style={[styles.listaTitulo, { marginTop: 12 }]}>
                  Escaneos ({(detalleHistorial.escaneos || []).length})
                </Text>
                {(detalleHistorial.escaneos || []).length === 0 ? (
                  <Text style={styles.emptyListText}>Sin escaneos.</Text>
                ) : (
                  <FlatList
                    data={detalleHistorial.escaneos}
                    keyExtractor={(item, index) => `${item.codigo}-${index}`}
                    renderItem={({ item }) => <EscaneoItem item={item} />}
                    style={{ flexGrow: 0, maxHeight: 300 }}
                  />
                )}
              </>
            ) : null}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={cerrarDetalleHistorial}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmarCodigoModal
        visible={!!confirmacion}
        valor={confirmacion?.valor || ''}
        onChangeValor={(v) => setConfirmacion({ valor: v })}
        onConfirmar={confirmarCodigo}
        onCancelar={cancelarConfirmacion}
      />
    </ScrollView>
  );
}
