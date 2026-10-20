import { StyleSheet, Dimensions, Platform } from 'react-native';
import Theme from '../constants/Theme';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  // Diseño del lienzo SyncWareApp (los títulos de pantalla van en el encabezado del stack).
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.muted,
    marginBottom: Theme.spacing.lg,
  },

  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.muted,
    marginBottom: 6,
    marginTop: Theme.spacing.md,
  },
  input: {
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.colors.text,
    minHeight: 48,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  primaryButton: {
    backgroundColor: Theme.colors.primaryDark,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.lg,
  },
  primaryButtonText: { color: Theme.colors.white, fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  secondaryButtonText: { color: Theme.colors.text, fontWeight: '600', fontSize: 14 },
  // Acción final (cerrar ruta, confirmar): verde de marca; el rojo queda para borrar.
  dangerButton: {
    backgroundColor: Theme.colors.primaryDark,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.lg,
  },
  dangerButtonText: { color: Theme.colors.white, fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },

  // Barra fija al fondo de la pantalla (fuera del ScrollView) — evita que el
  // usuario deba hacer scroll hasta el final para llegar al botón principal.
  footerBar: {
    paddingHorizontal: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  footerButton: { marginTop: 0 },

  // --- Selector de ruta ---
  rutaOption: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  rutaOptionSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryLight,
  },
  rutaOptionText: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },

  // --- Header de sesión activa ---
  activeHeader: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  activeRuta: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  countersRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginTop: Theme.spacing.sm, flexWrap: 'wrap' },
  counterPill: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 16,
    padding: 14,
  },
  counterLabel: { fontSize: 12, color: Theme.colors.muted },
  counterValue: { fontSize: 24, fontWeight: '800', color: Theme.colors.text },

  // --- Cámara ---
  cameraContainer: { width: '100%', alignItems: 'center', marginBottom: Theme.spacing.lg },
  cameraBox: {
    width: '100%',
    height: isSmallDevice ? 180 : 220,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.dark,
  },

  // --- Toggle modo (fase 2: solo factura) ---
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, marginBottom: Theme.spacing.md },
  toggleLabel: { ...Theme.typography.body, color: Theme.colors.text },

  // --- Lector bluetooth (modo HID, alternativa a la cámara) ---
  bluetoothBox: { justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.lg },
  bluetoothHint: { ...Theme.typography.body, color: Theme.colors.white, textAlign: 'center' },
  // Input real que recibe el tecleo del lector; invisible pero enfocable —
  // showSoftInputOnFocus=false evita que tape la pantalla con el teclado táctil.
  bluetoothInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },

  // --- Listas ---
  regionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Theme.spacing.sm },
  listaTitulo: { fontSize: 15, fontWeight: '700', color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  emptyListText: { ...Theme.typography.small, color: Theme.colors.light, textAlign: 'center', paddingVertical: Theme.spacing.lg },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 14,
  },
  // Pedido con cajas + factura completas: borde verde.
  itemRowCompleto: {
    borderColor: Theme.colors.primary,
  },
  itemInfo: { flex: 1 },
  itemNota: { fontSize: 14, color: Theme.colors.text, fontWeight: '700' },
  itemDetalle: { fontSize: 12, color: Theme.colors.muted, marginTop: 2 },
  itemAccion: { padding: Theme.spacing.xs },

  statusPill: { borderRadius: Theme.radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusPendiente:  { backgroundColor: Theme.colors.errorSoft },
  statusEscaneada:  { backgroundColor: Theme.colors.warningSoft },
  statusVerificada: { backgroundColor: Theme.colors.primaryLight },
  statusTextPendiente:  { color: Theme.colors.errorText },
  statusTextEscaneada:  { color: Theme.colors.warningText },
  statusTextVerificada: { color: Theme.colors.primaryDark },

  filterRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginBottom: Theme.spacing.sm },
  filterChip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: Theme.radius.pill,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  filterChipActive: { backgroundColor: Theme.colors.dark, borderColor: Theme.colors.dark },
  filterChipText: { fontSize: 12, color: Theme.colors.text, fontWeight: '500' },
  filterChipTextActive: { color: Theme.colors.white, fontWeight: '600' },

  // --- Toggle Cámara / Lector bluetooth: botones grandes, operador los toca
  // de un vistazo (no confundir con filterChip, que es el filtro de facturas)
  modoRow: { flexDirection: 'row', gap: Theme.spacing.md, marginBottom: Theme.spacing.md },
  modoChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  modoChipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  modoChipText: { ...Theme.typography.subheading, color: Theme.colors.muted },
  modoChipTextActive: { color: Theme.colors.white },

  totalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginVertical: Theme.spacing.md,
  },
  totalesTexto: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },

  bannerAdvertencia: {
    backgroundColor: Theme.colors.warningLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  bannerAdvertenciaTexto: { fontSize: 13, color: Theme.colors.warningText, fontWeight: '600' },
  bannerError: {
    backgroundColor: Theme.colors.errorLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  bannerErrorTexto: { fontSize: 13, color: Theme.colors.errorText, fontWeight: '600' },
  bannerOk: {
    backgroundColor: Theme.colors.successLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  bannerOkTexto: { ...Theme.typography.small, color: Theme.colors.successDark, fontWeight: '600' },

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(15,42,58,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: Theme.spacing.xl,
  },

  // --- Detalle de renglón (modal) ---
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  detailLabel: { ...Theme.typography.small, color: Theme.colors.muted, flex: 1 },
  detailValue: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  itemChevron: { ...Theme.typography.heading, color: Theme.colors.light, marginLeft: Theme.spacing.sm },
});

export default styles;
