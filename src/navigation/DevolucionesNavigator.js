import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DevolucionesScreen from '../screens/DevolucionesScreen';
import DevolucionNuevaScreen from '../screens/DevolucionNuevaScreen';
import { NavHeader } from '../components/AppHeader';

const Stack = createNativeStackNavigator();

// Stack del tab "Devoluciones" (los 3 roles): historial/cola -> nueva novedad.
// Encabezado del diseño (NavHeader) para las dos pantallas; el navegador padre (pestaña o
// "Más") va sin encabezado propio para no duplicarlo.
export default function DevolucionesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ header: (props) => <NavHeader {...props} /> }}>
      <Stack.Screen
        name="DevolucionesHistorial"
        component={DevolucionesScreen}
        options={{ title: 'Devoluciones', headerSubtitle: 'Y reposiciones enviadas desde este teléfono' }}
      />
      <Stack.Screen
        name="DevolucionNueva"
        component={DevolucionNuevaScreen}
        options={{ title: 'Nueva novedad', headerSubtitle: 'Devolución o reposición' }}
      />
    </Stack.Navigator>
  );
}
