import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../constants/Theme';
import { HeaderButton } from '../components/AppHeader';
import { IconoCaja, Seccion } from '../components/ui';

// Inicio del conductor con el estilo del lienzo SyncWareApp (mismo encabezado grande que el
// Inicio del vendedor) y accesos directos a sus módulos.
const C = Theme.colors;

export default function HomeScreenConductor({ navigation }) {
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUser = async () => {
      const data = await AsyncStorage.getItem('userData');
      if (data) setUser(JSON.parse(data));
    };
    loadUser();
  }, []);

  const primerNombre = String(user?.nombre || 'Chofer').trim().split(/\s+/)[0];
  const accesos = [
    { key: 'guia', label: 'Guía de Carga', sub: 'Buscar un rutagrama y escanear lo que llevas', icon: 'clipboard-outline', tono: 'verde', onPress: () => navigation.navigate('Guia de Carga') },
    { key: 'chequeo', label: 'Chequeo de Guía', sub: 'Entrega de mercancía', icon: 'checkmark-circle-outline', tono: 'azul', onPress: () => navigation.navigate('Más', { screen: 'ChequeoGuiaCarga' }) },
    { key: 'fact', label: 'Facturas', sub: 'Registrar facturas entregadas', icon: 'receipt-outline', tono: 'ambar', onPress: () => navigation.navigate('Facturas') },
    { key: 'ruta', label: 'Rutagrama', sub: 'Despacho de rutas', icon: 'bus-outline', tono: 'violeta', onPress: () => navigation.navigate('Rutagrama') },
  ];

  return (
    <ScrollView style={st.pantalla} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[st.header, { paddingTop: insets.top + 16 }]}>
        <View style={st.headerFila}>
          {navigation.openDrawer ? <HeaderButton icon="menu" label="Abrir menú" onPress={() => navigation.openDrawer()} /> : null}
          <Text style={st.headerEtiqueta}>Inicio</Text>
        </View>
        <View>
          <Text style={st.saludo}>Hola, {primerNombre}</Text>
          <Text style={st.saludoSub}>{user?.rol ? `${user.rol.charAt(0).toUpperCase()}${user.rol.slice(1)}` : 'Conductor'}{user?.sede ? ` · Sede ${user.sede}` : ''}</Text>
        </View>
      </View>

      <View style={st.contenido}>
        <Seccion titulo="Tus módulos" />
        {accesos.map((a) => (
          <TouchableOpacity key={a.key} style={st.acceso} onPress={a.onPress} activeOpacity={0.75} accessibilityRole="button">
            <IconoCaja name={a.icon} tono={a.tono} />
            <View style={{ flex: 1 }}>
              <Text style={st.accesoTitulo}>{a.label}</Text>
              <Text style={st.accesoSub}>{a.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.dark, paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  headerFila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  headerEtiqueta: { flex: 1, fontSize: 13, color: C.onDarkText },
  saludo: { fontSize: 24, fontWeight: '800', color: C.white },
  saludoSub: { fontSize: 14, color: C.onDarkSoft, marginTop: 4 },
  contenido: { paddingHorizontal: 16, marginTop: -24, gap: 12 },
  acceso: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
  },
  accesoTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  accesoSub: { fontSize: 12, color: C.muted, marginTop: 2 },
});
