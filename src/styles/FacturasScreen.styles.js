import { StyleSheet, Dimensions, Platform } from 'react-native';
import Theme from '../constants/Theme';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  // Diseño "Gestión de Facturas" del lienzo SyncWareApp (el título va en el encabezado).
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 40,
    gap: 14,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.muted,
    lineHeight: 19,
  },
  tableButton: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    height: 48,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableButtonText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  syncButton: {
    backgroundColor: Theme.colors.dark,
    borderColor: Theme.colors.dark,
  },
  syncButtonText: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
  recientes: {
    gap: 8,
  },
  recientesTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  recienteFila: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  recienteCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recienteNumero: {
    flex: 1,
    fontFamily: Theme.fontMono,
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  recienteDetalle: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: Theme.colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isSmallDevice ? Theme.spacing.lg : Theme.spacing.xxl,
  },
  modalContent: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: isSmallDevice ? Theme.spacing.xl : Theme.spacing.xxl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '800',
    marginBottom: Theme.spacing.md,
    color: Theme.colors.text,
    alignSelf: 'center',
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.md,
  },
  facturasList: { flex: 1 },
  facturasListContent: { paddingBottom: Theme.spacing.md },
  facturaItem: {
    marginBottom: Theme.spacing.md,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  facturaNumero: {
    fontWeight: '700',
    fontFamily: Theme.fontMono,
    color: Theme.colors.text,
    fontSize: 15,
  },
  facturaDescripcion: {
    color: Theme.colors.text,
    fontSize: 13,
    marginTop: 2,
  },
  facturaDetalle: {
    color: Theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: Theme.colors.muted,
    textAlign: 'center',
  },
  modalButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
  },
  modalCloseButton: { backgroundColor: Theme.colors.dark },
  sendButton:       { backgroundColor: Theme.colors.info },
  saveButton:       { backgroundColor: Theme.colors.primaryDark },
  closeButton:      { backgroundColor: Theme.colors.dark },
  cleanButton:      { backgroundColor: Theme.colors.surface, borderWidth: 1.5, borderColor: Theme.colors.error },
  cleanButtonText:  { color: Theme.colors.errorStrong },
  modalButtonText: {
    color: Theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  modalError: {
    color: Theme.colors.error,
    marginBottom: Theme.spacing.md,
    alignSelf: 'center',
    fontWeight: '700',
    textAlign: 'center',
  },
  modalTable: {
    marginBottom: Theme.spacing.lg,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  modalRowLabel: {
    fontWeight: '700',
    color: Theme.colors.text,
    minWidth: 100,
    fontSize: isSmallDevice ? 13 : 15,
  },
  modalRowValue: {
    color: Theme.colors.muted,
    flex: 1,
    textAlign: 'right',
    fontSize: isSmallDevice ? 13 : 15,
  },
  buttonGroup: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: Theme.spacing.sm,
  },
  facturaDataContainer: {
    width: '100%',
    backgroundColor: Theme.colors.warningSoft,
    borderWidth: 1,
    borderColor: Theme.colors.warningEdge,
    borderRadius: 14,
    padding: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  comentarioContainer: {
    marginTop: Theme.spacing.md,
  },
  comentarioLabel: {
    fontWeight: '700',
    color: Theme.colors.error,
    marginBottom: 6,
    fontSize: isSmallDevice ? 13 : 15,
  },
  comentarioInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: Theme.colors.text,
  },
  infoBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.colors.infoSoft,
    borderRadius: 14,
    padding: Theme.spacing.md,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    color: Theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  infoBannerFuerte: {
    fontWeight: '800',
    color: Theme.colors.dark,
  },
  manualInputContainer: {
    width: '100%',
    gap: 6,
  },
  manualInputLabel: {
    fontWeight: '600',
    color: Theme.colors.muted,
    fontSize: 12,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  manualInput: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    fontSize: 15,
    height: 50,
    color: Theme.colors.text,
  },
  consultButton: {
    backgroundColor: Theme.colors.dark,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
  },
  consultButtonText: {
    color: Theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // --- Confirmación de número escaneado/tipeado ---
  confirmSubtext: {
    fontSize: isSmallDevice ? 14 : 16,
    color: Theme.colors.text,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    marginBottom: 4,
  },
  confirmBigNumber: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: '800',
    fontFamily: Theme.fontMono,
    color: Theme.colors.dark,
    textAlign: 'center',
    marginVertical: Theme.spacing.sm,
    letterSpacing: 2,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    height: 56,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Theme.fontMono,
    letterSpacing: 2,
    textAlign: 'center',
    color: Theme.colors.dark,
    backgroundColor: Theme.colors.background,
    marginBottom: Theme.spacing.md,
  },

  // --- Aviso de guardado sin conexión ---
  offlineCard: {
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Theme.colors.error,
  },
  offlineTitulo: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '800',
    color: Theme.colors.error,
    letterSpacing: 1,
    marginBottom: Theme.spacing.sm,
  },
  offlineNumero: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  offlineTexto: {
    fontSize: isSmallDevice ? 15 : 17,
    color: Theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },

  // --- Resultado de sincronización ---
  syncCard: {
    alignItems: 'center',
  },
  syncIconoGrande: {
    fontSize: 48,
    marginBottom: Theme.spacing.sm,
  },
  syncTitulo: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  syncTexto: {
    fontSize: isSmallDevice ? 14 : 16,
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  resultadoLista: {
    width: '100%',
    marginBottom: Theme.spacing.md,
  },
  resultadoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  resultadoIcono: {
    fontSize: 20,
    marginRight: Theme.spacing.sm,
  },
  resultadoEtiqueta: {
    flex: 1,
    fontSize: isSmallDevice ? 13 : 15,
    fontWeight: '600',
  },
  resultadoCantidad: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'right',
  },
});

export default styles;
