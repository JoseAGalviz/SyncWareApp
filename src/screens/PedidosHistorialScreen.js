import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Alert,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';
import COLORS from '../constants/Colors';


const ESTADO_COLORS = {
    pendiente: { bg: 'transparent', border: 'transparent', text: 'transparent', label: '' },
    aprobado: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', label: 'Aprobado' },
    rechazado: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Rechazado' },
    procesado: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', label: 'Procesado' },
};

const PedidosHistorialScreen = ({ navigation }) => {
    const [pedidos, setPedidos] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    useEffect(() => {
        fetchPedidos();
    }, []);

    useEffect(() => {
        filterPedidos();
    }, [searchQuery, pedidos]);

    const fetchPedidos = async () => {
        try {
            // Cargar desde el historial local (caché)
            const historialJson = await AsyncStorage.getItem('PEDIDOS_CACHE');
            let data = [];

            if (historialJson) {
                data = JSON.parse(historialJson);
                console.log(`📦 Historial cargado desde caché: ${data.length} pedidos.`);
            }

            // Ordenar por fecha más reciente primero
            data.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

            setPedidos(data);
        } catch (error) {
            console.error('Error fetching pedidos from cache:', error);
            Alert.alert('Error', 'No se pudieron cargar los pedidos del historial.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPedidos();
    }, []);

    const filterPedidos = () => {
        let filtered = pedidos;

        // Filtrar por búsqueda
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.codigo_pedido?.toLowerCase().includes(query) ||
                p.nombre_cliente?.toLowerCase().includes(query) ||
                p.cod_cliente?.toLowerCase().includes(query)
            );
        }

        setFilteredPedidos(filtered);
    };

    const handleViewDetail = (pedido) => {
        setSelectedPedido(pedido);
        setDetailModalVisible(true);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    };


    const renderPedidoCard = ({ item }) => {
        const estadoConfig = ESTADO_COLORS[item.estado] || ESTADO_COLORS.pendiente;

        return (
            <TouchableOpacity
                style={styles.pedidoCard}
                onPress={() => handleViewDetail(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <MaterialIcons name="receipt-long" size={24} color={COLORS.PRIMARY} />
                        <View style={styles.cardHeaderInfo}>
                            <Text style={styles.pedidoCode}>{item.codigo_pedido}</Text>
                            <Text style={styles.pedidoDate}>{formatDate(item.fecha_creacion)}</Text>
                        </View>
                    </View>
                    {estadoConfig.label ? (
                        <View style={[
                            styles.estadoBadge,
                            { backgroundColor: estadoConfig.bg, borderColor: estadoConfig.border }
                        ]}>
                            <Text style={[styles.estadoText, { color: estadoConfig.text }]}>
                                {estadoConfig.label}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="business" size={16} color="#64748b" />
                        <Text style={styles.clienteText} numberOfLines={1}>
                            {item.nombre_cliente || 'Cliente Desconocido'}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialIcons name="fingerprint" size={16} color="#64748b" />
                        <Text style={styles.infoText}>{item.cod_cliente}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Items</Text>
                            <Text style={styles.statValue}>{item.items_count || 0}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Bruto</Text>
                            <Text style={styles.statValue}>{formatCurrency(item.tot_bruto)}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Neto</Text>
                            <Text style={[styles.statValue, styles.statValueHighlight]}>
                                {formatCurrency(item.tot_neto)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailText}>Ver detalles</Text>
                    <MaterialIcons name="chevron-right" size={20} color={COLORS.PRIMARY} />
                </View>
            </TouchableOpacity>
        );
    };

    const DetailModal = () => {
        if (!selectedPedido) return null;
        const estadoConfig = ESTADO_COLORS[selectedPedido.estado] || ESTADO_COLORS.pendiente;

        return (
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Detalles del Pedido</Text>
                                <Text style={styles.modalSubtitle}>{selectedPedido.codigo_pedido}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setDetailModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Estado */}
                            {estadoConfig.label ? (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Estado</Text>
                                    <View style={[
                                        styles.estadoBadgeLarge,
                                        { backgroundColor: estadoConfig.bg, borderColor: estadoConfig.border }
                                    ]}>
                                        <Text style={[styles.estadoTextLarge, { color: estadoConfig.text }]}>
                                            {estadoConfig.label}
                                        </Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Información del Cliente */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Cliente</Text>
                                <View style={styles.detailCard}>
                                    <DetailRow icon="business" label="Nombre" value={selectedPedido.nombre_cliente} />
                                    <DetailRow icon="fingerprint" label="Código" value={selectedPedido.cod_cliente} />
                                </View>
                            </View>

                            {/* Información del Pedido */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Información del Pedido</Text>
                                <View style={styles.detailCard}>
                                    <DetailRow icon="event" label="Fecha" value={formatDate(selectedPedido.fecha_creacion)} />
                                    <DetailRow icon="inventory-2" label="Total Items" value={selectedPedido.items_count || 0} />
                                </View>
                            </View>

                            {/* Resumen Financiero */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Resumen Financiero</Text>
                                <View style={styles.detailCard}>
                                    <DetailRow label="Total Bruto" value={formatCurrency(selectedPedido.tot_bruto)} />
                                    <DetailRow label="Total Neto" value={formatCurrency(selectedPedido.tot_neto)} highlight />
                                    <DetailRow label="Saldo" value={formatCurrency(selectedPedido.saldo)} />
                                </View>
                            </View>

                            {/* Detalle de Productos */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Productos</Text>
                                <View style={styles.itemsListContainer}>
                                    {selectedPedido.items && selectedPedido.items.length > 0 ? (
                                        selectedPedido.items.map((item, index) => (
                                            <View key={index} style={styles.itemRow}>
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemDescription} numberOfLines={2}>
                                                        {item.art_des || 'Producto sin descripción'}
                                                    </Text>
                                                    <Text style={styles.itemCode}>{item.co_art}</Text>
                                                </View>
                                                <View style={styles.itemQuantityContainer}>
                                                    <Text style={styles.itemQuantityLabel}>CANT.</Text>
                                                    <Text style={styles.itemQuantityValue}>{item.cant_sc}</Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.emptyItemsText}>No hay items en este pedido</Text>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const DetailRow = ({ icon, label, value, highlight }) => (
        <View style={styles.detailRow}>
            <View style={styles.detailRowLeft}>
                {icon && <MaterialIcons name={icon} size={16} color={COLORS.MUTED} style={styles.detailIcon} />}
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>
                {value}
            </Text>
        </View>
    );

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color={COLORS.BORDER} />
            <Text style={styles.emptyText}>
                {searchQuery.trim()
                    ? 'No se encontraron pedidos'
                    : 'Aún no hay pedidos generados'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <MaterialIcons name="search" size={20} color={COLORS.MUTED} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por código, cliente..."
                        placeholderTextColor={COLORS.MUTED}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color={COLORS.MUTED} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>


            {/* Lista de Pedidos */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={styles.loadingText}>Cargando pedidos...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPedidos}
                    renderItem={renderPedidoCard}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={ListEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.PRIMARY]}
                            tintColor={COLORS.PRIMARY}
                        />
                    }
                />
            )}

            <DetailModal />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.WHITE,
        borderWidth: 1,
        borderColor: COLORS.BORDER,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1e293b',
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    pedidoCard: {
        backgroundColor: COLORS.WHITE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    cardHeaderInfo: {
        marginLeft: 12,
        flex: 1,
    },
    pedidoCode: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    pedidoDate: {
        fontSize: 12,
        color: COLORS.MUTED,
    },
    estadoBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    estadoText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 12,
    },
    cardBody: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    clienteText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
    },
    infoText: {
        fontSize: 13,
        color: '#64748b',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#f1f5f9',
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.MUTED,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
    },
    statValueHighlight: {
        color: COLORS.PRIMARY,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    viewDetailText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.PRIMARY,
        marginRight: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.MUTED,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
        color: COLORS.MUTED,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.WHITE,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 34,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    detailSection: {
        marginBottom: 24,
    },
    detailSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    detailCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailIcon: {
        marginRight: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    detailValueHighlight: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.PRIMARY,
    },
    estadoBadgeLarge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    estadoTextLarge: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    itemsListContainer: {
        gap: 12,
    },
    itemRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.WHITE,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemDescription: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 2,
    },
    itemCode: {
        fontSize: 12,
        color: COLORS.MUTED,
    },
    itemQuantityContainer: {
        alignItems: 'center',
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: '#f1f5f9',
        minWidth: 60,
    },
    itemQuantityLabel: {
        fontSize: 10,
        color: COLORS.MUTED,
        fontWeight: '700',
        marginBottom: 2,
    },
    itemQuantityValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.PRIMARY,
    },
    emptyItemsText: {
        textAlign: 'center',
        color: COLORS.MUTED,
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
    },
});

export default PedidosHistorialScreen;
