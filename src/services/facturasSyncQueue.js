import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { API_ENDPOINTS } from '../constants/Config';
import { uuidv4 } from '../utils/uuid';

// Cola local de facturas escaneadas. El escaneo solo captura estos datos — el cálculo de
// fecha_venc, cliente, zona, etc. lo hace el servidor en /facturas/batch-scan.
// status: 'pendiente' (por sincronizar) | 'sincronizada' | 'duplicada' | 'no_encontrada' | 'error'
//         | 'invalido' | 'fallido' | 'ambiguo'
// 'no_encontrada' = la factura aún no se propagó al vendedor; se reintenta en el próximo sync.
// 'ambiguo' = entrada manual sin letra (fact_num de 7 dígitos) que calzó con una factura en
// la serie A y otra en la B a la vez — el server no puede adivinar cuál es, terminal como
// 'invalido'/'fallido' (no se reintenta solo).

const STORAGE_KEY = 'facturas';
const FACTURAS_LIMITE = 500;
const DIAS_RETENCION_HISTORIAL = 7;
// Alineado con MAX_BATCH_ITEMS en el server (facturas.controller.js) — Profit bloquea
// conexiones que le parecen pesadas, así que el lote se mantiene chico a propósito.
const BATCH_SIZE = 50;
// Tras este número de intentos automáticos, 'error'/'no_encontrada' pasan a 'fallido'
// (terminal) — sin esto un ítem roto de forma persistente se reintenta para siempre en
// cada sync, inflando el backlog y el volumen de requests fallidos sin ningún avance.
const MAX_INTENTOS_AUTO = 8;

// 'invalido' y 'fallido' son terminales: no se reintentan solos, quedan para que el
// usuario los revise y los borre con "Limpiar historial" (ambos caen fuera de esta lista,
// así que podarResueltos/limpiarHistorialResuelto ya los trata como resueltos).
const ESTADOS_PENDIENTES = ['pendiente', 'no_encontrada', 'error'];

// Cualquier fallo acá (storage corrupto, JSON roto) se propaga en vez de devolver []
// en silencio — el backlog de pendientes por sincronizar no debe desaparecer de la
// pantalla sin ningún aviso, indistinguible de "no hay nada pendiente".
async function leerLista() {
  let stored;
  try {
    stored = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (e) {
    throw new Error('No se pudo acceder al almacenamiento del teléfono.');
  }
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    throw new Error('El historial local de facturas está dañado y no se pudo leer.');
  }
}

async function guardarLista(lista) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    throw new Error('No se pudo guardar en el teléfono (memoria llena o sin espacio).');
  }
}

// Poda solo registros ya resueltos (sincronizada/duplicada) por antigüedad y cantidad.
// Los pendientes (incluye no_encontrada/error, que deben reintentarse) nunca se descartan aquí.
function podarResueltos(lista) {
  const pendientes = lista.filter(f => ESTADOS_PENDIENTES.includes(f.status));
  let resueltos = lista.filter(f => !ESTADOS_PENDIENTES.includes(f.status));

  const hoy = new Date();
  resueltos = resueltos.filter(f => {
    if (!f.fecha_escaneo) return true;
    try {
      const diff = (hoy - new Date(f.fecha_escaneo)) / (1000 * 60 * 60 * 24);
      return diff <= DIAS_RETENCION_HISTORIAL;
    } catch {
      return false;
    }
  });

  const cupoResueltos = Math.max(FACTURAS_LIMITE - pendientes.length, 0);
  if (resueltos.length > cupoResueltos) {
    resueltos.sort((a, b) => new Date(b.fecha_escaneo || 0) - new Date(a.fecha_escaneo || 0));
    resueltos = resueltos.slice(0, cupoResueltos);
  }

  return [...pendientes, ...resueltos];
}

export async function obtenerFacturas() {
  const lista = podarResueltos(await leerLista());
  await guardarLista(lista);
  return lista;
}

