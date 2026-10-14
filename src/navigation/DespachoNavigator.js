import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DespachoIniciarScreen from '../screens/DespachoIniciarScreen';
import DespachoEscanearScreen from '../screens/DespachoEscanearScreen';
import DespachoFacturaViejaScreen from '../screens/DespachoFacturaViejaScreen';
import DespachoNotasCreditoScreen from '../screens/DespachoNotasCreditoScreen';
import DespachoHistorialScreen from '../screens/DespachoHistorialScreen';
import DespachoRecibirEnlaceScreen from '../screens/DespachoRecibirEnlaceScreen';
import DespachoRecibirEnlaceDetalleScreen from '../screens/DespachoRecibirEnlaceDetalleScreen';
import DespachoEnlacesScreen from '../screens/DespachoEnlacesScreen';
import RfidMenuScreen from '../screens/RfidMenuScreen';
import RfidAsociarScreen from '../screens/RfidAsociarScreen';
import RfidEscanearScreen from '../screens/RfidEscanearScreen';

const Stack = createNativeStackNavigator();

// Stack interno del tab "Rutagrama": Iniciar -> Escanear (fase 1) -> Verificar (fase 2),
// más el flujo independiente de Notas de Crédito/Débito y el de recepción de enlace
// (BQTO<->S/C) en la sede destino. Las 3 pantallas Rfid* son el módulo experimental
// de la pistola Chainway SR160 — independiente del flujo real, ver STATUS.md.
export default function DespachoNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DespachoIniciar" component={DespachoIniciarScreen} />
      <Stack.Screen name="DespachoEscanear" component={DespachoEscanearScreen} />
      <Stack.Screen name="DespachoFacturaVieja" component={DespachoFacturaViejaScreen} />
      <Stack.Screen name="DespachoNotasCredito" component={DespachoNotasCreditoScreen} />
      <Stack.Screen name="DespachoHistorial" component={DespachoHistorialScreen} />
      <Stack.Screen name="DespachoRecibirEnlace" component={DespachoRecibirEnlaceScreen} />
      <Stack.Screen name="DespachoRecibirEnlaceDetalle" component={DespachoRecibirEnlaceDetalleScreen} />
      <Stack.Screen name="DespachoEnlaces" component={DespachoEnlacesScreen} />
      <Stack.Screen name="RfidMenu" component={RfidMenuScreen} />
      <Stack.Screen name="RfidAsociar" component={RfidAsociarScreen} />
      <Stack.Screen name="RfidEscanear" component={RfidEscanearScreen} />
    </Stack.Navigator>
  );
}
