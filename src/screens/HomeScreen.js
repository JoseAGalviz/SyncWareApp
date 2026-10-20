import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Linking, Modal, TextInput, Platform, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../constants/Theme';
import { HeaderButton } from '../components/AppHeader';
import { Tarjeta, Pill, Barra, Seccion, IconoCaja } from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllData } from '../services/syncAllData'; // Importa la función correctamente
import { showMessage } from "react-native-flash-message";
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
  const insets = useSafeAreaInsets();
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

  // Efectos para cargar datos al montar el componente
  useEffect(() => {
    obtenerTotales();
    cargarClientes();
    fetchKpiData();
  }, [obtenerTotales, cargarClientes, fetchKpiData]);

  // Accesos del inicio ("Herramientas"). Mis Negociaciones y Cartera de Clientes no se
  // muestran al vendedor; los que dependen de co_ven, solo si el usuario lo tiene.
  const esVendedor = user?.rol === 'vendedor';
  const tieneCoVen = !!(user && user.co_ven);
  const acciones = [
    tieneCoVen && {
      key: 'cobranza', label: generatingPDF ? 'Generando PDF...' : 'Cobranza Preventiva', icon: 'document-text-outline',
      tono: 'ambar', onPress: handleCobranzaPreventiva, disabled: syncing || generatingPDF, loading: generatingPDF,
    },
    tieneCoVen && {
      key: 'comparador', label: 'Comparador de Precios', icon: 'git-compare-outline', tono: 'azul',
      onPress: () => Linking.openURL(`${Config.DESPACHO_URL}/listado/negociacion.php`),
    },
    {
      key: 'catalogo', label: 'Catálogo Personalizado', icon: 'book-outline', tono: 'verde',
      onPress: () => Linking.openURL('https://catalogo-cristmedicals.netlify.app/'),
    },
    !esVendedor && {
      key: 'negociaciones', label: 'Mis Negociaciones', icon: 'checkmark-done-circle-outline', tono: 'violeta',
      onPress: handleOpenNegociaciones,
    },
    tieneCoVen && !esVendedor && {
      key: 'cartera', label: 'Cartera de Clientes', icon: 'people-outline', tono: 'azul',
      onPress: handleOpenCartera,
    },
  ].filter(Boolean);

  // Indicadores derivados (mismas fórmulas que antes).
  const k = kpiData || {};
  const ventasNetas = Number(k.ventas_factura_sum || 0) * 0.9;
  const pctVentas = Number(k.metaVentas) > 0 ? (ventasNetas / Number(k.metaVentas)) * 100 : 0;
  const pctNeg = Number(k.metaGrupoNeg) > 0 ? (Number(k.negociacion) / Number(k.metaGrupoNeg)) * 100 : 0;
  const vencidoCobrar = Number(k.metaSaldoVencidoInicio || 0) + Number(k.neto_facturas_mes_transito || 0);
  const pctCobranza = vencidoCobrar > 0 ? (Number(k.saldo_facturas_mes || 0) / vencidoCobrar) * 100 : 0;
  const mesActual = new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  const primerNombre = String(user?.nombre || 'Usuario').trim().split(/\s+/)[0];
  const dias = [
    ['Lun', k.diaLunes], ['Mar', k.diaMartes], ['Mié', k.diaMiercoles],
    ['Jue', k.diaJueves], ['Vie', k.diaViernes], ['Sáb', k.diaSabado],
  ];

  return (
    <View style={hs.pantalla}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.white} />
        }
      >
        {/* Encabezado grande azul noche con saludo; las tarjetas de abajo lo solapan. */}
        <View style={[hs.header, { paddingTop: insets.top + 16 }]}>
          <View style={hs.headerFila}>
            <HeaderButton icon="menu" label="Abrir menú" onPress={() => navigation.openDrawer()} />
            <Text style={hs.headerEtiqueta}>Inicio</Text>
          </View>
          <View>
            <Text style={hs.saludo}>Hola, {primerNombre}</Text>
            <Text style={hs.saludoSub}>Este es tu resumen de hoy</Text>
          </View>
        </View>

        <View style={hs.contenido}>
          <View style={hs.fila2}>
            <TouchableOpacity
              style={[hs.tarjetaTop, syncing && { opacity: 0.6 }]}
              onPress={handleSync}
              disabled={syncing}
              accessibilityRole="button"
              accessibilityLabel="Sincronizar datos"
            >
              {syncing ? (
                <View style={hs.iconoCargando}><ActivityIndicator color={C.primaryDark} /></View>
              ) : (
                <IconoCaja name="sync-outline" tono="verde" />
              )}
              <Text style={hs.tarjetaTitulo}>{syncing ? 'Sincronizando...' : 'Sincronizar datos'}</Text>
              <Text style={hs.tarjetaSub}>Clientes y catálogo</Text>
            </TouchableOpacity>
            <View style={hs.tarjetaTop} accessibilityLabel={`Clientes asignados: ${totalClientes}`}>
              <IconoCaja name="people-outline" tono="azul" />
              <Text style={hs.tarjetaTitulo}>Clientes asignados</Text>
              <Text style={hs.numeroGrande}>{totalClientes}</Text>
            </View>
          </View>

          {acciones.length ? (
            <View style={{ gap: 12 }}>
              <Seccion titulo="Herramientas" />
              <View style={hs.grilla}>
                {acciones.map((accion) => (
                  <TouchableOpacity
                    key={accion.key}
                    style={hs.herramienta}
                    onPress={accion.onPress}
                    disabled={accion.disabled}
                    accessibilityRole="button"
                    accessibilityLabel={accion.label}
                    activeOpacity={0.75}
                  >
                    {accion.loading ? (
                      <View style={hs.iconoCargando}><ActivityIndicator color={C.warningIcon} /></View>
                    ) : (
                      <IconoCaja name={accion.icon} tono={accion.tono} tam={36} />
                    )}
                    <Text style={hs.herramientaLabel}>{accion.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            <Seccion titulo="Mis indicadores" derecha={mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} />

            {loadingKpi && (
              <View style={hs.cargandoKpi}>
                <ActivityIndicator color={C.primary} />
                <Text style={{ color: C.muted, fontSize: 13 }}>Cargando indicadores...</Text>
              </View>
            )}

            {kpiData && !loadingKpi && (
              <>
                <Tarjeta style={hs.kpi}>
                  <View style={hs.kpiCabecera}>
                    <Text style={hs.kpiTitulo}>Ventas y Clientes</Text>
                    <Pill tono="verde">{pctVentas.toFixed(1)}% cumplido</Pill>
                  </View>
                  <Barra pct={pctVentas} alto={10} />
                  <View style={hs.kpiGrid3}>
                    <Dato label="Meta" valor={`$${money(k.metaVentas)}`} />
                    <Dato label="Ventas" valor={`$${money(ventasNetas)}`} />
                    <Dato label="Cartera activa" valor={`${k.clientes_activos_factura || 0} / ${k.metaCarteraAct || 0}`} />
                  </View>
                </Tarjeta>

                <Tarjeta style={hs.kpi}>
                  <Text style={hs.kpiTitulo}>Gestión de Clientes</Text>
                  <View style={hs.fila2}>
                    <Caja label="Recuperados" valor={k.clientes_recuperados || 0} />
                    <Caja label="Con convenio" valor={k.clientes_convenio || 0} />
                  </View>
                </Tarjeta>

                <Tarjeta style={hs.kpi}>
                  <View style={hs.kpiCabecera}>
                    <Text style={hs.kpiTitulo}>Productos y Negociación</Text>
                    <Pill tono="ambar">{pctNeg.toFixed(1)}% cumplido</Pill>
                  </View>
                  <Barra pct={pctNeg} color={C.warning} alto={10} />
                  <View style={hs.fila2}>
                    <Dato label="Meta" valor={k.metaGrupoNeg || 0} />
                    <Dato label="Negociaciones" valor={k.negociacion || 0} />
                  </View>
                </Tarjeta>

                <View style={hs.kpiOscura}>
                  <Text style={[hs.kpiTitulo, { color: C.white }]}>Cartera y Cobranza</Text>
                  <View style={hs.kpiCabecera}>
                    <Text style={{ fontSize: 13, color: C.onDarkSoft }}>Vencido a cobrar</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: C.white }}>${money(vencidoCobrar)}</Text>
                  </View>
                  <View style={hs.kpiCabecera}>
                    <Text style={{ fontSize: 12, color: C.onDarkSoft }}>Saldo en tránsito ${money(k.saldo_facturas_mes)}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.greenOnDark }}>{pctCobranza.toFixed(1)}% cumplido</Text>
                  </View>
                </View>

                <Tarjeta style={hs.kpi}>
                  <View style={hs.kpiCabecera}>
                    <Text style={hs.kpiTitulo}>Visitas por día</Text>
                    <Pill tono="azul">Total {k.totVisitas || 0}</Pill>
                  </View>
                  <View style={hs.dias}>
                    {dias.map(([dia, valor]) => (
                      <View key={dia} style={hs.dia}>
                        <Text style={hs.diaValor}>{valor || 0}</Text>
                        <Text style={hs.diaLabel}>{dia}</Text>
                      </View>
                    ))}
                  </View>
                </Tarjeta>

                <Text style={{ textAlign: 'center', fontSize: 12, color: C.muted }}>Desliza hacia abajo para actualizar</Text>
              </>
            )}
          </View>


          {/* Overlay de sincronización */}
          {syncing && (
            <View style={styles.syncingOverlay} accessibilityLabel="Sincronizando datos">
              <ActivityIndicator size={60} color={COLORS.PRIMARY} />
              <Text style={styles.syncingText}>Sincronizando datos...</Text>
            </View>
          )}

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
    </View>
  );
}

