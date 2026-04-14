// ─── SyncWare Design System ──────────────────────────────────────────────────
// Corporate minimalist theme. Import this file for all style tokens.

const Theme = {
  // ── Colors ────────────────────────────────────────────────────────────────
  colors: {
    // Brand
    primary:       '#0F766E',  // Deep teal – primary actions, highlights
    primaryDark:   '#0A5750',  // Hover / pressed state
    primaryLight:  '#E6F3F2',  // Tinted background

    // Neutrals – navigation & text
    dark:          '#1E293B',  // Darkest – nav bars, headings
    text:          '#0F172A',  // Body text
    muted:         '#64748B',  // Secondary text, labels
    light:         '#94A3B8',  // Placeholders, disabled text

    // Semantic
    success:       '#10B981',
    successLight:  '#ECFDF5',
    successDark:   '#047857',
    warning:       '#F59E0B',
    warningLight:  '#FFFBEB',
    error:         '#EF4444',
    errorLight:    '#FEF2F2',
    info:          '#0EA5E9',
    infoLight:     '#F0F9FF',

    // Surfaces
    background:    '#F1F5F9',  // Page background
    surface:       '#FFFFFF',  // Cards, inputs
    surfaceAlt:    '#F8FAFC',  // Alternate row, subtle bg

    // Borders
    border:        '#E2E8F0',
    borderStrong:  '#CBD5E1',

    // Utility
    overlay:       'rgba(0,0,0,0.5)',
    overlayLight:  'rgba(0,0,0,0.35)',
    white:         '#FFFFFF',
    black:         '#000000',

    // Table rows (semantic, minimalist)
    rowEven:       '#F8FAFC',
    rowOdd:        '#FFFFFF',
    rowWarning:    '#FFFBEB',  // rowUno  – only one doc
    rowSuccess:    '#ECFDF5',  // rowAmbos – both docs
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
