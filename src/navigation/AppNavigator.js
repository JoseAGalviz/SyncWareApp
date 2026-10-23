import React, { useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/HomeScreen";
import VisitaScreen from "../screens/VisitaScreen";
import FacturasScreen from "../screens/FacturasScreen";
import MontarPedidoScreen from "../screens/MontarPedidoScreen";
import LotesScreen from "../screens/LotesScreen";
import PedidosHistorialScreen from "../screens/PedidosHistorialScreen";
import CotizacionesPorDiaScreen from "../screens/CotizacionesPorDiaScreen";
import DespachoNavigator from './DespachoNavigator';
import DevolucionesNavigator from './DevolucionesNavigator';
import RecibirNavigator from './RecibirNavigator';
import { crearMasNavigator, MasMenu } from './MasNavigator';
import { useAvisoRutagramasVendedor } from '../hooks/useAvisoRutagramasVendedor';
import { useAuth } from '../context/AuthContext';
import Theme from '../constants/Theme';


import { opcionesTabBarFlotante, IconoTab, EtiquetaTab, altoOcupadoBarra } from './tabBarFlotante';
import { NavHeader } from '../components/AppHeader';

const Tab = createBottomTabNavigator();

// Nombre corto en la barra inferior (el `title` de cada pantalla es el del encabezado).
const ETIQUETAS = { "Montar Pedidos": "Pedidos" };

// Módulos que no van en la barra inferior: se abren desde la pestaña "Más".
const ITEMS_MAS = [
  { name: 'Lotes', label: 'Lotes', subtitle: 'Agrupar facturas', icon: 'list-outline', tono: 'verde', component: LotesScreen },
  // Rutagrama trae su propio encabezado (stack con NavHeader): sin el del "Más".
  { name: 'Rutagrama', label: 'Rutagrama', subtitle: 'Despacho de rutas', icon: 'bus-outline', tono: 'azul', component: DespachoNavigator, headerShown: false },
  // Devoluciones trae su propio encabezado (stack con NavHeader): sin el del "Más".
  { name: 'Devoluciones', label: 'Devoluciones', subtitle: 'Y reposiciones', icon: 'return-down-back-outline', tono: 'ambar', component: DevolucionesNavigator, headerShown: false },
];
const MasTodos = crearMasNavigator(ITEMS_MAS);
// El vendedor no opera rutagramas (recibe lo suyo en "Recibir"): su "Más" va sin Rutagrama.
// Suma "Mis pedidos": estado en Profit de sus pedidos (notas, alcabala, anulación), y
// "Cotizaciones por día": lo mismo agrupado por día para validar qué se procesó.
const ITEMS_MAS_VENDEDOR = [
  { name: 'MisPedidos', label: 'Mis pedidos', subtitle: 'Notas y alcabala', icon: 'document-text-outline', tono: 'azul', component: PedidosHistorialScreen },
  { name: 'CotizacionesPorDia', label: 'Cotizaciones por día', subtitle: 'Procesadas y no', icon: 'calendar-outline', tono: 'verde', component: CotizacionesPorDiaScreen },
  ...ITEMS_MAS.filter((i) => i.name !== 'Rutagrama'),
];
const MasVendedor = crearMasNavigator(ITEMS_MAS_VENDEDOR);

// Define tu navegación de pestañas
export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [masVisible, setMasVisible] = useState(false);
  const tabsNavRef = useRef(null);
  const { user } = useAuth();
  const esVendedor = user?.rol === "vendedor";
  // Aviso de rutagramas cerrados con pedidos del vendedor (sin push): tocarlo abre el tab
  // "Recibir", directo en el rutagrama si es uno solo.
  const { pendientes } = useAvisoRutagramasVendedor((cargadoId) =>
    navigation.navigate('HomeTabs', {
      screen: 'Recibir',
      params: { screen: 'RecibirRutagramas', params: cargadoId ? { abrirId: cargadoId } : undefined },
    })
  );
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...opcionesTabBarFlotante(insets),
          header: (props) => <NavHeader {...props} />,
          tabBarLabel: ({ color }) => <EtiquetaTab color={color}>{ETIQUETAS[route.name] ?? route.name}</EtiquetaTab>,
          tabBarIcon: ({ focused, color }) => {
            const iconos = {
              Inicio: "home-outline",
              Visita: "location-outline",
              Facturas: "receipt-outline",
              "Montar Pedidos": "cart-outline",
              Recibir: "cube-outline",
              Más: "ellipsis-horizontal",
            };
            return <IconoTab name={iconos[route.name] || "ellipse-outline"} focused={focused} color={color} />;
          },
        })}
      >
        {/* Inicio dibuja su propio encabezado grande (saludo + resumen). */}
        <Tab.Screen name="Inicio" component={HomeScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Visita" component={VisitaScreen} options={{ title: "Gestión de Visitas" }} />
        <Tab.Screen name="Facturas" component={FacturasScreen} options={{ title: "Gestión de Facturas" }} />
        <Tab.Screen
          name="Montar Pedidos"
          component={MontarPedidoScreen}
          options={{ headerShown: false, title: "Pedidos" }}
        />
        <Tab.Screen
          name="Recibir"
          component={RecibirNavigator}
          options={{ headerShown: false, tabBarBadge: pendientes > 0 ? pendientes : undefined }}
        />
        <Tab.Screen
          name="Más"
          component={esVendedor ? MasVendedor : MasTodos}
          options={{ headerShown: false }}
          listeners={({ navigation: tabsNav }) => ({
            // "Más" no abre pantalla: muestra el menú emergente (MasMenu).
            tabPress: (e) => {
              e.preventDefault();
              tabsNavRef.current = tabsNav;
              setMasVisible(true);
            },
          })}
        />
      </Tab.Navigator>
      <MasMenu
        visible={masVisible}
        items={esVendedor ? ITEMS_MAS_VENDEDOR : ITEMS_MAS}
        bottom={altoOcupadoBarra(insets)}
        onClose={() => setMasVisible(false)}
        onSelect={(item) => {
          setMasVisible(false);
          tabsNavRef.current?.navigate('Más', { screen: item.name });
        }}
      />
    </>
  );
}
