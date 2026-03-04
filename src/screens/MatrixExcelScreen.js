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
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { MatrixService } from '../services/MatrixService';
import { showMessage } from 'react-native-flash-message';
import COLORS from '../constants/Colors';

const MatrixExcelScreen = ({ navigation }) => {
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
            const result = await MatrixService.getMatrixData(segmento);
            setData(result || []);
            setFilteredData(result || []);
        } catch (error) {
            showMessage({
                message: "Error de conexión",
                description: error.message || "No se pudieron obtener los datos.",
                type: "danger",
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

        const filtered = data.filter(item => {
            const searchStr = `${item.nombre || ''} ${item.sicm || ''} ${item.id || ''}`.toLowerCase();
            return searchStr.includes(text.toLowerCase());
        });
        setFilteredData(filtered);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.idBadge, { backgroundColor: COLORS.SECONDARY }]}>
                    <Text style={styles.idText}>ID: {item.id || 'N/A'}</Text>
                </View>
                <View style={[styles.idBadge, { backgroundColor: COLORS.PRIMARY, marginLeft: 8 }]}>
                    <Text style={styles.idText}>SICM: {item.sicm || 'N/A'}</Text>
                </View>
            </View>

            <Text style={styles.companyName}>{item.nombre || 'Sin Nombre'}</Text>

            <View style={styles.divider} />

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CIUDAD/ESTADO</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                        {item.ciudad || item.estado || 'N/D'}
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>COMPRAS CRIST</Text>
                    <Text style={styles.infoValue}>
                        ${Number(item.compras_crist || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PROMEDIO PAGO</Text>
                    <Text style={[styles.infoValue, { color: Number(item.promedio_pago) < 0 ? '#EF4444' : COLORS.SUCCESS }]}>
                        {item.promedio_pago || '0.00'} días
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>NRO. PEDIDOS</Text>
                    <Text style={styles.infoValue}>{item.nro_pedidos || '0'}</Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PESO PROM.</Text>
                    <Text style={styles.infoValue}>
                        {(Number(item.peso_prom || 0) * 100).toFixed(2)}%
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>ZONA</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{item.segmento_zona_bitrix || 'N/D'}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Matriz Excel Datos</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={COLORS.MUTED} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por cliente o ID..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
                {!loading && (
                    <Text style={styles.resultsCount}>
                        {filteredData.length} {filteredData.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                    </Text>
                )}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={styles.loadingText}>Cargando datos...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={COLORS.MUTED} />
                            <Text style={styles.emptyTitle}>No hay registros</Text>
                            <Text style={styles.emptySubtitle}>
                                No se encontraron datos para el segmento: {"\n"}
                                <Text style={{ fontWeight: 'bold' }}>{user.segmento_bitrix_excel || user.segmento_bitrix || 'N/D'}</Text>
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 12,
        backgroundColor: COLORS.WHITE,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TEXT,
    },
    backButton: {
        padding: 8,
    },
    searchContainer: {
        padding: 16,
        backgroundColor: COLORS.WHITE,
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
    listContent: {
        padding: 16,
        paddingBottom: 30,
    },
    card: {
        backgroundColor: COLORS.WHITE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: COLORS.BORDER,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    idBadge: {
        backgroundColor: COLORS.SECONDARY,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    idText: {
        color: COLORS.WHITE,
        fontSize: 11,
        fontWeight: 'bold',
    },
    statusTag: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    companyName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS.TEXT,
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.BORDER,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        color: COLORS.MUTED,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 13,
        color: COLORS.SECONDARY,
        fontWeight: '600',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.MUTED,
        fontSize: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
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
    },
});

export default MatrixExcelScreen;
