import { StyleSheet, Platform } from 'react-native';
import Theme from '../constants/Theme';

// Estilos generados en función del ancho real de pantalla (useWindowDimensions),
// para que se adapte a cualquier teléfono/tablet y también a rotación en vivo.
export default function createStyles(width) {
  const isTiny = width < 340;
  const isSmall = width < 375;
  const isTablet = width >= 600;

  const hPad = isTablet ? Theme.spacing.xxxl : isSmall ? Theme.spacing.lg : Theme.spacing.xl;
  const contentMaxWidth = isTablet ? 560 : undefined;

  const cardShadow = Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    android: { elevation: 2 },
  });

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Theme.colors.background,
    },
    scrollContent: {
      padding: hPad,
      paddingBottom: 48,
      alignItems: 'center',
    },
    inner: {
      width: '100%',
      maxWidth: contentMaxWidth,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Theme.spacing.xxl,
      backgroundColor: Theme.colors.background,
    },
    permissionText: {
      fontSize: 15,
      marginBottom: Theme.spacing.lg,
      textAlign: 'center',
      color: Theme.colors.muted,
    },

    // ── Encabezado ──────────────────────────────────────────────────────
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    title: {
      fontSize: isTiny ? 19 : isSmall ? 21 : 25,
      fontWeight: '800',
      color: Theme.colors.primary,
      textAlign: 'center',
      letterSpacing: -0.3,
      marginLeft: Theme.spacing.sm,
    },
    subtitle: {
      fontSize: isSmall ? 12.5 : 14,
      marginTop: 4,
      marginBottom: Theme.spacing.xl,
      color: Theme.colors.muted,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: Theme.spacing.sm,
    },

    // ── Estado vacío (sin lote abierto) ────────────────────────────────
    emptyCard: {
      width: '100%',
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.lg,
      paddingVertical: Theme.spacing.xxl,
      paddingHorizontal: Theme.spacing.lg,
      alignItems: 'center',
      marginBottom: Theme.spacing.xl,
      borderWidth: 1,
      borderColor: Theme.colors.border,
      borderStyle: 'dashed',
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: Theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Theme.spacing.md,
    },
    emptyTitle: {
      fontSize: isSmall ? 15 : 17,
      fontWeight: '700',
      color: Theme.colors.dark,
      textAlign: 'center',
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 13,
      color: Theme.colors.muted,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: Theme.spacing.lg,
      paddingHorizontal: Theme.spacing.sm,
    },

    // ── Botones principales ─────────────────────────────────────────────
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.primary,
      paddingVertical: Theme.spacing.md,
      paddingHorizontal: Theme.spacing.xl,
      borderRadius: Theme.radius.md,
      width: '100%',
      minHeight: 50,
      ...cardShadow,
    },
    primaryButtonText: {
      color: Theme.colors.white,
      fontSize: 15,
      fontWeight: '700',
      marginLeft: Theme.spacing.sm,
    },
    secondaryButtonsRow: {
      flexDirection: isTiny ? 'column' : 'row',
      width: '100%',
      marginTop: Theme.spacing.xl,
      gap: Theme.spacing.sm,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.surface,
      borderWidth: 1,
      borderColor: Theme.colors.border,
      paddingVertical: Theme.spacing.sm + 2,
      paddingHorizontal: Theme.spacing.md,
      borderRadius: Theme.radius.md,
      minHeight: 46,
    },
    secondaryButtonText: {
      color: Theme.colors.dark,
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 6,
    },
    dangerOutlineButton: {
      borderColor: Theme.colors.error,
    },
    dangerOutlineText: {
      color: Theme.colors.error,
    },

    // ── Tarjeta resumen del lote abierto ────────────────────────────────
    loteSummaryCard: {
      width: '100%',
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.lg,
      padding: isSmall ? Theme.spacing.md : Theme.spacing.lg,
      marginBottom: Theme.spacing.lg,
      borderLeftWidth: 5,
      borderLeftColor: Theme.colors.warning,
      ...cardShadow,
    },
    loteSummaryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Theme.spacing.sm,
      flexWrap: 'wrap',
      gap: 6,
    },
    loteSummaryLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: Theme.colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    loteSummaryBody: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      rowGap: 6,
    },
    loteSummaryCountNumber: {
      fontSize: isTiny ? 32 : isSmall ? 36 : 42,
      fontWeight: '800',
      color: Theme.colors.primary,
      lineHeight: isTiny ? 36 : isSmall ? 40 : 46,
    },
    loteSummaryCountLabel: {
      fontSize: 12.5,
      color: Theme.colors.muted,
      marginLeft: 6,
      marginBottom: 6,
    },
    loteSummaryMeta: {
      fontSize: 11.5,
      color: Theme.colors.light,
      textAlign: 'right',
      flexShrink: 1,
    },

    // ── Secciones ────────────────────────────────────────────────────────
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Theme.spacing.md,
      marginBottom: Theme.spacing.sm,
    },
    sectionHeaderText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: Theme.colors.dark,
      marginLeft: 6,
    },
    sectionHint: {
      fontSize: 12,
      color: Theme.colors.muted,
      marginBottom: Theme.spacing.sm,
    },

    // ── Cámara (100% responsiva vía aspectRatio) ────────────────────────
    cameraWrap: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: Theme.radius.lg,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: Theme.colors.primary,
      backgroundColor: Theme.colors.dark,
      marginBottom: Theme.spacing.sm,
    },
    cameraFull: {
      width: '100%',
      height: '100%',
    },
    scanHintOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingVertical: 8,
      alignItems: 'center',
    },
    scanHintText: {
      color: Theme.colors.white,
      fontSize: 12,
      fontWeight: '600',
    },
    permissionInlineButton: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: Theme.radius.lg,
      backgroundColor: Theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: Theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Theme.spacing.sm,
    },

    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Theme.spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Theme.colors.border,
    },
    dividerText: {
      marginHorizontal: Theme.spacing.sm,
      fontSize: 11,
      color: Theme.colors.light,
      fontWeight: '600',
      textTransform: 'uppercase',
    },

    manualInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    manualInput: {
      flex: 1,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.md,
      borderWidth: 1,
      borderColor: Theme.colors.border,
      paddingHorizontal: Theme.spacing.md,
      fontSize: 15,
      marginRight: Theme.spacing.sm,
      minHeight: 48,
      color: Theme.colors.text,
    },
    consultButton: {
      backgroundColor: Theme.colors.primary,
      paddingHorizontal: Theme.spacing.lg,
      borderRadius: Theme.radius.md,
      minHeight: 48,
      minWidth: 48,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },

    // ── Overlay de carga ─────────────────────────────────────────────────
    loadingBox: {
      width: '100%',
      paddingVertical: Theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.lg,
      marginBottom: Theme.spacing.md,
      ...cardShadow,
    },
    loadingText: {
      marginTop: Theme.spacing.sm,
      color: Theme.colors.muted,
      fontSize: 13,
      fontWeight: '600',
    },

    // ── Tarjeta de previsualización de factura escaneada ────────────────
    previewCard: {
      width: '100%',
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.lg,
      padding: isSmall ? Theme.spacing.md : Theme.spacing.lg,
      marginBottom: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: Theme.colors.success,
      ...cardShadow,
    },
    previewErrorCard: {
      borderColor: Theme.colors.error,
    },
    previewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Theme.spacing.sm,
    },
    previewHeaderText: {
      fontSize: isSmall ? 15 : 17,
      fontWeight: '700',
      color: Theme.colors.dark,
      marginLeft: 6,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
      flexWrap: 'wrap',
    },
    previewLabel: {
      fontWeight: '600',
      color: Theme.colors.muted,
      fontSize: 13,
    },
    previewValue: {
      color: Theme.colors.dark,
      fontWeight: '700',
      fontSize: 13,
      flexShrink: 1,
      textAlign: 'right',
      marginLeft: Theme.spacing.sm,
    },
    previewErrorText: {
      color: Theme.colors.error,
      fontWeight: '700',
      textAlign: 'center',
      marginVertical: Theme.spacing.sm,
      fontSize: 13,
    },
    previewActionsRow: {
      flexDirection: isTiny ? 'column' : 'row',
      marginTop: Theme.spacing.md,
      gap: Theme.spacing.sm,
    },
    previewConfirmButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.success,
      paddingVertical: Theme.spacing.md,
      borderRadius: Theme.radius.md,
      minHeight: 48,
      ...cardShadow,
    },
    previewCancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: Theme.colors.border,
      paddingVertical: Theme.spacing.md,
      borderRadius: Theme.radius.md,
      minHeight: 48,
    },
    previewButtonTextLight: {
      color: Theme.colors.white,
      fontWeight: '700',
      fontSize: 14,
      marginLeft: 6,
    },
    previewButtonTextDark: {
      color: Theme.colors.dark,
      fontWeight: '700',
      fontSize: 14,
      marginLeft: 6,
    },

    // ── Lista de facturas dentro del lote ───────────────────────────────
    facturasListBox: {
      width: '100%',
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.lg,
      borderWidth: 1,
      borderColor: Theme.colors.border,
      marginBottom: Theme.spacing.lg,
      overflow: 'hidden',
    },
    facturaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Theme.spacing.sm + 2,
      paddingHorizontal: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Theme.colors.border,
    },
    facturaRowIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: Theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Theme.spacing.sm,
    },
    facturaRowBody: {
      flex: 1,
    },
    facturaRowTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: Theme.colors.dark,
    },
    facturaRowSub: {
      fontSize: 11.5,
      color: Theme.colors.muted,
      marginTop: 1,
    },
    facturaRowTime: {
      fontSize: 10.5,
      color: Theme.colors.light,
      marginLeft: Theme.spacing.sm,
    },
    emptyState: {
      padding: Theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: 13.5,
      color: Theme.colors.muted,
      textAlign: 'center',
    },

    // ── Botón cerrar lote ────────────────────────────────────────────────
    closeLoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.warning,
      paddingVertical: Theme.spacing.md,
      borderRadius: Theme.radius.md,
      width: '100%',
      minHeight: 50,
      marginTop: Theme.spacing.sm,
      ...cardShadow,
    },
    closeLoteButtonDisabled: {
      backgroundColor: Theme.colors.border,
    },
    closeLoteButtonText: {
      color: Theme.colors.white,
      fontSize: 15,
      fontWeight: '700',
      marginLeft: Theme.spacing.sm,
    },
    closeLoteButtonTextDisabled: {
      color: Theme.colors.light,
    },
    closeLoteHint: {
      fontSize: 11.5,
      color: Theme.colors.muted,
      textAlign: 'center',
      marginTop: 6,
    },

    // ── Modal historial de lotes ─────────────────────────────────────────
    modalBackground: {
      flex: 1,
      backgroundColor: Theme.colors.overlayLight,
      justifyContent: 'center',
      alignItems: 'center',
      padding: isSmall ? Theme.spacing.lg : Theme.spacing.xxl,
    },
    modalContent: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.radius.lg,
      padding: isSmall ? Theme.spacing.lg : Theme.spacing.xl,
      width: '100%',
      maxWidth: 500,
      maxHeight: '85%',
      ...Platform.select({
        ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
        android: { elevation: 6 },
      }),
    },
    modalTitle: {
      fontSize: isSmall ? 17 : 19,
      fontWeight: '800',
      marginBottom: Theme.spacing.md,
      color: Theme.colors.primary,
      alignSelf: 'center',
      textAlign: 'center',
    },
    modalDivider: {
      height: 1,
      backgroundColor: Theme.colors.border,
      marginVertical: Theme.spacing.sm,
    },
    modalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Theme.spacing.md,
      borderRadius: Theme.radius.md,
      marginTop: Theme.spacing.sm,
      minHeight: 48,
      ...cardShadow,
    },
    modalButtonText: {
      color: Theme.colors.white,
      fontWeight: '700',
      fontSize: 15,
      marginLeft: 6,
    },
    closeButton: { backgroundColor: Theme.colors.muted },

    loteItem: {
      paddingVertical: Theme.spacing.sm + 2,
      paddingHorizontal: Theme.spacing.md,
      marginBottom: Theme.spacing.sm,
      borderRadius: Theme.radius.md,
      backgroundColor: Theme.colors.surfaceAlt,
      borderLeftWidth: 4,
    },
    loteItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    loteItemTitle: {
      fontWeight: '700',
      color: Theme.colors.dark,
      fontSize: 14,
    },
    loteBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: Theme.radius.pill,
    },
    loteBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: Theme.colors.white,
      marginLeft: 3,
    },
    loteItemDetalle: {
      color: Theme.colors.muted,
      fontSize: 11.5,
      marginTop: 3,
    },
    loteEnviarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Theme.colors.info,
      paddingVertical: 8,
      paddingHorizontal: Theme.spacing.md,
      borderRadius: Theme.radius.sm,
      alignSelf: 'flex-start',
      marginTop: Theme.spacing.sm,
    },
    loteEnviarButtonText: {
      color: Theme.colors.white,
      fontSize: 12,
      fontWeight: '700',
      marginLeft: 4,
    },
  });
}
