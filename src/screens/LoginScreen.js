import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  TouchableOpacity,
  ActivityIndicator, // Se agrega para mejor UX al cargar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import COLORS from "../constants/Colors";
// import { api } from "../services/api"; // Ya no se usa directamente aquí
// import { Config, API_ENDPOINTS } from "../constants/Config"; // Ya no se usa directamente aquí

const USER_DATA_KEY = "userData"; // Clave para guardar los datos del usuario en AsyncStorage

/**
 * Componente principal de la pantalla de inicio de sesión.
 * @param {object} props - Propiedades del componente, incluyendo 'navigation' de React Navigation.
 */
export default function LoginScreen({ navigation }) {
  // --- Estados del componente (Uso de nombres descriptivos) ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // Controla la visibilidad de la contraseña

  // Usamos el contexto para login y estado de carga
  const { login, isLoading } = useAuth();

  // useEffect de verificación de sesión ELIMINADO: AuthContext y App.js manejan esto ahora.

  /**
   * Valida que los campos de usuario y contraseña no estén vacíos.
   * @returns {boolean} - true si la validación es exitosa, false en caso contrario.
   */
  const validateFields = () => {
    if (!username || !password) {
      // Muestra una alerta si falta algún campo
      Alert.alert(
        "Campos requeridos",
        "Por favor, ingresa tu usuario y contraseña."
      );
      return false;
    }
    return true;
  };

  /**
   * Almacena el objeto de usuario en AsyncStorage.
   * @param {object} userData - Datos del usuario a guardar.
   */
  const saveUserData = async (userData) => {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Error al guardar datos de usuario:", error);
      // Se podría añadir una alerta de error de almacenamiento aquí si fuera crítico
    }
  };

  /**
   * Navega a la pantalla principal adecuada según el rol del usuario.
   * @param {string} userRole - El rol del usuario ('conductor' u otro).
   */
  const navigateToMainApp = (userRole) => {
    if (userRole === "conductor") {
      navigation.navigate("MainAppDrawerConductor");
    } else {
      navigation.navigate("MainAppDrawer");
    }
  };

  /**
   * Maneja el proceso de inicio de sesión con validaciones y UX mejorada.
   */


  /**
   * Maneja el proceso de inicio de sesión usando el contexto.
   */
  const handleLogin = async () => {
    // Validar campos antes de continuar
    if (!validateFields()) return;

    // El loading se maneja en el contexto si se usa isLoading global,
    // pero aquí podemos gestionar feedback local o usar el del contexto.
    // setIsLoading(true); // Opcional si isAuthLoading no es suficiente reactivo aquí

    const result = await login(username, password);

    if (result.success) {
      // Navegación se maneja manual o automática.
      // Como el contexto actualizó el usuario, obtenemos el rol del usuario guardado o respuesta.
      // Dado que login() devuelve success y guardo user, podemos asumir que App.js podria redirigir
      // si usamos navegación condicional. Si no, navegamos manualmente.
      // Para saber el rol, login podría retornarlo o lo sacamos del estado (pero el estado puede tardar un tick).
      // Mejor que login retorne el usuario en success.
      // Revisando AuthContext: login guarda en AsyncStorage y setUser.
      // Vamos a navegar manualmente para asegurar la transición. 
      // Necesitamos el rol. AuthContext.login actual no devuelve el usuario en return, solo { success: true }.
      // Vamos a asumir que AsyncStorage ya tiene el dato o confiar en que se actualizó.
      // MEJORA: Leer el rol de AsyncStorage o modificar login para devolver user.
      // Por ahora, leeremos de AsyncStorage temporalmente para asegurar el rol, 
      // o modificamos AuthContext en un futuro paso. 
      // O mas simple: el usuario recien logueado TIENE que estar en AsyncStorage si login fue true.

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
            {/* Se usa el prop `disabled` y el texto cambia según el estado de carga */}
            <Button
              title={isLoading ? "Ingresando..." : "Ingresar"}
              onPress={handleLogin}
              disabled={isLoading} // Deshabilita el botón mientras la petición está en curso
              color={COLORS.SUCCESS} // Añadir color aquí puede ser útil para temas globales
            />
            {/* Mejora de UX: Indicador de carga sutil si no se usa en el botón */}
            {/* {isLoading && <ActivityIndicator style={styles.loadingIndicator} color="#49AF4E" />} */}
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

// --- Estilos del componente ---
// Se ha añadido un pequeño orden y se ha separado un estilo combinado para mayor claridad.
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 28,
    shadowColor: "#49AF4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  logo: {
    width: 110,
    height: 55,
    marginBottom: 18,
    marginTop: -10,
  },
  title: {
    fontSize: 26,
    marginBottom: 24,
    fontWeight: "bold",
    color: COLORS.SUCCESS,
    letterSpacing: 1,
  },
  // Estilo base para el TextInput
  input: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
    borderRadius: 10,
    marginBottom: 18,
    backgroundColor: COLORS.LIGHT_BG,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    position: "relative",
  },
  // Estilo específico para el input de contraseña para sobreescribir el 'marginBottom: 18' del estilo 'input'
  passwordInputBase: {
    flex: 1,
    marginBottom: 0, // Resetear el margen inferior del input base
  },
  showPasswordButton: {
    position: "absolute",
    right: 18,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  showPasswordText: {
    fontSize: 22,
    color: COLORS.PRIMARY,
  },
  buttonWrapper: {
    // Renombrado de 'button' a 'buttonWrapper' para mayor claridad
    width: "100%",
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
});

