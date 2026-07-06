export const theme = {
  colors: {
    background: '#F5F7FA',
    surface: '#FFFFFF',

    // "Azul Puerto" — confianza, banca, más distintivo que un azul genérico
    primary: '#0F4C81',
    primaryLight: '#E9F1FA',
    primaryMid: '#CFE2F4',

    // "Terracota Almacén" — cálido, evoca los toldos de un comercio de barrio.
    // Uso puntual (FAB, iconos hero, momentos de marca), nunca como color de acción repetida.
    accent: '#C2542D',
    accentLight: '#F7E9E2',

    text: '#16213A',
    textSecondary: '#5B6B85',
    muted: '#93A0B8',
    border: '#E3E8F0',
    divider: '#EEF1F6',

    success: '#1E8E5A',
    successLight: '#EEF8F2',
    successMid: '#D7EFE0',

    warning: '#B7791F',
    warningLight: '#FCF3DF',
    warningBorder: '#EFD9A6',

    error: '#C22E2E',
    dangerLight: '#FBEEEE',
    dangerMid: '#F5D9D9',

    overlay: 'rgba(22, 33, 58, 0.06)',
  },

  fontFamily: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },

  font: {
    micro: 11,
    caption: 13,
    body: 15,
    bodyLg: 17,
    h3: 19,
    h2: 22,
    h1: 26,
    display: 34,
    displayLg: 44,
    // aliases retenidos por compatibilidad
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 22,
    '2xl': 28,
    '3xl': 38,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
    // aliases retenidos por compatibilidad
    small: 8,
    medium: 16,
    large: 24,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 999,
    // semánticos por tipo de elemento
    button: 14,
    input: 12,
    card: 16,
    cardLg: 20,
    chip: 999,
    iconChip: 999,
  },

  iconChipSize: {
    sm: 32,
    md: 44,
    lg: 64,
    xl: 88,
  },

  shadow: {
    sm: {
      shadowColor: '#16213A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    md: {
      shadowColor: '#16213A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    lg: {
      shadowColor: '#0F4C81',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;
