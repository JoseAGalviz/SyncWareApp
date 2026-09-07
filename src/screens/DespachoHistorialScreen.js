import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

// Filtro por fecha de cierre. 'todo' no manda rango (comportamiento previo).
const RANGOS = [
  { key: 'todo', label: 'Todo' },
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: 'hoy', label: 'Hoy' },
];

function fmtFecha(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Devuelve { desde, hasta } en YYYY-MM-DD para el rango elegido (o {} para 'todo').
function rangoAFechas(rango) {
  if (rango === 'todo') return {};
  const hoy = new Date();
  const hasta = fmtFecha(hoy);
  if (rango === 'hoy') return { desde: hasta, hasta };
  const dias = rango === '7' ? 6 : 29;
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - dias);
  return { desde: fmtFecha(desde), hasta };
}

export default function DespachoHistorialScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [rutas, setRutas] = useState([]);
  const [rutaSel, setRutaSel] = useState(null);
  const [rango, setRango] = useState('todo');
  const [items, setItems] = useState([]);
  const [cargandoRutas, setCargandoRutas] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargarRutas = useCallback(async () => {
    setCargandoRutas(true);
    try {
      const resultado = await DespachoService.historialRutas();
      setRutas(resultado?.items || []);
    } catch (e) {
      console.error('Error cargando rutas del historial', e);
    } finally {
      setCargandoRutas(false);
    }
  }, []);

  useEffect(() => { if (isFocused && rutas.length === 0) cargarRutas(); }, [isFocused, rutas.length, cargarRutas]);

  const cargar = useCallback(async () => {
    if (!rutaSel) return;
    setCargando(true);
    try {
      const resultado = await DespachoService.historial(rutaSel, rangoAFechas(rango));
      setItems(resultado?.items || []);
    } catch (e) {
      console.error('Error cargando historial de rutagramas', e);
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [rutaSel, rango]);

  useEffect(() => { if (isFocused && rutaSel) cargar(); }, [isFocused, rutaSel, rango, cargar]);

  const elegirRuta = useCallback((ruta) => {
    setItems([]);
    setRutaSel((actual) => (actual === ruta ? null : ruta));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Theme.spacing.sm }}>
          <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historial de rutagramas</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.listaTitulo}>Elegí la ruta</Text>
        {cargandoRutas ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} />
        ) : rutas.length === 0 ? (
          <Text style={styles.emptyListText}>No hay rutas con rutagramas cerrados.</Text>
        ) : (
          rutas.map((ruta) => {
            const sel = ruta === rutaSel;
            return (
              <TouchableOpacity
                key={ruta}
                style={[styles.rutaOption, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sel && styles.rutaOptionSelected]}
                onPress={() => elegirRuta(ruta)}
                activeOpacity={0.8}
              >
                <Text style={styles.rutaOptionText}>{ruta}</Text>
                {sel && <Ionicons name="checkmark" size={18} color={Theme.colors.primary} />}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {!rutaSel ? (
        <Text style={styles.emptyListText}>Elegí una ruta para ver su historial.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.listaTitulo}>Filtrar por fecha de cierre</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {RANGOS.map((r) => {
                const sel = r.key === rango;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[
                      styles.rutaOption,
                      { flexGrow: 1, alignItems: 'center', marginRight: Theme.spacing.xs },
                      sel && styles.rutaOptionSelected,
                    ]}
                    onPress={() => setRango(r.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rutaOptionText}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {cargando ? (
            <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyListText}>
              {rango === 'todo'
                ? 'No hay rutagramas cerrados en esta ruta.'
                : 'No hay rutagramas cerrados en esta ruta para el rango elegido.'}
            </Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => <RutagramaItem item={item} />}
              scrollEnabled={false}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
