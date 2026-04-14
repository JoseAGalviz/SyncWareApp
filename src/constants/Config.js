export const Config = {
  API_BASE_URL: "https://98.94.185.164.nip.io",
  TIMEOUT: 60000, // 60 seconds
  IVA: 0.16, // 16%
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
  GESTIONES: "/api/gestiones",
};
