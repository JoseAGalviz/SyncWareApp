import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";

import HomeScreen from "../screens/HomeScreen";
import VisitaScreen from "../screens/VisitaScreen";
import FacturasScreen from "../screens/FacturasScreen";
import RecepcionGuiasScreen from "../screens/RecepcionGuiasScreen";
import MontarPedidoScreen from "../screens/MontarPedidoScreen";
import PedidosHistorialScreen from "../screens/PedidosHistorialScreen";
import MatrixExcelScreen from "../screens/MatrixExcelScreen";
import COLORS from '../constants/Colors';


const Tab = createBottomTabNavigator();

function DrawerMenuButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ marginLeft: 15 }}
    >
      <Ionicons name="menu" size={30} color={COLORS.WHITE} />
    </TouchableOpacity>
  );
}

// Define tu navegación de pestañas
export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: "Cristmedicals",
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "#000", // Negro para el header
        },
        headerTitleStyle: {
          color: COLORS.WHITE, // Blanco para el texto del header
        },
        headerTintColor: COLORS.WHITE, // Blanco para íconos y flechas
        headerLeft: () => <DrawerMenuButton />,
        headerRight: () => (
          <Image
            source={require("../../assets/logo.png")}
            style={{
              width: 150,
              height: 50,
              resizeMode: "contain",
              marginRight: -40,
            }}
          />
        ),
        headerLeftContainerStyle: { paddingLeft: 10 },
        headerRightContainerStyle: { paddingRight: 10 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Inicio") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Visita") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Facturas") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Recibir Guías de Carga") {
            iconName = focused ? "cube" : "cube-outline";
          } else if (route.name === "Montar Pedidos") {
            iconName = focused ? "cart" : "cart-outline";
          } else if (route.name === "Historial") {
            iconName = focused ? "clipboard" : "clipboard-outline";
          } else if (route.name === "Consulta Matrix") {
            iconName = focused ? "grid" : "grid-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.SUCCESS,
        tabBarInactiveTintColor: COLORS.PRIMARY,
        tabBarStyle: {
          backgroundColor: "#000", // Negro para el tabBar
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Visita" component={VisitaScreen} />
      <Tab.Screen name="Facturas" component={FacturasScreen} />
      <Tab.Screen
        name="Montar Pedidos"
        component={MontarPedidoScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
