// ============================================================================
// YESSWERA: SISTEMA DE TEMA Y ACCESIBILIDAD
// Colores, tipografía y escalas para modo claro/oscuro y tamaños
// Basado en el logo de Yesswera + psicología del color + WCAG AA
// ============================================================================

// ============================================================================
// PALETA DE COLORES - Basada en el logo de Yesswera
// ============================================================================

// Logo de Yesswera:
// - Verde (Principal): La Y grande - confianza, frescura, crecimiento
// - Naranja (Acento 1): Línea superior - energía, apetito, acción
// - Amarillo (Acento 2): Línea media - optimismo, promociones
// - Azul (Acento 3): Línea inferior - confiabilidad, profesionalismo

export const palette = {
  // Primarios - Verde Yesswera (confianza + frescura + crecimiento)
  green: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#22C55E', // Principal (del logo)
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Secundarios - Naranja (energía + apetito)
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Del logo
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Acento - Amarillo dorado (promociones + atención)
  yellow: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24', // Del logo
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Terciario - Azul (confiabilidad + profesionalismo)
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Del logo
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Alertas - Rojo (errores + urgencia)
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutros cálidos
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },

  // Puros
  white: '#FFFFFF',
  black: '#000000',
};

// ============================================================================
// TEMAS: CLARO Y OSCURO
// ============================================================================

export const lightTheme = {
  // Fondos
  background: {
    primary: '#FAFAF9',
    secondary: '#F5F5F4',
    tertiary: '#E7E5E4',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
  },

  // Textos - Alto contraste para accesibilidad
  text: {
    primary: '#1C1917',      // Contraste 15:1
    secondary: '#57534E',     // Contraste 7:1
    tertiary: '#78716C',      // Contraste 4.5:1
    muted: '#A8A29E',        // Para placeholders
    inverse: '#FFFFFF',
    link: '#16A34A',
  },

  // Colores de marca (basados en logo Yesswera)
  primary: '#16A34A',         // Verde premium profundo
  primaryLight: '#D1FAE5',
  primaryDark: '#15803D',

  secondary: '#EA580C',       // Naranja contenido
  secondaryLight: '#FFEDD5',
  secondaryDark: '#C2410C',

  accent: '#FBBF24',          // Amarillo (línea velocidad media)
  accentLight: '#FEF3C7',

  tertiary: '#2563EB',        // Azul profesional
  tertiaryLight: '#DBEAFE',

  // Estados
  success: '#16A34A',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Colores especiales para UI
  card: '#FFFFFF',

  // Bordes
  border: {
    light: '#E7E5E4',
    medium: '#D6D3D1',
    dark: '#A8A29E',
  },

  // Sombras
  shadow: {
    color: '#000000',
    opacity: 0.04,
  },

  // Tab bar
  tabBar: {
    background: '#FFFFFF',
    active: '#16A34A',
    inactive: '#78716C',
  },

  // Status bar
  statusBar: 'dark-content' as const,
};

export const darkTheme = {
  // Fondos
  background: {
    primary: '#1C1917',
    secondary: '#292524',
    tertiary: '#44403C',
    card: '#292524',
    elevated: '#44403C',
  },

  // Textos
  text: {
    primary: '#FAFAFA',
    secondary: '#D6D3D1',
    tertiary: '#A8A29E',
    muted: '#78716C',        // Para placeholders
    inverse: '#1C1917',
    link: '#34D399',
  },

  // Colores de marca (más brillantes en oscuro, basados en logo)
  primary: '#34D399',         // Verde brillante pero no neon
  primaryLight: '#064E3B',
  primaryDark: '#86EFAC',

  secondary: '#FB923C',       // Naranja más brillante
  secondaryLight: '#44403C',
  secondaryDark: '#FDBA74',

  accent: '#FCD34D',          // Amarillo más brillante
  accentLight: '#44403C',

  tertiary: '#60A5FA',        // Azul más brillante
  tertiaryLight: '#44403C',

  // Estados
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#44403C',
  error: '#F87171',
  errorLight: '#44403C',
  info: '#60A5FA',
  infoLight: '#44403C',

  // Colores especiales para UI
  card: '#292524',

  // Bordes
  border: {
    light: '#44403C',
    medium: '#57534E',
    dark: '#78716C',
  },

  // Sombras
  shadow: {
    color: '#000000',
    opacity: 0.3,
  },

  // Tab bar
  tabBar: {
    background: '#292524',
    active: '#34D399',
    inactive: '#A8A29E',
  },

  // Status bar
  statusBar: 'light-content' as const,
};

// ============================================================================
// TIPOGRAFÍA ESCALABLE
// ============================================================================

// Tres niveles de tamaño para accesibilidad
export type FontSizeLevel = 'compact' | 'default' | 'large';

export const fontSizes: Record<FontSizeLevel, {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
}> = {
  // Compacto - Para jóvenes, más contenido visible
  compact: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 26,
    '4xl': 30,
  },

  // Default - Balance
  default: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Grande - Para adultos mayores, máxima legibilidad
  large: {
    xs: 14,
    sm: 16,
    base: 18,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
};

// Pesos de fuente
export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Line heights escalables
export const lineHeights: Record<FontSizeLevel, {
  tight: number;
  normal: number;
  relaxed: number;
}> = {
  compact: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  default: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  large: {
    tight: 1.3,
    normal: 1.6,
    relaxed: 1.9,
  },
};

// ============================================================================
// ESPACIADO ESCALABLE
// ============================================================================

export const spacing: Record<FontSizeLevel, {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}> = {
  compact: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 28,
  },
  default: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  },
  large: {
    xs: 6,
    sm: 10,
    md: 18,
    lg: 24,
    xl: 30,
    '2xl': 40,
  },
};

// ============================================================================
// RADIOS DE BORDE
// ============================================================================

export const borderRadius: Record<FontSizeLevel, {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}> = {
  compact: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },
  default: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  large: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 24,
    full: 9999,
  },
};

// ============================================================================
// TAMAÑOS DE ICONOS
// ============================================================================

export const iconSizes: Record<FontSizeLevel, {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}> = {
  compact: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  },
  default: {
    sm: 18,
    md: 24,
    lg: 28,
    xl: 32,
  },
  large: {
    sm: 22,
    md: 28,
    lg: 34,
    xl: 40,
  },
};

// ============================================================================
// TAMAÑOS DE TOQUE (Accesibilidad)
// ============================================================================

export const touchTargets: Record<FontSizeLevel, {
  min: number;
  comfortable: number;
  large: number;
}> = {
  compact: {
    min: 40,
    comfortable: 44,
    large: 52,
  },
  default: {
    min: 44,
    comfortable: 48,
    large: 56,
  },
  large: {
    min: 52,
    comfortable: 56,
    large: 64,
  },
};

// ============================================================================
// ANIMACIONES
// ============================================================================

export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ============================================================================
// TIPO EXPORTADO
// ============================================================================

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark' | 'system';
