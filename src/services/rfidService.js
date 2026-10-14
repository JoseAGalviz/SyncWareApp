import { api } from './api';
import { API_ENDPOINTS } from '../constants/Config';

const BASE = API_ENDPOINTS.RFID;

// Módulo experimental: pistola Chainway SR160 (modo teclado Bluetooth HID,
// sin SDK — ver STATUS.md). Independiente del flujo real de Despacho.
export const RfidService = {
  // Mapeo completo EPC->nota, para cachear en memoria en la pantalla de escaneo.
  listarTags: () => api.get(`${BASE}/tags`),

  asociarTag: ({ usuario_id, epc, nota }) =>
    api.post(`${BASE}/tags`, { usuario_id, epc, nota }),

  eliminarTag: (epc) => api.delete(`${BASE}/tags/${encodeURIComponent(epc)}`),

  // lecturas: [{ epc, nota, veces_leido, primera_lectura, ultima_lectura }]
  guardarLecturas: ({ usuario_id, sesion_id, lecturas }) =>
    api.post(`${BASE}/lecturas`, { usuario_id, sesion_id, lecturas }),

  listarSesion: (sesionId) =>
    api.get(`${BASE}/lecturas?sesion_id=${encodeURIComponent(sesionId)}`),
};
