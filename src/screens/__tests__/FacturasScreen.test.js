/* eslint-disable no-undef */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// --- mocks de dependencias de la pantalla ---------------------------------------------
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

// getLastKnownPositionAsync devuelve una posición para que obtenerCoordenadas corte
// temprano y NO cree el setTimeout(4000) de la carrera (dejaría un handle abierto en Jest).
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 1, longitude: 2 } }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 1, longitude: 2 } }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../services/facturasSyncQueue', () => ({
  obtenerFacturas: jest.fn().mockResolvedValue([]),
  contarPendientes: jest.fn().mockReturnValue(0),
  encolarFactura: jest.fn(),
  limpiarHistorialResuelto: jest.fn().mockResolvedValue([]),
  sincronizarPendientes: jest.fn().mockResolvedValue({ enviados: 0, ok: 0 }),
  iniciarAutoSync: jest.fn().mockReturnValue(() => {}),
  hayConexion: jest.fn(),
  consultarFactura: jest.fn(),
}));

import FacturasScreen from '../FacturasScreen';
import {
  obtenerFacturas,
  contarPendientes,
  encolarFactura,
  sincronizarPendientes,
  limpiarHistorialResuelto,
  hayConexion,
  consultarFactura,
  iniciarAutoSync,
} from '../../services/facturasSyncQueue';

beforeEach(() => {
  jest.clearAllMocks();
  obtenerFacturas.mockResolvedValue([]);
  contarPendientes.mockReturnValue(0);
  sincronizarPendientes.mockResolvedValue({ enviados: 0, ok: 0 });
  iniciarAutoSync.mockReturnValue(() => {});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// Monta la pantalla y espera a que asiente el efecto de carga inicial (cargarRegistros).
// Vacía la cola de microtareas/timers dentro de act() para que los setState de los
// efectos async (cargarRegistros -> setRegistros) queden asentados y no disparen el
// warning "update not wrapped in act".
const asentar = () =>
  act(async () => {
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  });

const montar = async () => {
  render(<FacturasScreen />);
  await waitFor(() => expect(obtenerFacturas).toHaveBeenCalled());
  await asentar();
};

const escribirYAgregar = (numero) => {
  fireEvent.changeText(screen.getByPlaceholderText(/Número tal como aparece/i), numero);
  fireEvent.press(screen.getByText('Agregar'));
};

test('muestra entrada manual + banner de serie B y NO pide permiso de cámara', async () => {
  await montar();

  expect(screen.getByText('Gestión de Facturas')).toBeTruthy();
  expect(screen.getByText(/Funciona sin conexión/i)).toBeTruthy();
  expect(screen.getByText(/siempre empiezan con/i)).toBeTruthy();
  expect(screen.getByPlaceholderText(/Número tal como aparece/i)).toBeTruthy();
  expect(screen.getByText('Agregar')).toBeTruthy();
  expect(screen.queryByText(/Permitir cámara/i)).toBeNull();
  expect(iniciarAutoSync).toHaveBeenCalled(); // auto-sync activo
});

test('carga y cuenta el historial persistido', async () => {
  obtenerFacturas.mockResolvedValue([
    { id_local: 'a', fact_num: 'A0000001', status: 'sincronizada', fecha_escaneo: new Date().toISOString() },
    { id_local: 'b', fact_num: 'A0000002', status: 'pendiente', fecha_escaneo: new Date().toISOString() },
  ]);
  await montar();
  await waitFor(() => expect(screen.getByText(/Ver facturas guardadas \(2\)/)).toBeTruthy());
});

test('"Agregar" abre el modal de confirmación con el número tecleado', async () => {
  await montar();

  escribirYAgregar('392208');
  expect(screen.getByText('Confirmar número de factura')).toBeTruthy();
  expect(screen.getByText('392208')).toBeTruthy();
});

test('número con formato inválido: alerta y NO encola', async () => {
  hayConexion.mockResolvedValue(true);
  await montar();

  escribirYAgregar('12-34-XX');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Número no reconocido', expect.stringContaining('no tiene el formato'))
  );
  expect(encolarFactura).not.toHaveBeenCalled();
  expect(consultarFactura).not.toHaveBeenCalled();
});

test('con conexión: corrobora contra Profit y al confirmar encola + sincroniza', async () => {
  hayConexion.mockResolvedValue(true);
  consultarFactura.mockResolvedValue({
    fact_num: 'A0392208', cli_des: 'CLIENTE DEMO', co_cli: 'C1', saldo: 100,
    fec_venc_despues: '2026-10-01', num_factura_completo: 'A0392208', letra_resuelta: 'A',
  });
  encolarFactura.mockResolvedValue({ ok: true, item: { id_local: 'x1', fact_num: 'A0392208' } });
  sincronizarPendientes.mockResolvedValue({ enviados: 1, ok: 1 });
  obtenerFacturas
    .mockResolvedValueOnce([]) // carga inicial
    .mockResolvedValue([{ id_local: 'x1', fact_num: 'A0392208', status: 'sincronizada', cli_des: 'CLIENTE DEMO', fec_venc_despues: '2026-10-01', fecha_escaneo: new Date().toISOString() }]);

  await montar();

  escribirYAgregar('392208');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() => expect(consultarFactura).toHaveBeenCalledWith('392208'));
  await waitFor(() => expect(screen.getByText(/Factura #A0392208/)).toBeTruthy());

  fireEvent.press(screen.getByText('Sí, guardar'));

  await waitFor(() => expect(encolarFactura).toHaveBeenCalledWith(expect.objectContaining({ fact_num: 'A0392208' })));
  await waitFor(() =>
    expect(sincronizarPendientes).toHaveBeenCalledWith(expect.objectContaining({ soloIdLocal: 'x1' }))
  );
  await asentar(); // asentar el refresh final de registros
});

test('sin conexión: salta corroboración, encola y muestra el aviso offline', async () => {
  hayConexion.mockResolvedValue(false);
  encolarFactura.mockResolvedValue({ ok: true, item: { id_local: 'off1', fact_num: '72150775' } });

  await montar();

  escribirYAgregar('72150775');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() => expect(encolarFactura).toHaveBeenCalledWith(expect.objectContaining({ fact_num: '72150775' })));
  expect(consultarFactura).not.toHaveBeenCalled();
  expect(sincronizarPendientes).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText('SIN CONEXIÓN')).toBeTruthy());
  expect(screen.getByText(/Factura #72150775/)).toBeTruthy();
});

test('duplicado local: avisa y no sincroniza', async () => {
  hayConexion.mockResolvedValue(false);
  encolarFactura.mockResolvedValue({ ok: false, motivo: 'duplicada_local' });

  await montar();

  escribirYAgregar('392208');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() => expect(encolarFactura).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText(/ya estaba en la lista/i)).toBeTruthy());
  expect(sincronizarPendientes).not.toHaveBeenCalled();
});

