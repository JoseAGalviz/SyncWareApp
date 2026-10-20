// ─── SyncWare Design System ──────────────────────────────────────────────────
// Light theme, verde refinado + azul noche. Import this file for all style tokens.
import { Platform } from 'react-native';

const Theme = {
  // ── Colors ────────────────────────────────────────────────────────────────
  colors: {
    // Brand — "verde refinado" (2026-10): verde profundo de marca + azul noche en la
    // navegación, fondos neutros cálidos y estados con menos saturación.
    primary:       '#0E9F6E',  // Verde profundo – acciones principales, resaltados
    primaryDark:   '#0B7F58',  // Presionado
    primaryLight:  '#E7F6EF',  // Fondo teñido
    primaryBorder: '#B7E6D2',  // Borde de elementos teñidos de verde

    // Neutrales — navegación y texto
    dark:          '#0F2A3A',  // Azul noche – barras de navegación, encabezados
    darkSoft:      '#1C3D50',  // Superficies sobre `dark` (ítem activo, separadores)
    text:          '#12211C',  // Texto principal
    muted:         '#5F6F69',  // Texto secundario, labels
    light:         '#94A39D',  // Placeholders, texto deshabilitado
    onDarkMuted:   '#8FA6B2',  // Texto/íconos inactivos sobre `dark`
    primaryOnDark: '#3CCB95',  // Verde legible sobre `dark` (pestaña activa)

    // Semantic
    success:       '#0E9F6E',
    successLight:  '#E7F6EF',
    successDark:   '#0B7F58',
    warning:       '#D99A1E',
    warningLight:  '#FDF5E4',
    warningDark:   '#9A6A0E',  // Texto sobre warningLight
    warningBorder: '#F1D9A0',
    error:         '#D64545',
    errorLight:    '#FCECEC',
    errorBorder:   '#F2C4C4',
    info:          '#2A7FB8',
    infoLight:     '#EAF3FA',

    // Surfaces
    background:    '#F5F7F6',  // Fondo de pantalla
    surface:       '#FFFFFF',  // Tarjetas, inputs
    surfaceAlt:    '#F9FBFA',  // Fila alterna, fondo sutil

    // Borders
    border:        '#E4E9E7',
    borderStrong:  '#CDD6D2',

    // Tonos del diseño "SyncWareApp" (lienzo de diseño 2026-10-20)
    onDarkText:    '#A9BCC6',  // Subtítulos e íconos inactivos sobre `dark`
    onDarkSoft:    '#C9D6DC',  // Texto secundario claro sobre `dark`
    track:         '#EEF2F0',  // Fondo de barras de progreso / chips neutros
    warningText:   '#6E4800',  // Texto sobre warningSoft
    warningSoft:   '#FBF1DC',
    warningEdge:   '#EBCB85',
    warningIcon:   '#8A5A00',
    errorText:     '#A12F2F',
    errorSoft:     '#FBE6E6',
    errorEdge:     '#F0C4C4',
    errorStrong:   '#B83636',
    badge:         '#C53A3A',
    infoSoft:      '#E3EFF7',
    purple:        '#6B4AA0',
    purpleSoft:    '#F0EAF7',
    greenOnDark:   '#6EE7B7',
    amberOnDark:   '#FCD34D',
    dashed:        '#C9D3CF',

    // Utility
    overlay:       'rgba(10,26,34,0.5)',
    overlayLight:  'rgba(10,26,34,0.35)',
    white:         '#FFFFFF',
    black:         '#000000',

    // Table rows (semantic)
    rowEven:       '#F9FBFA',
    rowOdd:        '#FFFFFF',
    rowWarning:    '#FDF5E4',  // rowUno  – only one doc
    rowSuccess:    '#E7F6EF',  // rowAmbos – both docs
  },

  // ── Typography ────────────────────────────────────────────────────────────
  // Códigos (RG-, facturas, notas): monoespaciada del sistema.
  fontMono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
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
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    xxl:  24,
    pill: 100,
  },

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadow: {
    xs: {
      shadowColor: '#0F2A3A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#0F2A3A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#0F2A3A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0F2A3A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};

export default Theme;
