import AsyncStorage from "@react-native-async-storage/async-storage";
import { Config } from "../constants/Config";

export const AUTH_TOKEN_KEY = "authToken";

// Registrado por AuthContext al montar. Se dispara ante un 401 en una request que SÍ
// llevaba token (token guardado pero rechazado por el server — firma inválida por
// rotación de JWT_SECRET, token corrupto, etc). Login sin token de por medio no cuenta:
// ese 401 es "credenciales incorrectas", lo maneja la pantalla de login normalmente.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
    unauthorizedHandler = fn;
}

class ApiService {
    /**
     * Generic fetch wrapper with timeout and error handling
     * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
     * @param {object} options - Fetch options (method, headers, body, etc.)
     * @returns {Promise<any>} - JSON response
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith("http")
            ? endpoint
            : `${Config.API_BASE_URL}${endpoint}`;
        console.log('[api] URL:', url);
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const config = {
            ...options,
            headers,
        };

        // Create a timeout promise
        const timeoutMs = options.timeout || Config.TIMEOUT;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Request timed out"));
            }, timeoutMs);
        });

        try {
            const response = await Promise.race([
                fetch(url, config),
                timeoutPromise,
            ]);

            // Check if response is JSON (content-type)
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                if (response.status === 401 && token && unauthorizedHandler) {
                    unauthorizedHandler();
                }
                // Handle HTTP errors
                throw {
                    status: response.status,
                    message: data.message || `HTTP Error ${response.status}`,
                    data,
                };
            }

            return data;
        } catch (error) {
            console.error(`API Request Error [${endpoint}]:`, error, JSON.stringify(error));
            throw error; // Re-throw for caller to handle
        }
    }

    get(endpoint, headers = {}) {
        return this.request(endpoint, { method: "GET", headers });
    }

    post(endpoint, body, options = {}) {
        const { headers, ...restOptions } = options;
        return this.request(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
            headers: headers || {},
            ...restOptions,
        });
    }
}

export const api = new ApiService();

export async function getAuthToken() {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function getAuthHeader() {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
