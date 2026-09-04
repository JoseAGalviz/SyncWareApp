import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  Linking,
  Platform,
  KeyboardAvoidingView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { showMessage } from "react-native-flash-message";
import COLORS from '../constants/Colors';
import styles from '../styles/VisitaScreen.styles';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';

const RADIO_OPTIONS = [
  { label: "Venta", value: "venta" },
  { label: "Cobranza", value: "cobranza" },
  { label: "Nuevo Cliente", value: "nuevo_cliente" },
];

const RADIO_TIPO_GESTION = [
  { label: "Concretada", value: "concretada", color: COLORS.SUCCESS },
  { label: "En Proceso", value: "en_proceso", color: COLORS.WARNING },
  { label: "Negativa", value: "negativa", color: "#FF3B30" },
];

const StorageKeys = {
  CLIENTES: "clientes",
  GESTIONES: "gestiones",
  USER_DATA: "userData"
};

const GestionTypes = {
  VENTA: "venta",
  COBRANZA: "cobranza",
  NUEVO_CLIENTE: "nuevo_cliente"
};

const Colors = {
  PRIMARY: COLORS.PRIMARY,
  SECONDARY: COLORS.SUCCESS,
  WARNING: COLORS.WARNING,
  ERROR: "#FF3B30",
  BACKGROUND: "#F8FAFC",
  TEXT: COLORS.SECONDARY,
  LIGHT_TEXT: COLORS.MUTED,
  WHITE: COLORS.WHITE,
  LIGHT_BACKGROUND: "#E3F6F2",
  DARK_YELLOW: "#FFC107"
};

// ===== COMPONENTES DE UI REUTILIZABLES =====
const RadioButton = ({ label, value, selected, onSelect, color }) => (
  <TouchableOpacity 
    style={styles.radioOption} 
    onPress={onSelect} 
    activeOpacity={0.7}
    accessibilityLabel={`Opción ${label}`}
    accessibilityState={{ checked: selected }}
  >
    <View style={[
      styles.radioCircle, 
      selected && (color ? { backgroundColor: color, borderColor: color } : styles.radioCircleSelected)
    ]} />
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
);

