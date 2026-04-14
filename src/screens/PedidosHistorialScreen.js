import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
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
import Theme from '../constants/Theme';
import styles from '../styles/PedidosHistorialScreen.styles';


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
                String(p.codigo_pedido || '').toLowerCase().includes(query) ||
                String(p.nombre_cliente || '').toLowerCase().includes(query) ||
                String(p.cod_cliente || '').toLowerCase().includes(query)
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
                        <MaterialIcons name="receipt-long" size={24} color={Theme.colors.primary} />
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
                    <MaterialIcons name="chevron-right" size={20} color={Theme.colors.primary} />
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
                                <MaterialIcons name="close" size={24} color={Theme.colors.muted} />
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
                {icon && <MaterialIcons name={icon} size={16} color={Theme.colors.muted} style={styles.detailIcon} />}
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>
                {value}
            </Text>
        </View>
    );

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color={Theme.colors.border} />
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
                    <MaterialIcons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por código, cliente..."
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
            </View>


            {/* Lista de Pedidos */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
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
                            colors={[Theme.colors.primary]}
                            tintColor={Theme.colors.primary}
                        />
                    }
                />
            )}

            <DetailModal />
        </SafeAreaView>
    );
};


export default PedidosHistorialScreen;
