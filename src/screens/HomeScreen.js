import React, { useLayoutEffect, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, Linking, Modal, TextInput, Platform, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllData } from '../services/syncAllData'; // Importa la función correctamente
import FlashMessage, { showMessage } from "react-native-flash-message";
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import COLORS from '../constants/Colors';
import styles from '../styles/HomeScreen.styles';
import { Config } from '../constants/Config';

// Constantes para evitar "magic strings"
const STORAGE_KEYS = {
  // USER_DATA: 'userData', // Ya no se necesita leer manualmente
  TOTALES: 'totales',
  CLIENTES: 'clientes'
};

const MESSAGES = {
  SYNC_SUCCESS: "¡Sincronización exitosa!",
  SYNC_ERROR: "Error al sincronizar",
  NO_DATA: "No se pudo obtener el resultado."
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [totalClientes, setTotalClientes] = useState(0);
  const [endpointResult, setEndpointResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [clientesState, setClientesState] = useState([]);

  // Estados para el modal de descuento
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('0');

  // Estados para KPI data
  const [kpiData, setKpiData] = useState(null);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ... (rest of the functions remain the same until handleCobranzaPreventiva)

  // Obtener totales desde AsyncStorage
  const obtenerTotales = useCallback(async () => {
    try {
      const totalesStr = await AsyncStorage.getItem(STORAGE_KEYS.TOTALES);

      if (!totalesStr) {
        setDefaultValues();
        return;
      }

      const data = JSON.parse(totalesStr);
      setTotalClientes(data.total_clientes || 0);
      setEndpointResult(data);
    } catch (error) {
      console.error('Error loading totals:', error);
      setDefaultValues();
    }
  }, []);

  // Establecer valores por defecto
  const setDefaultValues = useCallback(() => {
    setTotalClientes(0);
    setEndpointResult({ error: MESSAGES.NO_DATA });
  }, []);

  // Cargar clientes desde AsyncStorage
  const cargarClientes = useCallback(async () => {
    try {
      const clientesStr = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTES);
      const clientesArr = clientesStr ? JSON.parse(clientesStr) : [];
      setClientesState(clientesArr);
      setTotalClientes(clientesArr.length);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClientesState([]);
      setTotalClientes(0);
    }
  }, []);

  // Obtener KPI data desde el API
  const fetchKpiData = useCallback(async () => {
    if (!user || !user.co_ven) {
      console.log('No user or co_ven available');
      return;
    }

    setLoadingKpi(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const fechaInicio = `${year}-${month}-01`;
      const fechaFin = `${year}-${month}-${lastDay}`;
      const endpoint = `/api/auditoria/kpi-metas?co_ven=${user.co_ven}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      const response = await api.request(endpoint, { method: 'GET', timeout: 120000 });

      if (response && response.length > 0) {
        setKpiData(response[0]); // Asumiendo que viene un array con el primer elemento
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      showMessage({
        message: "Error al cargar KPIs",
        description: "No se pudieron cargar los indicadores de desempeño",
        type: "warning",
        duration: 2500,
      });
    } finally {
      setLoadingKpi(false);
    }
  }, [user]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Ejecutamos en paralelo la carga de datos locales y los KPIs
    await Promise.all([
      fetchKpiData(),
      obtenerTotales(),
      cargarClientes()
    ]);
    setRefreshing(false);
  }, [fetchKpiData, obtenerTotales, cargarClientes]);

  // Manejar la sincronización de datos
  const handleSync = useCallback(async () => {
    setSyncing(true);

    try {
      const result = await syncAllData();

      if (result.success) {
        showMessage({
          message: MESSAGES.SYNC_SUCCESS,
          type: "success",
          icon: "success",
          duration: 2500,
          backgroundColor: COLORS.SECONDARY,
        });
        await cargarClientes();
      } else {
        showMessage({
          message: MESSAGES.SYNC_ERROR,
          description: result.error,
          type: "danger",
          icon: "danger",
          duration: 3500,
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      showMessage({
        message: MESSAGES.SYNC_ERROR,
        description: "Error inesperado durante la sincronización",
        type: "danger",
        icon: "danger",
        duration: 3500,
      });
    } finally {
      setSyncing(false);
    }
  }, [cargarClientes]);

  // Abrir link de negociaciones (Redirección vía API GET)
  const handleOpenNegociaciones = useCallback(async () => {
    if (user && user.co_ven) {
      const url = `${Config.API_BASE_URL}/api/auth/redirect-fixed-ip?co_ven=${user.co_ven}`;
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showMessage({
            message: "Error de navegador",
            description: "No se puede abrir el enlace en este dispositivo.",
            type: "warning",
          });
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        showMessage({
          message: "Error",
          description: "No se pudo abrir la página de negociaciones.",
          type: "danger",
        });
      }
    } else {
      showMessage({
        message: "Código de vendedor no encontrado",
        description: "No se encontró el co_ven del usuario.",
        type: "danger",
      });
    }
  }, [user]);

  // Abrir link de Cartera de Clientes (Endpoint externo)
  const handleOpenCartera = useCallback(async () => {
    if (user && user.co_ven) {
      const url = `${Config.MAIL_BASE_URL}/vendedor?co_ven=${user.co_ven}`;
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showMessage({
            message: "Error de navegador",
            description: "No se puede abrir el enlace en este dispositivo.",
            type: "warning",
          });
        }
      } catch (error) {
        console.error('Error opening Cartera URL:', error);
        showMessage({
          message: "Error",
          description: "No se pudo abrir la página de Cartera de Clientes.",
          type: "danger",
        });
      }
    } else {
      showMessage({
        message: "Código de vendedor no encontrado",
        description: "No se encontró el co_ven del usuario.",
        type: "danger",
      });
    }
  }, [user]);

  // Manejar generación de PDF de Cobranza Preventiva
  const handleCobranzaPreventiva = useCallback(() => {
    if (!user || !user.co_ven) {
      showMessage({
        message: "Código de vendedor no encontrado",
        type: "danger",
      });
      return;
    }
    setShowDiscountModal(true);
  }, [user]);

  const confirmAndGenerate = async () => {
    setShowDiscountModal(false);
    setGeneratingPDF(true);
    try {
      const { generateCobranzaPDF } = require('../services/CobranzaPreventivaService');
      await generateCobranzaPDF(user, discountPercent);
      showMessage({
        message: "PDF generado correctamente",
        type: "success",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      showMessage({
        message: "Error al generar PDF",
        description: error.message,
        type: "danger",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Configurar el header de navegación
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
          accessibilityLabel="Abrir menú"
          accessibilityHint="Despliega el menú de navegación"
        >
          <Ionicons name="menu" size={30} color={COLORS.WHITE} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Efectos para cargar datos al montar el componente
  useEffect(() => {
    obtenerTotales();
    cargarClientes();
    fetchKpiData();
  }, [obtenerTotales, cargarClientes, fetchKpiData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        <View style={styles.container}>
          <Text style={styles.subtitle}>Hola, {user ? user.nombre : 'Usuario'}</Text>
          <Text style={styles.welcomeText}>Aquí tienes el resumen de tu actividad de hoy.</Text>

          <View style={styles.syncRow}>
            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleSync}
              disabled={syncing}
              accessibilityLabel="Sincronizar datos"
              accessibilityHint="Sincroniza los datos con el servidor"
            >
              {syncing ? (
                <ActivityIndicator size={18} color={COLORS.PRIMARY} style={styles.syncIcon} />
              ) : (
                <Ionicons name="refresh" size={18} color={COLORS.PRIMARY} style={styles.syncIcon} />
              )}
              <Text style={styles.syncButtonText}>
                {syncing ? 'Sincronizando...' : 'Sincronizar datos'}
              </Text>
            </TouchableOpacity>

            <View style={styles.clientesInfoBox} accessibilityLabel="Clientes asignados">
              <Text style={styles.infoTitle}>Clientes asignados</Text>
              <Text style={styles.infoNumber}>{totalClientes}</Text>
              <Text style={styles.infoSubtitle}>Total sincronizados</Text>
            </View>

          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.SUCCESS }]}
            onPress={handleOpenNegociaciones}
            accessibilityLabel="Ir a Mis Negociaciones"
            accessibilityHint="Abre el dashboard de mis negociaciones en el navegador"
          >
            <View style={styles.btnIconContainer}>
              <Ionicons name="stats-chart" size={22} color={COLORS.WHITE} />
            </View>
            <Text style={styles.actionButtonText}>Mis Negociaciones</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.WHITE} style={{ opacity: 0.6 }} />
          </TouchableOpacity>

          {user && user.co_ven && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.PRIMARY }]}
              onPress={handleCobranzaPreventiva}
              disabled={syncing || generatingPDF}
              accessibilityLabel="Generar reporte de Cobranza Preventiva"
              accessibilityHint="Genera y comparte un PDF con el reporte de cobranza preventiva"
            >
              <View style={styles.btnIconContainer}>
                {generatingPDF ? (
                  <ActivityIndicator size={20} color={COLORS.WHITE} />
                ) : (
                  <Ionicons name="card-outline" size={22} color={COLORS.WHITE} />
                )}
              </View>
              <Text style={styles.actionButtonText}>
                {generatingPDF ? 'Generando PDF...' : 'Cobranza Preventiva'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.WHITE} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          )}

          {user && user.co_ven && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.ACCENT }]}
              onPress={handleOpenCartera}
              accessibilityLabel="Ir a Cartera de Clientes"
              accessibilityHint="Abre la pantalla de Cartera de Clientes"
            >
              <View style={styles.btnIconContainer}>
                <Ionicons name="people" size={22} color={COLORS.WHITE} />
              </View>
              <Text style={styles.actionButtonText}>Cartera de Clientes</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.WHITE} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          )}

          {user && user.co_ven && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#7B5EA7' }]}
              onPress={() => Linking.openURL(`${Config.DESPACHO_URL}/listado/negociacion.php`)}
              accessibilityLabel="Ir a Comparador de Precios y Negociaciones"
              accessibilityHint="Abre la pantalla de Comparador de Precios y Negociaciones"
            >
              <View style={styles.btnIconContainer}>
                <Ionicons name="swap-horizontal" size={22} color={COLORS.WHITE} />
              </View>
              <Text style={styles.actionButtonText}>Comparador - Precios - Negociaciones</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.WHITE} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          )}


          {/* KPI Metrics Section */}
          {loadingKpi && (
            <View style={styles.kpiLoadingContainer}>
              <ActivityIndicator size={30} color={COLORS.PRIMARY} />
              <Text style={styles.kpiLoadingText}>Cargando indicadores...</Text>
            </View>
          )}

          {kpiData && !loadingKpi && (
            <View style={styles.kpiContainer}>

              {/* Ventas y Clientes */}
              <View style={styles.kpiNewSection}>
                <View style={styles.kpiTitleRow}>
                  <Ionicons name="stats-chart-outline" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.kpiNewSectionTitle}>Ventas y Clientes</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Meta de Ventas:</Text>
                  <Text style={styles.kpiDataValue}>${Number(kpiData.metaVentas || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Ventas Actuales:</Text>
                  <Text style={styles.kpiDataValue}>${(Number(kpiData.ventas_factura_sum || 0) * 0.9).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>% Cumplido:</Text>
                  <Text style={styles.kpiDataValue}>
                    {Number(kpiData.metaVentas) > 0 ? ((Number(kpiData.ventas_factura_sum) * 0.9 / Number(kpiData.metaVentas)) * 100).toFixed(2) : '0.00'}%
                  </Text>
                </View>

                <View style={[styles.kpiDivider, { marginVertical: 10 }]} />

                {/* Meta Cartera Activa */}
                <View style={styles.kpiTitleRow}>
                  <Text style={[styles.kpiNewSectionTitle, { marginLeft: 0 }]}>Meta Cartera Activa</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Meta:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.metaCarteraAct || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Clientes Activos:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.clientes_activos_factura || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>% Cumplido:</Text>
                  <Text style={styles.kpiDataValue}>
                    {Number(kpiData.metaCarteraAct) > 0 ? ((Number(kpiData.clientes_activos_factura) / Number(kpiData.metaCarteraAct)) * 100).toFixed(2) : '0.00'}%
                  </Text>
                </View>
              </View>

              {/* Gestión de Clientes */}
              <View style={styles.kpiNewSection}>
                <View style={styles.kpiTitleRow}>
                  <Ionicons name="people-outline" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.kpiNewSectionTitle}>Gestión de Clientes</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Clientes Recuperados:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.clientes_recuperados || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Clientes con Convenio:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.clientes_convenio || '0'}</Text>
                </View>
              </View>

              {/* Productos y Negociación */}
              <View style={styles.kpiNewSection}>
                <View style={styles.kpiTitleRow}>
                  <Ionicons name="briefcase-outline" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.kpiNewSectionTitle}>Productos y Negociación</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Meta Negociaciones:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.metaGrupoNeg || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Negociaciones:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.negociacion || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Cumplido:</Text>
                  <Text style={styles.kpiDataValue}>
                    {Number(kpiData.metaGrupoNeg) > 0 ? ((Number(kpiData.negociacion) / Number(kpiData.metaGrupoNeg)) * 100).toFixed(2) : '0.00'}%
                  </Text>
                </View>
              </View>

              {/* Cartera y Cobranza */}
              <View style={styles.kpiNewSection}>
                <View style={styles.kpiTitleRow}>
                  <Ionicons name="card-outline" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.kpiNewSectionTitle}>Cartera y Cobranza</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Vencido a cobrar:</Text>
                  <Text style={styles.kpiDataValue}>
                    ${(Number(kpiData.metaSaldoVencidoInicio || 0) + Number(kpiData.neto_facturas_mes_transito || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Saldo en tránsito:</Text>
                  <Text style={styles.kpiDataValue}>
                    ${Number(kpiData.saldo_facturas_mes || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Cumplido:</Text>
                  <Text style={styles.kpiDataValue}>
                    {(Number(kpiData.metaSaldoVencidoInicio || 0) + Number(kpiData.neto_facturas_mes_transito || 0)) > 0
                      ? ((Number(kpiData.saldo_facturas_mes || 0) / (Number(kpiData.metaSaldoVencidoInicio || 0) + Number(kpiData.neto_facturas_mes_transito || 0))) * 100).toFixed(2)
                      : '0.00'}%
                  </Text>
                </View>
              </View>

              {/* Visitas por Día */}
              <View style={styles.kpiNewSection}>
                <View style={styles.kpiTitleRow}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.kpiNewSectionTitle}>Visitas por Día</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Lunes:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.diaLunes || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Martes:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.diaMartes || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Miércoles:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.diaMiercoles || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Jueves:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.diaJueves || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Viernes:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.diaViernes || '0'}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>Sábado:</Text>
                  <Text style={styles.kpiDataValue}>{kpiData.diaSabado || '0'}</Text>
                </View>
                <View style={[styles.kpiDataItem, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 8 }]}>
                  <Text style={[styles.kpiDataLabel, { fontWeight: 'bold' }]}>TOTAL VISITAS:</Text>
                  <Text style={[styles.kpiDataValue, { fontWeight: 'bold' }]}>{kpiData.totVisitas || '0'}</Text>
                </View>
              </View>
            </View>
          )}


          {/* Overlay de sincronización */}
          {syncing && (
            <View style={styles.syncingOverlay} accessibilityLabel="Sincronizando datos">
              <ActivityIndicator size={60} color={COLORS.PRIMARY} />
              <Text style={styles.syncingText}>Sincronizando datos...</Text>
            </View>
          )}


          <FlashMessage position="top" />

          {/* Modal de Descuento */}
          <Modal
            visible={showDiscountModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDiscountModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Descuento Divisas</Text>
                <Text style={styles.modalSubtitle}>Porcentaje de descuento para divisas en buen estado:</Text>

                <TextInput
                  style={styles.discountInput}
                  keyboardType="numeric"
                  value={discountPercent}
                  onChangeText={setDiscountPercent}
                  placeholder="Ej: 5"
                  autoFocus={true}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowDiscountModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={confirmAndGenerate}
                  >
                    <Text style={styles.confirmButtonText}>Generar PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos adaptados y reorganizados