const InputWithIcon = ({ 
  iconName, 
  placeholder, 
  value, 
  onChangeText, 
  keyboardType = "default",
  editable = true,
  accessibilityLabel 
}) => (
  <View style={styles.inputIconRow}>
    <Ionicons name={iconName} size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
    <TextInput
      style={[styles.input, { flex: 1 }]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholderTextColor={Colors.LIGHT_TEXT}
      editable={editable}
      accessibilityLabel={accessibilityLabel}
    />
  </View>
);

const ActionButton = ({ onPress, text, backgroundColor = Colors.PRIMARY, disabled = false }) => (
  <TouchableOpacity
    style={[styles.actionButton, { backgroundColor }, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={text}
  >
    <Text style={styles.actionButtonText}>{text}</Text>
  </TouchableOpacity>
);

// ===== HOOKS PERSONALIZADOS =====
const useClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const filteredClientes = useMemo(() => {
    if (!search) return clientes;
    return clientes.filter(cliente =>
      // Soporta tanto gestiones como bitrix
      (cliente.cli_des || cliente.TITLE || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, clientes]);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      try {
        const localClientes = await AsyncStorage.getItem(StorageKeys.CLIENTES);
        const bitrixClientes = await AsyncStorage.getItem('clientes_bitrix');
        let parsedClientes = [];
        if (localClientes) {
          parsedClientes = JSON.parse(localClientes);
        }
        let parsedBitrix = [];
        if (bitrixClientes) {
          parsedBitrix = JSON.parse(bitrixClientes);
          // Normaliza los clientes bitrix para que tengan las mismas claves
          parsedBitrix = parsedBitrix.map(b => ({
            co_cli: b.ID,
            cli_des: b.TITLE,
            tipo: "bitrix"
          }));
        }
        setClientes([...parsedClientes, ...parsedBitrix]);
      } catch (error) {
        console.error("Error fetching clients:", error);
        setClientes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, []);

  return { clientes, loading, search, setSearch, filteredClientes };
};

const useGestiones = () => {
  const [gestiones, setGestiones] = useState([]);

  useEffect(() => {
    loadGestiones();
  }, []);

  const loadGestiones = async () => {
    try {
      const data = await AsyncStorage.getItem(StorageKeys.GESTIONES);
      if (data) {
        const gestionesOrdenadas = JSON.parse(data).sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        setGestiones(gestionesOrdenadas);
      }
    } catch (error) {
      console.error("Error loading gestiones:", error);
    }
  };

  const saveGestiones = async (newGestiones) => {
    try {
      await AsyncStorage.setItem(StorageKeys.GESTIONES, JSON.stringify(newGestiones));
      setGestiones(newGestiones);
    } catch (error) {
      console.error("Error saving gestiones:", error);
      throw new Error("No se pudieron guardar las gestiones");
    }
  };

  const addGestion = async (nuevaGestion) => {
    try {
      const todas = [...gestiones, nuevaGestion];
      await saveGestiones(todas); // Guarda el array completo en AsyncStorage
      return todas;
    } catch (error) {
      console.error("Error adding gestion:", error);
      throw error;
    }
  };

  const deleteGestion = async (id) => {
    try {
      const nuevas = gestiones.filter(g => g.id !== id);
      await saveGestiones(nuevas);
    } catch (error) {
      console.error("Error deleting gestion:", error);
      throw error;
    }
  };

  const deleteGestionesEnviadas = async () => {
    try {
      const nuevas = gestiones.filter(g => !g.enviada);
      await saveGestiones(nuevas);
    } catch (error) {
      console.error("Error deleting sent gestiones:", error);
      throw error;
    }
  };

  return {
    gestiones,
    addGestion,
    deleteGestion,
    deleteGestionesEnviadas,
    loadGestiones
  };
};

// ===== UTILIDADES =====
// La ubicación es metadata opcional de la gestión (ver `ubicacion: location ? {...} : null`
// más abajo) — nunca debe bloquear el guardado. Por eso acá solo se intenta obtenerla
// con un timeout corto y, si falla por cualquier razón (GPS lento, sin señal, servicios
// de ubicación apagados), se devuelve null en silencio en vez de tirar un Alert que
// interrumpe al vendedor con el formulario ya lleno.
const obtenerUbicacion = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      // Único caso accionable: el vendedor puede ir a Configuración y arreglarlo.
      // GPS lento/apagado o timeout no lo son — por eso esos casos fallan en silencio.
      Alert.alert(
        "Permiso de ubicación requerido",
        "Puedes otorgar el permiso desde Configuración para que la gestión incluya ubicación. La gestión se guardará igual sin ella.",
        [
          {
            text: "Ir a configuración",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
          { text: "Ahora no", style: "cancel" },
        ]
      );
      return null;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) return null;

    const last = await Location.getLastKnownPositionAsync();
    if (last) return last;

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Mejor balance entre precisión y consumo
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 7000));
    return await Promise.race([locationPromise, timeoutPromise]);
  } catch (error) {
    return null;
  }
};

