import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { showMessage } from "react-native-flash-message";
import styles from "../styles/DespachoScreen.styles";
import { API_ENDPOINTS } from "../constants/Config";
import { api } from "../services/api";
import { syncAllData } from "../services/syncAllData";
import Theme from "../constants/Theme";

const STORAGE_KEY = "despacho_reportes";
const USER_DATA_KEY = "userData";

const STATUS_OPTIONS = [
  { label: "Entregado", value: "Entregado", color: Theme.colors.success },
  { label: "No Entregado", value: "No Entregado", color: "#FF3B30" },
];

// ===== HOOKS =====
const useClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [search, setSearch] = useState("");

  const filteredClientes = useMemo(() => {
    if (!search) return clientes;
    return clientes.filter((c) =>
      (c.cli_des || c.TITLE || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, clientes]);

  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const local = await AsyncStorage.getItem("clientes");
      const bitrix = await AsyncStorage.getItem("clientes_bitrix");
      let parsed = local ? JSON.parse(local) : [];
      let parsedBitrix = bitrix
        ? JSON.parse(bitrix).map((b) => ({ co_cli: b.ID, cli_des: b.TITLE, tipo: "bitrix" }))
        : [];
      setClientes([...parsed, ...parsedBitrix]);
    } catch (e) {
      console.error("Error fetching clientes:", e);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loadingClientes, search, setSearch, filteredClientes, refetch: fetchClientes };
};

const useReportes = () => {
  const [reportes, setReportes] = useState([]);

  useEffect(() => {
    loadReportes();
  }, []);

  const loadReportes = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setReportes(
          JSON.parse(data).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        );
      }
    } catch (e) {
      console.error("Error loading reportes despacho:", e);
    }
  };

  const saveReportes = async (nuevos) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
    setReportes(nuevos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
  };

  const addReporte = async (reporte) => {
    const todos = [reporte, ...reportes];
    await saveReportes(todos);
  };

  const marcarEnviados = async (ids) => {
    const actualizados = reportes.map((r) =>
      ids.includes(r.id) ? { ...r, enviado: true } : r
    );
    await saveReportes(actualizados);
  };

  const limpiarEnviados = async () => {
    const pendientes = reportes.filter((r) => !r.enviado);
    await saveReportes(pendientes);
  };

  return { reportes, addReporte, marcarEnviados, limpiarEnviados, loadReportes };
};

// ===== UTILIDADES =====
const obtenerUbicacion = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso de ubicación requerido",
        "Debes otorgar permisos de ubicación para registrar un reporte.",
        [
          {
            text: "Ir a configuración",
            onPress: () => {
              Platform.OS === "ios"
                ? Linking.openURL("app-settings:")
                : Linking.openSettings();
            },
          },
          { text: "Cancelar", style: "cancel" },
        ]
      );
      return null;
    }
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    Alert.alert("Error", "No se pudo obtener la ubicación.");
    return null;
  }
};

