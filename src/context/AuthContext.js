import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showMessage } from "react-native-flash-message";
import { api, AUTH_TOKEN_KEY, setUnauthorizedHandler } from "../services/api";
import { API_ENDPOINTS } from "../constants/Config";

const AuthContext = createContext();

export const USER_DATA_KEY = "userData";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSplashLoading, setIsSplashLoading] = useState(true);

    // Check for logged in user on startup
    useEffect(() => {
        isLoggedIn();
    }, []);

    const isLoggedIn = async () => {
        try {
            setIsSplashLoading(true);
            const userData = await AsyncStorage.getItem(USER_DATA_KEY);
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (e) {
            console.error("Auth Error:", e);
        } finally {
            setIsSplashLoading(false);
        }
    };

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const response = await api.post(API_ENDPOINTS.LOGIN, {
                username,
                password,
            });

            if (response && response.user) {
                const userInfo = response.user;
                setUser(userInfo);
                await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userInfo));
                if (response.token) {
                    await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
                }
                return { success: true };
            } else {
                return {
                    success: false,
                    error: "Respuesta inválida del servidor",
                };
            }
        } catch (error) {
            console.error("Login call failed", error);
            
            let errorMessage = "Error al iniciar sesión";
            
            if (error.status === 401) {
                errorMessage = "Usuario o contraseña incorrectos. Por favor, verifique sus datos.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await AsyncStorage.removeItem(USER_DATA_KEY);
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            setUser(null);
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Handler registrado una sola vez: usa la ref para no quedar atado al `logout`
    // de la primera render (closure vieja) mientras el componente vive re-renderizando.
    const logoutRef = useRef(logout);
    logoutRef.current = logout;

    useEffect(() => {
        setUnauthorizedHandler(() => {
            showMessage({
                message: "Sesión expirada",
                description: "Tu sesión ya no es válida. Inicia sesión de nuevo.",
                type: "warning",
            });
            logoutRef.current();
        });
        return () => setUnauthorizedHandler(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isLoading,
                isSplashLoading,
                user,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
