import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xxxl,
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.xxxl,
    width: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadow.sm,
  },
  avatarText: {
    color: Theme.colors.white,
    fontSize: 30,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  label: {
    fontWeight: '600',
    color: Theme.colors.muted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  loading: {
    color: Theme.colors.light,
    fontSize: 15,
  },
});

export default styles;
