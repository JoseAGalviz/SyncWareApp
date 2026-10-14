import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { File, Directory, Paths } from 'expo-file-system';
import { DevolucionesService } from './devolucionesService';
import { uuidv4 } from '../utils/uuid';

// Cola local + historial de devoluciones/reposiciones. Cada novedad (una por
// factura) se guarda acá antes de intentar enviarla; si no hay señal queda
// 'pendiente' y se reintenta al recuperar conexión o con "Sincronizar ahora".
// status: 'pendiente' | 'enviada' | 'rechazada'
// 'rechazada' = api-app o webdevoluciones respondieron 4xx (datos inválidos):
// terminal, reintentar no cambia nada.
//
// Las fotos se copian a documentDirectory/devoluciones/<lote>/ y se quedan en
// el teléfono — igual que el historial, nada se borra de forma automática.
// En la cola solo se guarda la ruta; el base64 se lee al momento de enviar.

const STORAGE_KEY = 'devoluciones';

// Mismo motivo que en facturasSyncQueue: serializar los read-modify-write
// sobre STORAGE_KEY para que encolar + auto-sync no se pisen.
let _cadenaEscritura = Promise.resolve();
function conLock(fn) {
  const corrida = _cadenaEscritura.then(fn, fn);
  _cadenaEscritura = corrida.then(() => {}, () => {});
  return corrida;
}

async function leerLista() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    throw new Error('El historial local de devoluciones está dañado y no se pudo leer.');
  }
}

async function guardarLista(lista) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    throw new Error('No se pudo guardar en el teléfono (memoria llena o sin espacio).');
  }
}

export async function obtenerDevoluciones() {
  return leerLista();
}

function actualizar(idLocal, cambios) {
  return conLock(async () => {
    const lista = await leerLista();
    await guardarLista(lista.map((d) => (d.id_local === idLocal ? { ...d, ...cambios } : d)));
  });
}

// Fecha local del teléfono (YYYY-MM-DD): la de "cuando se hizo la devolución",
// aunque se envíe después desde la cola.
function fechaHoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function guardarFotos(loteId, urisTemporales) {
  if (!urisTemporales.length) return [];
  const dir = new Directory(Paths.document, 'devoluciones', loteId);
  dir.create({ intermediates: true, idempotent: true });
  return urisTemporales.map((uri, i) => {
    const destino = new File(dir, `foto_${i + 1}.jpg`);
    new File(uri).copy(destino);
    return destino.uri;
  });
}

// Encola una devolución. `productos` puede traer artículos de varias facturas:
// se parte en una novedad por factura (webdevoluciones recibe una factura por
// novedad), todas con la misma clave y las mismas fotos.
// productos: [{ fact_num, co_art, art_des, codigo_barras, cantidad_facturada, cantidad_afectada }]
export async function encolarDevolucion({ usuario, cliente, tipo_novedad, observacion_clave, productos, fotos }) {
  const loteId = uuidv4();
  const fotosGuardadas = guardarFotos(loteId, fotos || []);
  const fecha = fechaHoy();
  const creadoEn = new Date().toISOString();

  const porFactura = new Map();
  for (const p of productos) {
    if (!porFactura.has(p.fact_num)) porFactura.set(p.fact_num, []);
    porFactura.get(p.fact_num).push(p);
  }

  const nuevas = [...porFactura.entries()].map(([factNum, items]) => ({
    id_local: uuidv4(),
    lote_id: loteId,
    creado_en: creadoEn,
    fecha_entrega: fecha,
    usuario_id: usuario.id,
    co_cli: cliente.co_cli,
    cliente: cliente.cli_des,
    rif: cliente.rif,
    zona: cliente.zona,
    factura_numero: factNum,
    tipo_novedad,
    observacion_clave,
    productos: items.map((i) => ({
      co_art: i.co_art,
      art_des: i.art_des,
      codigo_barras: i.codigo_barras,
      cantidad_facturada: i.cantidad_facturada,
      cantidad_afectada: i.cantidad_afectada,
    })),
    fotos: fotosGuardadas,
    status: 'pendiente',
    mensaje: null,
    intentos: 0,
    enviado_en: null,
  }));

  await conLock(async () => {
    const lista = await leerLista();
    await guardarLista([...nuevas, ...lista]);
  });
  return nuevas;
}

async function leerFotosBase64(uris) {
  const salida = [];
  for (const uri of uris || []) {
    const archivo = new File(uri);
    if (!archivo.exists) continue; // borrada a mano del teléfono: se envía sin ella
    salida.push(`data:image/jpeg;base64,${await archivo.base64()}`);
  }
  return salida;
}

async function enviarUna(d) {
  try {
    const res = await DevolucionesService.crear({
      id_local: d.id_local,
      usuario_id: d.usuario_id,
      co_cli: d.co_cli,
      factura_numero: d.factura_numero,
      tipo_novedad: d.tipo_novedad,
      observacion_clave: d.observacion_clave,
      fecha_entrega: d.fecha_entrega,
      productos: d.productos.map((p) => ({ co_art: p.co_art, cantidad_afectada: p.cantidad_afectada })),
      fotos: await leerFotosBase64(d.fotos),
    });
    await actualizar(d.id_local, {
      status: 'enviada',
      mensaje: null,
      respuesta: res?.respuesta ?? null,
      enviado_en: new Date().toISOString(),
      intentos: (d.intentos || 0) + 1,
    });
    return 'enviada';
  } catch (error) {
    const status = error?.status;
    const mensaje = error?.data?.error || error?.message || 'Error desconocido';
    // 4xx = datos inválidos (rechazada, terminal). Sin status (sin señal,
    // timeout) o 5xx/502 = reintentar después.
    const rechazada = typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429;
    await actualizar(d.id_local, {
      status: rechazada ? 'rechazada' : 'pendiente',
      mensaje,
      intentos: (d.intentos || 0) + 1,
    });
    return rechazada ? 'rechazada' : 'pendiente';
  }
}

let _sincronizacion = null;

// Envía todas las pendientes, una por una. Si ya hay una sincronización en
// curso devuelve esa misma promesa (no manda dos veces la misma novedad).
export function sincronizarPendientes() {
  if (_sincronizacion) return _sincronizacion;
  _sincronizacion = (async () => {
    const resumen = { enviadas: 0, rechazadas: 0, pendientes: 0 };
    const lista = await leerLista();
    for (const d of lista.filter((x) => x.status === 'pendiente')) {
      const r = await enviarUna(d);
      if (r === 'enviada') resumen.enviadas += 1;
      else if (r === 'rechazada') resumen.rechazadas += 1;
      else resumen.pendientes += 1;
    }
    return resumen;
  })().finally(() => { _sincronizacion = null; });
  return _sincronizacion;
}

// Una rechazada se puede volver a mandar a mano (ej. se corrigió algo en Profit).
export function reintentar(idLocal) {
  return actualizar(idLocal, { status: 'pendiente', mensaje: null });
}

export function iniciarAutoSync(onResultado) {
  return NetInfo.addEventListener(async (state) => {
    if (!state.isConnected || state.isInternetReachable === false) return;
    const lista = await leerLista().catch(() => []);
    if (!lista.some((d) => d.status === 'pendiente')) return;
    const resumen = await sincronizarPendientes();
    if (onResultado) onResultado(resumen);
  });
}
