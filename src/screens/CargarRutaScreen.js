import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import GlobalColors from '../constants/Colors';
import styles from '../styles/CargarRutaScreen.styles';

// Constantes
const STORAGE_KEYS = {
  GUIAS_GUARDADAS: "guiasGuardadas",
  GUIAS_CARGADAS_VEHICULO: "guiasCargadasVehiculo",
  ESCANEOS_PREFIX: "escaneos_"
};

const COLORS = {
  primary: GlobalColors.PRIMARY,
  success: GlobalColors.SUCCESS,
  warning: GlobalColors.WARNING,
  error: GlobalColors.ERROR,
  info: GlobalColors.INFO,
  white: GlobalColors.WHITE,
  lightGray: GlobalColors.LIGHT_BG,
  gray: GlobalColors.MUTED,
  darkGray: GlobalColors.SECONDARY,
  border: GlobalColors.BORDER
};

const GUIA_MAX_AGE_MS = 21600000; // 6 horas
const SCREEN_BREAKPOINTS = {
  small: 480,
  medium: 768,
  large: 1024
};

// Utilidades
const transformarNumFactura = (num_factura) => {
  if (!num_factura) return num_factura;

  if (/^A\d{7}$/.test(num_factura)) {
    if (num_factura.startsWith("A2")) {
      return "7" + num_factura.slice(1);
    }
    return String(Number(num_factura.slice(1)));
  }

  if (/^B\d{7}$/.test(num_factura)) {
    const serie = num_factura.slice(1);
    if (serie < "0050000") {
      return "8" + serie;
    }
    return "5" + serie;
  }

  return num_factura;
};

const obtenerFechaHoraActual = () => {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString(),
    hora: ahora.toLocaleTimeString(),
    timestamp: ahora.getTime()
  };
};

// Hooks personalizados
const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();

  const isSmallScreen = width <= SCREEN_BREAKPOINTS.small;
  const isMediumScreen = width > SCREEN_BREAKPOINTS.small && width <= SCREEN_BREAKPOINTS.medium;
  const isLargeScreen = width > SCREEN_BREAKPOINTS.medium;

  return {
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    screenWidth: width,
    screenHeight: height
  };
};

const useGuiasStorage = () => {
  const [guiasGuardadas, setGuiasGuardadas] = useState([]);
  const [guiasCargadasVehiculo, setGuiasCargadasVehiculo] = useState([]);

  const cargarGuias = useCallback(async () => {
    try {
      const [guiasData, cargadasData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.GUIAS_GUARDADAS),
        AsyncStorage.getItem(STORAGE_KEYS.GUIAS_CARGADAS_VEHICULO)
      ]);

      let guias = guiasData ? JSON.parse(guiasData) : [];

      const ahora = Date.now();
      const guiasFiltradas = guias.filter(g =>
        g.timestampGuardado ? ahora - g.timestampGuardado < GUIA_MAX_AGE_MS : true
      );

      if (guiasFiltradas.length !== guias.length) {
        await AsyncStorage.setItem(STORAGE_KEYS.GUIAS_GUARDADAS, JSON.stringify(guiasFiltradas));
      }

      setGuiasGuardadas(guiasFiltradas);
      setGuiasCargadasVehiculo(cargadasData ? JSON.parse(cargadasData) : []);
    } catch (error) {
      console.error("Error cargando guías:", error);
      Alert.alert("Error", "No se pudieron cargar las guías");
    }
  }, []);

  const guardarGuiaCargada = useCallback(async (guia) => {
    try {
      const nuevasCargadas = [...guiasCargadasVehiculo, guia];
      await AsyncStorage.setItem(
        STORAGE_KEYS.GUIAS_CARGADAS_VEHICULO,
        JSON.stringify(nuevasCargadas)
      );
      setGuiasCargadasVehiculo(nuevasCargadas);
      return true;
    } catch (error) {
      console.error("Error guardando guía:", error);
      Alert.alert("Error", "No se pudo guardar la guía");
      return false;
    }
  }, [guiasCargadasVehiculo]);

  return {
    guiasGuardadas,
    guiasCargadasVehiculo,
    cargarGuias,
    guardarGuiaCargada
  };
};

