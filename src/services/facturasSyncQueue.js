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
//
// REGLA DURA: el historial guardado en el teléfono NO se borra nunca de forma automática.
// No hay poda por antigüedad ni tope de registros. Lo único que borra algo es el botón
// "Limpiar historial" (limpiarHistorialResuelto), que es una acción explícita del usuario
// con diálogo de confirmación y solo toca lo ya resuelto.

const STORAGE_KEY = 'facturas';
// Alineado con MAX_BATCH_ITEMS en el server (facturas.controller.js) — Profit bloquea
// conexiones que le parecen pesadas, así que el lote se mantiene chico a propósito.
const BATCH_SIZE = 50;
// Tras este número de intentos automáticos, 'error'/'no_encontrada' pasan a 'fallido'
// (terminal) — sin esto un ítem roto de forma persistente se reintenta para siempre en
// cada sync, inflando el backlog y el volumen de requests fallidos sin ningún avance.
// 'fallido' NO se borra: queda visible en el historial para revisión manual.
const MAX_INTENTOS_AUTO = 8;

// 'invalido', 'fallido' y 'ambiguo' son terminales: no se reintentan solos. Quedan en el
// historial para que el usuario los revise; solo salen con "Limpiar historial".
const ESTADOS_PENDIENTES = ['pendiente', 'no_encontrada', 'error'];

// --------------------------------------------------------------------------------------
// Serialización de las escrituras a STORAGE_KEY. Sin esto, dos flujos que hacen
// read-modify-write sobre la misma clave (encolar un número nuevo + el auto-sync que
// dispara NetInfo al recuperar señal + "Sincronizar ahora") se pisan: el que termina
// último guarda su copia en memoria y borra lo que el otro agregó en el ínterin —
// exactamente "se borran facturas del historial". Toda mutación de la lista pasa por acá.
// --------------------------------------------------------------------------------------
let _cadenaEscritura = Promise.resolve();
function conLock(fn) {
  const corrida = _cadenaEscritura.then(fn, fn);
  // Un rechazo no debe romper la cadena para las siguientes operaciones.
  _cadenaEscritura = corrida.then(() => {}, () => {});
  return corrida;
}

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
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
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

