import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ImageBackground,
  Image,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, USER_DATA_KEY } from "../context/AuthContext";
import COLORS from "../constants/Colors";
import styles from '../styles/LoginScreen.styles';

/**
 * Componente principal de la pantalla de inicio de sesión.
 * @param {object} props - Propiedades del componente, incluyendo 'navigation' de React Navigation.
 */
export default function LoginScreen({ navigation }) {
  // --- Estados del componente (Uso de nombres descriptivos) ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // Controla la visibilidad de la contraseña

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



  return (
    <ImageBackground
      source={require("../../assets/back.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Logo */}
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Título de la pantalla */}
          <Text style={styles.title}>Iniciar Sesión</Text>

          {/* Campo de Usuario */}
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            placeholderTextColor={COLORS.MUTED}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            // Mejora: añadir hints para teclado
            keyboardType="email-address"
            textContentType="username"
            editable={!isLoading} // Deshabilitar durante la carga
          />

          {/* Contenedor de Contraseña y botón de visibilidad */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInputBase]}
              placeholder="Contraseña"
              placeholderTextColor={COLORS.MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible} // Oculta/Muestra según el estado
              textContentType="password"
              editable={!isLoading} // Deshabilitar durante la carga
            />
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              activeOpacity={0.7}
              disabled={isLoading} // Deshabilitar durante la carga
            >
              {/* Icono de visibilidad. Se puede usar un componente de iconos para mejor UX. */}
              <Text style={styles.showPasswordText}>
                {isPasswordVisible ? "👁️" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón de Ingresar */}
          <View style={styles.buttonWrapper}>
            <Button
              title={isLoading ? "Ingresando..." : "Ingresar"}
              onPress={handleLogin}
              disabled={isLoading}
              color={COLORS.SUCCESS}
            />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}


