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
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
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
    fontSize: 13,
    color: Theme.colors.dark,
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
