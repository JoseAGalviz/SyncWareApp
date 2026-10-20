import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ImageBackground,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth, USER_DATA_KEY } from "../context/AuthContext";
import Theme from "../constants/Theme";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [foco, setFoco] = useState(null);

  const { login, isLoading } = useAuth();

  const validateFields = () => {
    if (!username || !password) {
      Alert.alert("Campos requeridos", "Por favor, ingresa tu usuario y contraseña.");
      return false;
    }
    return true;
  };

  const navigateToMainApp = (userRole) => {
    if (userRole === "conductor") {
      navigation.navigate("MainAppDrawerConductor");
    } else if (userRole === "despachador") {
      navigation.navigate("MainAppDespachador");
    } else {
      navigation.navigate("MainAppDrawer");
    }
  };

  const handleLogin = async () => {
    if (!validateFields()) return;

    const result = await login(username, password);

    if (result.success) {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      const user = JSON.parse(userData);
      navigateToMainApp(user.rol);
    } else {
      Alert.alert("Error", result.error);
    }
  };

  // Diseño "Login" del lienzo SyncWareApp: fondo azul noche (imagen con velo), tarjeta
  // blanca con logo, campos con ícono y etiqueta, botón verde y pie con la versión.
  return (
    <ImageBackground source={require("../../assets/back.png")} style={st.fondo} resizeMode="cover">
      <KeyboardAvoidingView
        style={st.velo}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={st.circulo} pointerEvents="none" importantForAccessibility="no-hide-descendants" />
        <View style={st.tarjeta}>
          <View style={st.cabecera}>
            <View style={st.logoCaja}>
              <Image source={require("../../assets/logo.png")} style={st.logo} resizeMode="contain" />
            </View>
            <Text style={st.titulo}>Bienvenido</Text>
            <Text style={st.subtitulo}>Ingresa a SyncWare con tu usuario de Cristmedicals</Text>
          </View>

          <View style={st.campo}>
            <Text style={st.label}>Usuario</Text>
            <View style={[st.input, foco === "usuario" && st.inputFoco]}>
              <Ionicons name="person-outline" size={20} color={C.muted} />
              <TextInput
                style={st.inputTexto}
                placeholder="Tu usuario"
                placeholderTextColor={C.light}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFoco("usuario")}
                onBlur={() => setFoco(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                editable={!isLoading}
                accessibilityLabel="Usuario"
              />
            </View>
          </View>

          <View style={st.campo}>
            <Text style={st.label}>Contraseña</Text>
            <View style={[st.input, foco === "clave" && st.inputFoco, { paddingRight: 4 }]}>
              <Ionicons name="lock-closed-outline" size={20} color={C.muted} />
              <TextInput
                style={st.inputTexto}
                placeholder="Tu contraseña"
                placeholderTextColor={C.light}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFoco("clave")}
                onBlur={() => setFoco(null)}
                secureTextEntry={!isPasswordVisible}
                textContentType="password"
                editable={!isLoading}
                accessibilityLabel="Contraseña"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={st.ojo}
                onPress={() => setIsPasswordVisible((prev) => !prev)}
                activeOpacity={0.7}
                disabled={isLoading}
                accessibilityLabel={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={st.boton} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85} accessibilityRole="button">
            {isLoading ? <ActivityIndicator color={C.white} /> : <Text style={st.botonTexto}>Ingresar</Text>}
          </TouchableOpacity>

          <Text style={st.pie}>
            Departamento de Tecnología{Constants.expoConfig?.version ? ` · v${Constants.expoConfig.version}` : ""}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const C = Theme.colors;
const st = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: C.dark },
  velo: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(15,42,58,0.9)" },
  circulo: {
    position: "absolute", top: 72, alignSelf: "center",
    width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: C.darkSoft,
  },
  tarjeta: {
    width: "100%", maxWidth: 420, alignSelf: "center",
    backgroundColor: C.white, borderRadius: 24, paddingVertical: 32, paddingHorizontal: 24, gap: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.28, shadowRadius: 48, elevation: 14,
  },
  cabecera: { alignItems: "center", gap: 12 },
  logoCaja: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  logo: { width: 64, height: 64 },
  titulo: { fontSize: 26, fontWeight: "800", color: C.text },
  subtitulo: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: -6 },
  campo: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: C.text },
  input: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 52,
    borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: C.background,
  },
  inputFoco: { borderWidth: 2, borderColor: C.primary, backgroundColor: C.white, paddingHorizontal: 13 },
  inputTexto: { flex: 1, fontSize: 16, color: C.text, paddingVertical: 0 },
  ojo: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  boton: { height: 54, borderRadius: 14, backgroundColor: C.primaryDark, alignItems: "center", justifyContent: "center" },
  botonTexto: { color: C.white, fontSize: 16, fontWeight: "700" },
  pie: { textAlign: "center", fontSize: 12, color: C.muted },
});
