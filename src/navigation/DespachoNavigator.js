import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DespachoIniciarScreen from '../screens/DespachoIniciarScreen';
import DespachoEscanearScreen from '../screens/DespachoEscanearScreen';
import DespachoVerificarScreen from '../screens/DespachoVerificarScreen';
import DespachoFacturaViejaScreen from '../screens/DespachoFacturaViejaScreen';
import DespachoNotasCreditoScreen from '../screens/DespachoNotasCreditoScreen';
import DespachoHistorialScreen from '../screens/DespachoHistorialScreen';
import DespachoRecibirEnlaceScreen from '../screens/DespachoRecibirEnlaceScreen';
import DespachoRecibirEnlaceDetalleScreen from '../screens/DespachoRecibirEnlaceDetalleScreen';

const Stack = createNativeStackNavigator();

// Stack interno del tab "Rutagrama": Iniciar -> Escanear (fase 1) -> Verificar (fase 2),
// más el flujo independiente de Notas de Crédito/Débito y el de recepción de enlace
// (BQTO<->S/C) en la sede destino.
export default function DespachoNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DespachoIniciar" component={DespachoIniciarScreen} />
      <Stack.Screen name="DespachoEscanear" component={DespachoEscanearScreen} />
      <Stack.Screen name="DespachoVerificar" component={DespachoVerificarScreen} />
      <Stack.Screen name="DespachoFacturaVieja" component={DespachoFacturaViejaScreen} />
      <Stack.Screen name="DespachoNotasCredito" component={DespachoNotasCreditoScreen} />
      <Stack.Screen name="DespachoHistorial" component={DespachoHistorialScreen} />
      <Stack.Screen name="DespachoRecibirEnlace" component={DespachoRecibirEnlaceScreen} />
      <Stack.Screen name="DespachoRecibirEnlaceDetalle" component={DespachoRecibirEnlaceDetalleScreen} />
    </Stack.Navigator>
  );
}
