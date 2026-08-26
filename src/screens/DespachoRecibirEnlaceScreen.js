import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const EnlaceItem = React.memo(({ item, onPress }) => {
  const completo = item.total > 0 && item.recibidos === item.total;
  return (
    <TouchableOpacity style={styles.itemRow} onPress={() => onPress(item)} activeOpacity={0.6}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemNota}>Enlace #{item.id}</Text>
        <Text style={styles.itemDetalle}>
          {item.conductor} · {item.vehiculo} · {new Date(item.fecha).toLocaleString('es-VE')}
        </Text>
      </View>
      <View style={[styles.statusPill, completo ? styles.statusVerificada : styles.statusEscaneada]}>
        <Text style={[styles.statusPillText, completo ? styles.statusTextVerificada : styles.statusTextEscaneada]}>
          {item.recibidos}/{item.total}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// Lista de rutagramas de enlace (barquisimeto1/barquisimeto2) despachados en la sede
// origen y esperando confirmación de recepción en esta sede.
export default function DespachoRecibirEnlaceScreen({ route, navigation }) {
  const { rutaCodigo, rutaDesc } = route.params;
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('userData').then(str => {
      if (str) setUserData(JSON.parse(str));
    });
  }, []);

  const cargar = useCallback(async () => {
    if (!userData?.id) return;
    setCargando(true);
    setError(null);
    try {
      const resultado = await DespachoService.enlacesPendientes(userData.id, rutaCodigo);
      setItems(resultado?.items || []);
    } catch (e) {
      console.error('Error cargando enlaces pendientes', e);
      setError(e.data?.error || e.message || 'No se pudo cargar la lista de enlaces.');
    } finally {
      setCargando(false);
    }
  }, [userData, rutaCodigo]);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  const abrirEnlace = useCallback((item) => {
    navigation.navigate('DespachoRecibirEnlaceDetalle', { rutagramaId: item.id, usuarioId: userData.id });
  }, [navigation, userData]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Theme.spacing.sm }}>
          <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Recepción de enlace ({rutaDesc})</Text>
      </View>
      <Text style={styles.subtitle}>Cargas despachadas desde la otra sede, esperando confirmación de llegada.</Text>

      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : error ? (
        <Text style={styles.emptyListText}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyListText}>No hay enlaces pendientes por recibir.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <EnlaceItem item={item} onPress={abrirEnlace} />}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}
