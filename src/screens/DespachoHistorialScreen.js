import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const RutagramaItem = React.memo(({ item }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>Rutagrama #{item.cargado_id} — {item.ruta}</Text>
      <Text style={styles.itemDetalle}>
        Responsable: {item.responsable} · {item.pedidos} pedido(s) · {item.puntos_otorgados} pto(s)
      </Text>
      <Text style={styles.itemDetalle}>
        {item.conductor} · {item.vehiculo} · {new Date(item.fecha_cierre).toLocaleString('es-VE')}
      </Text>
    </View>
  </View>
));

export default function DespachoHistorialScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userData').then(str => {
      if (str) setUserData(JSON.parse(str));
    });
  }, []);

  const cargar = useCallback(async () => {
    if (!userData?.id) return;
    setCargando(true);
    try {
      const resultado = await DespachoService.historial(userData.id);
      setItems(resultado?.items || []);
    } catch (e) {
      console.error('Error cargando historial de rutagramas', e);
    } finally {
      setCargando(false);
    }
  }, [userData]);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Theme.spacing.sm }}>
          <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historial de rutagramas</Text>
      </View>

      {items.length > 0 && !cargando && (
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'Limpiar historial',
              'Se ocultará el historial de rutagramas de esta pantalla. Volverá a cargarse la próxima vez que entres.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpiar', style: 'destructive', onPress: () => setItems([]) },
              ]
            );
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.dangerButtonText}>Limpiar historial</Text>
        </TouchableOpacity>
      )}

      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : items.length === 0 ? (
        <Text style={styles.emptyListText}>Todavía no cerraste ningún rutagrama.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <RutagramaItem item={item} />}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}
