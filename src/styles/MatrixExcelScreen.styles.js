import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 40,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    ...Theme.shadow.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: -0.2,
  },
  backButton: {
    padding: Theme.spacing.sm,
  },
  // Botón "PDF" del encabezado (diseño "Zonas Potenciales").
  pdfBoton: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.darkSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfTexto: {
    color: Theme.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Theme.colors.text,
  },
  resultsCount: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: Theme.spacing.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  celdas: {
    flexDirection: 'row',
    gap: 6,
  },
  celda: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  celdaValor: {
    fontSize: 18,
    fontWeight: '800',
  },
  celdaLabel: {
    fontSize: 11,
  },
  idBadge: {
    backgroundColor: Theme.colors.dark,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  idText: {
    color: Theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primaryLight,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 12,
  },
  infoCol: {
    flex: 1,
    paddingRight: Theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  footerDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: Theme.colors.muted,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.muted,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text,
    marginTop: Theme.spacing.lg,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Theme.colors.muted,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});

export default styles;
