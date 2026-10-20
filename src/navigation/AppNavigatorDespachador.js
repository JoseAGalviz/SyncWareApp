import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import FacturasScreen from "../screens/FacturasScreen";
import DespachoScreen from "../screens/DespachoScreen";
import LotesScreen from "../screens/LotesScreen";
import DespachoNavigator from "./DespachoNavigator";
import DevolucionesNavigator from "./DevolucionesNavigator";
import Theme from "../constants/Theme";

import { opcionesTabBarFlotante, IconoTab, EtiquetaTab } from './tabBarFlotante';
import AppHeader, { HeaderButton } from '../components/AppHeader';

const Tab = createBottomTabNavigator();

const ETIQUETAS = { Devoluciones: "Devol." };
const ICONOS = {
  Facturas: "receipt-outline",
  Despacho: "checkbox-outline",
  Lotes: "list-outline",
  Rutagrama: "bus-outline",
  Devoluciones: "return-down-back-outline",
};

export default function AppNavigatorDespachador() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que deseas cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("userData");
            navigation.replace("Login");
          },
        },
      ]
    );
  };

  return (
    <Tab.Navigator
      initialRouteName="Despacho"
      screenOptions={({ route }) => ({
        ...opcionesTabBarFlotante(insets),
        // El despachador no tiene menú lateral: a la derecha del encabezado, cerrar sesión.
        header: (props) => (
          <AppHeader
            title={props.options.title ?? route.name}
            subtitle={props.options.headerSubtitle}
            right={<HeaderButton icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} />}
          />
        ),
        tabBarLabel: ({ color }) => <EtiquetaTab color={color}>{ETIQUETAS[route.name] ?? route.name}</EtiquetaTab>,
        tabBarIcon: ({ focused, color }) => (
          <IconoTab name={ICONOS[route.name] || "ellipse-outline"} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Facturas" component={FacturasScreen} options={{ title: "Gestión de Facturas" }} />
      <Tab.Screen name="Despacho" component={DespachoScreen} options={{ title: "Reporte de Despacho" }} />
      <Tab.Screen name="Lotes" component={LotesScreen} />
      {/* El stack de Rutagrama trae su propio encabezado (NavHeader). */}
      <Tab.Screen name="Rutagrama" component={DespachoNavigator} options={{ headerShown: false }} />
      {/* Devoluciones trae su propio encabezado (stack con NavHeader). */}
      <Tab.Screen name="Devoluciones" component={DevolucionesNavigator} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