// ── Piezas y estilos del Inicio (diseño "Inicio (vendedor)" del lienzo SyncWareApp) ──
const C = Theme.colors;
const money = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Dato = ({ label, valor }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 11, color: C.muted }}>{label}</Text>
    <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
  </View>
);

const Caja = ({ label, valor }) => (
  <View style={{ flex: 1, backgroundColor: C.background, borderRadius: 12, padding: 12 }}>
    <Text style={{ fontSize: 11, color: C.muted }}>{label}</Text>
    <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{valor}</Text>
  </View>
);

const hs = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.dark, paddingHorizontal: 20, paddingBottom: 56, gap: 16 },
  headerFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerEtiqueta: { flex: 1, fontSize: 13, color: C.onDarkText },
  saludo: { fontSize: 24, fontWeight: '800', color: C.white },
  saludoSub: { fontSize: 14, color: C.onDarkSoft, marginTop: 4 },
  contenido: { paddingHorizontal: 16, marginTop: -40, gap: 20 },
  fila2: { flexDirection: 'row', gap: 12 },
  tarjetaTop: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18,
    padding: 16, gap: 10,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3,
  },
  iconoCargando: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tarjetaTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  tarjetaSub: { fontSize: 12, color: C.muted },
  numeroGrande: { fontSize: 26, fontWeight: '800', color: C.dark },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  herramienta: {
    width: '48.4%', minHeight: 96, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 14, justifyContent: 'space-between', gap: 10,
  },
  herramientaLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  cargandoKpi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  kpi: { padding: 16, gap: 12 },
  kpiCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kpiTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  kpiGrid3: { flexDirection: 'row', gap: 8 },
  kpiOscura: { backgroundColor: C.dark, borderRadius: 18, padding: 16, gap: 10 },
  dias: { flexDirection: 'row', gap: 6 },
  dia: { flex: 1, backgroundColor: C.background, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  diaValor: { fontSize: 16, fontWeight: '800', color: C.text },
  diaLabel: { fontSize: 11, color: C.muted },
});

