import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: Theme.colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    paddingVertical: Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xxl,
    alignItems: 'center',
    ...Theme.shadow.md,
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: Theme.spacing.xl,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.xxl,
    letterSpacing: 0.3,
  },
  input: {
    width: '100%',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.lg,
    backgroundColor: Theme.colors.surfaceAlt,
    fontSize: 15,
    color: Theme.colors.text,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    position: 'relative',
  },
  passwordInputBase: {
    flex: 1,
    marginBottom: 0,
  },
  showPasswordButton: {
    position: 'absolute',
    right: Theme.spacing.lg,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showPasswordText: {
    fontSize: 20,
    color: Theme.colors.muted,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
  },
});

export default styles;
