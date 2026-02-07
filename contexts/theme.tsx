// ============================================================================
// YESSWERA: CONTEXT DE TEMA Y ACCESIBILIDAD
// Maneja modo claro/oscuro y tamaño de UI
// Persiste preferencias del usuario
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightTheme,
  darkTheme,
  fontSizes,
  spacing,
  borderRadius,
  iconSizes,
  touchTargets,
  lineHeights,
  fontWeights,
  FontSizeLevel,
} from '@/constants/theme';

// ============================================================================
// TIPOS
// ============================================================================

type ThemeMode = 'light' | 'dark' | 'system';

// Colores del tema (basados en logo Yesswera - Verde primario)
export const LightColors = {
  primary: '#22C55E',      // Verde Yesswera (la Y del logo)
  primaryDark: '#15803D',
  primaryLight: '#D1FAE5',

  secondary: '#F97316',    // Naranja (línea velocidad)
  secondaryDark: '#C2410C',
  secondaryLight: '#FFEDD5',

  accent: '#FBBF24',       // Amarillo (línea velocidad)
  accentDark: '#D97706',
  accentLight: '#FEF3C7',

  tertiary: '#3B82F6',     // Azul (línea velocidad)
  tertiaryDark: '#1D4ED8',
  tertiaryLight: '#DBEAFE',

  black: '#1C1917',
  darkGray: '#44403C',
  mediumGray: '#78716C',
  lightGray: '#A8A29E',
  silver: '#D6D3D1',
  white: '#FFFFFF',

  gold: '#FBBF24',
  goldSoft: '#FCD34D',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  text: {
    primary: '#1C1917',
    secondary: '#57534E',
    tertiary: '#78716C',
    light: '#A8A29E',
    disabled: '#D6D3D1',
    white: '#FFFFFF',
    muted: '#A8A29E',
  },

  border: {
    light: '#E7E5E4',
    medium: '#D6D3D1',
    dark: '#A8A29E',
  },

  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F4',
    tertiary: '#E7E5E4',
    dark: '#1C1917',
  },

  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.08)',
    dark: 'rgba(0, 0, 0, 0.12)',
  },

  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Tab bar
  tabBar: {
    background: '#FFFFFF',
    active: '#22C55E',
    inactive: '#78716C',
  },
};

export const DarkColors: typeof LightColors = {
  primary: '#4ADE80',      // Verde más brillante para modo oscuro
  primaryDark: '#86EFAC',
  primaryLight: '#064E3B',

  secondary: '#FB923C',    // Naranja más brillante
  secondaryDark: '#FDBA74',
  secondaryLight: '#44403C',

  accent: '#FCD34D',       // Amarillo más brillante
  accentDark: '#FBBF24',
  accentLight: '#44403C',

  tertiary: '#60A5FA',     // Azul más brillante
  tertiaryDark: '#93C5FD',
  tertiaryLight: '#44403C',

  black: '#000000',
  darkGray: '#1C1917',
  mediumGray: '#78716C',
  lightGray: '#A8A29E',
  silver: '#44403C',
  white: '#FFFFFF',

  gold: '#FCD34D',
  goldSoft: '#FBBF24',

  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  text: {
    primary: '#FAFAFA',
    secondary: '#D6D3D1',
    tertiary: '#A8A29E',
    light: '#78716C',
    disabled: '#57534E',
    white: '#FFFFFF',
    muted: '#78716C',
  },

  border: {
    light: '#44403C',
    medium: '#57534E',
    dark: '#78716C',
  },

  background: {
    primary: '#1C1917',
    secondary: '#292524',
    tertiary: '#44403C',
    dark: '#000000',
  },

  shadow: {
    light: 'rgba(0, 0, 0, 0.2)',
    medium: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.4)',
  },

  card: '#292524',
  cardElevated: '#44403C',
  overlay: 'rgba(0, 0, 0, 0.7)',

  tabBar: {
    background: '#292524',
    active: '#4ADE80',
    inactive: '#A8A29E',
  },
};

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface ThemeContextType {
  // Tema
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof LightColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  // Tamaño/Accesibilidad
  sizeLevel: FontSizeLevel;
  setSizeLevel: (level: FontSizeLevel) => void;
  cycleSizeLevel: () => void;

  // Valores escalados
  fonts: typeof fontSizes.default;
  space: typeof spacing.default;
  radius: typeof borderRadius.default;
  icons: typeof iconSizes.default;
  touch: typeof touchTargets.default;
  lineHeight: typeof lineHeights.default;
  fontWeight: typeof fontWeights;

  // Labels para UI
  sizeLevelLabel: string;
  themeModeLabel: string;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  themeMode: '@yesswera:themeMode',
  sizeLevel: '@yesswera:sizeLevel',
};

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [sizeLevel, setSizeLevelState] = useState<FontSizeLevel>('default');
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar preferencias guardadas
  useEffect(() => {
    async function loadPreferences() {
      try {
        const [savedMode, savedSize] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.themeMode),
          AsyncStorage.getItem(STORAGE_KEYS.sizeLevel),
        ]);

        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }

        if (savedSize && ['compact', 'default', 'large'].includes(savedSize)) {
          setSizeLevelState(savedSize as FontSizeLevel);
        }
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    }

    loadPreferences();
  }, []);

  // Cambiar modo de tema
  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.themeMode, newMode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  // Toggle tema
  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  // Cambiar nivel de tamaño
  const setSizeLevel = async (level: FontSizeLevel) => {
    setSizeLevelState(level);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.sizeLevel, level);
    } catch (error) {
      console.error('Error saving size level:', error);
    }
  };

  // Ciclar niveles de tamaño
  const cycleSizeLevel = () => {
    const levels: FontSizeLevel[] = ['compact', 'default', 'large'];
    const currentIndex = levels.indexOf(sizeLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    setSizeLevel(levels[nextIndex]);
  };

  // Determinar si es oscuro
  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  // Colores actuales
  const colors = isDark ? DarkColors : LightColors;

  // Valores escalados
  const fonts = fontSizes[sizeLevel];
  const space = spacing[sizeLevel];
  const radius = borderRadius[sizeLevel];
  const icons = iconSizes[sizeLevel];
  const touch = touchTargets[sizeLevel];
  const lineHeight = lineHeights[sizeLevel];

  // Labels para mostrar en UI
  const sizeLevelLabels: Record<FontSizeLevel, string> = {
    compact: 'Compacto',
    default: 'Normal',
    large: 'Grande',
  };

  const themeModeLabels: Record<ThemeMode, string> = {
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
  };

  const value = useMemo<ThemeContextType>(() => ({
    mode,
    isDark,
    colors,
    setMode,
    toggleTheme,
    sizeLevel,
    setSizeLevel,
    cycleSizeLevel,
    fonts,
    space,
    radius,
    icons,
    touch,
    lineHeight,
    fontWeight: fontWeights,
    sizeLevelLabel: sizeLevelLabels[sizeLevel],
    themeModeLabel: themeModeLabels[mode],
  }), [mode, isDark, colors, sizeLevel, fonts, space, radius, icons, touch, lineHeight]);

  // No renderizar hasta cargar preferencias
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook para solo colores (compatibilidad)
export function useColors() {
  const { colors } = useTheme();
  return colors;
}
