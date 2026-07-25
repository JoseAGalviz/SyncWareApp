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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, USER_DATA_KEY } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
      className="flex-1 w-full h-full"
      resizeMode="cover"
    >
      <View className="flex-1 justify-center items-center p-5 bg-surface-base/90">
        <View className="w-full max-w-[360px] bg-surface-card rounded-2xl py-8 px-6 items-center border border-surface-border">
          <Image
            source={require("../../assets/logo.png")}
            className="w-[120px] h-[60px] mb-5"
            resizeMode="contain"
          />

          <Text className="text-2xl font-bold text-primary mb-6 tracking-wide">
            Iniciar Sesión
          </Text>

          <TextInput
            className="w-full py-3 px-4 border border-surface-border rounded-lg mb-4 bg-surface-raised text-[15px] text-ink"
            placeholder="Usuario"
            placeholderTextColor="#64748B"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="username"
            editable={!isLoading}
          />

          <View className="w-full flex-row items-center mb-4 relative">
            <TextInput
              className="flex-1 py-3 px-4 border border-surface-border rounded-lg bg-surface-raised text-[15px] text-ink"
              placeholder="Contraseña"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              textContentType="password"
              editable={!isLoading}
            />
            <TouchableOpacity
              className="absolute right-4 p-1.5 justify-center items-center"
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="w-full mt-1 rounded-lg bg-primary py-3.5 items-center justify-center active:bg-primary-dark"
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B1120" />
            ) : (
              <Text className="text-surface-base font-bold text-base">Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}
