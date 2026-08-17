import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  header: {
    padding: Theme.spacing.xxl,
    paddingTop: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    borderBottomLeftRadius: Theme.radius.xxl,
    borderBottomRightRadius: Theme.radius.xxl,
    marginBottom: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    ...Theme.shadow.xs,
  },
  profilePic: {
    width: 200,
    height: 100,
    marginBottom: Theme.spacing.sm,
    resizeMode: 'contain',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: Theme.spacing.xs,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xs,
  },
  logoutButton: {
    marginTop: Theme.spacing.xl,
    borderRadius: Theme.radius.md,
    paddingTop: Theme.spacing.md,
  },
  logoutButtonText: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
});

export default styles;
