import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DespachoIniciarScreen from '../screens/DespachoIniciarScreen';
import DespachoEscanearScreen from '../screens/DespachoEscanearScreen';
import DespachoNotasCreditoScreen from '../screens/DespachoNotasCreditoScreen';
import DespachoHistorialScreen from '../screens/DespachoHistorialScreen';
import DespachoRecibirEnlaceScreen from '../screens/DespachoRecibirEnlaceScreen';
import DespachoRecibirEnlaceDetalleScreen from '../screens/DespachoRecibirEnlaceDetalleScreen';
import DespachoEnlacesScreen from '../screens/DespachoEnlacesScreen';
import RfidMenuScreen from '../screens/RfidMenuScreen';
import RfidAsociarScreen from '../screens/RfidAsociarScreen';
import RfidEscanearScreen from '../screens/RfidEscanearScreen';
import { NavHeader } from '../components/AppHeader';

const Stack = createNativeStackNavigator();

// Stack interno del tab "Rutagrama": Iniciar -> Escanear (fase 1) -> Verificar (fase 2),
// más el flujo independiente de Notas de Crédito/Débito y el de recepción de enlace
// (BQTO<->S/C) en la sede destino. Las 3 pantallas Rfid* son el módulo experimental
// de la pistola Chainway SR160 — independiente del flujo real, ver STATUS.md.
export default function DespachoNavigator() {
  return (
    // Encabezado del diseño (NavHeader) para todo el stack: en la primera pantalla lleva el
    // menú lateral; en las demás, "volver". El navegador padre (pestaña / "Más") va sin
    // encabezado propio para no duplicarlo.
    <Stack.Navigator screenOptions={{ header: (props) => <NavHeader {...props} /> }}>
      <Stack.Screen name="DespachoIniciar" component={DespachoIniciarScreen} options={{ title: 'Rutagrama', headerSubtitle: 'Despacho de rutas' }} />
      <Stack.Screen
        name="DespachoEscanear"
        component={DespachoEscanearScreen}
        options={({ route }) => ({ title: `RG-${route.params?.rutagramaId ?? ''}`, headerTitleMono: true, headerSubtitle: route.params?.rutaDesc })}
      />
      <Stack.Screen name="DespachoNotasCredito" component={DespachoNotasCreditoScreen} options={{ title: 'Notas de Crédito / Débito', headerSubtitle: 'Sin ruta: se escanea y se guarda' }} />
      <Stack.Screen name="DespachoHistorial" component={DespachoHistorialScreen} options={{ title: 'Historial de rutagramas' }} />
      <Stack.Screen
        name="DespachoRecibirEnlace"
        component={DespachoRecibirEnlaceScreen}
        options={({ route }) => ({ title: 'Recepción de enlace', headerSubtitle: route.params?.rutaDesc })}
      />
      <Stack.Screen
        name="DespachoRecibirEnlaceDetalle"
        component={DespachoRecibirEnlaceDetalleScreen}
        options={({ route }) => ({ title: `Enlace #${route.params?.rutagramaId ?? ''}`, headerSubtitle: 'Recibir' })}
      />
      <Stack.Screen name="DespachoEnlaces" component={DespachoEnlacesScreen} options={{ title: 'Enlaces generados' }} />
      <Stack.Screen name="RfidMenu" component={RfidMenuScreen} options={{ title: 'RFID', headerSubtitle: 'Experimental' }} />
      <Stack.Screen name="RfidAsociar" component={RfidAsociarScreen} options={{ title: 'Asociar tags' }} />
      <Stack.Screen name="RfidEscanear" component={RfidEscanearScreen} options={{ title: 'Escanear (inventario)' }} />
    </Stack.Navigator>
  );
}
