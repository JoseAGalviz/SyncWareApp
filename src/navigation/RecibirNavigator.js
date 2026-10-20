import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecibirRutagramasScreen from '../screens/RecibirRutagramasScreen';
import RecibirRutagramaScreen from '../screens/RecibirRutagramaScreen';
import { NavHeader } from '../components/AppHeader';

const Stack = createNativeStackNavigator();

// Stack del tab "Recibir" (rol vendedor): lista de rutagramas cerrados con pedidos suyos
// -> escaneo de lo recibido en uno de ellos. Encabezado del diseño (NavHeader): menú
// lateral en la lista, "volver" en el escaneo.
export default function RecibirNavigator() {
  return (
    <Stack.Navigator screenOptions={{ header: (props) => <NavHeader {...props} /> }}>
      <Stack.Screen
        name="RecibirRutagramas"
        component={RecibirRutagramasScreen}
        options={{ title: 'Recibir pedidos', headerSubtitle: 'Rutagramas cerrados' }}
      />
      <Stack.Screen
        name="RecibirRutagrama"
        component={RecibirRutagramaScreen}
        options={({ route }) => ({ title: `RG-${route.params?.rutagramaId ?? ''}`, headerTitleMono: true })}
      />
    </Stack.Navigator>
  );
}
