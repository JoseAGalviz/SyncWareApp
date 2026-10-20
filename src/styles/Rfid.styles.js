import { StyleSheet, Dimensions, Platform } from 'react-native';
import Theme from '../constants/Theme';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

// Módulo experimental RFID (pistola Chainway SR160) — hoja propia, no se
// mezcla con Despacho.styles.js para mantenerlo separado del flujo real.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 40,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  subtitle: { ...Theme.typography.body, color: Theme.colors.muted, marginBottom: Theme.spacing.xl },

  bannerExperimental: {
    backgroundColor: Theme.colors.warningSoft,
    borderRadius: 14,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  bannerExperimentalTexto: { fontSize: 13, color: Theme.colors.warningText, fontWeight: '600' },

  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  menuButton: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  menuButtonTitulo: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  menuButtonDetalle: { ...Theme.typography.small, color: Theme.colors.muted, marginTop: 4 },

  label: { fontSize: 12, fontWeight: '600', color: Theme.colors.muted, marginBottom: 6, marginTop: Theme.spacing.md },
  input: {
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    fontSize: 15,
    color: Theme.colors.text,
    minHeight: 48,
  },

  primaryButton: {
    backgroundColor: Theme.colors.primaryDark,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },
  primaryButtonText: { color: Theme.colors.white, fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  secondaryButtonText: { color: Theme.colors.text, fontWeight: '600', fontSize: 14 },
  dangerButton: {
    backgroundColor: Theme.colors.error,
    borderRadius: 14,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },
  dangerButtonText: { color: Theme.colors.white, fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },

  // --- Lector RFID (mismo mecanismo HID que EscanerInput/MODO_BLUETOOTH) ---
  lectorBox: {
    width: '100%',
    minHeight: isSmallDevice ? 120 : 150,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  lectorBoxInactivo: { borderColor: Theme.colors.border, backgroundColor: Theme.colors.surfaceAlt },
  lectorHint: { ...Theme.typography.body, color: Theme.colors.white, textAlign: 'center' },
  lectorInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },

  countersRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginTop: Theme.spacing.sm, marginBottom: Theme.spacing.lg, flexWrap: 'wrap' },
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
  itemRowDesconocido: {
    backgroundColor: Theme.colors.warningSoft,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.warning,
  },
  // Nota de la ruta que ya hizo match con una lectura RFID de esta sesión.
  itemRowMatch: {
    backgroundColor: Theme.colors.successLight,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.success,
  },
  // Ya estaba escaneada de antes (otra sesión) — no es la ruta la que se
  // resalta como recién hecha, pero tampoco queda como pendiente real.
  itemRowYaEscaneada: {
    backgroundColor: Theme.colors.surfaceAlt,
    opacity: 0.6,
  },
  itemInfo: { flex: 1 },
  itemNota: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },
  itemDetalle: { ...Theme.typography.tiny, color: Theme.colors.muted, marginTop: 2 },
  itemAccion: { padding: Theme.spacing.xs },
  pillMatch: {
    ...Theme.typography.tiny,
    color: Theme.colors.successDark,
    fontWeight: '700',
  },

  bannerAdvertencia: {
    backgroundColor: Theme.colors.warningSoft,
    borderRadius: 14,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  bannerAdvertenciaTexto: { ...Theme.typography.small, color: Theme.colors.warning, fontWeight: '600' },

  modalBackground: {
    flex: 1,
    backgroundColor: Theme.colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
});

export default styles;
