// ─── SyncWare Design System ──────────────────────────────────────────────────
// Dark theme, acento verde. Import this file for all style tokens.
// Mismos nombres de clave que la versión clara — pantallas que ya leen
// Theme.colors.X / COLORS.X (ver src/constants/Colors.js) se re-temáticas solas.

const Theme = {
  // ── Colors ────────────────────────────────────────────────────────────────
  colors: {
    // Brand — mismo verde que ya existía como "success", ahora protagonista
    primary:       '#10B981',  // Emerald – primary actions, highlights
    primaryDark:   '#059669',  // Hover / pressed state
    primaryLight:  'rgba(16,185,129,0.16)',  // Tinted background sobre superficie oscura

    // Neutrales — navegación y texto
    dark:          '#060B14',  // Más oscuro – nav bars, headers
    text:          '#E5E7EB',  // Texto principal (claro sobre fondo oscuro)
    muted:         '#94A3B8',  // Texto secundario, labels
    light:         '#64748B',  // Placeholders, texto deshabilitado

    // Semantic — mismos matices, calibrados para contraste sobre fondo oscuro
    success:       '#10B981',
    successLight:  'rgba(16,185,129,0.16)',
    successDark:   '#047857',
    warning:       '#F59E0B',
    warningLight:  'rgba(245,158,11,0.16)',
    error:         '#F87171',
    errorLight:    'rgba(248,113,113,0.16)',
    info:          '#38BDF8',
    infoLight:     'rgba(56,189,248,0.16)',

    // Surfaces
    background:    '#0B1120',  // Page background
    surface:       '#111827',  // Cards, inputs
    surfaceAlt:    '#1A2333',  // Alternate row, subtle bg

    // Borders
    border:        '#2A3446',
    borderStrong:  '#3B4759',

    // Utility
    overlay:       'rgba(0,0,0,0.65)',
    overlayLight:  'rgba(0,0,0,0.45)',
    white:         '#FFFFFF',
    black:         '#000000',

    // Table rows (semantic)
    rowEven:       '#111827',
    rowOdd:        '#0E1524',
    rowWarning:    'rgba(245,158,11,0.12)',  // rowUno  – only one doc
    rowSuccess:    'rgba(16,185,129,0.12)',  // rowAmbos – both docs
  },

  // ── Typography ────────────────────────────────────────────────────────────
  typography: {
    display:    { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 36 },
    title:      { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 30 },
    heading:    { fontSize: 18, fontWeight: '600', lineHeight: 26 },
    subheading: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
    body:       { fontSize: 14, fontWeight: '400', lineHeight: 22 },
    small:      { fontSize: 12, fontWeight: '400', lineHeight: 18 },
    tiny:       { fontSize: 10, fontWeight: '500', lineHeight: 16 },
    label:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  },

  // ── Spacing ───────────────────────────────────────────────────────────────
  spacing: {
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    xxl:  24,
    xxxl: 32,
  },

  // ── Border Radius ─────────────────────────────────────────────────────────
  radius: {
    sm:   6,
    md:   10,
    lg:   14,
    xl:   20,
    xxl:  24,
    pill: 100,
  },

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadow: {
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};

export default Theme;
