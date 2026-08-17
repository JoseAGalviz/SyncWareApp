import { api } from './api';
import { API_ENDPOINTS } from '../constants/Config';

const BASE = API_ENDPOINTS.DESPACHO;

// Despacho de rutas (fase 1: escaneo de caja, fase 2: verificación por factura, cierre) —
// réplica del flujo real de visor (lista.php + registro.php), ver despacho.controller.js
// en api-app para la lógica de negocio completa.
export const DespachoService = {
  segmentos: (usuarioId) =>
    api.get(`${BASE}/segmentos?usuario_id=${encodeURIComponent(usuarioId)}`),

  iniciar: ({ usuario_id, ruta_codigo }) =>
    api.post(`${BASE}/iniciar`, { usuario_id, ruta_codigo }),

  pendientes: (rutagramaId, usuarioId) =>
    api.get(`${BASE}/${rutagramaId}/pendientes?usuario_id=${encodeURIComponent(usuarioId)}`),

  escanearCaja: (rutagramaId, { usuario_id, nota, caja }) =>
    api.post(`${BASE}/${rutagramaId}/escanear-caja`, { usuario_id, nota, caja }),

  listarDetalle: (rutagramaId, usuarioId) =>
    api.get(`${BASE}/${rutagramaId}/detalle?usuario_id=${encodeURIComponent(usuarioId)}`),

  descartarDetalle: (rutagramaId, detalleId) =>
    api.delete(`${BASE}/${rutagramaId}/detalle/${detalleId}`),

  verificarFactura: (rutagramaId, { usuario_id, factura, solo_factura }) =>
    api.post(`${BASE}/${rutagramaId}/verificar-factura`, { usuario_id, factura, solo_factura: !!solo_factura }),

  resumenCierre: (rutagramaId, usuarioId) =>
    api.get(`${BASE}/${rutagramaId}/resumen-cierre?usuario_id=${encodeURIComponent(usuarioId)}`),

  finalizar: (rutagramaId, { usuario_id, chofer, carro, ayudantes }) =>
    api.post(`${BASE}/${rutagramaId}/finalizar`, { usuario_id, chofer, carro, ayudantes: ayudantes || [] }),

  ncEscanear: ({ usuario_id, ruta_codigo, nota }) =>
    api.post(`${BASE}/nc/escanear`, { usuario_id, ruta_codigo, nota }),

  ncPendientes: (usuarioId, rutaCodigo) =>
    api.get(`${BASE}/nc/pendientes?usuario_id=${encodeURIComponent(usuarioId)}&ruta_codigo=${encodeURIComponent(rutaCodigo)}`),

  ncFinalizar: ({ usuario_id, ruta_codigo }) =>
    api.post(`${BASE}/nc/finalizar`, { usuario_id, ruta_codigo }),
};
