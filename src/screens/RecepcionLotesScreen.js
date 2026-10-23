import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Theme from '../constants/Theme';
import styles from '../styles/RecepcionLotes.styles';

// Seguimiento de los lotes que envió el vendedor: qué facturas ya recibió San
// Cristóbal (GET /api/lotes/recepcion). La recepción marca cada factura al
// escanearla allá; mientras la pantalla está abierta se vuelve a consultar cada
// INTERVALO_MS para verlo casi en tiempo real.
const INTERVALO_MS = 30 * 1000;

const ESTADOS = {
  PENDIENTE: { color: Theme.colors.warning, label: 'Sin recibir', icono: 'time-outline' },
  PARCIAL: { color: Theme.colors.info, label: 'Recibido en parte', icono: 'git-compare-outline' },
  COMPLETO: { color: Theme.colors.success, label: 'Recibido', icono: 'checkmark-done-outline' },
};

const FILTROS = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'PENDIENTES', label: 'Con pendientes' },
  { key: 'COMPLETO', label: 'Recibidos' },
];

// Fechas del backend: "YYYY-MM-DD HH:mm:ss" (hora de Venezuela, sin zona).
const fechaCorta = (texto) => {
  if (!texto) return '';
  const [fecha, hora = ''] = texto.split(' ');
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y} ${hora.slice(0, 5)}`.trim();
};

const horaAhora = () => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
};

const MAX_FACTURAS_VISIBLES = 15;

const LoteCard = React.memo(({ lote, abierto, onToggle }) => {
  const estado = ESTADOS[lote.estado_recepcion] || ESTADOS.PENDIENTE;
  const [verTodas, setVerTodas] = useState(false);
  const porcentaje = lote.total ? Math.round((lote.recepcionadas / lote.total) * 100) : 0;
  // Pendientes primero: es lo que el vendedor necesita revisar.
  const facturas = useMemo(
    () => [...lote.facturas].sort((a, b) => Number(a.recepcionada) - Number(b.recepcionada)),
    [lote.facturas]
  );
  const visibles = verTodas ? facturas : facturas.slice(0, MAX_FACTURAS_VISIBLES);

  return (
    <TouchableOpacity
      style={[styles.loteCard, { borderLeftColor: estado.color }]}
      onPress={() => onToggle(lote.id)}
      activeOpacity={0.8}
    >
      <View style={styles.loteHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.loteTitulo}>
            Lote #{lote.id_local ? lote.id_local.slice(-6) : lote.id}
          </Text>
          <Text style={styles.loteDetalle}>Enviado: {fechaCorta(lote.fecha_cierre || lote.fecha_creacion)}</Text>
          {lote.ultima_recepcion ? (
            <Text style={styles.loteDetalle}>Última recepción: {fechaCorta(lote.ultima_recepcion)}</Text>
          ) : null}
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: estado.color }]}>
          <Text style={styles.estadoBadgeTexto}>{estado.label}</Text>
        </View>
      </View>

      <View style={styles.progresoFila}>
        <View style={styles.progresoBarra}>
          <View style={[styles.progresoRelleno, { width: `${porcentaje}%`, backgroundColor: estado.color }]} />
        </View>
        <Text style={styles.progresoTexto}>
          {lote.recepcionadas}/{lote.total}
        </Text>
      </View>

      {abierto ? (
        <View style={styles.facturasBox}>
          {visibles.map((f) => (
            <View key={f.fact_num} style={styles.facturaFila}>
              <Ionicons
                name={f.recepcionada ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={f.recepcionada ? Theme.colors.success : Theme.colors.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.facturaNumero}>#{f.fact_num}</Text>
                <Text style={styles.facturaSub}>
                  {f.co_cli || ''}
                  {f.recepcionada ? ` · Recibida ${fechaCorta(f.fecha_recepcion)}` : ' · Sin recibir'}
                </Text>
              </View>
            </View>
          ))}
          {facturas.length > MAX_FACTURAS_VISIBLES && !verTodas ? (
            <TouchableOpacity onPress={() => setVerTodas(true)}>
              <Text style={styles.verMas}>Ver las {facturas.length} facturas</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

export default function RecepcionLotesScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const [abiertos, setAbiertos] = useState(() => new Set());
  const cargando = useRef(false);

  const cargar = useCallback(async () => {
    if (!user?.co_ven) {
      setError('Tu usuario no tiene código de vendedor.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (cargando.current) return;
    cargando.current = true;
    try {
      const data = await api.get(`${API_ENDPOINTS.LOTES}/recepcion?co_ven=${encodeURIComponent(user.co_ven)}&dias=60`);
      setLotes(Array.isArray(data) ? data : []);
      setError(null);
      setActualizado(horaAhora());
    } catch (err) {
      console.error('Error cargando recepción de lotes:', err);
      setError('No se pudo consultar la recepción. Desliza hacia abajo para reintentar.');
    } finally {
      cargando.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.co_ven]);

  // Consulta al entrar y cada INTERVALO_MS mientras la pantalla esté visible.
  useEffect(() => {
    if (!isFocused) return undefined;
    cargar();
    const timer = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [isFocused, cargar]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargar();
  }, [cargar]);

  const toggle = useCallback((id) => {
    setAbiertos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }, []);

  const visibles = useMemo(() => {
    if (filtro === 'PENDIENTES') return lotes.filter((l) => l.estado_recepcion !== 'COMPLETO');
    if (filtro === 'COMPLETO') return lotes.filter((l) => l.estado_recepcion === 'COMPLETO');
    return lotes;
  }, [lotes, filtro]);

  const pendientesTotal = useMemo(
    () => lotes.reduce((s, l) => s + (l.total - l.recepcionadas), 0),
    [lotes]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centrado]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibles}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <LoteCard lote={item} abierto={abiertos.has(item.id)} onToggle={toggle} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.cabecera}>
            <Text style={styles.actualizado}>
              {actualizado ? `Actualizado ${actualizado} · se refresca cada 30 s` : ''}
              {pendientesTotal > 0 ? ` · ${pendientesTotal} factura(s) sin recibir` : ''}
            </Text>
            <View style={styles.chipsRow}>
              {FILTROS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, filtro === f.key && styles.chipActivo]}
                  onPress={() => setFiltro(f.key)}
                >
                  <Text style={[styles.chipText, filtro === f.key && styles.chipTextActivo]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.aviso}>Toca un lote para ver sus facturas. Solo aparecen los lotes ya enviados.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Ionicons name="file-tray-outline" size={56} color={Theme.colors.border} />
            <Text style={styles.textoVacio}>{error || 'No hay lotes enviados en los últimos 60 días'}</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Theme.colors.primary]}
            tintColor={Theme.colors.primary}
          />
        }
      />
    </View>
  );
}
