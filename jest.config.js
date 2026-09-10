// Config de test. El foco es src/services/facturasSyncQueue.js (cola offline del escaneo
// de facturas) y el flujo de src/screens/FacturasScreen.js. `jest-expo` aporta el
// transform de RN/Expo; acá solo se agregan el mock de `@env` (react-native-dotenv no
// corre bajo Jest) y los setups de AsyncStorage / NetInfo.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest/setup.js'],
  moduleNameMapper: {
    '^@env$': '<rootDir>/jest/env-mock.js',
  },
  clearMocks: true,
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/facturasSyncQueue.js',
    'src/screens/FacturasScreen.js',
  ],
};