// Devuelve el historial completo, tal cual está guardado. NO poda, NO recorta, NO reescribe
// (una lectura no debe tener efectos de escritura — era otra ventana de carrera).
export async function obtenerFacturas() {
  return leerLista();
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
// (el servidor lo guarda tal cual en facturas_cargadas / escribirEscaneoFactura).
// Todo el read-check-write va bajo lock: dos "Agregar" seguidos, o un Agregar mientras
// corre un sync, no se pisan.
export async function encolarFactura({ fact_num, coordenadas }) {
  const online = await hayConexion(); // I/O de red: fuera del lock

  return conLock(async () => {
    const lista = await leerLista();

    const yaExiste = lista.some(f => String(f.fact_num) === String(fact_num));
    if (yaExiste) {
      return { ok: false, motivo: 'duplicada_local' };
    }

    const item = {
      id_local: uuidv4(),
      fact_num: String(fact_num),
      fecha_escaneo: new Date().toISOString(),
      coordenadas: coordenadas || null,
      origen: online ? 'online' : 'offline',
      status: 'pendiente',
      intentos: 0,
    };

    lista.push(item);
    await guardarLista(lista);
    return { ok: true, item };
  });
}

// Limpia solo el historial ya resuelto (todo lo que no está en ESTADOS_PENDIENTES:
// sincronizadas, duplicadas, inválidas, ambiguas, fallidas). Los pendientes se conservan
// siempre. Es la ÚNICA forma de borrar algo del historial y es una acción explícita del
// usuario (botón + diálogo de confirmación en FacturasScreen).
export async function limpiarHistorialResuelto() {
  return conLock(async () => {
    const lista = await leerLista();
    const pendientes = lista.filter(f => ESTADOS_PENDIENTES.includes(f.status));
    await guardarLista(pendientes);
    return pendientes;
  });
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
//
// El envío por red se hace FUERA del lock; los resultados se aplican DENTRO, releyendo la
// lista y fusionando por id_local. Así, un ítem encolado mientras el sync estaba en vuelo
// sigue estando cuando se guarda — nunca se pierde un escaneo por una carrera.
// Devuelve conteo por resultado; nunca lanza por fallo de red — deja el ítem en 'pendiente'
// para que el próximo sync (automático al recuperar señal, o manual) lo reintente.
export async function sincronizarPendientes({ soloIdLocal } = {}) {
  const listaInicial = await leerLista();
  let pendientes = listaInicial.filter(f => ESTADOS_PENDIENTES.includes(f.status));
  if (soloIdLocal) pendientes = pendientes.filter(f => f.id_local === soloIdLocal);

  const resumen = { enviados: pendientes.length, ok: 0, duplicadas: 0, no_encontradas: 0, invalidas: 0, fallidas: 0, ambiguas: 0, errores: 0, sinConexion: 0 };
  if (!pendientes.length) return resumen;

  // id_local -> parche a aplicar sobre el ítem. NUNCA lleva "borrar": ni 'invalido' saca
  // la fila del historial, solo la marca.
  const parches = new Map();
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
        const base = lote.find(f => f.id_local === r.id_local);
        if (!base) continue;

        const parche = {
          intentos: (base.intentos || 0) + 1,
          ultimoError: r.error || r.advertencia || null,
        };

        if (r.status === 'invalido') {
          // El bloqueo en el confirm de FacturasScreen ya evita la mayoría en origen; si
          // alguno igual llegó a encolarse (ej. entrada manual vieja), se MARCA 'invalido'
          // y queda en el historial. NO se descarta — el historial no se borra solo.
          parche.status = 'invalido';
          resumen.invalidas++;
        } else {
          // El servidor manda 'ok'; el vocabulario local usa 'sincronizada' (ver ESTADO_LABEL
          // y los checks en FacturasScreen). Los demás status ('duplicada'/'no_encontrada'/'error')
          // ya coinciden entre server y cliente.
          parche.status = r.status === 'ok' ? 'sincronizada' : r.status;

          if (r.status === 'ok') {
            resumen.ok++;
            parche.cli_des = r.cli_des ?? base.cli_des;
            parche.dias_credito = r.dias_credito ?? base.dias_credito;
            parche.fec_venc_despues = r.fec_venc_actualizado ?? base.fec_venc_despues;
            parche.fuera_de_rango = r.fuera_de_rango ?? base.fuera_de_rango;
            parche.motivo_fecha_no_modificada = r.motivo_fecha_no_modificada ?? null;
            parche.zon_des = r.zon_des ?? base.zon_des;
            parche.seg_des = r.seg_des ?? base.seg_des;
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
          if ((parche.status === 'error' || parche.status === 'no_encontrada') && parche.intentos >= MAX_INTENTOS_AUTO) {
            parche.status = 'fallido';
            resumen.fallidas++;
          }
        }

        parches.set(r.id_local, parche);
      }
    } catch (err) {
      const statusHttp = err?.status;
      if (statusHttp) {
        // El server respondió con un error real (401/403/500/503...), no es falta de señal.
        // Se deja para reintentar igual, pero se marca como 'error' (no 'pendiente' mudo)
        // para que no se confunda con "sin conexión" ni quede indistinguible en el historial.
        for (const f of lote) {
          const intentos = (f.intentos || 0) + 1;
          parches.set(f.id_local, {
            intentos,
            status: intentos >= MAX_INTENTOS_AUTO ? 'fallido' : 'error',
            ultimoError: `Error del servidor (HTTP ${statusHttp}) — intento ${intentos}`,
          });
        }
        resumen.errores += lote.length;
      } else {
        // Sin conexión o timeout a mitad de sync: el lote entero queda 'pendiente' para reintentar.
        resumen.sinConexion += lote.length;
      }
    }
  }

  // Aplicación bajo lock: re-lee la lista actual (puede tener ítems encolados mientras
  // corría el envío) y fusiona los parches por id_local. Un ítem sin parche queda intacto.
  await conLock(async () => {
    const actual = await leerLista();
    const fusionada = actual.map(f => {
      const parche = parches.get(f.id_local);
      return parche ? { ...f, ...parche } : f;
    });
    await guardarLista(fusionada);
  });

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
