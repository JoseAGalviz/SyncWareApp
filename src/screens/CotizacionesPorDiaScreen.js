import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SectionList,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Theme from '../constants/Theme';
import styles from '../styles/PedidosHistorialScreen.styles';
import PedidoDetalleModal, { ESTADOS_PEDIDO, formatCurrency } from '../components/PedidoDetalleModal';

// Cotizaciones del vendedor logueado agrupadas por día de emisión, para validar
// qué se procesó y qué no en un rango de fechas (GET /api/pedidosApp/historial
// con desde/hasta). Mismo dato y mismo detalle que "Mis pedidos".

// Mismo tope que el backend (MAX_DIAS_HISTORIAL en api-app).
const MAX_DIAS_RANGO = 90;

const ATAJOS = [
    { key: 'hoy', label: 'Hoy', desde: 0, hasta: 0 },
    { key: 'ayer', label: 'Ayer', desde: -1, hasta: -1 },
    { key: '7', label: '7 días', desde: -6, hasta: 0 },
    { key: '15', label: '15 días', desde: -14, hasta: 0 },
    { key: '30', label: '30 días', desde: -29, hasta: 0 },
];

const FILTROS = [
    { key: 'TODAS', label: 'Todas' },
    { key: 'PROCESADAS', label: 'Procesadas' },
    { key: 'NO_PROCESADAS', label: 'No procesadas' },
];

