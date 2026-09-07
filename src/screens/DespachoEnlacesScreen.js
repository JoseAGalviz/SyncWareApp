import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const FILTROS = [
  { key: 'todos', label: 'Todos', estatus: null },
  { key: 'transito', label: 'En tránsito', estatus: 'F' },
  { key: 'recibidos', label: 'Recibidos', estatus: 'E' },
];

const EnlaceItem = React.memo(({ item, onPress }) => {
  const enTransito = item.en_transito;
  return (
    <TouchableOpacity style={styles.itemRow} onPress={() => onPress(item)} activeOpacity={0.6}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemNota}>Enlace #{item.id} · {item.direccion}</Text>
        <Text style={styles.itemDetalle}>
          Encargado: {item.encargado || '—'}
        </Text>
        <Text style={styles.itemDetalle}>
          {item.conductor} · {item.vehiculo} · {new Date(item.fecha).toLocaleString('es-VE')}
        </Text>
        {!enTransito && item.recibido_por ? (
          <Text style={styles.itemDetalle}>
            Recibió: {item.recibido_por}
            {item.fecha_recepcion ? ` · ${new Date(item.fecha_recepcion).toLocaleString('es-VE')}` : ''}
          </Text>
        ) : null}
      </View>
      <View style={[styles.statusPill, enTransito ? styles.statusEscaneada : styles.statusVerificada]}>
        <Text style={[styles.statusPillText, enTransito ? styles.statusTextEscaneada : styles.statusTextVerificada]}>
          {enTransito ? `EN TRÁNSITO ${item.recibidos}/${item.total}` : 'RECIBIDO'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// Listado global de enlaces entre sedes (BQTO <-> S/C): todos los generados, las dos
// direcciones, en tránsito y recibidos. Cualquiera lo ve. Tocar un enlace abre el mismo
// detalle que el flujo de recepción por dirección (DespachoRecibirEnlaceDetalle), que ya
// distingue 'F' (escanear + cerrar) de 'E' (solo lectura).
export default function DespachoEnlacesScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');

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
      const resultado = await DespachoService.enlacesTodos(userData.id);
      setItems(resultado?.items || []);
    } catch (e) {
      console.error('Error cargando enlaces', e);
      setError(e.data?.error || e.message || 'No se pudo cargar la lista de enlaces.');
    } finally {
      setCargando(false);
    }
  }, [userData]);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  const estatusFiltro = FILTROS.find(f => f.key === filtro)?.estatus;
  const itemsFiltrados = estatusFiltro ? items.filter(i => i.estatus === estatusFiltro) : items;

  const abrirEnlace = useCallback((item) => {
    navigation.navigate('DespachoRecibirEnlaceDetalle', { rutagramaId: item.id, usuarioId: userData.id });
  }, [navigation, userData]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Theme.spacing.sm }}>
          <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Enlaces generados</Text>
      </View>
      <Text style={styles.subtitle}>Todos los enlaces entre sedes (BQTO / S/C), las dos direcciones.</Text>

      <View style={styles.filterRow}>
        {FILTROS.map(op => (
          <TouchableOpacity
            key={op.key}
            style={[styles.filterChip, filtro === op.key && styles.filterChipActive]}
            onPress={() => setFiltro(op.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filtro === op.key && styles.filterChipTextActive]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando ? (
        <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
      ) : error ? (
        <Text style={styles.emptyListText}>{error}</Text>
      ) : itemsFiltrados.length === 0 ? (
        <Text style={styles.emptyListText}>
          {items.length === 0 ? 'No hay enlaces generados.' : 'Ningún enlace coincide con el filtro.'}
        </Text>
      ) : (
        <FlatList
          data={itemsFiltrados}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <EnlaceItem item={item} onPress={abrirEnlace} />}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}
