import React, { useLayoutEffect, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, Linking, Modal, TextInput, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllData } from '../services/syncAllData'; // Importa la función correctamente
import FlashMessage, { showMessage } from "react-native-flash-message";
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import COLORS from '../constants/Colors';

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
      const endpoint = `/api/auditoria/kpi-metas?co_ven=${user.co_ven}`;
      const response = await api.get(endpoint);

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
      const url = `https://98.94.185.164.nip.io/api/auth/redirect-fixed-ip?co_ven=${user.co_ven}`;
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
      const url = `http://98.94.185.164:8025/vendedor?co_ven=${user.co_ven}`;
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
                  <Text style={styles.kpiDataValue}>${Number(kpiData.ventas_factura_sum || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.kpiDataItem}>
                  <Text style={styles.kpiDataLabel}>% Cumplido:</Text>
                  <Text style={styles.kpiDataValue}>
                    {Number(kpiData.metaVentas) > 0 ? ((Number(kpiData.ventas_factura_sum) / Number(kpiData.metaVentas)) * 100).toFixed(2) : '0.00'}%
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
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: '4%',
    paddingTop: 30,
    width: '100%',
    minHeight: '100%',
  },
  subtitle: {
    fontSize: 24,
    color: COLORS.SECONDARY,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: -0.5,
    textAlign: 'left',
    width: '100%',
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.MUTED,
    marginBottom: 20,
    textAlign: 'left',
    width: '100%',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    width: '100%',
    maxWidth: 500,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 140,
  },
  syncButtonText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
  syncIcon: {
    marginRight: 6,
  },
  clientesInfoBox: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    minWidth: 100,
    maxWidth: SCREEN_WIDTH * 0.45,
    shadowColor: COLORS.SECONDARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoTitle: {
    color: COLORS.MUTED,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoNumber: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 34,
    marginVertical: 2,
    textAlign: 'center',
    width: '100%',
  },
  infoSubtitle: {
    color: COLORS.MUTED,
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  menuButton: {
    marginLeft: 15,
  },
  syncingOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 40,
    width: '100%',
  },
  syncingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  syncDetailBox: {
    marginTop: 30,
    backgroundColor: COLORS.LIGHT_BACKGROUND,
    borderRadius: 10,
    padding: 18,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    elevation: 2,
  },
  syncDetailTitle: {
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  syncDetailItem: {
    fontSize: 15,
    color: COLORS.TEXT,
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ACCENT,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 15,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  btnIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
    flex: 1,
  },
  btnIcon: {
    marginRight: 10,
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 20,
  },
  discountInput: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 25,
    backgroundColor: COLORS.LIGHT_BG,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
  },
  confirmButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  // Loading and Container Styles
  kpiLoadingContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
  },
  kpiLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  kpiContainer: {
    marginTop: 15,
    width: '100%',
    maxWidth: 500,
    paddingBottom: 20,
  },
  // KPI Revamp Styles
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  kpiHeaderBox: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiHeaderLabel: {
    fontSize: 13,
    color: COLORS.TEXT,
    marginBottom: 5,
    fontWeight: '600',
  },
  kpiHeaderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  kpiNewSection: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  kpiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  kpiNewSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kpiDataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  kpiDataLabel: {
    fontSize: 14,
    color: COLORS.MUTED,
    flex: 1,
    fontWeight: '500',
  },
  kpiDataValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    textAlign: 'right',
  },
  kpiDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    width: '100%',
  },
});
