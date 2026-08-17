import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import FacturasScreen from "../screens/FacturasScreen";
import DespachoScreen from "../screens/DespachoScreen";
import LotesScreen from "../screens/LotesScreen";
import DespachoNavigator from "./DespachoNavigator";
import Theme from "../constants/Theme";

const Tab = createBottomTabNavigator();

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
        headerTitle: "Cristmedicals",
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: Theme.colors.dark,
        },
        headerTitleStyle: {
          color: Theme.colors.white,
          fontSize: 16,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
        headerTintColor: Theme.colors.white,
        headerLeft: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginLeft: 15 }}>
            <Ionicons name="log-out-outline" size={26} color={Theme.colors.white} />
          </TouchableOpacity>
        ),
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
          if (route.name === "Facturas") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Despacho") {
            iconName = focused ? "cube" : "cube-outline";
          } else if (route.name === "Lotes") {
            iconName = focused ? "layers" : "layers-outline";
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
          fontWeight: "600",
          marginBottom: 4,
        },
      })}
    >
      <Tab.Screen name="Facturas" component={FacturasScreen} />
      <Tab.Screen name="Despacho" component={DespachoScreen} />
      <Tab.Screen name="Lotes" component={LotesScreen} />
      <Tab.Screen name="Rutagrama" component={DespachoNavigator} />
    </Tab.Navigator>
  );
}
