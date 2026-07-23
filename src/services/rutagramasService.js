import { api } from './api';
import { API_ENDPOINTS } from '../constants/Config';

// Rutagramas: online-simple (sin cola offline) — cada acción hace POST directo.
export const RutagramasService = {
  crear: ({ ruta, comentario, usuario_id, usuario_nombre, rol, coordenadas }) =>
    api.post(API_ENDPOINTS.RUTAGRAMAS, { ruta, comentario, usuario_id, usuario_nombre, rol, coordenadas }),

  escanear: (rutagramaId, codigo) =>
    api.post(`${API_ENDPOINTS.RUTAGRAMAS}/${rutagramaId}/escaneo`, { codigo }),

  cerrar: (rutagramaId, comentario) =>
    api.post(`${API_ENDPOINTS.RUTAGRAMAS}/${rutagramaId}/cerrar`, { comentario: comentario || null }),

  obtener: (rutagramaId) =>
    api.get(`${API_ENDPOINTS.RUTAGRAMAS}/${rutagramaId}`),

  listarPropios: (usuarioId) =>
    api.get(`${API_ENDPOINTS.RUTAGRAMAS}?usuario_id=${encodeURIComponent(usuarioId)}`),
};
