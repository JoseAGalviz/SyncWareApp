import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { PotencialCiudadesService } from '../services/PotencialCiudadesService';
import { showMessage } from 'react-native-flash-message';
import COLORS from '../constants/Colors';

const PotencialCiudadesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user || (!user.segmento_bitrix_excel && !user.segmento_bitrix)) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        const segmento = user.segmento_bitrix_excel || user.segmento_bitrix;

        try {
            if (!isRefresh) setLoading(true);
            const result = await PotencialCiudadesService.getPotencialData(segmento);
            setData(result || []);
            setFilteredData(result || []);
        } catch (error) {
            showMessage({
                message: 'Error de conexión',
                description: error.message || 'No se pudieron obtener los datos.',
                type: 'danger',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (!text) {
            setFilteredData(data);
            return;
        }
        const lower = text.toLowerCase();
        const filtered = data.filter(item => {
            const searchStr = `${item.ciudad || ''} ${item.vendedor_bitrix || ''}`.toLowerCase();
            return searchStr.includes(lower);
        });
        setFilteredData(filtered);
    };

    // ── Tarjeta individual ────────────────────────────────────────────────────
    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            {/* Número de fila */}
            <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: COLORS.PRIMARY }]}>
                    <Ionicons name="location-outline" size={13} color={COLORS.WHITE} />
                    <Text style={styles.badgeText}>{item.ciudad || 'Sin ciudad'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: COLORS.SECONDARY }]}>
                    <Text style={styles.badgeText}>#{index + 1}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Fila 1: Potencial en unidades | Promedio mensual */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>POTENCIAL EN UNIDADES</Text>
                    <Text style={[styles.infoValue, { color: COLORS.ACCENT }]}>
                        {Number(item.potencial_unidades ?? item.potencial_en_unidades ?? 0).toLocaleString()}
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PROMEDIO MENSUAL</Text>
                    <Text style={[styles.infoValue, { color: COLORS.SUCCESS }]}>
                        {Number(item.promedio_mensual ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                </View>
            </View>

            {/* Fila 2: Compras crist | Peso crist en zona */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>COMPRAS CRIST</Text>
                    <Text style={styles.infoValue}>
                        ${Number(item.compras_crist ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PESO CRIST EN ZONA</Text>
                    <Text style={[styles.infoValue, { color: COLORS.WARNING }]}>
                        {(Number(item.peso_crist_zona ?? item.peso_crist_en_zona ?? 0) * 100).toFixed(2)}%
                    </Text>
                </View>
            </View>

            {/* Vendedor de Bitrix (fila completa) */}
            <View style={styles.vendedorRow}>
                <Ionicons name="person-outline" size={14} color={COLORS.MUTED} />
                <Text style={styles.vendedorLabel}>  VENDEDOR BITRIX: </Text>
                <Text style={styles.vendedorValue} numberOfLines={1}>
                    {item.vendedor_bitrix ?? item.vendedor_de_bitrix ?? 'N/D'}
                </Text>
            </View>
        </View>
    );

    // ── Render principal ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.SECONDARY} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Ionicons name="bar-chart-outline" size={20} color={COLORS.SUCCESS} />
                    <Text style={styles.headerTitle}>  Potencial por Ciudad</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={COLORS.MUTED} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por ciudad o vendedor..."
                        placeholderTextColor={COLORS.LIGHT_TEXT}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.MUTED} />
                        </TouchableOpacity>
                    )}
                </View>
                {!loading && (
                    <Text style={styles.resultsCount}>
                        {filteredData.length} {filteredData.length === 1 ? 'ciudad encontrada' : 'ciudades encontradas'}
                    </Text>
                )}
            </View>

            {/* Contenido */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={styles.loadingText}>Cargando potencial de ciudades...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `ciudad-${index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.PRIMARY]}
                            tintColor={COLORS.PRIMARY}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="map-outline" size={64} color={COLORS.MUTED} />
                            <Text style={styles.emptyTitle}>Sin datos de ciudades</Text>
                            <Text style={styles.emptySubtitle}>
                                No se encontraron registros para el segmento:{'\n'}
                                <Text style={{ fontWeight: 'bold', color: COLORS.TEXT }}>
                                    {user?.segmento_bitrix_excel || user?.segmento_bitrix || 'N/D'}
                                </Text>
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 14,
        backgroundColor: COLORS.SECONDARY,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS.WHITE,
    },
    backButton: {
        padding: 6,
    },
    // Search
    searchContainer: {
        padding: 14,
        backgroundColor: COLORS.WHITE,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.BACKGROUND,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.TEXT,
    },
    resultsCount: {
        fontSize: 12,
        color: COLORS.MUTED,
        marginTop: 8,
        fontWeight: '600',
    },
    // List
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    // Card
    card: {
        backgroundColor: COLORS.WHITE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: COLORS.BORDER,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        color: COLORS.WHITE,
        fontSize: 12,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.BORDER,
        marginBottom: 12,
    },
    // Rows
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoCol: {
        flex: 1,
        paddingRight: 8,
    },
    infoLabel: {
        fontSize: 10,
        color: COLORS.MUTED,
        fontWeight: 'bold',
        marginBottom: 2,
        letterSpacing: 0.4,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.TEXT,
        fontWeight: '700',
    },
    // Vendedor row
    vendedorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.BORDER,
    },
    vendedorLabel: {
        fontSize: 11,
        color: COLORS.MUTED,
        fontWeight: 'bold',
    },
    vendedorValue: {
        flex: 1,
        fontSize: 13,
        color: COLORS.TEXT,
        fontWeight: '600',
    },
    // Estados
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.MUTED,
        fontSize: 15,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TEXT,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.MUTED,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
        lineHeight: 22,
    },
});

export default PotencialCiudadesScreen;
