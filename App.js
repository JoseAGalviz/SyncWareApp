import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer"; // Importar Drawer Navigator
import FlashMessage from "react-native-flash-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from './src/navigation/AppNavigator'; // Ajusta la ruta si es necesario
import UserDataScreen from './src/screens/UserDataScreen';
import CustomDrawerContent from './src/navigation/CustomDrawerContent';
import AppNavigatorConductor from './src/navigation/AppNavigatorConductor';

// Secondary screens moved to Drawer
import RecepcionGuiasScreen from "./src/screens/RecepcionGuiasScreen";
import PedidosHistorialScreen from "./src/screens/PedidosHistorialScreen";
import MatrixExcelScreen from "./src/screens/MatrixExcelScreen";
import PotencialCiudadesScreen from "./src/screens/PotencialCiudadesScreen";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator(); // Crear una instancia del Drawer Navigator

// Este componente contendrá el Drawer Navigator
function MainAppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />} // Usar tu contenido personalizado
      screenOptions={{
        headerShown: false, // Puedes mostrar el header si lo prefieres, pero el Drawer lo manejará
        drawerStyle: {
          backgroundColor: "#ffffff", // Color de fondo del Drawer
          width: 270, // Cambia este valor al ancho que desees (por defecto es 240)
        },
      }}
    >
      {/* La pantalla principal dentro del Drawer es tu AppNavigator (el Tab Navigator) */}
      <Drawer.Screen
        name="HomeTabs"
        component={AppNavigator}
        options={{ title: "Inicio" }}
      />
      <Drawer.Screen
        name="UserData"
        component={UserDataScreen}
        options={{
          title: "Mi Perfil",
          drawerIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />
        }}
      />

      <Drawer.Screen
        name="RecibirGuías"
        component={RecepcionGuiasScreen}
        options={{
          title: "Cristmedicals",
          headerShown: true,
          headerStyle: { backgroundColor: "#000" },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#fff",
          headerTitleAlign: "center",
          headerRight: () => (
            <Image
              source={require("./assets/logo.png")}
              style={{ width: 150, height: 50, resizeMode: "contain", marginRight: -40 }}
            />
          ),
          drawerIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} />,
          drawerLabel: "Recibir Guías",
        }}
      />

      <Drawer.Screen
        name="HistorialPedidos"
        component={PedidosHistorialScreen}
        options={{
          title: "Historial de Pedidos",
          drawerIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} />
        }}
      />

      <Drawer.Screen
        name="ConsultaMatrix"
        component={MatrixExcelScreen}
        options={{
          title: "Consulta Matrix",
          drawerIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />
        }}
      />

      <Drawer.Screen
        name="PotencialCiudades"
        component={PotencialCiudadesScreen}
        options={{
          title: "Potencial de Ciudades",
          drawerIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" color={color} size={size} />,
          drawerLabel: "Potencial de Ciudades",
        }}
      />

      {/* Puedes añadir más pantallas aquí si quieres que aparezcan en el Drawer */}
    </Drawer.Navigator>
  );
}

function MainAppDrawerConductor() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "#fff", width: 270 },
      }}
    >
      <Drawer.Screen
        name="HomeTabsConductor"
        component={AppNavigatorConductor}
        options={{ title: "Inicio" }}
      />
      {/* ...otras pantallas específicas para conductor */}
    </Drawer.Navigator>
  );
}

import { AuthProvider, useAuth } from './src/context/AuthContext';

function AppLayout() {
  const { user, isSplashLoading } = useAuth();

  if (isSplashLoading) {
    // Puedes mostrar un splash o loader aquí
    return null;
  }

  const isAuthenticated = !!user;
  const userRole = user?.rol;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={
          isAuthenticated
            ? userRole === "conductor"
              ? "MainAppDrawerConductor"
              : "MainAppDrawer"
            : "Login"
        }
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainAppDrawer" component={MainAppDrawer} />
        <Stack.Screen
          name="MainAppDrawerConductor"
          component={MainAppDrawerConductor}
        />
      </Stack.Navigator>
      <FlashMessage
        position="top"
        floating={true}
        statusBarHeight={StatusBar.currentHeight}
        style={{ marginTop: Platform.OS === 'android' ? 30 : 0 }}
        titleStyle={{ paddingTop: 5 }}
      />
    </NavigationContainer>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform, Image } from 'react-native';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Update AppLayout's FlashMessage:
// We add extra padding and specific style to ensure it looks good.
// floating={true} should make it a bubble, but if it fails, the style fixes the padding.

