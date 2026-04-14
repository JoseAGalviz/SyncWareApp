import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
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
import Theme from '../constants/Theme';
import styles from '../styles/MatrixExcelScreen.styles';

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
                <View style={[styles.idBadge, { backgroundColor: Theme.colors.dark }]}>
                    <Text style={styles.idText}>ID: {item.id || 'N/A'}</Text>
                </View>
                <View style={[styles.idBadge, { backgroundColor: Theme.colors.primary, marginLeft: 8 }]}>
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
                    <Text style={[styles.infoValue, { color: Number(item.promedio_pago) < 0 ? Theme.colors.error : Theme.colors.success }]}>
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
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Matriz Excel Datos</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
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
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loadingText}>Cargando datos...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={Theme.colors.muted} />
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


export default MatrixExcelScreen;
