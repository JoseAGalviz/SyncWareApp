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
import { PotencialCiudadesService } from '../services/PotencialCiudadesService';
import { showMessage } from 'react-native-flash-message';
import Theme from '../constants/Theme';
import styles from '../styles/PotencialCiudadesScreen.styles';

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
                <View style={[styles.badge, { backgroundColor: Theme.colors.primary }]}>
                    <Ionicons name="location-outline" size={13} color={Theme.colors.white} />
                    <Text style={styles.badgeText}>{item.ciudad || 'Sin ciudad'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: Theme.colors.dark }]}>
                    <Text style={styles.badgeText}>#{index + 1}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Fila 1: Potencial en unidades | Promedio mensual */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>POTENCIAL EN UNIDADES</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.info }]}>
                        {Number(item.potencial_unidades ?? item.potencial_en_unidades ?? 0).toLocaleString()}
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PROMEDIO MENSUAL</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.success }]}>
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
                    <Text style={[styles.infoValue, { color: Theme.colors.warning }]}>
                        {(Number(item.peso_crist_zona ?? item.peso_crist_en_zona ?? 0) * 100).toFixed(2)}%
                    </Text>
                </View>
            </View>

            {/* Vendedor de Bitrix (fila completa) */}
            <View style={styles.vendedorRow}>
                <Ionicons name="person-outline" size={14} color={Theme.colors.muted} />
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
            <StatusBar barStyle="light-content" backgroundColor={Theme.colors.dark} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.white} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Ionicons name="bar-chart-outline" size={20} color={Theme.colors.success} />
                    <Text style={styles.headerTitle}>  Potencial por Ciudad</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por ciudad o vendedor..."
                        placeholderTextColor={Theme.colors.light}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={18} color={Theme.colors.muted} />
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
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
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
                            colors={[Theme.colors.primary]}
                            tintColor={Theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="map-outline" size={64} color={Theme.colors.muted} />
                            <Text style={styles.emptyTitle}>Sin datos de ciudades</Text>
                            <Text style={styles.emptySubtitle}>
                                No se encontraron registros para el segmento:{'\n'}
                                <Text style={{ fontWeight: '700', color: Theme.colors.text }}>
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


export default PotencialCiudadesScreen;
