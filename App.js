import React from "react";
import { StatusBar, Platform, Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import FlashMessage from "react-native-flash-message";
import { Ionicons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import Theme from "./src/constants/Theme";
import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import AppNavigatorConductor from "./src/navigation/AppNavigatorConductor";
import CustomDrawerContent from "./src/navigation/CustomDrawerContent";
import UserDataScreen from "./src/screens/UserDataScreen";
import RecepcionGuiasScreen from "./src/screens/RecepcionGuiasScreen";
import PedidosHistorialScreen from "./src/screens/PedidosHistorialScreen";
import MatrixExcelScreen from "./src/screens/MatrixExcelScreen";
import PotencialCiudadesScreen from "./src/screens/PotencialCiudadesScreen";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainAppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: Theme.colors.surface,
          width: 270,
        },
        drawerActiveTintColor: Theme.colors.primary,
        drawerInactiveTintColor: Theme.colors.muted,
        drawerLabelStyle: { fontSize: 14, fontWeight: '500' },
      }}
    >
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
          drawerIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="RecibirGuías"
        component={RecepcionGuiasScreen}
        options={{
          title: "Cristmedicals",
          headerShown: true,
          headerStyle: { backgroundColor: Theme.colors.dark },
          headerTitleStyle: { color: Theme.colors.white, fontSize: 16, fontWeight: '600' },
          headerTintColor: Theme.colors.white,
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
          drawerIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="ConsultaMatrix"
        component={MatrixExcelScreen}
        options={{
          title: "Consulta Matrix",
          drawerIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
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
    </Drawer.Navigator>
  );
}

function MainAppDrawerConductor() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: Theme.colors.surface, width: 270 },
        drawerActiveTintColor: Theme.colors.primary,
        drawerInactiveTintColor: Theme.colors.muted,
        drawerLabelStyle: { fontSize: 14, fontWeight: '500' },
      }}
    >
      <Drawer.Screen
        name="HomeTabsConductor"
        component={AppNavigatorConductor}
        options={{ title: "Inicio" }}
      />
    </Drawer.Navigator>
  );
}

function AppLayout() {
  const { user, isSplashLoading } = useAuth();

  if (isSplashLoading) {
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
        <Stack.Screen name="MainAppDrawerConductor" component={MainAppDrawerConductor} />
      </Stack.Navigator>
      <FlashMessage
        position="top"
        floating={true}
        statusBarHeight={StatusBar.currentHeight}
        style={{ marginTop: Platform.OS === "android" ? 30 : 0 }}
        titleStyle={{ paddingTop: 5 }}
      />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
