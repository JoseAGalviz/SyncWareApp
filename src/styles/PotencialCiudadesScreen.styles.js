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
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
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
  chipScroll: {
    marginTop: Theme.spacing.sm,
  },
  chipScrollContent: {
    paddingRight: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Theme.colors.dark,
    borderColor: Theme.colors.dark,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.text,
  },
  chipTextActive: {
    color: Theme.colors.white,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: Theme.spacing.sm,
  },
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
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
    marginVertical: Theme.spacing.md,
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
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
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
