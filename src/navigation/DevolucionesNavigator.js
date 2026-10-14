import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DevolucionesScreen from '../screens/DevolucionesScreen';
import DevolucionNuevaScreen from '../screens/DevolucionNuevaScreen';

const Stack = createNativeStackNavigator();

// Stack del tab "Devoluciones" (los 3 roles): historial/cola -> nueva novedad.
export default function DevolucionesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DevolucionesHistorial" component={DevolucionesScreen} />
      <Stack.Screen name="DevolucionNueva" component={DevolucionNuevaScreen} />
    </Stack.Navigator>
  );
}
