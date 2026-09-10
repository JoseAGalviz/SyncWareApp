/* eslint-disable no-undef */
// Mocks base para todos los tests.

// AsyncStorage: implementación en memoria oficial de la librería.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// NetInfo: por defecto "con conexión". Cada test ajusta con setNetInfoState().
jest.mock('@react-native-community/netinfo', () => {
  let estado = { isConnected: true, isInternetReachable: true };
  const listeners = new Set();
  return {
    __esModule: true,
    default: {
      fetch: jest.fn(() => Promise.resolve(estado)),
      addEventListener: jest.fn((cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      }),
      // helpers de test (no son API real de NetInfo)
      __setState: (s) => {
        estado = { ...estado, ...s };
      },
      __emit: (s) => {
        estado = { ...estado, ...s };
        listeners.forEach((cb) => cb(estado));
      },
      __reset: () => {
        estado = { isConnected: true, isInternetReachable: true };
        listeners.clear();
      },
    },
  };
});
