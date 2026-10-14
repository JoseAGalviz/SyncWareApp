import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/Devoluciones.styles';
import Theme from '../constants/Theme';
import {
  obtenerDevoluciones,
  sincronizarPendientes,
  reintentar,
  iniciarAutoSync,
} from '../services/devolucionesQueue';

const ESTADOS = {
  enviada: { texto: 'ENVIADA', estilo: styles.estadoEnviada, color: Theme.colors.successDark },
  pendiente: { texto: 'PENDIENTE', estilo: styles.estadoPendiente, color: Theme.colors.warning },
  rechazada: { texto: 'RECHAZADA', estilo: styles.estadoRechazada, color: Theme.colors.error },
};

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
  return (
    <View style={styles.card}>
      <View style={styles.filaEntre}>
        <Text style={styles.filaTitulo} numberOfLines={1}>
          {item.tipo_novedad === 'Reposicion' ? 'Reposición' : 'Devolución'} · {item.observacion_clave}
        </Text>
        <View style={[styles.estadoPill, estado.estilo]}>
          <Text style={[styles.estadoTexto, { color: estado.color }]}>{estado.texto}</Text>
        </View>
      </View>
      <Text style={styles.filaDetalle} numberOfLines={1}>{item.cliente} ({item.co_cli})</Text>
      <Text style={styles.filaDetalle}>
        Factura {item.factura_numero} · {item.productos.length} artículo(s), {unidades} und · {item.fotos.length} foto(s)
      </Text>
      <Text style={styles.filaDetalle}>{new Date(item.creado_en).toLocaleString('es-VE')}</Text>
      {item.mensaje ? <Text style={styles.mensajeError}>{item.mensaje}</Text> : null}
      {item.status === 'rechazada' ? (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => onReintentar(item.id_local)}>
          <Ionicons name="refresh" size={16} color={Theme.colors.primary} />
          <Text style={styles.secondaryButtonText}>Reintentar envío</Text>
        </TouchableOpacity>
      ) : null}
    </View>
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

  const pendientes = lista.filter((d) => d.status === 'pendiente').length;

  const encabezado = (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Devoluciones</Text>
      </View>
      <Text style={styles.subtitle}>Reposiciones y devoluciones enviadas desde este teléfono.</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('DevolucionNueva')}>
        <Text style={styles.primaryButtonText}>+ Nueva devolución / reposición</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { marginBottom: Theme.spacing.lg }, sincronizando && styles.buttonDisabled]}
        onPress={sincronizar}
        disabled={sincronizando}
      >
        {sincronizando
          ? <ActivityIndicator color={Theme.colors.primary} />
          : <Ionicons name="cloud-upload-outline" size={18} color={Theme.colors.primary} />}
        <Text style={styles.secondaryButtonText}>Sincronizar ahora</Text>
      </TouchableOpacity>

      {pendientes > 0 ? (
        <View style={styles.bannerPendientes}>
          <Text style={styles.bannerPendientesTexto}>
            {pendientes} sin enviar — se enviarán solas al recuperar señal.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={lista}
        keyExtractor={(d) => d.id_local}
        renderItem={({ item }) => <DevolucionItem item={item} onReintentar={onReintentar} />}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          cargando ? <ActivityIndicator color={Theme.colors.primary} /> : <Text style={styles.emptyText}>Aún no hay devoluciones registradas.</Text>
        }
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
      />
    </View>
  );
}
