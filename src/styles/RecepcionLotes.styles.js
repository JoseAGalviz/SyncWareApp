import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxxl,
  },
  cabecera: {
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  actualizado: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  chipActivo: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  chipTextActivo: {
    color: '#ffffff',
  },
  loteCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderLeftWidth: 5,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loteTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  loteDetalle: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  estadoBadgeTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progresoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Theme.spacing.md,
  },
  progresoBarra: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.border,
    overflow: 'hidden',
  },
  progresoRelleno: {
    height: 8,
    borderRadius: 4,
  },
  progresoTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
    minWidth: 52,
    textAlign: 'right',
  },
  facturasBox: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    gap: 2,
  },
  facturaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  facturaNumero: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  facturaSub: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
  facturaObservacion: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.warning,
    marginTop: 2,
  },
  loteObservaciones: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.warning,
    marginTop: 2,
  },
  verMas: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.primary,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
  },
  aviso: {
    fontSize: 12,
    color: Theme.colors.muted,
    fontStyle: 'italic',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  textoVacio: {
    marginTop: Theme.spacing.lg,
    fontSize: 15,
    color: Theme.colors.muted,
    textAlign: 'center',
  },
});

export default styles;
