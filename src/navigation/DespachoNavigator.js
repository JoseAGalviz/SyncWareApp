import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DespachoIniciarScreen from '../screens/DespachoIniciarScreen';
import DespachoEscanearScreen from '../screens/DespachoEscanearScreen';
import DespachoVerificarScreen from '../screens/DespachoVerificarScreen';
import DespachoNotasCreditoScreen from '../screens/DespachoNotasCreditoScreen';

const Stack = createNativeStackNavigator();

// Stack interno del tab "Rutagrama": Iniciar -> Escanear (fase 1) -> Verificar (fase 2),
// más el flujo independiente de Notas de Crédito/Débito.
export default function DespachoNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DespachoIniciar" component={DespachoIniciarScreen} />
      <Stack.Screen name="DespachoEscanear" component={DespachoEscanearScreen} />
      <Stack.Screen name="DespachoVerificar" component={DespachoVerificarScreen} />
      <Stack.Screen name="DespachoNotasCredito" component={DespachoNotasCreditoScreen} />
    </Stack.Navigator>
  );
}