const useEscaneos = (guiaSeleccionada) => {
  const [escaneos, setEscaneos] = useState({});

  const cargarEscaneos = useCallback(async () => {
    if (!guiaSeleccionada) return;

    try {
      const saved = await AsyncStorage.getItem(
        `${STORAGE_KEYS.ESCANEOS_PREFIX}${guiaSeleccionada.numeroCarga}`
      );
      setEscaneos(saved ? JSON.parse(saved) : {});
    } catch (error) {
      console.error("Error cargando escaneos:", error);
    }
  }, [guiaSeleccionada]);

  const guardarEscaneos = useCallback(async (nuevosEscaneos) => {
    if (!guiaSeleccionada) return;

    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.ESCANEOS_PREFIX}${guiaSeleccionada.numeroCarga}`,
        JSON.stringify(nuevosEscaneos)
      );
    } catch (error) {
      console.error("Error guardando escaneos:", error);
    }
  }, [guiaSeleccionada]);

  useEffect(() => {
    if (guiaSeleccionada) {
      cargarEscaneos();
    }
  }, [guiaSeleccionada, cargarEscaneos]);

  return {
    escaneos,
    setEscaneos,
    guardarEscaneos
  };
};

const useCameraScanner = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  return {
    permission,
    requestPermission,
    scanned,
    setScanned,
    loading,
    setLoading
  };
};

// Utilidades de escaneo
const useScanUtilities = (guiaSeleccionada, escaneos, setEscaneos, guardarEscaneos) => {
  const verificarScan = useCallback((valorOriginal) => {
    if (!valorOriginal || !guiaSeleccionada) return false;

    const valor = transformarNumFactura(valorOriginal.trim());
    let encontrado = false;
    let nuevoEscaneos = { ...escaneos };

    // Usamos un bucle for clásico para mejor rendimiento con break
    for (let idx = 0; idx < guiaSeleccionada.detalle.length; idx++) {
      const item = guiaSeleccionada.detalle[idx];

      // Verifica factura
      if (String(item.factura).trim() === valor) {
        if (!nuevoEscaneos[idx] || !nuevoEscaneos[idx].factura) {
          encontrado = true;
          nuevoEscaneos[idx] = {
            ...(nuevoEscaneos[idx] || {}),
            factura: true,
            nota: nuevoEscaneos[idx]?.nota || false,
          };
          break;
        }
      }

      // Verifica nota
      if (String(item.nota).trim() === valor) {
        if (!nuevoEscaneos[idx] || !nuevoEscaneos[idx].nota) {
          encontrado = true;
          nuevoEscaneos[idx] = {
            ...(nuevoEscaneos[idx] || {}),
            factura: nuevoEscaneos[idx]?.factura || false,
            nota: true,
          };
          break;
        }
      }
    }

    if (encontrado) {
      setEscaneos(nuevoEscaneos);
      guardarEscaneos(nuevoEscaneos);
    }

    return encontrado;
  }, [guiaSeleccionada, escaneos, setEscaneos, guardarEscaneos]);

  const esCodigoDuplicado = useCallback((valor) => {
    if (!guiaSeleccionada) return false;

    const valorTransformado = transformarNumFactura(valor.trim());

    for (let idx = 0; idx < guiaSeleccionada.detalle.length; idx++) {
      const item = guiaSeleccionada.detalle[idx];
      const escaneo = escaneos[idx] || {};

      if ((String(item.factura || "").trim() === valorTransformado && escaneo.factura) ||
        (String(item.nota || "").trim() === valorTransformado && escaneo.nota)) {
        return true;
      }
    }

    return false;
  }, [guiaSeleccionada, escaneos]);

  return {
    verificarScan,
    esCodigoDuplicado
  };
};

// Componentes
const GuiaItem = React.memo(({ guia, esProcesada, onSeleccionar, isSmallScreen }) => (
  <TouchableOpacity
    style={[
      styles.guiaItem,
      esProcesada && styles.guiaItemDeshabilitada,
      isSmallScreen && styles.guiaItemSmall
    ]}
    onPress={() => onSeleccionar(guia)}
    disabled={esProcesada}
  >
    <Text style={[styles.guiaItemTitle, isSmallScreen && styles.guiaItemTitleSmall]}>
      Guía #{guia.numeroCarga} — {guia.fechaGuardado} {guia.horaGuardado}
    </Text>
    <Text style={[styles.guiaItemDetail, isSmallScreen && styles.guiaItemDetailSmall]}>
      Pedidos: {guia.detalle ? guia.detalle.length : 0}
    </Text>
    {esProcesada && (
      <Text style={styles.guiaItemWarning}>
        Ya cargada en vehículo
      </Text>
    )}
  </TouchableOpacity>
));

const TableRow = React.memo(({ item, escaneo, index, isSmallScreen }) => {
  let rowStyle = index % 2 === 0 ? styles.rowEven : styles.rowOdd;
  if (escaneo.factura && escaneo.nota) rowStyle = styles.rowAmbos;
  else if (escaneo.factura || escaneo.nota) rowStyle = styles.rowUno;

  let textStyle = styles.tableCell;
  if (escaneo.factura && escaneo.nota) textStyle = styles.cellAmbos;
  else if (escaneo.factura) textStyle = styles.cellFactura;
  else if (escaneo.nota) textStyle = styles.cellNota;

  return (
    <View key={item._idx} style={[styles.tableRow, rowStyle, isSmallScreen && styles.tableRowSmall]}>
      <Text style={[textStyle, isSmallScreen && styles.tableCellSmall]}>
        {isSmallScreen ? `${item.factura}/${item.nota}` : `${item.factura} / ${item.nota}`}
      </Text>
      <Text style={[styles.tableCell, isSmallScreen && styles.tableCellSmall]}>
        {item.paquetes}
      </Text>
      {!isSmallScreen && (
        <Text style={[styles.tableCell, isSmallScreen && styles.tableCellSmall]}>
          {item.descrip?.trim()}
        </Text>
      )}
    </View>
  );
});

const TablaDetalle = React.memo(({ detalleOrdenado, escaneos, isSmallScreen }) => (
  <View style={[styles.table, isSmallScreen && styles.tableSmall]}>
    <View style={[styles.tableRowHeader, isSmallScreen && styles.tableRowHeaderSmall]}>
      <Text style={[styles.tableHeaderCell, isSmallScreen && styles.tableHeaderCellSmall]}>
        {isSmallScreen ? "Fact/Nota" : "Factura / N° Nota"}
      </Text>
      <Text style={[styles.tableHeaderCell, isSmallScreen && styles.tableHeaderCellSmall]}>
        Paq
      </Text>
      {!isSmallScreen && (
        <Text style={[styles.tableHeaderCell, isSmallScreen && styles.tableHeaderCellSmall]}>
          Descripción
        </Text>
      )}
    </View>
    {detalleOrdenado.map((item, idx) => (
      <TableRow
        key={item._idx}
        item={item}
        escaneo={escaneos[item._idx] || {}}
        index={idx}
        isSmallScreen={isSmallScreen}
      />
    ))}
  </View>
));

const ComentarioBox = React.memo(({
  detalleFaltantes,
  comentario,
  setComentario,
  onEnviarDatos,
  isSmallScreen
}) => (
  <View style={[styles.comentarioBox, isSmallScreen && styles.comentarioBoxSmall]}>
    {detalleFaltantes && (
      <ScrollView
        style={{ maxHeight: isSmallScreen ? 150 : 250 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontWeight: "bold", color: COLORS.error }}>
            Detalle de faltantes:
          </Text>
          <Text style={styles.detalleFaltantesText}>
            {detalleFaltantes}
          </Text>
        </View>
      </ScrollView>
    )}
    <Text style={{ fontWeight: "bold", marginBottom: 8, marginTop: 8 }}>
      {detalleFaltantes &&
        detalleFaltantes.trim() !== "Todos los pedidos/facturas están completos."
        ? "Motivo de faltante:"
        : "Descripción o comentario:"}
    </Text>
    <TextInput
      style={[styles.input, { marginBottom: 16 }, isSmallScreen && styles.inputSmall]}
      placeholder="Motivo"
      value={comentario}
      onChangeText={setComentario}
      multiline
      textAlignVertical="top"
    />
    <TouchableOpacity style={[styles.saveButton, isSmallScreen && styles.saveButtonSmall]} onPress={onEnviarDatos}>
      <Text style={[styles.saveButtonText, { color: COLORS.white }]}>
        Enviar datos
      </Text>
    </TouchableOpacity>
  </View>
));

const CameraComponent = React.memo(({
  permission,
  requestPermission,
  scanned,
  onBarCodeScanned,
  loading,
  isSmallScreen
}) => {
  if (!permission?.granted) {
    return (
      <View style={styles.centered}>
        <Text>No se concedió acceso a la cámara.</Text>
        <TouchableOpacity style={styles.cameraPermissionButton} onPress={requestPermission}>
          <Text style={styles.cameraPermissionButtonText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.cameraContainer, isSmallScreen && styles.cameraContainerSmall]}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : onBarCodeScanned}
        style={styles.camera}
      />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.info} />
          <Text>Procesando escaneo...</Text>
        </View>
      )}
    </View>
  );
});

// Componente para la vista de selección de guía
const GuiasList = React.memo(({ guiasGuardadas, esGuiaProcesada, onSeleccionarGuia, isSmallScreen }) => {
  if (guiasGuardadas.length === 0) {
    return <Text style={styles.emptyText}>No hay guías guardadas.</Text>;
  }

  return (
    <>
      {guiasGuardadas.map((guia, idx) => (
        <GuiaItem
          key={guia.numeroCarga || idx}
          guia={guia}
          esProcesada={esGuiaProcesada(guia.numeroCarga)}
          onSeleccionar={onSeleccionarGuia}
          isSmallScreen={isSmallScreen}
        />
      ))}
    </>
  );
});

// Componente principal
export default function CargarRutaScreen() {
  const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);
  const [notaScan, setNotaScan] = useState("");
  const [errorScan, setErrorScan] = useState("");
  const [detalleFaltantes, setDetalleFaltantes] = useState("");
  const [showComentario, setShowComentario] = useState(false);
  const [comentario, setComentario] = useState("");

  const {
    isSmallScreen,
    isMediumScreen,
    screenWidth
  } = useResponsiveLayout();

  const {
    guiasGuardadas,
    guiasCargadasVehiculo,
    cargarGuias,
    guardarGuiaCargada
  } = useGuiasStorage();

  const {
    escaneos,
    setEscaneos,
    guardarEscaneos
  } = useEscaneos(guiaSeleccionada);

  const {
    permission,
    requestPermission,
    scanned,
    setScanned,
    loading,
    setLoading
  } = useCameraScanner();

  const { verificarScan, esCodigoDuplicado } = useScanUtilities(
    guiaSeleccionada,
    escaneos,
    setEscaneos,
    guardarEscaneos
  );

  useFocusEffect(
    React.useCallback(() => {
      cargarGuias();
    }, [cargarGuias])
  );

  const esGuiaProcesada = useCallback((numeroCarga) => {
    return guiasCargadasVehiculo.some(g => g.numeroCarga === numeroCarga);
  }, [guiasCargadasVehiculo]);

  const seleccionarGuia = useCallback(async (guia) => {
    if (esGuiaProcesada(guia.numeroCarga)) {
      Alert.alert("Ya cargada", "Esta guía ya fue cargada en el vehículo.");
      return;
    }

    setGuiaSeleccionada(guia);
    setNotaScan("");
    setErrorScan("");
    setShowComentario(false);
    setComentario("");
    setDetalleFaltantes("");
    setScanned(false);
    setLoading(false);
  }, [esGuiaProcesada, setLoading]);

  const volver = useCallback(() => {
    setGuiaSeleccionada(null);
    setEscaneos({});
    setNotaScan("");
    setErrorScan("");
    setShowComentario(false);
    setComentario("");
    setDetalleFaltantes("");
    setScanned(false);
    setLoading(false);
  }, [setEscaneos, setLoading]);

  const handleVerificarScan = useCallback(() => {
    if (!notaScan.trim()) return;

    const encontrado = verificarScan(notaScan);

    if (encontrado) {
      setErrorScan("");
    } else {
      setErrorScan("No encontrado o ya escaneado.");
    }
    setNotaScan("");
  }, [notaScan, verificarScan]);

  const handleBarCodeScanned = useCallback(({ data }) => {
    const valorOriginal = data.trim();

    if (esCodigoDuplicado(valorOriginal)) {
      Alert.alert("Escaneo duplicado", "Este código ya fue registrado.");
      setScanned(true);
      setTimeout(() => setScanned(false), 1500);
      return;
    }

    setScanned(true);
    setLoading(true);
    setErrorScan("");

    const encontrado = verificarScan(valorOriginal);

    if (encontrado) {
      Alert.alert(
        "Escaneo exitoso",
        `Código ${valorOriginal} registrado correctamente.`
      );
    } else {
      setErrorScan("¡El valor no pertenece a ninguna factura o nota de esta guía!");
      Alert.alert(
        "Error de escaneo",
        "El valor no pertenece a ninguna factura o nota de esta guía."
      );
    }

    setNotaScan("");
    setLoading(false);
    setTimeout(() => setScanned(false), 1500);
  }, [verificarScan, esCodigoDuplicado, setScanned, setLoading]);

  const calcularFaltantes = useCallback((guia) => {
    if (!guia || !guia.detalle) return "";

    const faltantes = [];

    for (let idx = 0; idx < guia.detalle.length; idx++) {
      const item = guia.detalle[idx];
      const esc = escaneos[idx] || {};

      if (!esc.factura && !esc.nota) {
        faltantes.push(`Pedido ${item.factura || item.nota}: Sin escanear`);
      } else if (!esc.factura) {
        faltantes.push(`Pedido ${item.factura || item.nota}: Falta factura`);
      } else if (!esc.nota) {
        faltantes.push(`Pedido ${item.factura || item.nota}: Falta nota`);
      }
    }

    return faltantes.length > 0
      ? "Faltantes:\n" + faltantes.join("\n")
      : "Todos los pedidos/facturas están completos.";
  }, [escaneos]);

  const enviarDatos = useCallback(async () => {
    if (!guiaSeleccionada) return;

    const { escaneos: escaneosGuia, ...restoGuia } = guiaSeleccionada;
    const { fecha, hora, timestamp } = obtenerFechaHoraActual();

    const registro = {
      ...restoGuia,
      comentario,
      fechaGuardado: fecha,
      horaGuardado: hora,
      timestampGuardado: timestamp,
    };

    const success = await guardarGuiaCargada(registro);

    if (success) {
      Alert.alert("Éxito", "Guía cargada en el vehículo.");
      volver();
      cargarGuias();

      /* 
        // Comentado para permitir que el estado de los escaneos persista 
        // y no se borren los pedidos de la tabla al finalizar.
        await AsyncStorage.removeItem(
          `${STORAGE_KEYS.ESCANEOS_PREFIX}${guiaSeleccionada.numeroCarga}`
        );
      */
    }
  }, [guiaSeleccionada, comentario, guardarGuiaCargada, volver, cargarGuias]);

  const handleMostrarComentario = useCallback(() => {
    setDetalleFaltantes(calcularFaltantes(guiaSeleccionada));
    setShowComentario(true);
  }, [guiaSeleccionada, calcularFaltantes]);

  // Memoized values
  const detalleOrdenado = useMemo(() => {
    if (!guiaSeleccionada) return [];

    return [
      ...Object.keys(escaneos)
        .filter(idx => escaneos[idx]?.factura || escaneos[idx]?.nota)
        .reverse()
        .map(idx => ({
          ...guiaSeleccionada.detalle[idx],
          _idx: parseInt(idx),
        })),
      ...guiaSeleccionada.detalle
        .map((item, idx) => ({ ...item, _idx: idx }))
        .filter(item => !Object.keys(escaneos).includes(item._idx.toString())),
    ];
  }, [guiaSeleccionada, escaneos]);

  const todosVerificados = useMemo(() => {
    return guiaSeleccionada &&
      guiaSeleccionada.detalle.every((item, idx) => {
        const esc = escaneos[idx] || {};
        return esc.factura && esc.nota;
      });
  }, [guiaSeleccionada, escaneos]);

  if (guiaSeleccionada) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={volver}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
            Cargar Guía #{guiaSeleccionada.numeroCarga}
          </Text>

          <Text style={[styles.pedidosCount, isSmallScreen && styles.pedidosCountSmall]}>
            Cantidad de pedidos:{" "}
            <Text style={styles.pedidosCountNumber}>
              {guiaSeleccionada.detalle.length}
            </Text>
          </Text>

          {/* Cámara SIEMPRE visible mientras no esté mostrando comentario */}
          {!showComentario && (
            <CameraComponent
              permission={permission}
              requestPermission={requestPermission}
              scanned={scanned}
              onBarCodeScanned={handleBarCodeScanned}
              loading={loading}
              isSmallScreen={isSmallScreen}
            />
          )}

          {errorScan ? (
            <Text style={styles.errorText}>{errorScan}</Text>
          ) : null}

          {!showComentario && (
            <>
              <TextInput
                style={[styles.input, isSmallScreen && styles.inputSmall]}
                placeholder="Escanea o ingresa Factura o N° Nota"
                value={notaScan}
                onChangeText={setNotaScan}
                onSubmitEditing={handleVerificarScan}
                keyboardType="numeric"
                returnKeyType="done"
                editable={!showComentario}
              />

              <ScrollView
                style={{ width: "100%" }}
                keyboardShouldPersistTaps="handled"
              >
                <TablaDetalle
                  detalleOrdenado={detalleOrdenado}
                  escaneos={escaneos}
                  isSmallScreen={isSmallScreen}
                />
              </ScrollView>

              <Text style={[
                styles.statusText,
                { color: todosVerificados ? COLORS.success : COLORS.error }
              ]}>
                {todosVerificados
                  ? "¡Todos los pedidos/facturas han sido verificados!"
                  : "Faltan pedidos/facturas por verificar."}
              </Text>

              {todosVerificados && (
                <TouchableOpacity
                  style={[styles.saveButton, isSmallScreen && styles.saveButtonSmall]}
                  onPress={enviarDatos}
                >
                  <Text style={styles.saveButtonText}>
                    Guardar guía de carga
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {!showComentario && !todosVerificados && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: COLORS.warning }, isSmallScreen && styles.saveButtonSmall]}
              onPress={handleMostrarComentario}
            >
              <Text style={[styles.saveButtonText, { color: COLORS.darkGray }]}>
                Registrar guía incompleta
              </Text>
            </TouchableOpacity>
          )}

          {showComentario && (
            <ComentarioBox
              detalleFaltantes={detalleFaltantes}
              comentario={comentario}
              setComentario={setComentario}
              onEnviarDatos={enviarDatos}
              isSmallScreen={isSmallScreen}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Cargar Ruta</Text>

      <Text style={[styles.subtitle, isSmallScreen && styles.subtitleSmall]}>
        Guías guardadas
      </Text>

      <GuiasList
        guiasGuardadas={guiasGuardadas}
        esGuiaProcesada={esGuiaProcesada}
        onSeleccionarGuia={seleccionarGuia}
        isSmallScreen={isSmallScreen}
      />
    </View>
  );
}

