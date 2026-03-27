// ============================================================================
// YESSWERA: VISTA TEMATICA
// Contenedor que responde automaticamente al tema
// ============================================================================

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';

// Colores explícitos para garantizar que el tema funcione correctamente
const EXPLICIT_COLORS = {
  light: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F5F5F4',
      tertiary: '#E7E5E4',
    },
    card: '#FFFFFF',
    border: '#E7E5E4',
  },
  dark: {
    background: {
      primary: '#1C1917',
      secondary: '#292524',
      tertiary: '#44403C',
    },
    card: '#292524',
    border: '#44403C',
  },
};

type ViewVariant =
  | 'screen'    // Pantalla completa
  | 'card'      // Tarjeta elevada
  | 'section'   // Sección con padding
  | 'row'       // Fila horizontal
  | 'center';   // Centrado

type BackgroundColor =
  | 'primary'   // Fondo principal
  | 'secondary' // Fondo secundario
  | 'tertiary'  // Fondo terciario
  | 'card'      // Fondo de tarjeta
  | 'transparent';

interface ThemedViewProps extends ViewProps {
  variant?: ViewVariant;
  background?: BackgroundColor;
  padding?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  shadow?: boolean;
  border?: boolean;
  children?: React.ReactNode;
}

export default function ThemedView({
  variant,
  background = 'transparent',
  padding,
  rounded,
  shadow = false,
  border = false,
  style,
  children,
  ...props
}: ThemedViewProps) {
  const { colors, space, radius, isDark } = useTheme();

  // Usar colores explícitos basados en isDark
  const themeColors = isDark ? EXPLICIT_COLORS.dark : EXPLICIT_COLORS.light;

  // Obtener color de fondo
  const getBackgroundColor = (): string | undefined => {
    switch (background) {
      case 'primary': return themeColors.background.primary;
      case 'secondary': return themeColors.background.secondary;
      case 'tertiary': return themeColors.background.tertiary;
      case 'card': return themeColors.card;
      case 'transparent': return undefined;
      default: return undefined;
    }
  };

  // Obtener padding
  const getPadding = (): number | undefined => {
    if (padding === true) return space.md;
    if (padding === 'sm') return space.sm;
    if (padding === 'md') return space.md;
    if (padding === 'lg') return space.lg;
    if (padding === 'xl') return space.xl;
    return undefined;
  };

  // Obtener border radius
  const getBorderRadius = (): number | undefined => {
    if (rounded === true) return radius.md;
    if (rounded === 'sm') return radius.sm;
    if (rounded === 'md') return radius.md;
    if (rounded === 'lg') return radius.lg;
    if (rounded === 'xl') return radius.xl;
    return undefined;
  };

  // Estilos de variante
  const getVariantStyles = () => {
    switch (variant) {
      case 'screen':
        return {
          flex: 1,
          backgroundColor: themeColors.background.primary,
        };
      case 'card':
        return {
          backgroundColor: themeColors.card,
          borderRadius: radius.lg,
          padding: space.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 3,
        };
      case 'section':
        return {
          paddingHorizontal: space.md,
          paddingVertical: space.lg,
        };
      case 'row':
        return {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
        };
      case 'center':
        return {
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        };
      default:
        return {};
    }
  };

  // Estilos de sombra
  const getShadowStyles = () => {
    if (!shadow) return {};
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 12,
      elevation: 5,
    };
  };

  // Estilos de borde
  const getBorderStyles = () => {
    if (!border) return {};
    return {
      borderWidth: 1,
      borderColor: themeColors.border,
    };
  };

  return (
    <View
      style={[
        getVariantStyles(),
        {
          backgroundColor: getBackgroundColor(),
          padding: getPadding(),
          borderRadius: getBorderRadius(),
        },
        getShadowStyles(),
        getBorderStyles(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
