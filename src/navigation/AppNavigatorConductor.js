import React, { useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreenConductor from "../screens/HomeScreenConductor";

import GuiaCargaScreen from "../screens/GuiaCargaScreen";
import ChequeoGuiaCargaScreen from "../screens/ChequeoGuiaCargaScreen";
import FacturasScreen from '../screens/FacturasScreen';
import DespachoNavigator from './DespachoNavigator';
import DevolucionesNavigator from './DevolucionesNavigator';
import { crearMasNavigator, MasMenu } from './MasNavigator';
import { NavHeader } from '../components/AppHeader';

import { opcionesTabBarFlotante, IconoTab, EtiquetaTab, altoOcupadoBarra } from './tabBarFlotante';

const Tab = createBottomTabNavigator();

// Módulos del conductor que no van en la barra inferior: se abren desde la pestaña "Más".
const ITEMS_MAS_CONDUCTOR = [
  { name: 'ChequeoGuiaCarga', label: 'Chequeo de Guía', subtitle: 'Entrega de mercancía', headerSubtitle: 'Entrega de mercancía', icon: 'checkmark-circle-outline', tono: 'verde', component: ChequeoGuiaCargaScreen },
  // Devoluciones trae su propio encabezado (stack con NavHeader): sin el del "Más".
  { name: 'Devoluciones', label: 'Devoluciones', subtitle: 'Y reposiciones', icon: 'return-down-back-outline', tono: 'ambar', component: DevolucionesNavigator, headerShown: false },
];
const MasConductor = crearMasNavigator(ITEMS_MAS_CONDUCTOR);

// Nombre corto en la barra inferior (el `title` de cada pantalla es el del encabezado).
const ETIQUETAS = { "Guia de Carga": "Guía" };
const ICONOS = {
  Inicio: "home-outline",
  "Guia de Carga": "clipboard-outline",
  Facturas: "receipt-outline",
  Rutagrama: "bus-outline",
  Más: "ellipsis-horizontal",
};

export default function AppNavigatorConductor() {
  const insets = useSafeAreaInsets();
  const [masVisible, setMasVisible] = useState(false);
  const tabsNavRef = useRef(null);
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...opcionesTabBarFlotante(insets),
          header: (props) => <NavHeader {...props} />,
          tabBarLabel: ({ color }) => <EtiquetaTab color={color}>{ETIQUETAS[route.name] ?? route.name}</EtiquetaTab>,
          tabBarIcon: ({ focused, color }) => (
            <IconoTab name={ICONOS[route.name] || "ellipse-outline"} focused={focused} color={color} />
          ),
        })}
      >
        {/* Inicio dibuja su propio encabezado grande (saludo + accesos). */}
        <Tab.Screen name="Inicio" component={HomeScreenConductor} options={{ headerShown: false }} />
        <Tab.Screen
          name="Guia de Carga"
          component={GuiaCargaScreen}
          options={{ title: "Guía de Carga", headerSubtitle: "Chofer · avance guardado en el teléfono" }}
        />
        <Tab.Screen name="Facturas" component={FacturasScreen} options={{ title: "Gestión de Facturas" }} />
        {/* El stack de Rutagrama trae su propio encabezado (NavHeader). */}
        <Tab.Screen name="Rutagrama" component={DespachoNavigator} options={{ headerShown: false }} />
        <Tab.Screen
          name="Más"
          component={MasConductor}
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
        items={ITEMS_MAS_CONDUCTOR}
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
