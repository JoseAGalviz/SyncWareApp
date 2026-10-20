import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Devoluciones.styles';
import Theme from '../constants/Theme';
import { Tarjeta, Pill, Boton, Chip, IconoCaja } from '../components/ui';
import {
  obtenerDevoluciones,
  sincronizarPendientes,
  reintentar,
  iniciarAutoSync,
} from '../services/devolucionesQueue';

// Diseño "Devoluciones" del lienzo SyncWareApp: tarjeta de cola de envío, filtros por tipo,
// tarjetas con estado (Enviada / En cola / Error) y botón fijo "Nueva devolución".
const C = Theme.colors;
const ESTADOS = {
  enviada: { texto: 'Enviada', tono: 'verde' },
  pendiente: { texto: 'En cola', tono: 'ambar' },
  rechazada: { texto: 'Error', tono: 'rojo' },
};
const FILTROS = [
  { key: 'todas', label: 'Todas' },
  { key: 'Devolucion', label: 'Devolución' },
  { key: 'Reposicion', label: 'Reposición' },
];

function describirResumen(r) {
  const partes = [];
  if (r.enviadas) partes.push(`${r.enviadas} enviada(s)`);
  if (r.rechazadas) partes.push(`${r.rechazadas} rechazada(s)`);
  if (r.pendientes) partes.push(`${r.pendientes} sin enviar`);
  return partes.join(', ');
}

const DevolucionItem = React.memo(({ item, onReintentar }) => {
  const estado = ESTADOS[item.status] || ESTADOS.pendiente;
  const unidades = item.productos.reduce((s, p) => s + p.cantidad_afectada, 0);
  const tipo = item.tipo_novedad === 'Reposicion' ? 'Reposición' : 'Devolución';
  return (
    <Tarjeta error={item.status === 'rechazada'} style={{ borderRadius: 16, gap: 6, marginBottom: 12 }}>
      <View style={styles.filaEntre}>
        <Text style={styles.filaTitulo} numberOfLines={1}>{item.cliente} · {tipo}</Text>
        <Pill tono={estado.tono}>{estado.texto}</Pill>
      </View>
      <Text style={styles.filaDetalle}>
        {item.productos.length} artículo(s), {unidades} und · Factura{' '}
        <Text style={{ fontFamily: Theme.fontMono }}>{item.factura_numero}</Text>
        {item.fotos.length ? ` · ${item.fotos.length} foto(s)` : ''}
      </Text>
      <Text style={styles.filaDetalle}>Clave: {item.observacion_clave} · {new Date(item.creado_en).toLocaleString('es-VE')}</Text>
      {item.mensaje ? <Text style={styles.mensajeError}>No se pudo enviar: {item.mensaje}</Text> : null}
      {item.status === 'rechazada' ? (
        <Boton
          variante="peligro"
          titulo="Reintentar envío"
          alto={40}
          onPress={() => onReintentar(item.id_local)}
          style={{ alignSelf: 'flex-start', borderRadius: 10 }}
          textStyle={{ fontSize: 13 }}
        />
      ) : null}
    </Tarjeta>
  );
});

// Historial local de devoluciones/reposiciones + cola de envío.
export default function DevolucionesScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLista(await obtenerDevoluciones());
    } catch (e) {
      showMessage({ message: 'Error', description: e.message, type: 'danger' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  useEffect(() => {
    const unsubscribe = iniciarAutoSync((resumen) => {
      cargar();
      if (resumen.enviadas || resumen.rechazadas) {
        showMessage({ message: 'Devoluciones sincronizadas', description: describirResumen(resumen), type: 'info' });
      }
    });
    return unsubscribe;
  }, [cargar]);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const resumen = await sincronizarPendientes();
      const texto = describirResumen(resumen);
      showMessage({
        message: texto ? 'Sincronización terminada' : 'No hay devoluciones pendientes',
        description: texto || undefined,
        type: resumen.pendientes || resumen.rechazadas ? 'warning' : 'success',
      });
    } catch (e) {
      showMessage({ message: 'Error', description: e.message, type: 'danger' });
    } finally {
      setSincronizando(false);
      cargar();
    }
  }, [cargar]);

  const onReintentar = useCallback(async (idLocal) => {
    await reintentar(idLocal);
    sincronizar();
  }, [sincronizar]);

  const [filtro, setFiltro] = useState('todas');
  const pendientes = lista.filter((d) => d.status === 'pendiente').length;
  const visibles = filtro === 'todas' ? lista : lista.filter((d) => d.tipo_novedad === filtro);

  const encabezado = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconoCaja name="cloud-upload-outline" tono="ambar" tam={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
            {pendientes > 0 ? `${pendientes} en cola de envío` : 'Todo enviado'}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted }}>
            {pendientes > 0 ? 'Se enviarán al recuperar conexión' : 'No hay devoluciones pendientes'}
          </Text>
        </View>
        <Boton
          variante="oscuro"
          titulo="Sincronizar ahora"
          alto={44}
          cargando={sincronizando}
          onPress={sincronizar}
          style={{ borderRadius: 12, paddingHorizontal: 12 }}
          textStyle={{ fontSize: 13 }}
        />
      </Tarjeta>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTROS.map((f) => (
          <Chip key={f.key} label={f.label} activo={filtro === f.key} onPress={() => setFiltro(f.key)} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visibles}
        keyExtractor={(d) => d.id_local}
        renderItem={({ item }) => <DevolucionItem item={item} onReintentar={onReintentar} />}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          cargando ? <ActivityIndicator color={C.primary} /> : <Text style={styles.emptyText}>Aún no hay devoluciones registradas.</Text>
        }
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 96 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[C.primary]} />}
      />
      <View style={styles.botonFijo}>
        <Boton
          titulo="Nueva devolución / reposición"
          icon="add"
          alto={56}
          onPress={() => navigation.navigate('DevolucionNueva')}
          style={styles.botonFijoSombra}
        />
      </View>
    </View>
  );
}
