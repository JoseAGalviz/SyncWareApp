import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

// Diseño "Menú lateral" del lienzo SyncWareApp.
const C = Theme.colors;

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.dark,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopRightRadius: 24,
    gap: 14,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCaja: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  marcaTexto: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  usuarioFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    color: C.white,
    fontSize: 18,
    fontWeight: '800',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
  },
  userEmail: {
    fontSize: 12,
    color: C.onDarkText,
    marginTop: 2,
  },
  rolChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radius.pill,
    backgroundColor: C.primaryLight,
  },
  rolChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  lista: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 4,
  },
  item: {
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  pie: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logoutButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: C.errorStrong,
    fontWeight: '700',
    fontSize: 15,
  },
});

export default styles;
