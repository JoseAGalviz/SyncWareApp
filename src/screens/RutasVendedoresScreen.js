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
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { RutasVendedoresService } from '../services/RutasVendedoresService';
import { showMessage } from 'react-native-flash-message';
import * as Clipboard from 'expo-clipboard';
import { printAndSharePdf } from '../utils/pdfUtils';
import Theme from '../constants/Theme';
import styles from '../styles/RutasVendedoresScreen.styles';


const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_LABEL = ['L', 'M', 'X', 'J', 'V', 'S'];
const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const formatNum = (val, decimals = 0) =>
    Number(val ?? 0).toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

// ── Tarjeta individual ───────────────────────────────────────────────────
const RutaCard = React.memo(({ item }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await Clipboard.setStringAsync(item.coordenadas);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.idBadge, { backgroundColor: Theme.colors.primary, flex: 1, marginRight: 6 }]}>
                    <Text style={styles.idText} numberOfLines={1}>{item.vendedor || 'Sin nombre'}</Text>
                </View>
                {item.tiempo_mas ? (
                    <View style={[styles.idBadge, { backgroundColor: Theme.colors.info }]}>
                        <Ionicons name="time-outline" size={11} color={Theme.colors.white} />
                        <Text style={[styles.idText, { marginLeft: 3 }]}>{item.tiempo_mas}</Text>
                    </View>
                ) : null}
            </View>

            <Text style={styles.companyName}>{item.zona || 'Sin zona'}</Text>

            {item.coordenadas ? (
                <TouchableOpacity
                    onPress={handleCopy}
                    activeOpacity={0.7}
                    style={styles.coordRow}
                >
                    <Ionicons
                        name={copied ? 'checkmark-circle' : 'location-outline'}
                        size={12}
                        color={copied ? Theme.colors.success : Theme.colors.primary}
                    />
                    <Text style={[styles.coordText, copied && { color: Theme.colors.success }]}>
                        {copied ? '¡Copiado!' : item.coordenadas}
                    </Text>
                    {!copied && (
                        <Ionicons name="copy-outline" size={12} color={Theme.colors.muted} style={{ marginLeft: 4 }} />
                    )}
                </TouchableOpacity>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.diasRow}>
                {DIAS.map((dia, i) => (
                    <View
                        key={dia}
                        style={[
                            styles.diaBadge,
                            { backgroundColor: item[dia]?.toLowerCase() === 'x' ? Theme.colors.success : Theme.colors.border },
                        ]}
                    >
                        <Text style={[styles.diaText, { color: item[dia]?.toLowerCase() === 'x' ? Theme.colors.white : Theme.colors.muted }]}>
                            {DIAS_LABEL[i]}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CLIENTES MERCADO</Text>
                    <Text style={styles.infoValue}>{formatNum(item.clientes_me)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CLIENTES CRIST.</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.success }]}>
                        {formatNum(item.clientes_cris)}
                    </Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>ACTIVOS CRIST.</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.info }]}>
                        {formatNum(item.activos_crist)}
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>INACTIVOS</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.error }]}>
                        {formatNum(item.inactivos)}
                    </Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>UNID. MERCADO</Text>
                    <Text style={styles.infoValue}>{formatNum(item.unidades_m, 2)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>UNID. CRIST.</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.primary }]}>
                        {formatNum(item.unidades_cr, 2)}
                    </Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PESO UNID.</Text>
                    <Text style={styles.infoValue}>{formatNum(item.peso_unid, 4)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PESO CLIENTE</Text>
                    <Text style={styles.infoValue}>{formatNum(item.peso_cliente, 4)}</Text>
                </View>
            </View>

            {item.observacion ? (
                <View style={styles.obsRow}>
                    <Ionicons name="information-circle-outline" size={14} color={Theme.colors.muted} />
                    <Text style={styles.obsText}> {item.observacion}</Text>
                </View>
            ) : null}
        </View>
    );
});


const RutasVendedoresScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState(null); // null = todos
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user || !user.co_ven) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            if (!isRefresh) setLoading(true);
            const result = await RutasVendedoresService.getData(user.co_ven);
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

    const applyFilters = useCallback((query, day, source) => {
        let result = source;
        if (day !== null) {
            result = result.filter(item => item[DIAS[day]]?.toLowerCase() === 'x');
        }
        if (query) {
            const lower = query.toLowerCase();
            result = result.filter(item =>
                `${item.vendedor || ''} ${item.zona || ''}`.toLowerCase().includes(lower)
            );
        }
        setFilteredData(result);
    }, []);

    const handleSearch = (text) => {
        setSearchQuery(text);
    };

    // Debounce solo del texto: filtrar en cada tecla trababa la UI con listas grandes.
    // El filtro por día (abajo) sigue siendo inmediato porque es un tap, no tecleo.
    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters(searchQuery, selectedDay, data);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedDay, data, applyFilters]);

    const handleDayFilter = (dayIndex) => {
        const next = selectedDay === dayIndex ? null : dayIndex;
        setSelectedDay(next);
        applyFilters(searchQuery, next, data);
    };

    // ── PDF ──────────────────────────────────────────────────────────────────
    const handleGeneratePdf = async () => {
        if (filteredData.length === 0) {
            showMessage({ message: 'Sin datos', description: 'No hay registros para exportar.', type: 'warning' });
            return;
        }
        setGeneratingPdf(true);
        try {
            const date = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
            const dayLabel = selectedDay !== null ? DIAS_FULL[selectedDay] : 'Semana completa';

            const diasHeader = DIAS_LABEL.map(l => `<th style="text-align:center;">${l}</th>`).join('');

            const rows = filteredData.map((item, i) => {
                const diasCells = DIAS.map(d =>
                    `<td style="text-align:center;">${item[d]?.toLowerCase() === 'x' ? '✓' : ''}</td>`
                ).join('');
                return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.zona || 'N/D'}</td>
                  ${diasCells}
                  <td style="text-align:center;">${item.tiempo_mas || 'N/D'}</td>
                  <td style="text-align:right;">${formatNum(item.clientes_me)}</td>
                  <td style="text-align:right;">${formatNum(item.clientes_cris)}</td>
                  <td style="text-align:right;">${formatNum(item.activos_crist)}</td>
                  <td style="text-align:right;">${formatNum(item.inactivos)}</td>
                  <td style="text-align:right;">${formatNum(item.unidades_m, 2)}</td>
                  <td style="text-align:right;">${formatNum(item.unidades_cr, 2)}</td>
                  <td>${item.observacion || ''}</td>
                </tr>`;
            }).join('');

            const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    body { font-family: Arial, sans-serif; font-size: 8.5px; color: #222; }
    h1 { font-size: 17px; font-weight: 700; color: #1a1a2e; margin: 0 0 3px 0; }
    .subtitle { font-size: 10px; color: #666; margin: 0 0 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #1a1a2e; color: #fff; padding: 5px; text-align: left; font-size: 8px; text-transform: uppercase; white-space: nowrap; }
    tbody td { padding: 4px 5px; border-bottom: 1px solid #e8e8e8; font-size: 8.5px; }
    tbody tr:nth-child(even) td { background: #f7f7f7; }
    .footer { margin-top: 14px; font-size: 9px; color: #aaa; text-align: right; }
  </style>
</head>
<body>
  <h1>Rutas Vendedores</h1>
  <p class="subtitle">
    Vendedor: <strong>${user?.co_ven || 'N/D'}</strong> &nbsp;|&nbsp;
    Día: <strong>${dayLabel}</strong> &nbsp;|&nbsp;
    ${date} &nbsp;|&nbsp; ${filteredData.length} registros
    ${searchQuery ? `&nbsp;|&nbsp; Filtro: "${searchQuery}"` : ''}
  </p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Zona</th>
        ${diasHeader}
        <th style="text-align:center;">Tiempo</th>
        <th style="text-align:right;">Cli.Mer.</th>
        <th style="text-align:right;">Cli.Cri.</th>
        <th style="text-align:right;">Activos</th>
        <th style="text-align:right;">Inact.</th>
        <th style="text-align:right;">Unid.M.</th>
        <th style="text-align:right;">Unid.C.</th>
        <th>Observación</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generado por SyncWare</div>
</body>
</html>`;

            const fileName = selectedDay !== null
                ? `Rutas_${DIAS_FULL[selectedDay]}`
                : 'Rutas_Semana_Completa';

            await printAndSharePdf(html, fileName);
        } catch (error) {
            showMessage({ message: 'Error al generar PDF', description: error.message, type: 'danger' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    // ── Tarjeta ───────────────────────────────────────────────────────────────
    const renderItem = ({ item }) => <RutaCard item={item} />;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rutas Vendedores</Text>
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

            {/* Búsqueda */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por vendedor o zona..."
                        placeholderTextColor={Theme.colors.muted}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={18} color={Theme.colors.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filtro por día */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayFilterRow}>
                    <TouchableOpacity
                        style={[styles.dayFilterBtn, selectedDay === null && styles.dayFilterBtnActive]}
                        onPress={() => handleDayFilter(null)}
                    >
                        <Text style={[styles.dayFilterText, selectedDay === null && styles.dayFilterTextActive]}>
                            Todos
                        </Text>
                    </TouchableOpacity>
                    {DIAS_FULL.map((label, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.dayFilterBtn, selectedDay === i && styles.dayFilterBtnActive]}
                            onPress={() => handleDayFilter(i)}
                        >
                            <Text style={[styles.dayFilterText, selectedDay === i && styles.dayFilterTextActive]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {!loading && (
                    <Text style={styles.resultsCount}>
                        {filteredData.length} {filteredData.length === 1 ? 'resultado' : 'resultados'}
                        {selectedDay !== null ? ` — ${DIAS_FULL[selectedDay]}` : ''}
                    </Text>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loadingText}>Cargando rutas...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `ruta-${item.id ?? index}`}
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
                            <Ionicons name="navigate-outline" size={64} color={Theme.colors.muted} />
                            <Text style={styles.emptyTitle}>Sin rutas</Text>
                            <Text style={styles.emptySubtitle}>
                                {selectedDay !== null
                                    ? `No hay rutas para ${DIAS_FULL[selectedDay]}`
                                    : `No se encontraron rutas para:\n`}
                                {selectedDay === null && (
                                    <Text style={{ fontWeight: '700', color: Theme.colors.text }}>
                                        {user?.co_ven || 'N/D'}
                                    </Text>
                                )}
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

export default RutasVendedoresScreen;
