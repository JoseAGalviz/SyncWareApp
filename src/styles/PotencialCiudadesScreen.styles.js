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
    paddingBottom: Theme.spacing.lg,
    backgroundColor: Theme.colors.dark,
    ...Theme.shadow.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.white,
    letterSpacing: -0.2,
  },
  backButton: {
    padding: Theme.spacing.sm,
  },
  searchContainer: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.md,
    height: 44,
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
  chipScroll: {
    marginTop: Theme.spacing.sm,
  },
  chipScrollContent: {
    paddingRight: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 5,
    borderRadius: Theme.radius.pill,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.muted,
  },
  chipTextActive: {
    color: Theme.colors.white,
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 1,
    borderRadius: Theme.radius.md,
  },
  badgeText: {
    color: Theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.sm,
  },
  badgeSmallText: {
    color: Theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  infoCol: {
    flex: 1,
    paddingRight: Theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 10,
    color: Theme.colors.muted,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  vendedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  vendedorLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    fontWeight: '700',
    marginRight: Theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vendedorValue: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.text,
    fontWeight: '600',
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
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
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
