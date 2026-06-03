import { Platform } from 'react-native';
import { API_BASE_URL, IMAGES_BASE_URL, MAIL_BASE_URL, DESPACHO_URL } from '@env';

export const Config = {
  API_BASE_URL: Platform.OS === 'web' ? '' : (API_BASE_URL || "https://98.94.185.164.nip.io"),
  IMAGES_BASE_URL: IMAGES_BASE_URL || "https://imagenes.cristmedicals.com",
  MAIL_BASE_URL: MAIL_BASE_URL || "http://98.94.185.164:8025",
  DESPACHO_URL: DESPACHO_URL || "https://despacho.cristmedicals.com",
  TIMEOUT: 60000,
  IVA: 0.16,
};

export const API_ENDPOINTS = {
  LOGIN: "/api/auth/login",
  CLIENTES_GESTIONES: "/api/clientes/gestiones-bitrix",
  CLIENTES_SEGMENTOS: "/api/clientes/segmentos",
  CATALOGO: "/api/pedidosApp/catalogo",
  CLIENTES_PEDIDOS: "/api/pedidosApp/clientes",
  TIEMPOS_PAGO: "/api/transferencias/tiempos-pago",
  CREAR_PEDIDO: "/api/pedidosApp/crear",
  OBTENER_PEDIDOS: "/api/pedidosApp/pedidos",
  DESCUENTOS_ESCALA: "/api/pedidosApp/descuentos-escala",
  GESTIONES: "/api/gestiones",
  REPORTE_DESPACHO: "/api/gestiones/reporteDespacho",
};