export function contarPendientes(lista) {
  return lista.filter(f => ESTADOS_PENDIENTES.includes(f.status)).length;
}

export async function hayConexion() {
  const estado = await NetInfo.fetch();
  return !!estado.isConnected && estado.isInternetReachable !== false;
}

// Encola un escaneo. No requiere que el servidor lo confirme antes — el fact_num puede ni
// siquiera existir todavía en el sistema (ventana de propagación), eso se resuelve al
// sincronizar. `origen` se decide acá según había señal o no en el momento del escaneo
// (el servidor lo guarda tal cual, ver origen en facturas_cargadas / escribirEscaneoFactura).
export async function encolarFactura({ fact_num, coordenadas }) {
  const lista = await obtenerFacturas();

  const yaExiste = lista.some(f => String(f.fact_num) === String(fact_num));
  if (yaExiste) {
    return { ok: false, motivo: 'duplicada_local' };
  }

  const origen = (await hayConexion()) ? 'online' : 'offline';
  const item = {
    id_local: uuidv4(),
    fact_num: String(fact_num),
    fecha_escaneo: new Date().toISOString(),
    coordenadas: coordenadas || null,
    origen,
    status: 'pendiente',
    intentos: 0,
  };

  lista.push(item);
  await guardarLista(lista);
  return { ok: true, item };
}

// Limpia solo el historial ya resuelto (sincronizadas/duplicadas). Los pendientes se conservan
// siempre — nunca se pierde un escaneo por limpiar la pantalla.
export async function limpiarHistorialResuelto() {
  const lista = await leerLista();
  const pendientes = lista.filter(f => ESTADOS_PENDIENTES.includes(f.status));
  await guardarLista(pendientes);
  return pendientes;
}

