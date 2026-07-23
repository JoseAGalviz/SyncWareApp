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

  // --- Formulario de inicio ---
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // --- Sesión activa ---
  activeHeader: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  activeRuta: {
    ...Theme.typography.heading,
    color: Theme.colors.primary,
  },
  activeComentario: {
    ...Theme.typography.small,
    color: Theme.colors.muted,
    marginTop: 2,
  },
  countersRow: {
    flexDirection: 'row',
    gap: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.md,
  },
  counterLabel: {
    ...Theme.typography.small,
    color: Theme.colors.muted,
  },
  counterValue: {
    ...Theme.typography.subheading,
    color: Theme.colors.dark,
  },

  cameraContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  cameraBox: {
    width: '100%',
    maxWidth: 400,
    height: isSmallDevice ? 180 : 220,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.dark,
  },

  listaTitulo: {
    ...Theme.typography.subheading,
    color: Theme.colors.dark,
    marginBottom: Theme.spacing.sm,
  },
  escaneoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  escaneoTipoPill: {
    borderRadius: Theme.radius.pill,
    paddingVertical: 3,
    paddingHorizontal: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  escaneoTipoPillFactura: { backgroundColor: Theme.colors.infoLight },
  escaneoTipoPillNota:    { backgroundColor: Theme.colors.successLight },
  escaneoTipoTexto: {
    ...Theme.typography.tiny,
    fontWeight: '700',
  },
  escaneoTipoTextoFactura: { color: Theme.colors.info },
  escaneoTipoTextoNota:    { color: Theme.colors.successDark },
  escaneoCodigo: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    flex: 1,
  },
  escaneoHora: {
    ...Theme.typography.tiny,
    color: Theme.colors.light,
  },
  emptyListText: {
    ...Theme.typography.small,
    color: Theme.colors.light,
    textAlign: 'center',
    paddingVertical: Theme.spacing.lg,
  },

  finalizarButton: {
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
  },
  finalizarButtonText: {
    color: Theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: Theme.colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
  },

  // --- Historial ---
  historialButton: {
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  historialButtonText: {
    color: Theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  historialModalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
  },
  historialItem: {
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  historialItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historialRuta: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  historialEstatusPill: {
    borderRadius: Theme.radius.pill,
    paddingVertical: 3,
    paddingHorizontal: Theme.spacing.sm,
    marginLeft: Theme.spacing.sm,
  },
  historialEstatusPillAbierto: { backgroundColor: Theme.colors.infoLight },
  historialEstatusPillCerrado: { backgroundColor: Theme.colors.successLight },
  historialEstatusTexto: {
    ...Theme.typography.tiny,
    fontWeight: '700',
  },
  historialEstatusTextoAbierto: { color: Theme.colors.info },
  historialEstatusTextoCerrado: { color: Theme.colors.successDark },
  historialFecha: {
    ...Theme.typography.tiny,
    color: Theme.colors.light,
    marginTop: 2,
  },
  historialComentario: {
    ...Theme.typography.small,
    color: Theme.colors.muted,
    marginTop: 4,
  },
});

export default styles;
