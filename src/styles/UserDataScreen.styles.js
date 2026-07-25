import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Theme.spacing.lg,
    marginLeft: 4,
    marginTop: Theme.spacing.sm,
  },
  backText: {
    color: Theme.colors.primary,
    fontSize: 15,
    marginLeft: 4,
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    paddingVertical: Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.md,
  },
  logo: {
    width: 220,
    height: 110,
    marginBottom: Theme.spacing.sm,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.xxl,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.sm,
  },
  label: {
    fontWeight: '600',
    color: Theme.colors.muted,
    fontSize: 13,
    width: 110,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    color: Theme.colors.text,
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  segmentList: {
    width: '100%',
    paddingLeft: 8,
    marginBottom: 6,
  },
  segmentItem: {
    color: Theme.colors.muted,
    fontSize: 14,
    marginBottom: 3,
    textAlign: 'right',
  },
});

export default styles;
