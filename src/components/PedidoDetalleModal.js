import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Theme from '../constants/Theme';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/PedidosHistorialScreen.styles';

// Estados y detalle de un pedido (cotización de Profit) tal como los devuelve
// GET /api/pedidosApp/historial. Lo comparten "Mis pedidos" y "Cotizaciones por día".

export const ESTADOS_PEDIDO = {
    PENDIENTE: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', label: 'Sin procesar' },
    EN_ALCABALA: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', label: 'En alcabala' },
    PROCESADO: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', label: 'Procesado' },
    CERRADO_SIN_NOTA: { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', label: 'Cerrado sin nota' },
    ANULADO: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Anulado' },
};

export const ESTADOS_NOTA = {
    EN_ALCABALA: { text: '#b45309', label: 'En alcabala' },
    APROBADA: { text: '#047857', label: 'Aprobada' },
    FACTURADA: { text: '#1e40af', label: 'Facturada' },
    ANULADA: { text: '#dc2626', label: 'Anulada' },
};

export const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    // Profit guarda fec_emis a medianoche: se muestra solo la fecha, en UTC para
    // que no corra un día hacia atrás por la zona horaria del teléfono.
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
};

export const formatCurrency = (amount) =>
    parseFloat(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Alcabala anula en Profit y deja quién y a qué hora; el motivo solo cuando lo
// escribe (casi nunca). Se arma un aviso por documento anulado (pedido y notas),
// sin repetir el de la nota si dice lo mismo que el del pedido.
export const quienAnulo = (doc) => {
    if (!doc.anulada_alcabala) return 'Anulado';
    const por = doc.anulado_por ? ` por ${doc.anulado_por}` : '';
    const hora = doc.anulado_hora ? ` a las ${doc.anulado_hora}` : '';
    return `Anulado por alcabala${por}${hora}`;
};

export const avisosAnulacion = (pedido) => {
    const lista = [];
    const vistos = new Set();
    const agregar = (origen, doc) => {
        const titulo = quienAnulo(doc);
        const texto = doc.motivo || 'Sin motivo registrado';
        const clave = `${titulo}|${texto}`;
        if (vistos.has(clave)) return;
        vistos.add(clave);
        lista.push({ origen, titulo, texto });
    };
    if (pedido.anulada) agregar(`Pedido ${pedido.fact_num}`, pedido);
    for (const n of pedido.notas) {
        if (n.estado === 'ANULADA') agregar(`Nota ${n.fact_num}`, n);
    }
    return lista;
};

// Discrepancias por artículo que devuelve GET /historial/:fact_num/renglones.
const DISCREPANCIAS = {
    NO_EN_NOTA: 'No salió en nota',
    NOTA_DE_MENOS: 'Nota con menos',
    NOTA_DE_MAS: 'Nota con más',
    FACTURADO_DE_MENOS: 'Facturado de menos',
    FACTURADO_DE_MAS: 'Facturado de más',
    NO_COTIZADO: 'No cotizado',
    PRECIO_DISTINTO: 'Precio distinto',
    DESCUENTO_DISTINTO: 'Descuento distinto',
};

const ETAPAS = {
    FACTURA: 'Facturado',
    PARCIAL: 'Facturado en parte',
    NOTA: 'En nota, sin facturar',
};

const cantidad = (v) => (Number.isInteger(v) ? String(v) : String(Number(v).toFixed(2)));

// Renglones del pedido: lo cotizado contra lo que salió en nota y lo facturado.
// Se piden al abrir el detalle (no vienen en el listado para no cargarlo).
function RenglonesPedido({ factNum }) {
    const { user } = useAuth();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState(null);
    const [soloDiferencias, setSoloDiferencias] = useState(false);

    useEffect(() => {
        let vigente = true;
        setDatos(null);
        setError(null);
        api.get(`${API_ENDPOINTS.HISTORIAL_PEDIDOS}/${factNum}/renglones?co_ven=${encodeURIComponent(user?.co_ven ?? '')}`)
            .then((d) => {
                if (!vigente) return;
                setDatos(d);
                setSoloDiferencias(d.con_discrepancias > 0);
            })
            .catch((err) => vigente && setError(err?.data?.error || 'No se pudieron cargar los renglones.'));
        return () => {
            vigente = false;
        };
    }, [factNum, user?.co_ven]);

    if (error) return <Text style={styles.emptyItemsText}>{error}</Text>;
    if (!datos) return <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: 12 }} />;

    const visibles = soloDiferencias ? datos.renglones.filter((r) => r.discrepancias.length) : datos.renglones;

    return (
        <View style={styles.itemsListContainer}>
            <View style={styles.renglonesResumen}>
                <Text style={styles.itemCode}>
                    {datos.renglones.length} artículos
                    {datos.etapa ? ` · ${ETAPAS[datos.etapa]}` : ''}
                    {datos.facturas.length ? ` · Factura ${datos.facturas.join(', ')}` : ''}
                </Text>
                {datos.con_discrepancias > 0 ? (
                    <Text style={[styles.itemCode, styles.textoNoProcesadas]}>
                        {datos.con_discrepancias} con diferencias
                    </Text>
                ) : (
                    <Text style={[styles.itemCode, styles.textoProcesadas]}>Sin diferencias</Text>
                )}
            </View>

            {datos.con_discrepancias > 0 && datos.con_discrepancias < datos.renglones.length ? (
                <View style={styles.chipsRow}>
                    <TouchableOpacity
                        style={[styles.chip, soloDiferencias && styles.chipActivo]}
                        onPress={() => setSoloDiferencias(true)}
                    >
                        <Text style={[styles.chipText, soloDiferencias && styles.chipTextActivo]}>Con diferencias</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chip, !soloDiferencias && styles.chipActivo]}
                        onPress={() => setSoloDiferencias(false)}
                    >
                        <Text style={[styles.chipText, !soloDiferencias && styles.chipTextActivo]}>Todos</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {visibles.map((r) => {
                const conDiferencia = r.discrepancias.length > 0;
                return (
                    <View key={r.co_art} style={[styles.renglon, conDiferencia && styles.renglonConDiferencia]}>
                        <Text style={styles.itemDescription} numberOfLines={2}>{r.art_des || r.co_art}</Text>
                        <Text style={styles.itemCode}>{r.co_art}</Text>
                        <View style={styles.renglonCantidades}>
                            <Text style={styles.renglonCantidad}>Cotizado {cantidad(r.cotizado)}</Text>
                            <Text style={styles.renglonCantidad}>Nota {cantidad(r.nota)}</Text>
                            <Text style={styles.renglonCantidad}>Facturado {cantidad(r.facturado)}</Text>
                            {r.pendiente_facturar > 0 ? (
                                <Text style={styles.renglonCantidad}>Por facturar {cantidad(r.pendiente_facturar)}</Text>
                            ) : null}
                        </View>
                        {r.discrepancias.includes('PRECIO_DISTINTO') ? (
                            <Text style={styles.notaComentario}>
                                Precio {formatCurrency(r.precio_cotizado)} cotizado, {formatCurrency(r.precio_final)} final
                            </Text>
                        ) : null}
                        {r.discrepancias.includes('DESCUENTO_DISTINTO') ? (
                            <Text style={styles.notaComentario}>
                                Descuento {r.descuento_cotizado || '0'}% cotizado, {r.descuento_final || '0'}% final
                            </Text>
                        ) : null}
                        {conDiferencia ? (
                            <View style={styles.discrepanciasFila}>
                                {r.discrepancias.map((d) => (
                                    <Text key={d} style={styles.discrepanciaChip}>{DISCREPANCIAS[d] || d}</Text>
                                ))}
                            </View>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}

const DetailRow = ({ icon, label, value, highlight }) => (
    <View style={styles.detailRow}>
        <View style={styles.detailRowLeft}>
            {icon && <MaterialIcons name={icon} size={16} color={Theme.colors.muted} style={styles.detailIcon} />}
            <Text style={styles.detailLabel}>{label}</Text>
        </View>
        <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
    </View>
);

export default function PedidoDetalleModal({ pedido: selectedPedido, onClose }) {
    if (!selectedPedido) return null;
    const estado = ESTADOS_PEDIDO[selectedPedido.estado] || ESTADOS_PEDIDO.PENDIENTE;
    const avisos = avisosAnulacion(selectedPedido);

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Pedido {selectedPedido.fact_num}</Text>
                            {selectedPedido.codigo_pedido ? (
                                <Text style={styles.modalSubtitle}>{selectedPedido.codigo_pedido}</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={Theme.colors.muted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Estado</Text>
                            <View style={[styles.estadoBadgeLarge, { backgroundColor: estado.bg, borderColor: estado.border }]}>
                                <Text style={[styles.estadoTextLarge, { color: estado.text }]}>{estado.label}</Text>
                            </View>
                        </View>

                        {avisos.length > 0 ? (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Anulación</Text>
                                {avisos.map((a) => (
                                    <View key={a.origen} style={styles.comentarioBox}>
                                        <Text style={styles.comentarioTitulo}>{a.origen} · {a.titulo}</Text>
                                        <Text style={styles.comentarioTexto}>{a.texto}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {selectedPedido.estado === 'CERRADO_SIN_NOTA' ? (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Cerrado en Profit sin nota</Text>
                                <View style={[styles.comentarioBox, styles.cerradoBox]}>
                                    <Text style={styles.comentarioTexto}>{selectedPedido.descrip || 'Sin descripción'}</Text>
                                </View>
                            </View>
                        ) : null}

                        {selectedPedido.motivo && !selectedPedido.anulada ? (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Comentario</Text>
                                <View style={styles.detailCard}>
                                    <Text style={styles.comentarioTexto}>{selectedPedido.motivo}</Text>
                                </View>
                            </View>
                        ) : null}

                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Pedido</Text>
                            <View style={styles.detailCard}>
                                <DetailRow icon="business" label="Cliente" value={selectedPedido.cli_des || '—'} />
                                <DetailRow icon="fingerprint" label="Código" value={selectedPedido.co_cli} />
                                <DetailRow icon="event" label="Fecha" value={formatDate(selectedPedido.fec_emis)} />
                                <DetailRow label="Total Neto" value={formatCurrency(selectedPedido.tot_neto)} highlight />
                            </View>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Notas de entrega</Text>
                            <View style={styles.itemsListContainer}>
                                {selectedPedido.notas.length > 0 ? (
                                    selectedPedido.notas.map((n) => {
                                        const en = ESTADOS_NOTA[n.estado] || ESTADOS_NOTA.APROBADA;
                                        return (
                                            <View key={n.fact_num} style={styles.itemRow}>
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemDescription}>Nota {n.fact_num}</Text>
                                                    <Text style={styles.itemCode}>
                                                        {formatDate(n.fec_emis)} · {formatCurrency(n.tot_neto)}
                                                    </Text>
                                                    {n.estado === 'ANULADA' ? (
                                                        <Text style={styles.notaComentario}>{quienAnulo(n)}</Text>
                                                    ) : null}
                                                    {n.motivo ? (
                                                        <Text style={styles.notaComentario}>{n.motivo}</Text>
                                                    ) : null}
                                                </View>
                                                <Text style={[styles.notaEstado, { color: en.text }]}>{en.label}</Text>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.emptyItemsText}>
                                        Todavía no se ha convertido en nota de entrega
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Renglones: cotizado vs facturado</Text>
                            <RenglonesPedido factNum={selectedPedido.fact_num} />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