// ===== COMPONENTE PRINCIPAL =====
export default function VisitaScreen() {
  const { clientes, loading, search, setSearch, filteredClientes } = useClientes();
  const { gestiones, addGestion, deleteGestion, deleteGestionesEnviadas, loadGestiones } = useGestiones();
  
  const [selectedCliente, setSelectedCliente] = useState("");
  const [gestionTypes, setGestionTypes] = useState([]);
  const [tipoGestionVenta, setTipoGestionVenta] = useState("");
  const [tipoGestionCobranza, setTipoGestionCobranza] = useState("");
  const [descripcionVenta, setDescripcionVenta] = useState("");
  const [descripcionCobranza, setDescripcionCobranza] = useState("");
  const [showGestionForm, setShowGestionForm] = useState(false);
  const [nuevoNombreFarmacia, setNuevoNombreFarmacia] = useState("");
  const [nuevoResponsable, setNuevoResponsable] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoCodigoSim, setNuevoCodigoSim] = useState("");
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [gestionSeleccionada, setGestionSeleccionada] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-sync silencioso de gestiones pendientes: dispara solo al recuperar señal
  // (evento de NetInfo, no polling) y solo si hay pendientes — mismo patrón que
  // iniciarAutoSync en facturasSyncQueue.js. Sin esto, una gestión quedaba local hasta
  // que el vendedor se acordara de presionar "Cargar" a mano; si la app se
  // reinstalaba/actualizaba antes de eso, se perdía sin haber llegado al servidor.
  const gestionesRef = useRef(gestiones);
  useEffect(() => { gestionesRef.current = gestiones; }, [gestiones]);
  const loadGestionesRef = useRef(loadGestiones);
  useEffect(() => { loadGestionesRef.current = loadGestiones; });

  useEffect(() => {
    let sincronizando = false;
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (sincronizando) return;
      if (!state.isConnected || state.isInternetReachable === false) return;

      const pendientes = gestionesRef.current.filter(g => !g.enviada);
      if (pendientes.length === 0) return;

      sincronizando = true;
      try {
        const userDataStr = await AsyncStorage.getItem(StorageKeys.USER_DATA);
        const usuario = userDataStr ? JSON.parse(userDataStr) : null;
        const data = await api.post(API_ENDPOINTS.GESTIONES, { usuario, gestiones: pendientes });
        if (data && typeof data.insertadas === "number") {
          const actualizadas = gestionesRef.current.map(g =>
            pendientes.some(p => p.id === g.id) ? { ...g, enviada: true } : g
          );
          await AsyncStorage.setItem(StorageKeys.GESTIONES, JSON.stringify(actualizadas));
          await loadGestionesRef.current();
          console.log(`[gestiones] auto-sync: ${data.insertadas} insertada(s), ${data.omitidas} omitida(s).`);
        }
      } catch (error) {
        // Silencioso a propósito: es un intento en segundo plano al reconectar.
        // Si falla, las gestiones quedan pendientes y el botón manual sigue disponible.
        console.error("[gestiones] auto-sync falló (se reintenta en la próxima reconexión):", error);
      } finally {
        sincronizando = false;
      }
    });
    return () => unsubscribe();
  }, []);

  const limpiarFormulario = useCallback(() => {
    setSelectedCliente("");
    setGestionTypes([]);
    setTipoGestionVenta("");
    setTipoGestionCobranza("");
    setDescripcionVenta("");
    setDescripcionCobranza("");
    setSearch("");
    setNuevoNombreFarmacia("");
    setNuevoResponsable("");
    setNuevoTelefono("");
    setNuevoCodigoSim("");
  }, []);

  const handleToggleGestionType = useCallback((type) => {
    setGestionTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(v => v !== type);
      }

      // Lógica para combinaciones válidas
      if (type === GestionTypes.NUEVO_CLIENTE) {
        if (prev.includes(GestionTypes.VENTA)) return [GestionTypes.VENTA, GestionTypes.NUEVO_CLIENTE];
        return [GestionTypes.NUEVO_CLIENTE];
      }
      
      if (type === GestionTypes.VENTA) {
        if (prev.includes(GestionTypes.NUEVO_CLIENTE)) return [GestionTypes.VENTA, GestionTypes.NUEVO_CLIENTE];
        if (prev.includes(GestionTypes.COBRANZA)) return [GestionTypes.VENTA, GestionTypes.COBRANZA];
        return [GestionTypes.VENTA];
      }
      
      if (type === GestionTypes.COBRANZA) {
        if (prev.includes(GestionTypes.VENTA)) return [GestionTypes.VENTA, GestionTypes.COBRANZA];
        return [GestionTypes.COBRANZA];
      }
      
      return [type];
    });
  }, []);

  const validarFormulario = useCallback(() => {
    if ((!selectedCliente && !gestionTypes.includes(GestionTypes.NUEVO_CLIENTE)) || gestionTypes.length === 0) {
      Alert.alert("Debes seleccionar un cliente o marcar 'Nuevo Cliente'.");
      return false;
    }

    if (gestionTypes.includes(GestionTypes.VENTA) && !tipoGestionVenta) {
      Alert.alert("Debes seleccionar el estado de la gestión de Venta.");
      return false;
    }

    if (gestionTypes.includes(GestionTypes.VENTA) && !descripcionVenta.trim()) {
      Alert.alert("Debes ingresar la descripción de la Venta.");
      return false;
    }

    if (gestionTypes.includes(GestionTypes.COBRANZA) && !tipoGestionCobranza) {
      Alert.alert("Debes seleccionar el estado de la gestión de Cobranza.");
      return false;
    }

    return true;
  }, [selectedCliente, gestionTypes, tipoGestionVenta, descripcionVenta, tipoGestionCobranza]);

  const handleAddGestion = useCallback(async () => {
    if (!validarFormulario()) return;

    setIsSubmitting(true);

    try {
      // Mostrar mensaje de carga de ubicación
      showMessage({
        message: "Obteniendo ubicación...",
        type: "info",
        icon: "info",
        duration: 4000,
        backgroundColor: Colors.PRIMARY,
      });

      const location = await obtenerUbicacion();

      const clienteObj = clientes.find(c => c.co_cli === selectedCliente);

      const nuevaGestion = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        cliente: clienteObj ? clienteObj.cli_des : nuevoNombreFarmacia,
        co_cli: selectedCliente,
        tipos: [...gestionTypes],
        venta: gestionTypes.includes(GestionTypes.VENTA) ? {
          tipoGestion: tipoGestionVenta,
          descripcion: descripcionVenta,
        } : undefined,
        cobranza: gestionTypes.includes(GestionTypes.COBRANZA) ? {
          tipoGestion: tipoGestionCobranza,
          descripcion: descripcionCobranza,
        } : undefined,
        nuevo_cliente: gestionTypes.includes(GestionTypes.NUEVO_CLIENTE) ? {
          nombreFarmacia: nuevoNombreFarmacia,
          responsable: nuevoResponsable,
          telefono: nuevoTelefono,
          codigoSim: nuevoCodigoSim,
        } : undefined,
        fecha: new Date().toISOString(),
        ubicacion: location ? {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
        } : null,
      };

      await addGestion(nuevaGestion);

      showMessage({
        message: "Gestión guardada con éxito de manera local.",
        type: "success",
        icon: "success",
        duration: 2500,
        backgroundColor: Colors.SECONDARY,
      });

      limpiarFormulario();
      setShowGestionForm(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la gestión. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validarFormulario, clientes, selectedCliente, gestionTypes,
    tipoGestionVenta, descripcionVenta, tipoGestionCobranza,
    descripcionCobranza, nuevoNombreFarmacia, nuevoResponsable,
    nuevoTelefono, nuevoCodigoSim, addGestion, limpiarFormulario
  ]);

  const handleUploadGestiones = useCallback(async () => {
    if (gestiones.length === 0) {
      Alert.alert("No hay gestiones para cargar.");
      return;
    }

    // Filtrar solo gestiones no enviadas
    const gestionesPendientes = gestiones.filter(g => !g.enviada);
    
    if (gestionesPendientes.length === 0) {
      Alert.alert("Todas las gestiones ya han sido enviadas.");
      return;
    }

    try {
      const userData = await AsyncStorage.getItem(StorageKeys.USER_DATA);
      let usuario = userData ? JSON.parse(userData) : null;

      const payload = { usuario, gestiones: gestionesPendientes };

      const data = await api.post(API_ENDPOINTS.GESTIONES, payload);

      if (data && typeof data.insertadas === "number" && typeof data.omitidas === "number") {
        // Marcar gestiones como enviadas
        const gestionesActualizadas = gestiones.map(g =>
          gestionesPendientes.some(p => p.id === g.id) ? { ...g, enviada: true } : g
        );
        await AsyncStorage.setItem(StorageKeys.GESTIONES, JSON.stringify(gestionesActualizadas));
        await loadGestiones();

        let mensaje = "";
        if (data.insertadas > 0 && data.omitidas === 0) {
          mensaje = `¡${data.insertadas} gestiones insertadas exitosamente!`;
        } else if (data.insertadas > 0 && data.omitidas > 0) {
          mensaje = `¡${data.insertadas} gestiones nuevas insertadas!\n${data.omitidas} gestiones omitidas por estar repetidas.`;
        } else if (data.insertadas === 0 && data.omitidas > 0) {
          mensaje = `Todas las gestiones fueron omitidas (${data.omitidas}) porque ya existen en la base de datos.`;
        } else {
          mensaje = "No se procesaron gestiones.";
        }

        Alert.alert("Gestiones cargadas", mensaje, [{ text: "OK", style: "default" }]);
      } else {
        Alert.alert("Error", "No se pudo cargar la información.");
      }
    } catch (error) {
      console.error("Error al subir gestiones:", error); // <-- Agrega este log
      Alert.alert("Error", "Ocurrió un error al intentar cargar las gestiones.");
    }
  }, [gestiones]);

  const handleDeleteGestionesEnviadas = useCallback(async () => {
    try {
      await deleteGestionesEnviadas();
      Alert.alert("Registros enviados borrados.");
    } catch (error) {
      Alert.alert("Error", "No se pudieron borrar los registros enviados.");
    }
  }, [deleteGestionesEnviadas]);

  const renderGestionItem = useCallback(({ item }) => {
    const tipoGestionColor = (tipo) => {
      if (tipo === "en_proceso") return Colors.DARK_YELLOW;
      return RADIO_TIPO_GESTION.find(opt => opt.value === tipo)?.color || Colors.TEXT;
    };

    const tipoGestionLabel = (tipo) => {
      return RADIO_TIPO_GESTION.find(opt => opt.value === tipo)?.label || tipo;
    };

    return (
      <TouchableOpacity
        onPress={() => {
          setGestionSeleccionada(item);
          setShowDetalleModal(true);
        }}
        activeOpacity={0.8}
        accessibilityLabel={`Ver detalles de gestión para ${item.cliente}`}
      >
        <View
          style={[
            styles.gestionItem,
            item.enviada
              ? { borderColor: Colors.SECONDARY, backgroundColor: "#e9f7ef" } // <-- Fondo verde claro y borde verde
              : { borderColor: Colors.ERROR, backgroundColor: Colors.WHITE },
          ]}
        >
          <Text style={styles.gestionCliente}>{item.cliente}</Text>
          
          {item.tipos && item.tipos.length > 0 && (
            <Text style={styles.gestionInfo}>
              <Text style={{ fontWeight: "bold" }}>Tipo(s): </Text>
              {item.tipos.map((tipo, idx) => {
                let label = "";
                if (tipo === GestionTypes.VENTA) label = "Venta";
                if (tipo === GestionTypes.COBRANZA) label = "Cobranza";
                if (tipo === GestionTypes.NUEVO_CLIENTE) label = "Nuevo Cliente";
                return (
                  <Text
                    key={tipo}
                    style={{ fontWeight: "bold", color: Colors.PRIMARY }}
                  >
                    {label}
                    {idx < item.tipos.length - 1 ? ", " : ""}
                  </Text>
                );
              })}
            </Text>
          )}
          
          {item.venta && (
            <>
              <Text style={styles.gestionInfo}>
                <Text style={{ fontWeight: "bold" }}>Gestión Venta: </Text>
                <Text style={{
                  fontWeight: "bold",
                  color: tipoGestionColor(item.venta.tipoGestion),
                }}>
                  {tipoGestionLabel(item.venta.tipoGestion)}
                </Text>
              </Text>
              <Text style={styles.gestionDesc}>{item.venta.descripcion}</Text>
            </>
          )}
          
          {item.cobranza && (
            <>
              <Text style={styles.gestionInfo}>
                <Text style={{ fontWeight: "bold" }}>Gestión Cobranza: </Text>
                <Text style={{
                  fontWeight: "bold",
                  color: tipoGestionColor(item.cobranza.tipoGestion),
                }}>
                  {tipoGestionLabel(item.cobranza.tipoGestion)}
                </Text>
              </Text>
              <Text style={styles.gestionDesc}>{item.cobranza.descripcion}</Text>
            </>
          )}
          
          {item.nuevo_cliente && (
            <>
              <Text style={styles.gestionInfo}>
                <Text style={{ fontWeight: "bold" }}>Nuevo Cliente</Text>
              </Text>
              <Text style={styles.gestionDesc}>
                <Text style={{ fontWeight: "bold" }}>Responsable: </Text>
                {item.nuevo_cliente.responsable}
                {"\n"}
                <Text style={{ fontWeight: "bold" }}>Teléfono: </Text>
                {item.nuevo_cliente.telefono}
                {"\n"}
                <Text style={{ fontWeight: "bold" }}>Código SIM: </Text>
                {item.nuevo_cliente.codigoSim}
              </Text>
            </>
          )}
          
          <Text style={styles.gestionFecha}>{new Date(item.fecha).toLocaleString()}</Text>
          
          {!item.enviada && (
            <ActionButton
              onPress={() => deleteGestion(item.id)}
              text="Borrar gestión local"
              backgroundColor={Colors.ERROR}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [deleteGestion]);

  const renderClienteItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.clienteItem,
        selectedCliente === item.co_cli && styles.clienteItemSelected,
      ]}
      onPress={() => {
        setSelectedCliente(item.co_cli);
        setSearch("");
      }}
      accessibilityLabel={`Seleccionar cliente ${item.cli_des}`}
    >
      <Text style={styles.clienteText}>
        {item.cli_des}{" "}
        <Text style={{ color: Colors.WARNING, fontWeight: "bold" }}>
          ({item.co_cli})
        </Text>
      </Text>
    </TouchableOpacity>
  ), [selectedCliente]);

  const clienteSeleccionado = useMemo(() => 
    clientes.find(c => c.co_cli === selectedCliente),
    [clientes, selectedCliente]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={gestiones}
        keyExtractor={item => item.id}
        style={styles.gestionesList}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={styles.headerSticky}>
            <Text style={styles.floatingTitle}>Gestión de Visitas</Text>
            <Text style={styles.floatingSubtitle}>Gestiones realizadas</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: Colors.LIGHT_TEXT, padding: 10 }}>
            No hay gestiones registradas
          </Text>
        }
        renderItem={renderGestionItem}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
      />

      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: Colors.PRIMARY }]}
          onPress={() => setShowGestionForm(true)}
          activeOpacity={0.8}
          accessibilityLabel="Añadir nueva gestión"
        >
          <Ionicons name="add" size={28} color={Colors.WHITE} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: Colors.SECONDARY }]}
          onPress={handleUploadGestiones}
          accessibilityLabel="Subir gestiones al servidor"
        >
          <Ionicons name="cloud-upload-outline" size={24} color={Colors.WHITE} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: COLORS.ERROR }]}
          onPress={handleDeleteGestionesEnviadas}
          activeOpacity={0.8}
          accessibilityLabel="Eliminar gestiones enviadas"
        >
          <Ionicons name="trash-outline" size={24} color={Colors.WHITE} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showGestionForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGestionForm(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          {/* KeyboardAvoidingView como contenedor principal */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", flex: 1, justifyContent: "center" }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
          >
            <View style={[styles.modalContent, { maxHeight: "90%" }]}>
              <Text style={styles.title}>Nueva Gestión</Text>
              
              <Text style={styles.label}>Buscar cliente</Text>
              <TextInput
                style={styles.input}
                placeholder="Escriba para buscar..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={Colors.LIGHT_TEXT}
                editable={!selectedCliente && !gestionTypes.includes(GestionTypes.NUEVO_CLIENTE)}
                accessibilityLabel="Buscar cliente"
                returnKeyType="done"
              />
              
              {search.length > 0 && !gestionTypes.includes(GestionTypes.NUEVO_CLIENTE) && (
                <View style={styles.pickerWrapper}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.SECONDARY} />
                  ) : (
                    <FlatList
                      data={filteredClientes}
                      keyExtractor={item => item.co_cli}
                      style={{ maxHeight: 150 }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={renderClienteItem}
                      ListEmptyComponent={
                        <Text style={{ color: Colors.LIGHT_TEXT, padding: 10 }}>
                          No hay clientes
                        </Text>
                      }
                      initialNumToRender={5}
                    />
                  )}
                </View>
              )}
              
              {/* ScrollView con flexGrow para evitar saltos */}
              <ScrollView
                contentContainerStyle={{ paddingBottom: 24, flexGrow: 1, minHeight: 350 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {selectedCliente && (
                  <Text style={styles.selectedClienteLabel}>
                    Cliente seleccionado:{" "}
                    <Text style={{ fontWeight: "bold" }}>
                      {clienteSeleccionado?.cli_des}
                    </Text>
                  </Text>
                )}

                <Text style={styles.label}>Tipo de gestión</Text>
                <View style={styles.radioGroup}>
                  {RADIO_OPTIONS.map(opt => (
                    <RadioButton
                      key={opt.value}
                      label={opt.label}
                      value={opt.value}
                      selected={gestionTypes.includes(opt.value)}
                      onSelect={() => handleToggleGestionType(opt.value)}
                    />
                  ))}
                </View>

                {gestionTypes.includes(GestionTypes.NUEVO_CLIENTE) && (
                  <>
                    <InputWithIcon
                      iconName="business-outline"
                      placeholder="Nombre de la farmacia"
                      value={nuevoNombreFarmacia}
                      onChangeText={setNuevoNombreFarmacia}
                      accessibilityLabel="Nombre de la farmacia"
                    />
                    
                    <InputWithIcon
                      iconName="person-outline"
                      placeholder="Responsable"
                      value={nuevoResponsable}
                      onChangeText={setNuevoResponsable}
                      accessibilityLabel="Responsable de la farmacia"
                    />
                    
                    <InputWithIcon
                      iconName="call-outline"
                      placeholder="Número de teléfono"
                      value={nuevoTelefono}
                      onChangeText={setNuevoTelefono}
                      keyboardType="phone-pad"
                      accessibilityLabel="Número de teléfono"
                    />
                    
                    <InputWithIcon
                      iconName="barcode-outline"
                      placeholder="Código SIM"
                      value={nuevoCodigoSim}
                      onChangeText={setNuevoCodigoSim}
                      accessibilityLabel="Código SIM"
                    />
                    
                    {gestionTypes.includes(GestionTypes.VENTA) && (
                      <>
                        <Text style={styles.label}>Estado de la gestión (Venta)</Text>
                        <View style={styles.radioGroup}>
                          {RADIO_TIPO_GESTION.map(opt => (
                            <RadioButton
                              key={"venta_" + opt.value}
                              label={opt.label}
                              value={opt.value}
                              selected={tipoGestionVenta === opt.value}
                              onSelect={() => setTipoGestionVenta(opt.value)}
                              color={opt.color}
                            />
                          ))}
                        </View>
                        <TextInput
                          style={[styles.input, styles.inputMultiline]}
                          placeholder="Descripción Venta"
                          value={descripcionVenta}
                          onChangeText={setDescripcionVenta}
                          multiline
                          placeholderTextColor={Colors.LIGHT_TEXT}
                          accessibilityLabel="Descripción de venta"
                        />
                      </>
                    )}
                  </>
                )}

                {!gestionTypes.includes(GestionTypes.NUEVO_CLIENTE) && (
                  <>
                    {gestionTypes.includes(GestionTypes.VENTA) && (
                      <>
                        <Text style={styles.label}>Estado de la gestión (Venta)</Text>
                        <View style={styles.radioGroup}>
                          {RADIO_TIPO_GESTION.map(opt => (
                            <RadioButton
                              key={"venta_" + opt.value}
                              label={opt.label}
                              value={opt.value}
                              selected={tipoGestionVenta === opt.value}
                              onSelect={() => setTipoGestionVenta(opt.value)}
                              color={opt.color}
                            />
                          ))}
                        </View>
                        <TextInput
                          style={[styles.input, styles.inputMultiline]}
                          placeholder="Descripción Venta"
                          value={descripcionVenta}
                          onChangeText={setDescripcionVenta}
                          multiline
                          placeholderTextColor={Colors.LIGHT_TEXT}
                          accessibilityLabel="Descripción de venta"
                        />
                      </>
                    )}
                    
                    {gestionTypes.includes(GestionTypes.COBRANZA) && (
                      <>
                        <Text style={styles.label}>Estado de la gestión (Cobranza)</Text>
                        <View style={styles.radioGroup}>
                          {RADIO_TIPO_GESTION.map(opt => (
                            <RadioButton
                              key={"cobranza_" + opt.value}
                              label={opt.label}
                              value={opt.value}
                              selected={tipoGestionCobranza === opt.value}
                              onSelect={() => setTipoGestionCobranza(opt.value)}
                              color={opt.color}
                            />
                          ))}
                        </View>
                        <TextInput
                          style={[styles.input, styles.inputMultiline]}
                          placeholder="Descripción Cobranza"
                          value={descripcionCobranza}
                          onChangeText={setDescripcionCobranza}
                          multiline
                          placeholderTextColor={Colors.LIGHT_TEXT}
                          accessibilityLabel="Descripción de cobranza"
                        />
                      </>
                    )}
                  </>
                )}

                <View style={styles.formButtonsRow}>
                  <ActionButton
                    onPress={handleAddGestion}
                    text={isSubmitting ? "Guardando..." : "Guardar gestión"}
                    backgroundColor={Colors.PRIMARY}
                    disabled={isSubmitting}
                  />
                  
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      limpiarFormulario();
                      setShowGestionForm(false);
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showDetalleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetalleModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.LIGHT_BG, borderColor: Colors.SECONDARY, borderWidth: 2 }]}>
            <Text style={[styles.title, { color: Colors.SECONDARY, marginBottom: 12 }]}>Detalle de Gestión</Text>
            
            {gestionSeleccionada && (
              <ScrollView>
                <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                  Cliente: <Text style={{ color: Colors.TEXT, fontWeight: "bold" }}>{gestionSeleccionada.cliente}</Text>
                </Text>
                
                <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                  Fecha: <Text style={{ color: Colors.TEXT }}>{new Date(gestionSeleccionada.fecha).toLocaleString()}</Text>
                </Text>
                
                <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                  Tipos: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.tipos?.join(", ")}</Text>
                </Text>
                
                {gestionSeleccionada.venta && (
                  <>
                    <Text style={[styles.label, { color: Colors.SECONDARY }]}>
                      Venta: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.venta.tipoGestion}</Text>
                    </Text>
                    <Text style={[styles.label, { color: Colors.SECONDARY }]}>
                      Descripción Venta: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.venta.descripcion}</Text>
                    </Text>
                  </>
                )}
                
                {gestionSeleccionada.cobranza && (
                  <>
                    <Text style={[styles.label, { color: Colors.WARNING }]}>
                      Cobranza: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.cobranza.tipoGestion}</Text>
                    </Text>
                    <Text style={[styles.label, { color: Colors.WARNING }]}>
                      Descripción Cobranza: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.cobranza.descripcion}</Text>
                    </Text>
                  </>
                )}
                
                {gestionSeleccionada.nuevo_cliente && (
                  <>
                    <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                      Nuevo Cliente: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.nuevo_cliente.nombreFarmacia}</Text>
                    </Text>
                    <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                      Responsable: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.nuevo_cliente.responsable}</Text>
                    </Text>
                    <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                      Teléfono: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.nuevo_cliente.telefono}</Text>
                    </Text>
                    <Text style={[styles.label, { color: Colors.PRIMARY }]}>
                      Código SIM: <Text style={{ color: Colors.TEXT }}>{gestionSeleccionada.nuevo_cliente.codigoSim}</Text>
                    </Text>
                  </>
                )}
                
                {gestionSeleccionada.ubicacion && (
                  <>
                    <Text style={[styles.label, { color: Colors.LIGHT_TEXT }]}>Ubicación:</Text>
                    <Text style={{ color: Colors.TEXT }}>Latitud: {gestionSeleccionada.ubicacion.lat.toFixed(6)}</Text>
                    <Text style={{ color: Colors.TEXT }}>Longitud: {gestionSeleccionada.ubicacion.lng.toFixed(6)}</Text>
                    <Text style={{ color: Colors.TEXT }}>Precisión: {gestionSeleccionada.ubicacion.accuracy != null ? `${gestionSeleccionada.ubicacion.accuracy.toFixed(2)} metros` : 'N/D'}</Text>
                  </>
                )}
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.detalleCloseButton}
              onPress={() => setShowDetalleModal(false)}
            >
              <Text style={styles.detalleCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== ESTILOS =====

