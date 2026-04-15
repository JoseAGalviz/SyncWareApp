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
import { printAndSharePdf } from '../utils/pdfUtils';
import Theme from '../constants/Theme';
import styles from '../styles/PotencialCiudadesScreen.styles';

const PotencialCiudadesScreen = ({ navigation }) => {
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
            const result = await PotencialCiudadesService.getPotencialData(user.co_ven);
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
            const searchStr = `${item.nombre || ''} ${item.rif || ''} ${item.municipio_y_parroquia || ''}`.toLowerCase();
            return searchStr.includes(lower);
        });
        setFilteredData(filtered);
    };

    const formatDate = (val) => {
        if (!val) return 'N/D';
        return String(val).split('T')[0];
    };

    const formatNum = (val, decimals = 0) =>
        Number(val ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

    // ── Generación del PDF ────────────────────────────────────────────────────
    const handleGeneratePdf = async () => {
        if (filteredData.length === 0) {
            showMessage({ message: 'Sin datos', description: 'No hay registros para exportar.', type: 'warning' });
            return;
        }
        setGeneratingPdf(true);
        try {
            const date = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

            const rows = filteredData.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.nombre || 'N/D'}</td>
                <td>${item.rif || 'N/D'}</td>
                <td>${item.sicm || 'N/D'}</td>
                <td>${item.municipio_y_parroquia || 'N/D'}</td>
                <td style="text-align:center;">${item.clasificacion_horar_caja || 'N/D'}</td>
                <td style="text-align:right;">${formatNum(item.unid_mensual)}</td>
                <td style="text-align:right;">${formatNum(item.crist_mensual)}</td>
                <td style="text-align:right;">${formatNum(item.peso_de_la_drogueria, 2)}%</td>
                <td style="text-align:right;">${formatNum(item.promedio_mora, 1)}</td>
                <td style="text-align:center;">${formatNum(item.cantidad_doc_e)}</td>
                <td>${item.codigo_profit || 'N/D'}</td>
                <td>${formatDate(item.ultima_compra)}</td>
                <td style="color:${item.ultima_fec_emis ? '#222' : '#aaa'};">${formatDate(item.ultima_fec_emis)}</td>
                <td>${item.contacto_farmap || 'N/D'}</td>
                <td>${[item.numero, item.numero_2].filter(Boolean).join(' / ') || 'N/D'}</td>
                <td>${item.vendedor || 'N/D'}</td>
                <td>${formatDate(item.fecha_creacion)}</td>
              </tr>`).join('');

            const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    body { font-family: Arial, sans-serif; font-size: 8.5px; color: #222; }
    .header-block { margin-bottom: 12px; }
    h1 { font-size: 17px; font-weight: 700; color: #1a1a2e; margin: 0 0 3px 0; }
    .subtitle { font-size: 10px; color: #666; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th {
      background: #1a1a2e; color: #fff;
      padding: 5px 5px; text-align: left;
      font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px;
      white-space: nowrap;
    }
    tbody td { padding: 4px 5px; border-bottom: 1px solid #e8e8e8; font-size: 8.5px; }
    tbody tr:nth-child(even) td { background: #f7f7f7; }
    .footer { margin-top: 14px; font-size: 9px; color: #aaa; text-align: right; }
  </style>
</head>
<body>
  <div class="header-block">
    <h1>Clientes Potenciales</h1>
    <p class="subtitle">Vendedor: <strong>${user?.co_ven || 'N/D'}</strong> &nbsp;|&nbsp; ${date} &nbsp;|&nbsp; ${filteredData.length} registros${searchQuery ? ` &nbsp;|&nbsp; Filtro: "${searchQuery}"` : ''}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre</th>
        <th>RIF</th>
        <th>SICM</th>
        <th>Municipio / Parroquia</th>
        <th>Clasif.</th>
        <th style="text-align:right;">Unid.Men.</th>
        <th style="text-align:right;">Crist.Men.</th>
        <th style="text-align:right;">Peso%</th>
        <th style="text-align:right;">Mora(d)</th>
        <th style="text-align:center;">Doc.E</th>
        <th>Cód. Profit</th>
        <th>Últ. Compra</th>
        <th>Últ. Fact.</th>
        <th>Contacto</th>
        <th>Núm.</th>
        <th>Vendedor</th>
        <th>F. Creación</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generado por SyncWare</div>
</body>
</html>`;

            await printAndSharePdf(html, 'Clientes_Potenciales');
        } catch (error) {
            showMessage({ message: 'Error al generar PDF', description: error.message, type: 'danger' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    // ── Tarjeta individual ────────────────────────────────────────────────────
    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            {/* Encabezado: nombre + clasificacion + índice */}
            <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: Theme.colors.primary, flex: 1, marginRight: 6 }]}>
                    <Ionicons name="storefront-outline" size={13} color={Theme.colors.white} />
                    <Text style={[styles.badgeText, { marginLeft: 4 }]} numberOfLines={1}>
                        {item.nombre || 'Sin nombre'}
                    </Text>
                </View>
                {item.clasificacion_horar_caja ? (
                    <View style={[styles.badge, { backgroundColor: Theme.colors.info, marginRight: 6 }]}>
                        <Text style={styles.badgeText}>{item.clasificacion_horar_caja}</Text>
                    </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: Theme.colors.dark }]}>
                    <Text style={styles.badgeText}>#{index + 1}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* RIF | SICM */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>RIF</Text>
                    <Text style={styles.infoValue}>{item.rif || 'N/D'}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>SICM</Text>
                    <Text style={styles.infoValue}>{item.sicm || 'N/D'}</Text>
                </View>
            </View>

            {/* Municipio y parroquia */}
            <View style={{ marginBottom: Theme.spacing.md }}>
                <Text style={styles.infoLabel}>MUNICIPIO / PARROQUIA</Text>
                <Text style={[styles.infoValue, { fontSize: 13 }]}>{item.municipio_y_parroquia || 'N/D'}</Text>
            </View>

            {/* Unidades mensuales | Crist mensual */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>UNID. MENSUAL</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.info }]}>
                        {formatNum(item.unid_mensual)}
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CRIST MENSUAL</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.success }]}>
                        {formatNum(item.crist_mensual)}
                    </Text>
                </View>
            </View>

            {/* Peso droguería | Promedio mora */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PESO DROGUERÍA</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.warning }]}>
                        {formatNum(item.peso_de_la_drogueria, 2)}%
                    </Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>PROMEDIO MORA</Text>
                    <Text style={styles.infoValue}>{formatNum(item.promedio_mora, 1)} días</Text>
                </View>
            </View>

            {/* Cantidad doc | Código profit */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CANT. DOC. E</Text>
                    <Text style={styles.infoValue}>{formatNum(item.cantidad_doc_e)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CÓDIGO PROFIT</Text>
                    <Text style={styles.infoValue}>{item.codigo_profit || 'N/D'}</Text>
                </View>
            </View>

            {/* Última compra | Última fact. emitida */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>ÚLTIMA COMPRA</Text>
                    <Text style={styles.infoValue}>{formatDate(item.ultima_compra)}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>ÚLT. FACT. EMITIDA</Text>
                    <Text style={[styles.infoValue, { color: item.ultima_fec_emis ? Theme.colors.text : Theme.colors.muted }]}>
                        {formatDate(item.ultima_fec_emis)}
                    </Text>
                </View>
            </View>

            {/* Contacto | Número / Número 2 */}
            <View style={styles.row}>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CONTACTO</Text>
                    <Text style={styles.infoValue}>{item.contacto_farmap || 'N/D'}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>NÚM. / NÚM. 2</Text>
                    <Text style={styles.infoValue}>
                        {[item.numero, item.numero_2].filter(Boolean).join(' / ') || 'N/D'}
                    </Text>
                </View>
            </View>

            {/* Vendedor + fecha creación */}
            <View style={styles.vendedorRow}>
                <Ionicons name="person-outline" size={14} color={Theme.colors.muted} />
                <Text style={styles.vendedorLabel}>  VENDEDOR: </Text>
                <Text style={styles.vendedorValue} numberOfLines={1}>{item.vendedor || 'N/D'}</Text>
                <Text style={[styles.infoLabel, { marginLeft: 8 }]}>
                    {formatDate(item.fecha_creacion)}
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
                    <Text style={styles.headerTitle}>  Clientes Potenciales</Text>
                </View>
                <TouchableOpacity
                    onPress={handleGeneratePdf}
                    disabled={generatingPdf || loading || filteredData.length === 0}
                    style={{ padding: 8, opacity: (generatingPdf || loading || filteredData.length === 0) ? 0.4 : 1 }}
                >
                    {generatingPdf
                        ? <ActivityIndicator size="small" color={Theme.colors.white} />
                        : <Ionicons name="download-outline" size={24} color={Theme.colors.white} />
                    }
                </TouchableOpacity>
            </View>

            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Theme.colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nombre, RIF o municipio..."
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
                        {filteredData.length} {filteredData.length === 1 ? 'farmacia encontrada' : 'farmacias encontradas'}
                    </Text>
                )}
            </View>

            {/* Contenido */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loadingText}>Cargando clientes potenciales...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `farmacia-${item.id ?? index}`}
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
                            <Ionicons name="storefront-outline" size={64} color={Theme.colors.muted} />
                            <Text style={styles.emptyTitle}>Sin clientes potenciales</Text>
                            <Text style={styles.emptySubtitle}>
                                No se encontraron registros para el vendedor:{'\n'}
                                <Text style={{ fontWeight: '700', color: Theme.colors.text }}>
                                    {user?.co_ven || 'N/D'}
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
