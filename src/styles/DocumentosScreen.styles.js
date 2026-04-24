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
    content: {
        padding: Theme.spacing.lg,
        gap: Theme.spacing.md,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.radius.xl,
        padding: Theme.spacing.lg,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        ...Theme.shadow.sm,
    },
    docIconContainer: {
        width: 52,
        height: 52,
        borderRadius: Theme.radius.lg,
        backgroundColor: Theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Theme.spacing.md,
    },
    docInfo: {
        flex: 1,
    },
    docTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: Theme.colors.text,
        marginBottom: 3,
    },
    docDescripcion: {
        fontSize: 12,
        color: Theme.colors.muted,
    },
});

export default styles;
