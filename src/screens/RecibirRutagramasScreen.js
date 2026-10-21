import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';
import { Tarjeta, Pill, Barra, Stat, Aviso } from '../components/ui';

// Vendedor: rutagramas ya cerrados con pedidos suyos (últimos días, ver despachoVendedor.js
// en api-app). Al tocar uno se escanea lo que recibió (RecibirRutagramaScreen), del
// rutagrama completo; el avance es del rutagrama entero y aparte el de sus pedidos.
// Diseño: "Recibir · Rutagramas" del lienzo SyncWareApp.
const C = Theme.colors;

const RutagramaItem = React.memo(({ item, onPress }) => {
  const nuevo = !item.completo && !item.iniciado && !item.cerrada;
  const pct = item.pedidos ? (item.recibidos / item.pedidos) * 100 : 0;
  if (item.completo || item.cerrada) {
    const faltan = item.pedidos - item.recibidos;
    return (
      <Tarjeta onPress={() => onPress(item)} style={{ gap: 8 }}>
        <View style={st.fila}>
          <Text style={st.codigo}>RG-{item.cargado_id}</Text>
          {faltan > 0 ? <Pill tono="ambar">CERRADO · FALTAN {faltan}</Pill> : <Pill tono="verde">RECIBIDO ✓</Pill>}
        </View>
        <Text style={st.meta}>
          {item.ruta} · cerrado {item.fecha_cierre} · {item.recibidos}/{item.pedidos} pedidos recibidos
          {item.cierre?.por ? ` · recepción cerrada por ${item.cierre.por}` : ''}
        </Text>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta destacada={nuevo} onPress={() => onPress(item)}>
      <View style={st.fila}>
        <Text style={st.codigo}>RG-{item.cargado_id}</Text>
        {nuevo ? <Pill tono="solido">NUEVO</Pill> : <Pill tono="ambar">EN CURSO</Pill>}
      </View>
      <Text style={st.ruta}>Ruta {item.ruta}</Text>
      <View style={st.metaGrid}>
        <Text style={st.meta}>Cierre: {item.fecha_cierre}</Text>
        {item.conductor ? <Text style={st.meta}>Chofer: {item.conductor}</Text> : null}
        {item.vehiculo ? <Text style={st.meta}>Vehículo: {item.vehiculo}</Text> : null}
      </View>
      <View style={st.progreso}>
        <Barra pct={pct} color={C.warning} style={{ flex: 1 }} />
        <Text style={st.progresoTexto}>{item.recibidos}/{item.pedidos} pedidos recibidos</Text>
      </View>
      <Text style={st.meta}>Tuyos: {item.mis_recibidos}/{item.mis_pedidos}</Text>
    </Tarjeta>
  );
});

export default function RecibirRutagramasScreen({ navigation, route }) {
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userData').then((str) => { if (str) setUserData(JSON.parse(str)); });
  }, []);

  const cargar = useCallback(async () => {
    if (!userData?.id) return;
    setCargando(true);
    setError('');
    try {
      const res = await DespachoService.vendedorRutagramas(userData.id);
      setItems(res?.items || []);
      if (res?.dias) navigation.setOptions({ headerSubtitle: `Rutagramas cerrados · últimos ${res.dias} días` });
    } catch (e) {
      setError(e.data?.error || e.message || 'No se pudieron cargar tus rutagramas.');
    } finally {
      setCargando(false);
    }
  }, [userData, navigation]);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  // Desde el aviso: abre directo el rutagrama indicado.
  useEffect(() => {
    const id = route?.params?.abrirId;
    if (id && userData?.id) {
      navigation.setParams({ abrirId: undefined });
      navigation.navigate('RecibirRutagrama', { rutagramaId: id, usuarioId: userData.id });
    }
  }, [route?.params?.abrirId, userData, navigation]);

  const abrir = useCallback((item) => {
    navigation.navigate('RecibirRutagrama', { rutagramaId: item.cargado_id, usuarioId: userData.id });
  }, [navigation, userData]);

  const pendientes = items.filter((i) => !i.completo && !i.cerrada).length;

  return (
    <FlatList
      style={{ backgroundColor: C.background }}
      contentContainerStyle={st.contenido}
      data={items}
      keyExtractor={(item) => String(item.cargado_id)}
      renderItem={({ item }) => <RutagramaItem item={item} onPress={abrir} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshControl={<RefreshControl refreshing={cargando && items.length > 0} onRefresh={cargar} colors={[C.primary]} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="Por recibir" valor={pendientes} color={C.primaryDark} />
            <Stat label="Rutagramas" valor={items.length} />
          </View>
          {error ? <Aviso tono="rojo">{error}</Aviso> : null}
        </View>
      }
      ListEmptyComponent={
        cargando
          ? <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 20 }} />
          : <Text style={st.vacio}>No hay rutagramas con pedidos tuyos.</Text>
      }
    />
  );
}

const st = StyleSheet.create({
  contenido: { padding: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codigo: { fontFamily: Theme.fontMono, fontSize: 16, fontWeight: '700', color: C.text },
  ruta: { fontSize: 14, fontWeight: '600', color: C.text },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  meta: { fontSize: 12, color: C.muted },
  progreso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progresoTexto: { fontSize: 12, fontWeight: '700', color: C.text },
  vacio: { textAlign: 'center', color: C.muted, marginTop: 24 },
});
