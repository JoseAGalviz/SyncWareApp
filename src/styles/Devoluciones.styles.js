import { StyleSheet, Dimensions, Platform } from 'react-native';
import Theme from '../constants/Theme';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const sombra = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: {
    padding: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
    paddingBottom: 60,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm },
  title: { ...Theme.typography.title, color: Theme.colors.primary, flex: 1 },
  subtitle: { ...Theme.typography.body, color: Theme.colors.muted, marginBottom: Theme.spacing.lg },

  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    ...sombra,
  },
  cardTitulo: { ...Theme.typography.subheading, color: Theme.colors.text, marginBottom: Theme.spacing.sm },

  label: { ...Theme.typography.label, color: Theme.colors.muted, marginBottom: Theme.spacing.xs, marginTop: Theme.spacing.md },
  input: {
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    fontSize: 15,
    color: Theme.colors.text,
    minHeight: 44,
  },
  inputCantidad: {
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    width: 64,
    textAlign: 'center',
    fontSize: 15,
    color: Theme.colors.text,
    paddingVertical: 6,
  },

  primaryButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },
  primaryButtonText: { color: Theme.colors.white, fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  secondaryButtonText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },

  // Selector Reposición / Devolución
  segmento: { flexDirection: 'row', gap: Theme.spacing.sm },
  segmentoOpcion: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceAlt,
    alignItems: 'center',
  },
  segmentoOpcionActiva: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  segmentoTexto: { fontWeight: '700', color: Theme.colors.muted },
  segmentoTextoActivo: { color: Theme.colors.white },

  // Filas de listas (clientes, claves, artículos, historial)
  fila: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surfaceAlt,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filaActiva: { borderColor: Theme.colors.primary, backgroundColor: Theme.colors.primaryLight },
  filaTitulo: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },
  filaDetalle: { ...Theme.typography.small, color: Theme.colors.muted, marginTop: 2 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Theme.spacing.sm },

  pill: {
    alignSelf: 'flex-start',
    borderRadius: Theme.radius.pill,
    paddingVertical: 2,
    paddingHorizontal: Theme.spacing.sm,
    backgroundColor: Theme.colors.infoLight,
  },
  pillTexto: { ...Theme.typography.tiny, color: Theme.colors.info },

  // Chips de facturas bajo cada artículo encontrado
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, marginTop: Theme.spacing.sm },
  chip: {
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.sm,
  },
  chipAgregado: { backgroundColor: Theme.colors.primary },
  chipTexto: { ...Theme.typography.small, color: Theme.colors.primaryDark, fontWeight: '600' },
  chipTextoAgregado: { color: Theme.colors.white },

  filtroEtiqueta: { ...Theme.typography.small, color: Theme.colors.muted, fontWeight: '600', marginBottom: 4 },
  limpiarFiltros: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: Theme.spacing.sm },
  limpiarFiltrosTexto: { ...Theme.typography.small, color: Theme.colors.primaryDark, fontWeight: '600' },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surfaceAlt,
    padding: Theme.spacing.md,
    minHeight: 44,
  },
  selectTexto: { fontSize: 15, color: Theme.colors.text, flex: 1 },
  selectFondo: { flex: 1, backgroundColor: Theme.colors.overlay, justifyContent: 'flex-end' },
  selectHoja: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.radius.lg,
    borderTopRightRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    maxHeight: '75%',
  },

  bannerOcr: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.infoLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  bannerOcrTexto: { ...Theme.typography.small, color: Theme.colors.info, fontWeight: '600' },
  montoLinea: { color: Theme.colors.text, fontWeight: '700' },
  totalProforma: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderStrong,
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
  },
  totalProformaTexto: { ...Theme.typography.subheading, color: Theme.colors.text, fontWeight: '700' },
  imagenArticulo: { width: '100%', height: 200, marginVertical: Theme.spacing.sm, borderRadius: Theme.radius.md, backgroundColor: Theme.colors.surfaceAlt },
  imagenArticuloVacia: { alignItems: 'center', justifyContent: 'center', gap: 4 },

  facturaGrupoTitulo: { ...Theme.typography.label, color: Theme.colors.primaryDark, marginTop: Theme.spacing.md, marginBottom: Theme.spacing.xs },

  // Fotos
  fotosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, marginTop: Theme.spacing.sm },
  foto: { width: 80, height: 80, borderRadius: Theme.radius.md, backgroundColor: Theme.colors.border },
  fotoQuitar: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.radius.pill,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camaraContenedor: { flex: 1, backgroundColor: Theme.colors.black },
  camara: { flex: 1 },
  camaraBarra: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    backgroundColor: Theme.colors.black,
  },
  disparador: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: Theme.colors.white,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Historial
  estadoPill: { borderRadius: Theme.radius.pill, paddingVertical: 2, paddingHorizontal: Theme.spacing.sm },
  estadoEnviada: { backgroundColor: Theme.colors.successLight },
  estadoPendiente: { backgroundColor: Theme.colors.warningLight },
  estadoRechazada: { backgroundColor: Theme.colors.errorLight },
  estadoTexto: { ...Theme.typography.tiny, fontWeight: '700' },
  mensajeError: { ...Theme.typography.small, color: Theme.colors.error, marginTop: Theme.spacing.xs },

  bannerPendientes: {
    backgroundColor: Theme.colors.warningLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  bannerPendientesTexto: { ...Theme.typography.small, color: Theme.colors.warning, fontWeight: '600' },

  emptyText: { ...Theme.typography.small, color: Theme.colors.light, textAlign: 'center', paddingVertical: Theme.spacing.lg },
});

export default styles;
