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
import { printAndSharePdf } from '../utils/pdfUtils';
import Theme from '../constants/Theme';
import styles from '../styles/MatrixExcelScreen.styles';

const POTENCIAL_COLORS = {
    Alto: Theme.colors.success,
    Medio: Theme.colors.warning,
    Bajo: Theme.colors.error,
};

const MatrixExcelScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user || !user.co_ven) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            if (!isRefresh) setLoading(true);
            const result = await MatrixService.getMatrixData(user.co_ven);
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
        const q = text.toLowerCase();
        const filtered = data.filter(item =>
            `${item.ciudad || ''} ${item.potencial || ''} ${item.id || ''}`.toLowerCase().includes(q)
        );
        setFilteredData(filtered);
    };

    const formatNumber = (val) =>
        Number(val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── Generación del PDF ────────────────────────────────────────────────────
    const handleGeneratePdf = async () => {
        if (filteredData.length === 0) {
            showMessage({ message: 'Sin datos', description: 'No hay registros para exportar.', type: 'warning' });
            return;
        }
        setGeneratingPdf(true);
        try {
            const date = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
            const badgeColor = { Alto: '#27ae60', Medio: '#f39c12', Bajo: '#e74c3c' };

            const rows = filteredData.map((item, i) => {
                const color = badgeColor[item.potencial] || '#555';
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${item.id ?? 'N/A'}</td>
                    <td>${item.ciudad || 'Sin Ciudad'}</td>
                    <td><span style="background:${color};color:#fff;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;">${item.potencial || 'N/D'}</span></td>
                    <td style="text-align:center;">${item.farmacias || '0'}</td>
                    <td style="text-align:right;">${formatNumber(item.mesual_unid)}</td>
                    <td style="text-align:right;">${formatNumber(item.mesual_crist)}</td>
                    <td style="text-align:right;">${formatNumber(item.peso_empresa)}</td>
                  </tr>`;
            }).join('');

            const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: A4 portrait; margin: 20mm 15mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #222; }
    .header-block { margin-bottom: 18px; }
    h1 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; }
    .subtitle { font-size: 11px; color: #666; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    thead th { background: #1a1a2e; color: #fff; padding: 7px 9px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    tbody td { padding: 6px 9px; border-bottom: 1px solid #e8e8e8; font-size: 11px; }
    tbody tr:nth-child(even) td { background: #f7f7f7; }
    .footer { margin-top: 20px; font-size: 10px; color: #aaa; text-align: right; }
  </style>
</head>
<body>
  <div class="header-block">
    <h1>Zonas Potenciales</h1>
    <p class="subtitle">Vendedor: <strong>${user?.co_ven || 'N/D'}</strong> &nbsp;|&nbsp; ${date} &nbsp;|&nbsp; ${filteredData.length} registros${searchQuery ? ` &nbsp;|&nbsp; Filtro: "${searchQuery}"` : ''}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>ID</th><th>Ciudad</th><th>Potencial</th>
        <th style="text-align:center;">Farmacias</th>
        <th style="text-align:right;">Mensual Unid.</th>
        <th style="text-align:right;">Mensual Crist.</th>
        <th style="text-align:right;">Peso Empresa</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generado por SyncWare</div>
</body>
</html>`;

            await printAndSharePdf(html, 'Zonas_Potenciales');
        } catch (error) {
            showMessage({ message: 'Error al generar PDF', description: error.message, type: 'danger' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    // ── Tarjeta individual ────────────────────────────────────────────────────
    const renderItem = ({ item }) => {
        const potencialColor = POTENCIAL_COLORS[item.potencial] || Theme.colors.muted;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.idBadge, { backgroundColor: Theme.colors.dark }]}>
                        <Text style={styles.idText}>ID: {item.id ?? 'N/A'}</Text>
                    </View>
                    <View style={[styles.idBadge, { backgroundColor: potencialColor }]}>
                        <Text style={styles.idText}>{item.potencial || 'N/D'}</Text>
                    </View>
                </View>

                <Text style={styles.companyName}>{item.ciudad || 'Sin Ciudad'}</Text>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>FARMACIAS</Text>
                        <Text style={styles.infoValue}>{item.farmacias || '0'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>MENSUAL UNID.</Text>
                        <Text style={styles.infoValue}>{formatNumber(item.mesual_unid)}</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>MENSUAL CRIST.</Text>
                        <Text style={styles.infoValue}>{formatNumber(item.mesual_crist)}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>PESO EMPRESA</Text>
                        <Text style={styles.infoValue}>{formatNumber(item.peso_empresa)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Zonas Potenciales</Text>
                <TouchableOpacity
                    onPress={handleGeneratePdf}
                    disabled={generatingPdf || loading || filteredData.length === 0}
                    style={{ padding: 8, opacity: (generatingPdf || loading || filteredData.length === 0) ? 0.4 : 1 }}
                >
                    {generatingPdf
                        ? <ActivityIndicator size="small" color={Theme.colors.primary} />
                        : <Ionicons name="download-outline" size={24} color={Theme.colors.primary} />
                    }
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por ciudad o potencial..."
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
                                No se encontraron datos para el vendedor:{"\n"}
                                <Text style={{ fontWeight: 'bold' }}>{user?.co_ven || 'N/D'}</Text>
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default MatrixExcelScreen;
