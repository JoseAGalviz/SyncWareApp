/* eslint-disable no-undef */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../api';
import {
  obtenerFacturas,
  contarPendientes,
  encolarFactura,
  limpiarHistorialResuelto,
  sincronizarPendientes,
  iniciarAutoSync,
  hayConexion,
} from '../facturasSyncQueue';

jest.mock('../api', () => ({ api: { post: jest.fn() } }));

const STORAGE_KEY = 'facturas';

const leerStorage = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};
const sembrar = (lista) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
const item = (over = {}) => ({
  id_local: over.id_local || `id-${Math.random().toString(36).slice(2)}`,
  fact_num: over.fact_num || '392208',
  fecha_escaneo: over.fecha_escaneo || new Date().toISOString(),
  coordenadas: over.coordenadas ?? null,
  origen: over.origen || 'online',
  status: over.status || 'pendiente',
  intentos: over.intentos ?? 0,
  ...over,
});
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();

beforeEach(async () => {
  await AsyncStorage.clear();
  NetInfo.__reset();
  api.post.mockReset();
});

// ------------------------------------------------------------------ encolarFactura
describe('encolarFactura', () => {
  test('con señal encola status "pendiente" y origen "online"', async () => {
    NetInfo.__setState({ isConnected: true, isInternetReachable: true });
    const res = await encolarFactura({ fact_num: '392208', coordenadas: '1,2' });
    expect(res.ok).toBe(true);
    expect(res.item).toMatchObject({ fact_num: '392208', status: 'pendiente', origen: 'online', coordenadas: '1,2' });
    expect(res.item.id_local).toBeTruthy();
    const guardado = await leerStorage();
    expect(guardado).toHaveLength(1);
    expect(guardado[0].fact_num).toBe('392208');
  });

  test('sin señal encola con origen "offline"', async () => {
    NetInfo.__setState({ isConnected: false, isInternetReachable: false });
    const res = await encolarFactura({ fact_num: '72150775' });
    expect(res.ok).toBe(true);
    expect(res.item.origen).toBe('offline');
    expect(res.item.coordenadas).toBeNull();
  });

  test('rechaza duplicado local sin tocar la lista', async () => {
    await encolarFactura({ fact_num: '392208' });
    const res = await encolarFactura({ fact_num: '392208' });
    expect(res).toEqual({ ok: false, motivo: 'duplicada_local' });
    expect(await leerStorage()).toHaveLength(1);
  });
});

// ------------------------------------------------------------------ obtenerFacturas (NO borra)
describe('obtenerFacturas — el historial no se poda nunca', () => {
  test('conserva facturas sincronizadas viejas (100 días)', async () => {
    await sembrar([
      item({ fact_num: 'A0000001', status: 'sincronizada', fecha_escaneo: diasAtras(100) }),
      item({ fact_num: 'A0000002', status: 'duplicada', fecha_escaneo: diasAtras(365) }),
      item({ fact_num: 'A0000003', status: 'pendiente' }),
    ]);
    const lista = await obtenerFacturas();
    expect(lista.map((f) => f.fact_num).sort()).toEqual(['A0000001', 'A0000002', 'A0000003']);
  });

  test('no reescribe el storage al leer (sin efectos de escritura)', async () => {
    await sembrar([item({ status: 'sincronizada', fecha_escaneo: diasAtras(100) })]);
    AsyncStorage.setItem.mockClear(); // descartar el setItem del sembrado
    await obtenerFacturas();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('no descarta ítems con fecha_escaneo corrupta', async () => {
    await sembrar([
      item({ fact_num: 'A0000001', status: 'sincronizada', fecha_escaneo: 'no-es-fecha' }),
      item({ fact_num: 'A0000002', status: 'sincronizada', fecha_escaneo: null }),
    ]);
    const lista = await obtenerFacturas();
    expect(lista).toHaveLength(2);
  });

  test('no aplica ningún tope de cantidad (600 resueltas siguen ahí)', async () => {
    const muchas = Array.from({ length: 600 }, (_, i) =>
      item({ fact_num: `A${String(i).padStart(7, '0')}`, status: 'sincronizada', fecha_escaneo: diasAtras(30) })
    );
    await sembrar(muchas);
    expect(await obtenerFacturas()).toHaveLength(600);
  });

  test('storage vacío o corrupto no explota', async () => {
    expect(await obtenerFacturas()).toEqual([]);
    await AsyncStorage.setItem(STORAGE_KEY, '{no json');
    await expect(obtenerFacturas()).rejects.toThrow(/dañado/);
  });

  test('si el storage no tiene un array guardado, devuelve []', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ no: 'es-array' }));
    expect(await obtenerFacturas()).toEqual([]);
  });
});