// Todo lo que no terminó en nota viva aprobada/facturada.
const NO_PROCESADOS = ['PENDIENTE', 'EN_ALCABALA', 'ANULADO', 'CERRADO_SIN_NOTA'];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Fechas como 'YYYY-MM-DD' en el día local del teléfono (los vendedores están en
// Venezuela, igual que Profit).
const fechaIso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hoyIso = () => fechaIso(new Date());

const sumarDias = (iso, dias) => {
    const [y, m, d] = iso.split('-').map(Number);
    return fechaIso(new Date(y, m - 1, d + dias));
};

const diasEntre = (desde, hasta) => {
    const [y1, m1, d1] = desde.split('-').map(Number);
    const [y2, m2, d2] = hasta.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

const fechaCorta = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

const tituloDia = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${DIAS_SEMANA[new Date(y, m - 1, d).getDay()]} ${fechaCorta(iso)}`;
};

// fec_emis viene de Profit sin zona (la API lo manda como ISO "…Z"): el día es
// la parte de fecha tal cual, sin convertir a la hora del teléfono.
const diaDe = (fecEmis) => String(fecEmis || '').slice(0, 10);

const SelectorFecha = ({ label, valor, onCambiar, puedeAtras, puedeAdelante }) => (
    <View style={styles.selectorFecha}>
        <Text style={styles.selectorFechaLabel}>{label}</Text>
        <View style={styles.selectorFechaFila}>
            <TouchableOpacity
                onPress={() => onCambiar(-1)}
                disabled={!puedeAtras}
                style={styles.selectorFechaBoton}
                accessibilityLabel={`${label}: día anterior`}
            >
                <MaterialIcons name="chevron-left" size={24} color={puedeAtras ? Theme.colors.primary : Theme.colors.border} />
            </TouchableOpacity>
            <Text style={styles.selectorFechaValor}>{fechaCorta(valor)}</Text>
            <TouchableOpacity
                onPress={() => onCambiar(1)}
                disabled={!puedeAdelante}
                style={styles.selectorFechaBoton}
                accessibilityLabel={`${label}: día siguiente`}
            >
                <MaterialIcons name="chevron-right" size={24} color={puedeAdelante ? Theme.colors.primary : Theme.colors.border} />
            </TouchableOpacity>
        </View>
    </View>
);

const CotizacionesPorDiaScreen = () => {
    const { user } = useAuth();
    const [desde, setDesde] = useState(() => hoyIso());
    const [hasta, setHasta] = useState(() => hoyIso());
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState('TODAS');
    const [seleccionada, setSeleccionada] = useState(null);

    const hoy = hoyIso();

    const cargar = useCallback(async () => {
        if (!user?.co_ven) {
            setError('Tu usuario no tiene código de vendedor.');
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            setError(null);
            const data = await api.get(
                `${API_ENDPOINTS.HISTORIAL_PEDIDOS}?co_ven=${encodeURIComponent(user.co_ven)}&desde=${desde}&hasta=${hasta}`
            );
            setCotizaciones(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error cargando cotizaciones por día:', err);
            setError(err?.data?.error || 'No se pudieron cargar las cotizaciones. Desliza hacia abajo para reintentar.');
            setCotizaciones([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.co_ven, desde, hasta]);

    useEffect(() => {
        setLoading(true);
        cargar();
    }, [cargar]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        cargar();
    }, [cargar]);

    const aplicarAtajo = (a) => {
        setDesde(sumarDias(hoy, a.desde));
        setHasta(sumarDias(hoy, a.hasta));
    };

    const atajoActivo = ATAJOS.find((a) => sumarDias(hoy, a.desde) === desde && sumarDias(hoy, a.hasta) === hasta)?.key;

    // desde <= hasta <= hoy y como mucho MAX_DIAS_RANGO días de rango: al mover una
    // punta más allá, la otra la acompaña.
    const moverDesde = (delta) => {
        const nuevo = sumarDias(desde, delta);
        setDesde(nuevo);
        if (nuevo > hasta) setHasta(nuevo);
        else if (diasEntre(nuevo, hasta) > MAX_DIAS_RANGO) setHasta(sumarDias(nuevo, MAX_DIAS_RANGO));
    };

    const moverHasta = (delta) => {
        const nuevo = sumarDias(hasta, delta);
        setHasta(nuevo);
        if (nuevo < desde) setDesde(nuevo);
        else if (diasEntre(desde, nuevo) > MAX_DIAS_RANGO) setDesde(sumarDias(nuevo, -MAX_DIAS_RANGO));
    };

    const resumen = useMemo(() => {
        const r = { total: cotizaciones.length, procesadas: 0, noProcesadas: 0, porEstado: {} };
        for (const c of cotizaciones) {
            if (c.estado === 'PROCESADO') r.procesadas += 1;
            else r.noProcesadas += 1;
            r.porEstado[c.estado] = (r.porEstado[c.estado] || 0) + 1;
        }
        return r;
    }, [cotizaciones]);

    const secciones = useMemo(() => {
        const porDia = new Map();
        for (const c of cotizaciones) {
            const dia = diaDe(c.fec_emis);
            if (!porDia.has(dia)) porDia.set(dia, { dia, todas: [], procesadas: 0 });
            const grupo = porDia.get(dia);
            grupo.todas.push(c);
            if (c.estado === 'PROCESADO') grupo.procesadas += 1;
        }
        const visibles = (c) =>
            filtro === 'TODAS' ||
            (filtro === 'PROCESADAS' ? c.estado === 'PROCESADO' : NO_PROCESADOS.includes(c.estado));
        return [...porDia.values()]
            .sort((a, b) => (a.dia < b.dia ? 1 : -1))
            .map((g) => ({ ...g, data: g.todas.filter(visibles) }))
            .filter((g) => g.data.length > 0);
    }, [cotizaciones, filtro]);

    const renderCotizacion = ({ item }) => {
        const estado = ESTADOS_PEDIDO[item.estado] || ESTADOS_PEDIDO.PENDIENTE;
        return (
            <TouchableOpacity style={styles.filaCotizacion} onPress={() => setSeleccionada(item)} activeOpacity={0.7}>
                <View style={styles.filaCotizacionInfo}>
                    <Text style={styles.pedidoCode}>Pedido {item.fact_num}</Text>
                    <Text style={styles.infoText} numberOfLines={1}>{item.cli_des || item.co_cli}</Text>
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.notas.length ? `Notas: ${item.notas.map((n) => n.fact_num).join(', ')}` : 'Sin notas'}
                        {' · '}
                        {formatCurrency(item.tot_neto)}
                    </Text>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: estado.bg, borderColor: estado.border }]}>
                    <Text style={[styles.estadoText, { color: estado.text }]}>{estado.label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEncabezadoDia = ({ section }) => {
        const total = section.todas.length;
        const noProcesadas = total - section.procesadas;
        return (
            <View style={styles.encabezadoDia}>
                <Text style={styles.encabezadoDiaTitulo}>{tituloDia(section.dia)}</Text>
                <Text style={styles.encabezadoDiaResumen}>
                    {total} · <Text style={styles.textoProcesadas}>{section.procesadas} procesadas</Text>
                    {noProcesadas > 0 ? (
                        <Text style={styles.textoNoProcesadas}> · {noProcesadas} no</Text>
                    ) : null}
                </Text>
            </View>
        );
    };

    const Cabecera = (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {ATAJOS.map((a) => (
                    <TouchableOpacity
                        key={a.key}
                        style={[styles.chip, atajoActivo === a.key && styles.chipActivo]}
                        onPress={() => aplicarAtajo(a)}
                    >
                        <Text style={[styles.chipText, atajoActivo === a.key && styles.chipTextActivo]}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.selectoresFecha}>
                <SelectorFecha
                    label="Desde"
                    valor={desde}
                    onCambiar={moverDesde}
                    puedeAtras={diasEntre(sumarDias(desde, -1), hoy) <= MAX_DIAS_RANGO}
                    puedeAdelante={desde < hoy}
                />
                <SelectorFecha
                    label="Hasta"
                    valor={hasta}
                    onCambiar={moverHasta}
                    puedeAtras={diasEntre(sumarDias(hasta, -1), hoy) <= MAX_DIAS_RANGO}
                    puedeAdelante={hasta < hoy}
                />
            </View>

            {!loading && !error ? (
                <View style={styles.resumenFila}>
                    <View style={styles.resumenItem}>
                        <Text style={styles.statLabel}>Total</Text>
                        <Text style={styles.resumenValor}>{resumen.total}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.resumenItem}>
                        <Text style={styles.statLabel}>Procesadas</Text>
                        <Text style={[styles.resumenValor, styles.textoProcesadas]}>{resumen.procesadas}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.resumenItem}>
                        <Text style={styles.statLabel}>No procesadas</Text>
                        <Text style={[styles.resumenValor, styles.textoNoProcesadas]}>{resumen.noProcesadas}</Text>
                    </View>
                </View>
            ) : null}

            {!loading && resumen.noProcesadas > 0 ? (
                <Text style={styles.resumenDetalle}>
                    {NO_PROCESADOS.filter((e) => resumen.porEstado[e])
                        .map((e) => `${ESTADOS_PEDIDO[e].label}: ${resumen.porEstado[e]}`)
                        .join(' · ')}
                </Text>
            ) : null}

            <View style={styles.chipsRow}>
                {FILTROS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.chip, filtro === f.key && styles.chipActivo]}
                        onPress={() => setFiltro(f.key)}
                    >
                        <Text style={[styles.chipText, filtro === f.key && styles.chipTextActivo]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>{Cabecera}</View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loadingText}>Cargando cotizaciones...</Text>
                </View>
            ) : (
                <SectionList
                    sections={secciones}
                    keyExtractor={(item) => String(item.fact_num)}
                    renderItem={renderCotizacion}
                    renderSectionHeader={renderEncabezadoDia}
                    stickySectionHeadersEnabled
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="event-busy" size={64} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>
                                {error || (cotizaciones.length
                                    ? 'Ninguna cotización con ese filtro'
                                    : desde === hasta
                                        ? `Sin cotizaciones el ${fechaCorta(desde)}`
                                        : `Sin cotizaciones del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`)}
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Theme.colors.primary]}
                            tintColor={Theme.colors.primary}
                        />
                    }
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                />
            )}

            <PedidoDetalleModal pedido={seleccionada} onClose={() => setSeleccionada(null)} />
        </View>
    );
};

export default CotizacionesPorDiaScreen;
