import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  searchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.text,
  },
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxxl,
  },
  pedidoCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderInfo: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  pedidoCode: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  pedidoDate: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
  estadoBadge: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clienteText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: Theme.colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Theme.colors.border,
  },
  statLabel: {
    fontSize: 10,
    color: Theme.colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  statValueHighlight: {
    color: Theme.colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginRight: Theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 14,
    color: Theme.colors.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: Theme.spacing.lg,
    fontSize: 15,
    color: Theme.colors.muted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.radius.xxl,
    borderTopRightRadius: Theme.radius.xxl,
    maxHeight: '90%',
    paddingBottom: 34,
    ...Theme.shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Theme.colors.muted,
    marginTop: 2,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  modalBody: {
    padding: Theme.spacing.xl,
  },
  detailSection: {
    marginBottom: Theme.spacing.xxl,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.md,
    letterSpacing: 0.5,
  },
  detailCard: {
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    marginRight: Theme.spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  detailValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  estadoBadgeLarge: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  estadoTextLarge: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemsListContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    ...Theme.shadow.xs,
  },
  itemInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  itemCode: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
  itemQuantityContainer: {
    alignItems: 'center',
    paddingLeft: Theme.spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.border,
    minWidth: 60,
  },
  itemQuantityLabel: {
    fontSize: 10,
    color: Theme.colors.muted,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemQuantityValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  emptyItemsText: {
    textAlign: 'center',
    color: Theme.colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: Theme.spacing.sm,
  },
});

export default styles;
