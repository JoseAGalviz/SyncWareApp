import { api } from './api';
import { API_ENDPOINTS } from '../constants/Config';

const BASE = API_ENDPOINTS.DEVOLUCIONES;

// Módulo Devoluciones/Reposiciones — api-app completa los datos con Profit y
// reenvía a webdevoluciones (la API key nunca sale del servidor).
export const DevolucionesService = {
  buscarClientes: (q) => api.get(`${BASE}/clientes?q=${encodeURIComponent(q)}`),

  // Todo lo facturado al cliente en el último año, agrupado por artículo; cada
  // factura con su cupo (disponible = facturado − ya devuelto).
  articulosCliente: (coCli) => api.get(`${BASE}/clientes/${encodeURIComponent(coCli)}/articulos`),

  // Una factura puntual -> { cliente, fact_num, items } (misma forma que articulosCliente).
  factura: (factNum) => api.get(`${BASE}/facturas/${encodeURIComponent(factNum)}`),

  // Foto del empaque (base64) -> lo que se lee: { texto_leido, nombre_comercial,
  // principio_activo, laboratorio, concentracion, codigo_barras } (Qwen-VL en GDX).
  ocrArticulo: (imagen) => api.post(`${BASE}/ocr`, { imagen }, { timeout: 60000 }),

  // Las fotos van en base64: timeout más largo que el default.
  crear: (novedad) => api.post(BASE, novedad, { timeout: 120000 }),
};
