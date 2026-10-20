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
    resultsCount: {
        fontSize: 12,
        color: Theme.colors.muted,
        marginTop: Theme.spacing.sm,
    },
    listContent: {
        padding: Theme.spacing.lg,
        paddingBottom: 30,
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
    idBadge: {
        backgroundColor: Theme.colors.infoSoft,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    idText: {
        color: Theme.colors.dark,
        fontSize: 11,
        fontWeight: '800',
    },
    companyName: {
        fontSize: 16,
        fontWeight: '800',
        color: Theme.colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: Theme.colors.border,
        marginVertical: Theme.spacing.md,
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
        fontSize: 11,
        color: Theme.colors.muted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: Theme.colors.text,
        fontWeight: '700',
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
