// Re-exports from Theme for backward compatibility.
// Use Theme.js directly for new code.
import Theme from './Theme';

const COLORS = {
  PRIMARY:    Theme.colors.primary,
  SECONDARY:  Theme.colors.dark,
  ACCENT:     Theme.colors.info,
  SUCCESS:    Theme.colors.success,
  WARNING:    Theme.colors.warning,
  ERROR:      Theme.colors.error,
  INFO:       Theme.colors.info,

  BACKGROUND: Theme.colors.background,
  WHITE:      Theme.colors.white,
  BLACK:      Theme.colors.black,

  BORDER:     Theme.colors.border,
  TEXT:       Theme.colors.text,
  MUTED:      Theme.colors.muted,
  LIGHT_TEXT: Theme.colors.light,

  CARD_BG:    Theme.colors.surface,
  LIGHT_BG:   Theme.colors.surfaceAlt,
  OVERLAY:    Theme.colors.overlay,
};

export default COLORS;
