import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreenConductor from "../screens/HomeScreenConductor";

// Debes crear estos dos screens:
import GuiaCargaScreen from "../screens/GuiaCargaScreen";
import ChequeoGuiaCargaScreen from "../screens/ChequeoGuiaCargaScreen";
import FacturasScreen from '../screens/FacturasScreen';
import RutagramaScreen from '../screens/RutagramaScreen';
import COLORS from '../constants/Colors';

// import CargarRutaScreen from "../screens/CargarRutaScreen"; // Eliminado (Unificado)

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

export default function AppNavigatorConductor() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: "Cristmedicals",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: "#000" },
        headerTitleStyle: { color: COLORS.WHITE },
        headerTintColor: COLORS.WHITE,
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
          if (route.name === "Guia de Carga") {
            iconName = focused ? "cube" : "cube-outline";
          }
          /* else if (route.name === "Cargar Ruta") {
            iconName = focused ? "car" : "car-outline"; 
          } */
          else if (route.name === "Chequeo de Guia de Carga") {
            iconName = focused
              ? "checkmark-circle"
              : "checkmark-circle-outline";
          } else if (route.name === "Inicio") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Facturas") {
            iconName = focused ? "document-text" : "document-text-outline";
          } else if (route.name === "Rutagrama") {
            iconName = focused ? "map" : "map-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.SUCCESS,
        tabBarInactiveTintColor: COLORS.PRIMARY,
        tabBarStyle: { 
          backgroundColor: "#000",
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreenConductor} />
      <Tab.Screen name="Guia de Carga" component={GuiaCargaScreen} />
      {/* <Tab.Screen name="Cargar Ruta" component={CargarRutaScreen} /> (Unificado) */}
      <Tab.Screen
        name="Chequeo de Guia de Carga"
        component={ChequeoGuiaCargaScreen}
      />
      <Tab.Screen name="Facturas" component={FacturasScreen} />
      <Tab.Screen name="Rutagrama" component={RutagramaScreen} />
    </Tab.Navigator>
  );
}
