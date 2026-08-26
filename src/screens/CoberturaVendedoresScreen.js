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
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CoberturaVendedoresService } from '../services/CoberturaVendedoresService';
import { showMessage } from 'react-native-flash-message';
import Theme from '../constants/Theme';
import styles from '../styles/CoberturaVendedoresScreen.styles';

const CoberturaVendedoresScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user || !user.co_ven) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            if (!isRefresh) setLoading(true);
            const result = await CoberturaVendedoresService.getData(user.co_ven);
            setData(result);
            setFilteredData(result);
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

    // Filtrado con debounce: filtrar en cada tecla trababa la UI con listas grandes.
    useEffect(() => {
        const timer = setTimeout(() => {
            const lower = searchQuery.trim().toLowerCase();
            if (!lower) {
                setFilteredData(data);
                return;
            }
            const filtered = data.filter(item =>
                `${item.vendedor || ''} ${item.ruta || ''} ${item.co_ven || ''}`.toLowerCase().includes(lower)
            );
            setFilteredData(filtered);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, data]);

    const formatNum = (val, decimals = 0) =>
        Number(val ?? 0).toLocaleString('es-VE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.idBadge, { backgroundColor: Theme.colors.primary }]}>
                    <Text style={styles.idText}>Ruta: {item.ruta || 'N/A'}</Text>
                </View>
                <View style={[styles.idBadge, { backgroundColor: Theme.colors.dark }]}>
                    <Text style={styles.idText}>#{item.co_ven ?? 'N/A'}</Text>
                </View>
            </View>

            <Text style={styles.companyName}>{item.vendedor || 'Sin nombre'}</Text>

            <View style={styles.divider} />

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CLIENTES MERCADO</Text>
                    <Text style={styles.infoValue}>{formatNum(item.clientes_mercado)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CLIENTES CRIST.</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.success }]}>
                        {formatNum(item.clientes_crist)}
                    </Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>UNID. MERCADO</Text>
                    <Text style={styles.infoValue}>{formatNum(item.unidades_mercado, 2)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>UNID. CRIST.</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.info }]}>
                        {formatNum(item.unidades_crist, 2)}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cobertura Vendedores</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por vendedor o ruta..."
                        placeholderTextColor={Theme.colors.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={Theme.colors.muted} />
                        </TouchableOpacity>
                    )}
                </View>
                {!loading && (
                    <Text style={styles.resultsCount}>
                        {filteredData.length} {filteredData.length === 1 ? 'resultado' : 'resultados'}
                    </Text>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loadingText}>Cargando cobertura...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `cobertura-${item.id ?? index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Theme.colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="map-outline" size={64} color={Theme.colors.muted} />
                            <Text style={styles.emptyTitle}>Sin cobertura</Text>
                            <Text style={styles.emptySubtitle}>
                                No se encontraron datos para:{'\n'}
                                <Text style={{ fontWeight: '700', color: Theme.colors.text }}>
                                    {user?.co_ven || 'N/D'}
                                </Text>
                            </Text>
                        </View>
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                    removeClippedSubviews={true}
                />
            )}
        </SafeAreaView>
    );
};

export default CoberturaVendedoresScreen;