// ===== COMPONENTE PRINCIPAL =====
export default function DespachoScreen() {
  const { clientes, loadingClientes, search, setSearch, filteredClientes, refetch } = useClientes();
  const { reportes, addReporte, marcarEnviados, limpiarEnviados } = useReportes();

  const [showForm, setShowForm] = useState(false);
  const [statusDespacho, setStatusDespacho] = useState("");
  const [comentario, setComentario] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncAllData();
      if (result.success) {
        await refetch();
        showMessage({
          message: "Clientes sincronizados correctamente.",
          type: "success",
          icon: "success",
          duration: 2500,
          backgroundColor: Theme.colors.success,
        });
      } else {
        Alert.alert("Error de sincronización", result.error || "Intenta nuevamente.");
      }
    } catch {
      Alert.alert("Error", "No se pudo sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  }, [refetch]);

  const handleUpload = useCallback(async () => {
    const pendientes = reportes.filter((r) => !r.enviado);
    if (pendientes.length === 0) {
      Alert.alert("Sin pendientes", "No hay reportes pendientes por enviar.");
      return;
    }

    setIsUploading(true);
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      const user = userData ? JSON.parse(userData) : null;

      let enviados = 0;
      let fallidos = 0;
      const idsEnviados = [];

      for (const reporte of pendientes) {
        try {
          const body = {
            usuario_id: user?.id,
            co_cli: reporte.co_cli ?? null,
            status_despacho: reporte.status_despacho,
            comentario: reporte.comentario,
            coordenadas: reporte.coordenadas,
          };
          console.log("📦 Enviando a reporteDespacho:", JSON.stringify(body, null, 2));
          await api.post(API_ENDPOINTS.REPORTE_DESPACHO, body);
          idsEnviados.push(reporte.id);
          enviados++;
        } catch {
          fallidos++;
        }
      }

      if (idsEnviados.length > 0) {
        await marcarEnviados(idsEnviados);
      }

      const msg = fallidos > 0
        ? `${enviados} enviados, ${fallidos} fallidos.`
        : `${enviados} reporte(s) enviado(s) exitosamente.`;

      Alert.alert("Resultado", msg);
    } catch {
      Alert.alert("Error", "No se pudo completar el envío.");
    } finally {
      setIsUploading(false);
    }
  }, [reportes, marcarEnviados]);

  const handleLimpiarEnviados = useCallback(() => {
    const enviados = reportes.filter((r) => r.enviado);
    if (enviados.length === 0) {
      Alert.alert("Sin registros", "No hay reportes enviados para borrar.");
      return;
    }
    Alert.alert(
      "Borrar enviados",
      `¿Eliminar ${enviados.length} reporte(s) ya enviados?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Borrar", style: "destructive", onPress: limpiarEnviados },
      ]
    );
  }, [reportes, limpiarEnviados]);

  const limpiarFormulario = useCallback(() => {
    setStatusDespacho("");
    setComentario("");
    setSelectedCliente(null);
    setSearch("");
  }, [setSearch]);

  const handleSubmit = useCallback(async () => {
    if (!statusDespacho) {
      Alert.alert("Campo requerido", "Selecciona el estatus de despacho.");
      return;
    }

    setIsSubmitting(true);

    try {
      showMessage({
        message: "Obteniendo ubicación...",
        type: "info",
        icon: "info",
        duration: 4000,
        backgroundColor: Theme.colors.primary,
      });

      const location = await obtenerUbicacion();
      if (!location) {
        setIsSubmitting(false);
        return;
      }

      const coordenadas = `${location.coords.latitude},${location.coords.longitude}`;

      const nuevoReporte = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        status_despacho: statusDespacho,
        comentario: comentario.trim(),
        coordenadas,
        cliente: selectedCliente ? selectedCliente.cli_des : null,
        co_cli: selectedCliente ? selectedCliente.co_cli : null,
        fecha: new Date().toISOString(),
        enviado: false,
      };

      await addReporte(nuevoReporte);

      showMessage({
        message: "Reporte guardado localmente.",
        type: "success",
        icon: "success",
        duration: 2500,
        backgroundColor: Theme.colors.success,
      });

      limpiarFormulario();
      setShowForm(false);
    } catch {
      Alert.alert("Error", "No se pudo guardar el reporte. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [statusDespacho, comentario, selectedCliente, addReporte, limpiarFormulario]);

  const renderReporteItem = useCallback(({ item }) => {
    const opcion = STATUS_OPTIONS.find((o) => o.value === item.status_despacho);
    const color = opcion?.color ?? Theme.colors.primary;
    const borderColor = item.enviado ? Theme.colors.success : "#FF3B30";

    return (
      <View style={[styles.reporteItem, { borderLeftColor: color, borderColor: borderColor, backgroundColor: item.enviado ? "#e9f7ef" : Theme.colors.surface }]}>
        {!!item.cliente && (
          <Text style={styles.reporteCliente}>{item.cliente}</Text>
        )}
        <Text style={[styles.reporteStatus, { color }]}>{item.status_despacho}</Text>
        {!!item.comentario && (
          <Text style={styles.reporteComentario}>{item.comentario}</Text>
        )}
        <Text style={styles.reporteCoordenadas}>
          <Ionicons name="location-outline" size={11} /> {item.coordenadas}
        </Text>
        <Text style={styles.reporteFecha}>
          {new Date(item.fecha).toLocaleString()}
        </Text>
      </View>
    );
  }, []);

  const renderClienteItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.clienteItem,
        selectedCliente?.co_cli === item.co_cli && styles.clienteItemSelected,
      ]}
      onPress={() => {
        setSelectedCliente(item);
        setSearch("");
      }}
    >
      <Text style={styles.clienteText}>
        {item.cli_des}{" "}
        <Text style={{ color: Theme.colors.warning, fontWeight: "bold" }}>
          ({item.co_cli})
        </Text>
      </Text>
    </TouchableOpacity>
  ), [selectedCliente, setSearch]);

  return (
    <View style={styles.container}>
      <FlatList
        data={reportes}
        keyExtractor={(item) => item.id.toString()}
        style={styles.reportesList}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={styles.headerSticky}>
            <Text style={styles.floatingTitle}>Reporte de Despacho</Text>
            <Text style={styles.floatingSubtitle}>Reportes registrados</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: Theme.colors.muted, padding: 16, textAlign: "center" }}>
            No hay reportes registrados
          </Text>
        }
        renderItem={renderReporteItem}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
      />

      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: "#FF3B30" }]}
          onPress={handleLimpiarEnviados}
          activeOpacity={0.8}
          accessibilityLabel="Borrar reportes enviados"
        >
          <Ionicons name="trash-outline" size={22} color={Theme.colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: Theme.colors.success }]}
          onPress={handleSync}
          disabled={isSyncing}
          activeOpacity={0.8}
          accessibilityLabel="Sincronizar clientes"
        >
          {isSyncing
            ? <ActivityIndicator size="small" color={Theme.colors.white} />
            : <Ionicons name="sync-outline" size={24} color={Theme.colors.white} />
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: Theme.colors.success }]}
          onPress={handleUpload}
          disabled={isUploading}
          activeOpacity={0.8}
          accessibilityLabel="Enviar reportes pendientes"
        >
          {isUploading
            ? <ActivityIndicator size="small" color={Theme.colors.white} />
            : <Ionicons name="cloud-upload-outline" size={24} color={Theme.colors.white} />
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roundButton, { backgroundColor: Theme.colors.primary }]}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
          accessibilityLabel="Nuevo reporte de despacho"
        >
          <Ionicons name="add" size={28} color={Theme.colors.white} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForm(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", flex: 1, justifyContent: "center" }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
          >
            <View style={[styles.modalContent, { maxHeight: "90%" }]}>
              <Text style={styles.title}>Nuevo Reporte</Text>

              <Text style={styles.label}>Buscar cliente</Text>
              <TextInput
                style={styles.input}
                placeholder="Escriba para buscar..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={Theme.colors.muted}
                editable={!selectedCliente}
                returnKeyType="done"
              />

              {search.length > 0 && !selectedCliente && (
                <View style={styles.pickerWrapper}>
                  {loadingClientes ? (
                    <ActivityIndicator size="small" color={Theme.colors.success} />
                  ) : (
                    <FlatList
                      data={filteredClientes}
                      keyExtractor={(item) => String(item.co_cli)}
                      style={{ maxHeight: 150 }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={renderClienteItem}
                      ListEmptyComponent={
                        <Text style={{ color: Theme.colors.muted, padding: 10 }}>
                          No hay clientes
                        </Text>
                      }
                      initialNumToRender={5}
                    />
                  )}
                </View>
              )}

              <ScrollView
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {selectedCliente && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Text style={styles.selectedClienteLabel}>
                      Cliente: <Text style={{ fontWeight: "bold" }}>{selectedCliente.cli_des}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedCliente(null)} style={{ marginLeft: 8 }}>
                      <Ionicons name="close-circle" size={18} color={Theme.colors.muted} />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.label}>Estatus de Despacho</Text>
                <View style={styles.selectRow}>
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = statusDespacho === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.selectOption,
                          selected && { borderColor: opt.color, backgroundColor: opt.color + "18" },
                        ]}
                        onPress={() => setStatusDespacho(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.selectOptionText, selected && { color: opt.color }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Comentario</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Ingresa un comentario..."
                  value={comentario}
                  onChangeText={setComentario}
                  multiline
                  placeholderTextColor={Theme.colors.muted}
                />

                <View style={styles.coordenadasInfo}>
                  <Ionicons name="location-outline" size={16} color={Theme.colors.muted} />
                  <Text style={styles.coordenadasText}>
                    Las coordenadas GPS se capturarán automáticamente al guardar.
                  </Text>
                </View>

                <View style={styles.formButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: Theme.colors.primary },
                      isSubmitting && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.actionButtonText}>
                      {isSubmitting ? "Guardando..." : "Guardar Reporte"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => { limpiarFormulario(); setShowForm(false); }}
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
    </View>
  );
}
