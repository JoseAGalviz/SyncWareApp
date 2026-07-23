import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/HomeScreen";
import VisitaScreen from "../screens/VisitaScreen";
import FacturasScreen from "../screens/FacturasScreen";
import MontarPedidoScreen from "../screens/MontarPedidoScreen";
import LotesScreen from "../screens/LotesScreen";
import RutagramaScreen from "../screens/RutagramaScreen";
import Theme from '../constants/Theme';


const Tab = createBottomTabNavigator();

function DrawerMenuButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ marginLeft: 15 }}
    >
      <Ionicons name="menu" size={28} color={Theme.colors.white} />
    </TouchableOpacity>
  );
}

// Define tu navegación de pestañas
export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: "Cristmedicals",
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: Theme.colors.dark,
        },
        headerTitleStyle: {
          color: Theme.colors.white,
          fontSize: 16,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        headerTintColor: Theme.colors.white,
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
          } else if (route.name === "Lotes") {
            iconName = focused ? "layers" : "layers-outline";
          } else if (route.name === "Recibir Guías de Carga") {
            iconName = focused ? "cube" : "cube-outline";
          } else if (route.name === "Montar Pedidos") {
            iconName = focused ? "cart" : "cart-outline";
          } else if (route.name === "Historial") {
            iconName = focused ? "clipboard" : "clipboard-outline";
          } else if (route.name === "Consulta Matrix") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Rutagrama") {
            iconName = focused ? "map" : "map-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.muted,
        tabBarStyle: {
          backgroundColor: Theme.colors.dark,
          borderTopWidth: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Visita" component={VisitaScreen} />
      <Tab.Screen name="Facturas" component={FacturasScreen} />
      <Tab.Screen name="Lotes" component={LotesScreen} />
      <Tab.Screen name="Rutagrama" component={RutagramaScreen} />
      <Tab.Screen
        name="Montar Pedidos"
        component={MontarPedidoScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
