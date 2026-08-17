import { StyleSheet, Dimensions, Platform } from 'react-native';
import Theme from '../constants/Theme';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    padding: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
    paddingBottom: 40,
  },
  title: {
    ...Theme.typography.title,
    color: Theme.colors.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.muted,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },

  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  label: {
    ...Theme.typography.label,
    color: Theme.colors.muted,
    marginBottom: Theme.spacing.xs,
    marginTop: Theme.spacing.md,
  },
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
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

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
  },
  secondaryButtonText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 15 },
  dangerButton: {
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },
  dangerButtonText: { color: Theme.colors.white, fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },

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
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  activeRuta: { ...Theme.typography.heading, color: Theme.colors.primary },
  countersRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginTop: Theme.spacing.sm, flexWrap: 'wrap' },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.md,
  },
  counterLabel: { ...Theme.typography.small, color: Theme.colors.muted },
  counterValue: { ...Theme.typography.subheading, color: Theme.colors.text },

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

  // --- Listas ---
  listaTitulo: { ...Theme.typography.subheading, color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  emptyListText: { ...Theme.typography.small, color: Theme.colors.light, textAlign: 'center', paddingVertical: Theme.spacing.lg },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  itemInfo: { flex: 1 },
  itemNota: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },
  itemDetalle: { ...Theme.typography.tiny, color: Theme.colors.muted, marginTop: 2 },
  itemAccion: { padding: Theme.spacing.xs },

  statusPill: { borderRadius: Theme.radius.pill, paddingVertical: 3, paddingHorizontal: Theme.spacing.sm },
  statusPillText: { ...Theme.typography.tiny, fontWeight: '700' },
  statusPendiente:  { backgroundColor: Theme.colors.errorLight },
  statusEscaneada:  { backgroundColor: Theme.colors.warningLight },
  statusVerificada: { backgroundColor: Theme.colors.successLight },
  statusTextPendiente:  { color: Theme.colors.error },
  statusTextEscaneada:  { color: Theme.colors.warning },
  statusTextVerificada: { color: Theme.colors.successDark },

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
  bannerAdvertenciaTexto: { ...Theme.typography.small, color: Theme.colors.warning, fontWeight: '600' },
  bannerError: {
    backgroundColor: Theme.colors.errorLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  bannerErrorTexto: { ...Theme.typography.small, color: Theme.colors.error, fontWeight: '600' },
  bannerOk: {
    backgroundColor: Theme.colors.successLight,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  bannerOkTexto: { ...Theme.typography.small, color: Theme.colors.successDark, fontWeight: '600' },

  modalBackground: {
    flex: 1,
    backgroundColor: Theme.colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
  },
});

export default styles;