// ------------------------------------------------------------------ contarPendientes
test('contarPendientes solo cuenta pendiente/no_encontrada/error', () => {
  const lista = [
    item({ status: 'pendiente' }),
    item({ status: 'no_encontrada' }),
    item({ status: 'error' }),
    item({ status: 'sincronizada' }),
    item({ status: 'invalido' }),
    item({ status: 'fallido' }),
    item({ status: 'ambiguo' }),
  ];
  expect(contarPendientes(lista)).toBe(3);
});

// ------------------------------------------------------------------ limpiarHistorialResuelto
describe('limpiarHistorialResuelto', () => {
  test('borra lo resuelto y conserva TODO lo pendiente', async () => {
    await sembrar([
      item({ fact_num: 'P1', status: 'pendiente' }),
      item({ fact_num: 'P2', status: 'no_encontrada' }),
      item({ fact_num: 'P3', status: 'error' }),
      item({ fact_num: 'R1', status: 'sincronizada' }),
      item({ fact_num: 'R2', status: 'duplicada' }),
      item({ fact_num: 'R3', status: 'invalido' }),
      item({ fact_num: 'R4', status: 'ambiguo' }),
      item({ fact_num: 'R5', status: 'fallido' }),
    ]);
    const quedan = await limpiarHistorialResuelto();
    expect(quedan.map((f) => f.fact_num).sort()).toEqual(['P1', 'P2', 'P3']);
    expect((await leerStorage()).map((f) => f.fact_num).sort()).toEqual(['P1', 'P2', 'P3']);
  });
});

