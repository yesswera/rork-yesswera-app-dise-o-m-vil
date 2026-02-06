import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: typeof LightColors;
}

// Light theme colors (current default)
export const LightColors = {
  primary: '#00C896',
  primaryDark: '#00A876',
  primaryLight: '#34d399',

  secondary: '#FF6B35',
  secondaryDark: '#E55A2B',
  secondaryLight: '#fb923c',

  accent: '#00A8E8',
  accentDark: '#0088C4',
  accentLight: '#38bdf8',

  black: '#1A1A1A',
  darkGray: '#2D3436',
  mediumGray: '#6C757D',
  lightGray: '#B2BEC3',
  silver: '#DEE2E6',
  white: '#FFFFFF',

  gold: '#FFD700',
  goldSoft: '#F4C430',

  success: '#00C896',
  warning: '#FF6B35',
  error: '#DC3545',

  text: {
    primary: '#1A1A1A',
    secondary: '#6C757D',
    light: '#ADB5BD',
    disabled: '#B2BEC3',
    white: '#FFFFFF',
    muted: '#ADB5BD',
  },

  border: {
    light: '#DEE2E6',
    medium: '#B2BEC3',
    dark: '#6C757D',
  },

  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5',
    dark: '#1A1A1A',
  },

  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.15)',
  },

  // Card and surface colors
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme colors
export const DarkColors: typeof LightColors = {
  primary: '#00D9A6', // Slightly brighter for dark mode
  primaryDark: '#00C896',
  primaryLight: '#4AE3B5',

  secondary: '#FF8B5A', // Slightly softer
  secondaryDark: '#FF6B35',
  secondaryLight: '#FFB088',

  accent: '#33B8F0',
  accentDark: '#00A8E8',
  accentLight: '#66CCFF',

  black: '#000000',
  darkGray: '#121212',
  mediumGray: '#888888',
  lightGray: '#AAAAAA',
  silver: '#333333',
  white: '#FFFFFF',

  gold: '#FFD700',
  goldSoft: '#F4C430',

  success: '#00D9A6',
  warning: '#FF8B5A',
  error: '#FF6B6B',

  text: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    light: '#888888',
    disabled: '#666666',
    white: '#FFFFFF',
    muted: '#888888',
  },

  border: {
    light: '#333333',
    medium: '#444444',
    dark: '#555555',
  },

  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#2A2A2A',
    dark: '#000000',
  },

  shadow: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },

  card: '#1E1E1E',
  cardElevated: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

const THEME_STORAGE_KEY = '@yesswera_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // Calculate if we're actually in dark mode
  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? DarkColors : LightColors;

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
  };

  const toggleTheme = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('system');
    } else {
      setMode('light');
    }
  };

  // Don't render until we've loaded the saved preference
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get just the colors (backward compatible)
export function useColors() {
  const { colors } = useTheme();
  return colors;
}
