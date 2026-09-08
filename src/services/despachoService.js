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

  cancelar: (rutagramaId) =>
    api.delete(`${BASE}/${rutagramaId}/cancelar`),

  pendientes: (rutagramaId, usuarioId) =>
    api.get(`${BASE}/${rutagramaId}/pendientes?usuario_id=${encodeURIComponent(usuarioId)}`),

  // Escaneo unificado: un código por vez (nota o factura, sin orden fijo). El backend
  // clasifica y devuelve { accion, fila, advertencias[], totales }.
  escanear: (rutagramaId, { usuario_id, codigo, caja }) =>
    api.post(`${BASE}/${rutagramaId}/escanear`, { usuario_id, codigo, ...(caja != null ? { caja } : {}) }),

  escanearCaja: (rutagramaId, { usuario_id, nota, caja }) =>
    api.post(`${BASE}/${rutagramaId}/escanear-caja`, { usuario_id, nota, caja }),

  // `rapido:true` -> el backend salta el autocompletado de factura contra Profit (link lento).
  // Se usa en el refresh inmediato post-escaneo; el poll de fondo y la carga inicial van sin rapido.
  listarDetalle: (rutagramaId, usuarioId, { rapido } = {}) =>
    api.get(`${BASE}/${rutagramaId}/detalle?usuario_id=${encodeURIComponent(usuarioId)}${rapido ? '&rapido=1' : ''}`),

  descartarDetalle: (rutagramaId, detalleId) =>
    api.delete(`${BASE}/${rutagramaId}/detalle/${detalleId}`),

  verificarFactura: (rutagramaId, { usuario_id, factura, nota, solo_factura }) =>
    api.post(`${BASE}/${rutagramaId}/verificar-factura`, { usuario_id, factura, nota, solo_factura: !!solo_factura }),

  resumenCierre: (rutagramaId, usuarioId) =>
    api.get(`${BASE}/${rutagramaId}/resumen-cierre?usuario_id=${encodeURIComponent(usuarioId)}`),

  finalizar: (rutagramaId, { usuario_id, chofer, carro, ayudantes, responsable }) =>
    api.post(`${BASE}/${rutagramaId}/finalizar`, { usuario_id, chofer, carro, ayudantes: ayudantes || [], responsable }),

  // Catálogo de rutas que tienen al menos un rutagrama finalizado (selector del historial).
  historialRutas: () =>
    api.get(`${BASE}/historial/rutas`),

  // `desde`/`hasta` opcionales, formato YYYY-MM-DD, acotan por fecha_cierre (hasta inclusivo).
  historial: (ruta, { segmento, desde, hasta } = {}) => {
    const qs = [`ruta=${encodeURIComponent(ruta)}`];
    if (segmento) qs.push(`segmento=${encodeURIComponent(segmento)}`);
    if (desde) qs.push(`desde=${encodeURIComponent(desde)}`);
    if (hasta) qs.push(`hasta=${encodeURIComponent(hasta)}`);
    return api.get(`${BASE}/historial?${qs.join('&')}`);
  },

  // Módulo NC/ND independiente: sin ruta. Se escanea el código y se guarda.
  ncEscanear: ({ usuario_id, codigo }) =>
    api.post(`${BASE}/nc/escanear`, { usuario_id, codigo }),

  ncLista: (usuarioId, { todos } = {}) =>
    api.get(`${BASE}/nc/lista?usuario_id=${encodeURIComponent(usuarioId)}${todos ? '&todos=1' : ''}`),

  ncEliminar: (usuarioId, ncId) =>
    api.delete(`${BASE}/nc/${ncId}?usuario_id=${encodeURIComponent(usuarioId)}`),

  // Recepción de enlace entre sedes (BQTO<->S/C) — ver despachos/lista.php+registro.php
  // en el legado, y el bloque "Recepción de enlace" en despacho.controller.js.
  enlacesPendientes: (usuarioId, rutaCodigo) =>
    api.get(`${BASE}/enlaces/pendientes?usuario_id=${encodeURIComponent(usuarioId)}&ruta_codigo=${encodeURIComponent(rutaCodigo)}`),

  // Listado global de enlaces entre sedes: todos los generados, las dos direcciones,
  // en tránsito ('F') y recibidos ('E'). `estatus` y `rutaCodigo` son filtros opcionales.
  enlacesTodos: (usuarioId, { estatus, rutaCodigo } = {}) =>
    api.get(`${BASE}/enlaces?usuario_id=${encodeURIComponent(usuarioId)}` +
      (estatus ? `&estatus=${encodeURIComponent(estatus)}` : '') +
      (rutaCodigo ? `&ruta_codigo=${encodeURIComponent(rutaCodigo)}` : '')),

  detalleEnlace: (rutagramaId, usuarioId) =>
    api.get(`${BASE}/${rutagramaId}/enlace/detalle?usuario_id=${encodeURIComponent(usuarioId)}`),

  escanearEnlace: (rutagramaId, { usuario_id, codigo }) =>
    api.post(`${BASE}/${rutagramaId}/enlace/escanear`, { usuario_id, codigo }),

  recibirEnlace: (rutagramaId, { usuario_id, responsable }) =>
    api.post(`${BASE}/${rutagramaId}/enlace/recibir`, { usuario_id, responsable }),
};
