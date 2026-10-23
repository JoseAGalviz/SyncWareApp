import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Theme from '../constants/Theme';
import styles from '../styles/PedidosHistorialScreen.styles';
import PedidoDetalleModal, {
    ESTADOS_PEDIDO,
    formatDate,
    formatCurrency,
    avisosAnulacion,
} from '../components/PedidoDetalleModal';

// Historial de pedidos del vendedor logueado con su estado real en Profit
// (GET /api/pedidosApp/historial): si ya se convirtió en nota(s), cuáles, y si
// alcabala la anuló, con el comentario que dejaron.


const FILTROS = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'PENDIENTE', label: 'Sin procesar' },
    { key: 'EN_ALCABALA', label: 'Alcabala' },
    { key: 'PROCESADO', label: 'Procesados' },
    { key: 'ANULADO', label: 'Anulados' },
    { key: 'CERRADO_SIN_NOTA', label: 'Cerrados' },
];

const RANGOS_DIAS = [7, 30, 90];

// pedido.discrepancia (historial con discrepancias=1): ALTA = cantidades que no
// cuadran entre cotización, nota y factura; MEDIA = solo precio o descuento.
const DISCREPANCIA_PEDIDO = {
    ALTA: { bg: '#fef2f2', border: '#f87171', text: '#b91c1c', label: 'Cantidades no cuadran con la cotización' },
    MEDIA: { bg: '#fefce8', border: '#facc15', text: '#a16207', label: 'Precio o descuento distinto al cotizado' },
};


const PedidosHistorialScreen = () => {
    const { user } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filtro, setFiltro] = useState('TODOS');
    const [dias, setDias] = useState(30);
    const [selectedPedido, setSelectedPedido] = useState(null);

    const fetchPedidos = useCallback(async () => {
        if (!user?.co_ven) {
            setError('Tu usuario no tiene código de vendedor.');
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            setError(null);
            const data = await api.get(
                `${API_ENDPOINTS.HISTORIAL_PEDIDOS}?co_ven=${encodeURIComponent(user.co_ven)}&dias=${dias}&discrepancias=1`
            );
            setPedidos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error cargando historial de pedidos:', err);
            setError('No se pudo cargar el historial. Desliza hacia abajo para reintentar.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.co_ven, dias]);

    useEffect(() => {
        setLoading(true);
        fetchPedidos();
    }, [fetchPedidos]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPedidos();
    }, [fetchPedidos]);

    const filteredPedidos = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return pedidos.filter((p) => {
            if (filtro !== 'TODOS' && p.estado !== filtro) return false;
            if (!query) return true;
            return (
                String(p.fact_num).includes(query) ||
                String(p.codigo_pedido || '').toLowerCase().includes(query) ||
                String(p.cli_des || '').toLowerCase().includes(query) ||
                String(p.co_cli || '').toLowerCase().includes(query) ||
                p.notas.some((n) => String(n.fact_num).includes(query))
            );
        });
    }, [pedidos, filtro, searchQuery]);

    const conteos = useMemo(() => {
        const c = { TODOS: pedidos.length };
        for (const p of pedidos) c[p.estado] = (c[p.estado] || 0) + 1;
        return c;
    }, [pedidos]);

    const renderPedidoCard = ({ item }) => {
        const estado = ESTADOS_PEDIDO[item.estado] || ESTADOS_PEDIDO.PENDIENTE;
        const avisos = item.estado === 'ANULADO' ? avisosAnulacion(item) : [];
        const discrepancia = DISCREPANCIA_PEDIDO[item.discrepancia];

        return (
            <TouchableOpacity
                style={[styles.pedidoCard, discrepancia && { backgroundColor: discrepancia.bg, borderColor: discrepancia.border }]}
                onPress={() => setSelectedPedido(item)}
                activeOpacity={0.7}
            >
                {discrepancia ? (
                    <View style={styles.discrepanciaAviso}>
                        <MaterialIcons name="warning-amber" size={16} color={discrepancia.text} />
                        <Text style={[styles.discrepanciaAvisoTexto, { color: discrepancia.text }]}>{discrepancia.label}</Text>
                    </View>
                ) : null}
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <MaterialIcons name="receipt-long" size={24} color={Theme.colors.primary} />
                        <View style={styles.cardHeaderInfo}>
                            <Text style={styles.pedidoCode}>Pedido {item.fact_num}</Text>
                            <Text style={styles.pedidoDate}>{formatDate(item.fec_emis)}</Text>
                        </View>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: estado.bg, borderColor: estado.border }]}>
                        <Text style={[styles.estadoText, { color: estado.text }]}>{estado.label}</Text>
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="business" size={16} color="#64748b" />
                        <Text style={styles.clienteText} numberOfLines={1}>
                            {item.cli_des || item.co_cli}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="description" size={16} color="#64748b" />
                        <Text style={styles.infoText} numberOfLines={1}>
                            {item.notas.length
                                ? `Notas: ${item.notas.map((n) => n.fact_num).join(', ')}`
                                : 'Sin notas todavía'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="attach-money" size={16} color="#64748b" />
                        <Text style={[styles.infoText, styles.statValueHighlight]}>{formatCurrency(item.tot_neto)}</Text>
                    </View>
                    {avisos.length > 0 ? (
                        <View style={styles.comentarioBox}>
                            <Text style={styles.comentarioTitulo}>{avisos[0].titulo}</Text>
                            <Text style={styles.comentarioTexto} numberOfLines={3}>
                                {avisos[0].texto}
                            </Text>
                        </View>
                    ) : null}
                    {item.estado === 'CERRADO_SIN_NOTA' && item.descrip ? (
                        <View style={[styles.comentarioBox, styles.cerradoBox]}>
                            <Text style={[styles.comentarioTitulo, styles.cerradoTitulo]}>Cerrado en Profit</Text>
                            <Text style={styles.comentarioTexto} numberOfLines={3}>{item.descrip}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailText}>Ver detalles</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Theme.colors.primary} />
                </View>
            </TouchableOpacity>
        );
    };

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color={Theme.colors.border} />
            <Text style={styles.emptyText}>
                {error || (searchQuery.trim() || filtro !== 'TODOS'
                    ? 'No se encontraron pedidos'
                    : `Sin pedidos en los últimos ${dias} días`)}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <MaterialIcons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar pedido, nota o cliente..."
                        placeholderTextColor={Theme.colors.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color={Theme.colors.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {FILTROS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.chip, filtro === f.key && styles.chipActivo]}
                            onPress={() => setFiltro(f.key)}
                        >
                            <Text style={[styles.chipText, filtro === f.key && styles.chipTextActivo]}>
                                {f.label} ({conteos[f.key] || 0})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.chipsRow}>
                    {RANGOS_DIAS.map((d) => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.chip, dias === d && styles.chipActivo]}
                            onPress={() => setDias(d)}
                        >
                            <Text style={[styles.chipText, dias === d && styles.chipTextActivo]}>{d} días</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loadingText}>Cargando pedidos...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPedidos}
                    renderItem={renderPedidoCard}
                    keyExtractor={(item) => String(item.fact_num)}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={ListEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Theme.colors.primary]}
                            tintColor={Theme.colors.primary}
                        />
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                    removeClippedSubviews={true}
                />
            )}

            <PedidoDetalleModal pedido={selectedPedido} onClose={() => setSelectedPedido(null)} />
        </View>
    );
};

export default PedidosHistorialScreen;