// Consulta en vivo de solo lectura (no marca la factura ni escribe nada) — usada para
// mostrarle al vendedor los datos reales antes de comprometer el escaneo, cuando hay conexión.
export async function consultarFactura(fact_num) {
  return api.post(API_ENDPOINTS.FACTURAS_SCAN, { num_factura: String(fact_num) });
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Sube lo pendiente (incluye reintentos de no_encontrada/error) en lotes.
// `soloIdLocal`: limita el envío a un solo ítem — usado justo después de escanear, para no
// re-mandar el backlog entero (con 20+ pendientes atascados, cada escaneo nuevo antes
// reintentaba TODOS de nuevo). El sync completo sigue disponible sin este parámetro,
// para "Sincronizar ahora" y el auto-sync al recuperar señal.
// Devuelve conteo por resultado; nunca lanza por fallo de red — deja el item en 'pendiente'
// para que el próximo sync (automático al recuperar señal, o manual) lo reintente.
export async function sincronizarPendientes({ soloIdLocal } = {}) {
  const lista = await obtenerFacturas();
  let pendientes = lista.filter(f => ESTADOS_PENDIENTES.includes(f.status));
  if (soloIdLocal) pendientes = pendientes.filter(f => f.id_local === soloIdLocal);

  const resumen = { enviados: pendientes.length, ok: 0, duplicadas: 0, no_encontradas: 0, invalidas: 0, fallidas: 0, ambiguas: 0, errores: 0, sinConexion: 0 };
  if (!pendientes.length) return resumen;

  const porId = new Map(lista.map(f => [f.id_local, f]));
  const lotes = chunk(pendientes, BATCH_SIZE);

  for (const lote of lotes) {
    try {
      const payload = {
        items: lote.map(f => ({
          id_local: f.id_local,
          fact_num: f.fact_num,
          fecha_escaneo: f.fecha_escaneo,
          coordenadas: f.coordenadas,
          origen: f.origen || 'online',
        })),
      };
      const respuesta = await api.post(API_ENDPOINTS.FACTURAS_BATCH_SCAN, payload);
      const resultados = respuesta?.resultados || [];

      for (const r of resultados) {
        const item = porId.get(r.id_local);
        if (!item) continue;

        // 'invalido' no deja registro — se descarta del todo, no se marca. El bloqueo en
        // el confirm de FacturasScreen ya evita la mayoría en origen; esto es la red de
        // seguridad si alguno igual llegó a encolarse (ej. entrada manual vieja).
        if (r.status === 'invalido') {
          porId.delete(r.id_local);
          resumen.invalidas++;
          continue;
        }

        // El servidor manda 'ok'; el vocabulario local usa 'sincronizada' (ver ESTADO_LABEL
        // y los checks en FacturasScreen). Los demás status ('duplicada'/'no_encontrada'/'error')
        // ya coinciden entre server y cliente.
        item.status = r.status === 'ok' ? 'sincronizada' : r.status;
        item.intentos = (item.intentos || 0) + 1;
        item.ultimoError = r.error || r.advertencia || null;

        if (r.status === 'ok') {
          resumen.ok++;
          item.cli_des = r.cli_des ?? item.cli_des;
          item.dias_credito = r.dias_credito ?? item.dias_credito;
          item.fec_venc_despues = r.fec_venc_actualizado ?? item.fec_venc_despues;
          item.fuera_de_rango = r.fuera_de_rango ?? item.fuera_de_rango;
          item.motivo_fecha_no_modificada = r.motivo_fecha_no_modificada ?? null;
          item.zon_des = r.zon_des ?? item.zon_des;
          item.seg_des = r.seg_des ?? item.seg_des;
        } else if (r.status === 'duplicada') {
          resumen.duplicadas++;
        } else if (r.status === 'no_encontrada') {
          resumen.no_encontradas++;
        } else if (r.status === 'ambiguo') {
          // Terminal, como 'invalido'/'fallido': el número sin letra calzó con una factura
          // en la serie A y otra en la B a la vez, no se puede adivinar sola. No se
          // reintenta (no está en ESTADOS_PENDIENTES) — el vendedor la reingresa con la
          // letra o escanea el código de barras.
          resumen.ambiguas++;
        } else {
          resumen.errores++;
        }

        // Tope de reintentos automáticos: 'error'/'no_encontrada' persistentes pasan a
        // 'fallido' (terminal) en vez de seguir reintentándose para siempre solos.
        if ((item.status === 'error' || item.status === 'no_encontrada') && item.intentos >= MAX_INTENTOS_AUTO) {
          item.status = 'fallido';
          resumen.fallidas++;
        }
      }
    } catch (err) {
      const statusHttp = err?.status;
      if (statusHttp) {
        // El server respondió con un error real (401/403/500/503...), no es falta de señal.
        // Se deja para reintentar igual, pero se marca como 'error' (no 'pendiente' mudo)
        // para que no se confunda con "sin conexión" ni quede indistinguible en el historial.
        for (const f of lote) {
          f.intentos = (f.intentos || 0) + 1;
          f.status = f.intentos >= MAX_INTENTOS_AUTO ? 'fallido' : 'error';
          f.ultimoError = `Error del servidor (HTTP ${statusHttp}) — intento ${f.intentos}`;
        }
        resumen.errores += lote.length;
      } else {
        // Sin conexión o timeout a mitad de sync: el lote entero queda 'pendiente' para reintentar.
        resumen.sinConexion += lote.length;
      }
    }
  }

  await guardarLista(Array.from(porId.values()));
  return resumen;
}

// Dispara sincronizarPendientes automáticamente al recuperar conexión.
// Devuelve función para desuscribirse (llamar en cleanup del useEffect).
export function iniciarAutoSync(onResultado) {
  let sincronizando = false;
  return NetInfo.addEventListener(async (state) => {
    if (sincronizando) return;
    if (!state.isConnected || state.isInternetReachable === false) return;

    sincronizando = true;
    try {
      const resumen = await sincronizarPendientes();
      if (onResultado) onResultado(resumen);
    } finally {
      sincronizando = false;
    }
  });
}