test('"Limpiar historial" pide confirmación y solo entonces limpia lo resuelto', async () => {
  obtenerFacturas.mockResolvedValue([
    { id_local: 'r1', fact_num: 'A0000001', status: 'sincronizada', fecha_escaneo: new Date().toISOString() },
  ]);
  await montar();
  await waitFor(() => expect(screen.getByText('Limpiar historial')).toBeTruthy());

  fireEvent.press(screen.getByText('Limpiar historial'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Limpiar historial',
    expect.stringContaining('ya resueltas'),
    expect.any(Array)
  );
  // ejecutar el botón "Limpiar" del diálogo
  const acciones = Alert.alert.mock.calls[0][2];
  const limpiar = acciones.find((a) => a.text === 'Limpiar');
  await act(async () => { await limpiar.onPress(); });
  expect(limpiarHistorialResuelto).toHaveBeenCalled();
});

test('con conexión, número ambiguo (409): alerta y NO encola', async () => {
  hayConexion.mockResolvedValue(true);
  consultarFactura.mockRejectedValue({ status: 409, data: { error: 'coincide con serie A y B' } });

  await montar();
  escribirYAgregar('7215077');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Número ambiguo', expect.stringContaining('serie A y B'))
  );
  expect(encolarFactura).not.toHaveBeenCalled();
});

test('con conexión, factura ya ingresada (400): alerta y NO encola', async () => {
  hayConexion.mockResolvedValue(true);
  consultarFactura.mockRejectedValue({ status: 400, data: { error: 'ya fue ingresada' } });

  await montar();
  escribirYAgregar('392208');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Factura ya ingresada', expect.stringContaining('ya fue ingresada'))
  );
  expect(encolarFactura).not.toHaveBeenCalled();
});

test('con conexión, 404 aún no disponible: encola igual para reintento', async () => {
  hayConexion.mockResolvedValue(true);
  consultarFactura.mockRejectedValue({ status: 404 });
  encolarFactura.mockResolvedValue({ ok: true, item: { id_local: 'p1', fact_num: '392208' } });
  sincronizarPendientes.mockResolvedValue({ enviados: 1, no_encontradas: 1 });
  obtenerFacturas
    .mockResolvedValueOnce([])
    .mockResolvedValue([{ id_local: 'p1', fact_num: '392208', status: 'no_encontrada', fecha_escaneo: new Date().toISOString() }]);

  await montar();
  escribirYAgregar('392208');
  fireEvent.press(screen.getByText('Sí, es correcto — Guardar'));

  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Aún no disponible', expect.any(String)));
  await waitFor(() => expect(encolarFactura).toHaveBeenCalledWith(expect.objectContaining({ fact_num: '392208' })));
  await asentar();
});

test('"Sincronizar ahora" dispara el sync y muestra el resumen', async () => {
  contarPendientes.mockReturnValue(2);
  obtenerFacturas.mockResolvedValue([
    { id_local: 'p1', fact_num: 'A0000001', status: 'pendiente', fecha_escaneo: new Date().toISOString() },
    { id_local: 'p2', fact_num: 'A0000002', status: 'pendiente', fecha_escaneo: new Date().toISOString() },
  ]);
  sincronizarPendientes.mockResolvedValue({ enviados: 2, ok: 2, duplicadas: 0, no_encontradas: 0, invalidas: 0, fallidas: 0, ambiguas: 0, errores: 0, sinConexion: 0 });

  await montar();
  fireEvent.press(screen.getByText(/Sincronizar ahora \(2 pendientes\)/));

  await waitFor(() => expect(sincronizarPendientes).toHaveBeenCalledWith());
  await waitFor(() => expect(screen.getByText('Sincronización completa')).toBeTruthy());
  expect(screen.getByText('Sincronizadas')).toBeTruthy();
  await asentar();
});