// ------------------------------------------------------------------ sincronizarPendientes
describe('sincronizarPendientes', () => {
  const encolar = async (fact_num, online = true) => {
    NetInfo.__setState({ isConnected: online, isInternetReachable: online });
    const { item: it } = await encolarFactura({ fact_num });
    return it;
  };

  test('sin pendientes devuelve resumen en cero y no llama al server', async () => {
    await sembrar([item({ status: 'sincronizada' })]);
    const r = await sincronizarPendientes();
    expect(r.enviados).toBe(0);
    expect(api.post).not.toHaveBeenCalled();
  });

  test('status "ok" marca "sincronizada" y copia los datos del server', async () => {
    const it = await encolar('392208');
    api.post.mockResolvedValueOnce({
      resultados: [{ id_local: it.id_local, status: 'ok', cli_des: 'CLIENTE X', dias_credito: 30, fec_venc_actualizado: '2026-10-01', zon_des: 'ZONA 1', seg_des: 'SEG A' }],
    });
    const r = await sincronizarPendientes();
    expect(r.ok).toBe(1);
    const [g] = await leerStorage();
    expect(g).toMatchObject({ status: 'sincronizada', cli_des: 'CLIENTE X', dias_credito: 30, fec_venc_despues: '2026-10-01', zon_des: 'ZONA 1', seg_des: 'SEG A' });
  });

  test('"no_encontrada" queda pendiente de reintento (sigue en la lista)', async () => {
    const it = await encolar('392208');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: it.id_local, status: 'no_encontrada' }] });
    const r = await sincronizarPendientes();
    expect(r.no_encontradas).toBe(1);
    const [g] = await leerStorage();
    expect(g.status).toBe('no_encontrada');
    expect(contarPendientes(await leerStorage())).toBe(1);
  });

  test('"invalido" del server NO borra la fila — la marca', async () => {
    const it = await encolar('999');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: it.id_local, status: 'invalido', error: 'formato' }] });
    const r = await sincronizarPendientes();
    expect(r.invalidas).toBe(1);
    const guardado = await leerStorage();
    expect(guardado).toHaveLength(1);
    expect(guardado[0]).toMatchObject({ status: 'invalido', fact_num: '999', ultimoError: 'formato' });
  });

  test('"duplicada" del server: se marca y sale de pendientes', async () => {
    const it = await encolar('392208');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: it.id_local, status: 'duplicada' }] });
    const r = await sincronizarPendientes();
    expect(r.duplicadas).toBe(1);
    expect((await leerStorage())[0].status).toBe('duplicada');
    expect(contarPendientes(await leerStorage())).toBe(0);
  });

  test('status desconocido del server cae en "errores" sin borrar la fila', async () => {
    const it = await encolar('392208');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: it.id_local, status: 'algo_raro' }] });
    const r = await sincronizarPendientes();
    expect(r.errores).toBe(1);
    const guardado = await leerStorage();
    expect(guardado).toHaveLength(1);
    expect(guardado[0].status).toBe('algo_raro');
  });

  test('"ambiguo" es terminal y se conserva en el historial', async () => {
    const it = await encolar('7215077');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: it.id_local, status: 'ambiguo' }] });
    const r = await sincronizarPendientes();
    expect(r.ambiguas).toBe(1);
    expect((await leerStorage())[0].status).toBe('ambiguo');
    expect(contarPendientes(await leerStorage())).toBe(0);
  });

  test('error HTTP del server marca "error" y suma intento; llega a "fallido" en el tope', async () => {
    const it = await encolar('392208');
    api.post.mockRejectedValue({ status: 500 });
    for (let i = 0; i < 7; i++) await sincronizarPendientes();
    let g = (await leerStorage())[0];
    expect(g.status).toBe('error');
    expect(g.intentos).toBe(7);
    await sincronizarPendientes(); // intento 8 = MAX_INTENTOS_AUTO
    g = (await leerStorage())[0];
    expect(g.status).toBe('fallido');
    expect(g.id_local).toBe(it.id_local);
  });

  test('caída de red (sin status) deja el ítem "pendiente" — nunca se pierde', async () => {
    await encolar('392208');
    api.post.mockRejectedValueOnce(new Error('Network request failed'));
    const r = await sincronizarPendientes();
    expect(r.sinConexion).toBe(1);
    const g = (await leerStorage())[0];
    expect(g.status).toBe('pendiente');
    expect(contarPendientes(await leerStorage())).toBe(1);
  });

  test('soloIdLocal limita el envío a ese ítem', async () => {
    const a = await encolar('1000001');
    await encolar('1000002');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: a.id_local, status: 'ok' }] });
    await sincronizarPendientes({ soloIdLocal: a.id_local });
    expect(api.post).toHaveBeenCalledTimes(1);
    const payload = api.post.mock.calls[0][1];
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].id_local).toBe(a.id_local);
  });

  test('no toca las facturas resueltas viejas ya guardadas', async () => {
    const fechaVieja = diasAtras(300);
    await sembrar([
      item({ fact_num: 'VIEJA', status: 'sincronizada', fecha_escaneo: fechaVieja, cli_des: 'HISTORICO' }),
    ]);
    const it = await encolar('392208');
    api.post.mockResolvedValueOnce({ resultados: [{ id_local: it.id_local, status: 'ok' }] });
    await sincronizarPendientes();
    const vieja = (await leerStorage()).find((f) => f.fact_num === 'VIEJA');
    expect(vieja).toMatchObject({ status: 'sincronizada', cli_des: 'HISTORICO', fecha_escaneo: fechaVieja });
  });
});

// ------------------------------------------------------------------ CARRERAS (regresión "se borran del historial")
describe('concurrencia — el historial no se pisa', () => {
  test('encolar un número nuevo mientras un sync está en vuelo: sobreviven ambos', async () => {
    NetInfo.__setState({ isConnected: true, isInternetReachable: true });
    const a = (await encolarFactura({ fact_num: 'AAA1111' })).item;

    // api.post que no resuelve hasta que lo soltamos: simula un batch lento.
    let soltar;
    api.post.mockImplementationOnce(
      () => new Promise((resolve) => { soltar = () => resolve({ resultados: [{ id_local: a.id_local, status: 'ok' }] }); })
    );

    const syncEnVuelo = sincronizarPendientes();
    // Mientras el POST está pendiente, entra un escaneo nuevo por la pantalla.
    const b = (await encolarFactura({ fact_num: 'BBB2222' })).item;

    soltar();
    await syncEnVuelo;

    const guardado = await leerStorage();
    const porNum = Object.fromEntries(guardado.map((f) => [f.fact_num, f]));
    expect(Object.keys(porNum).sort()).toEqual(['AAA1111', 'BBB2222']);
    expect(porNum.AAA1111.status).toBe('sincronizada'); // el sync aplicó su parche
    expect(porNum.BBB2222.status).toBe('pendiente');     // el encolado nuevo intacto
    expect(porNum.BBB2222.id_local).toBe(b.id_local);
  });

  test('dos "Agregar" en paralelo con números distintos: quedan los dos', async () => {
    NetInfo.__setState({ isConnected: true, isInternetReachable: true });
    const [r1, r2] = await Promise.all([
      encolarFactura({ fact_num: 'N0000001' }),
      encolarFactura({ fact_num: 'N0000002' }),
    ]);
    expect(r1.ok && r2.ok).toBe(true);
    expect((await leerStorage()).map((f) => f.fact_num).sort()).toEqual(['N0000001', 'N0000002']);
  });

  test('"Sincronizar ahora" y auto-sync solapados no duplican ni borran', async () => {
    NetInfo.__setState({ isConnected: true, isInternetReachable: true });
    const it = (await encolarFactura({ fact_num: 'C0000001' })).item;
    api.post.mockResolvedValue({ resultados: [{ id_local: it.id_local, status: 'ok' }] });
    await Promise.all([sincronizarPendientes(), sincronizarPendientes()]);
    const guardado = await leerStorage();
    expect(guardado).toHaveLength(1);
    expect(guardado[0].status).toBe('sincronizada');
  });
});

// ------------------------------------------------------------------ iniciarAutoSync
describe('iniciarAutoSync', () => {
  test('sincroniza al recuperar señal y avisa el resumen', async () => {
    const it = (await encolarFactura({ fact_num: '392208' })).item;
    api.post.mockResolvedValue({ resultados: [{ id_local: it.id_local, status: 'ok' }] });

    const onResultado = jest.fn();
    const off = iniciarAutoSync(onResultado);

    NetInfo.__emit({ isConnected: true, isInternetReachable: true });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(onResultado).toHaveBeenCalledWith(expect.objectContaining({ ok: 1 }));
    expect(typeof off).toBe('function');
    off();
  });

  test('no sincroniza si el evento llega sin conexión', async () => {
    await encolarFactura({ fact_num: '392208' });
    const off = iniciarAutoSync(jest.fn());
    NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(api.post).not.toHaveBeenCalled();
    off();
  });
});

// ------------------------------------------------------------------ hayConexion
describe('hayConexion', () => {
  test('true solo si isConnected y isInternetReachable !== false', async () => {
    NetInfo.__setState({ isConnected: true, isInternetReachable: true });
    expect(await hayConexion()).toBe(true);
    NetInfo.__setState({ isConnected: true, isInternetReachable: null });
    expect(await hayConexion()).toBe(true);
    NetInfo.__setState({ isConnected: true, isInternetReachable: false });
    expect(await hayConexion()).toBe(false);
    NetInfo.__setState({ isConnected: false, isInternetReachable: true });
    expect(await hayConexion()).toBe(false);
  });
});
