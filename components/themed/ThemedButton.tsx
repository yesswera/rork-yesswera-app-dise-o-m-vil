// ============================================================================
// YESSWERA: BOTON TEMATICO
// Botón que responde automaticamente al tema y tamaño
// ============================================================================

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/contexts/theme';

type ButtonVariant =
  | 'primary'   // Botón principal (fondo naranja)
  | 'secondary' // Botón secundario (fondo verde)
  | 'outline'   // Solo borde
  | 'ghost'     // Sin fondo ni borde
  | 'danger';   // Rojo para acciones destructivas

type ButtonSize =
  | 'sm'    // Pequeño
  | 'md'    // Mediano (default)
  | 'lg';   // Grande

interface ThemedButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export default function ThemedButton({
  variant = 'primary',
  size = 'md',
  title,
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ThemedButtonProps) {
  const { colors, fonts, space, radius, touch } = useTheme();

  // Obtener colores según variante
  const getColors = () => {
    const isDisabled = disabled || loading;

    switch (variant) {
      case 'primary':
        return {
          background: isDisabled ? colors.border.medium : colors.primary,
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'secondary':
        return {
          background: isDisabled ? colors.border.medium : colors.secondary,
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'outline':
        return {
          background: 'transparent',
          text: isDisabled ? colors.text.tertiary : colors.primary,
          border: isDisabled ? colors.border.light : colors.primary,
        };
      case 'ghost':
        return {
          background: 'transparent',
          text: isDisabled ? colors.text.tertiary : colors.primary,
          border: 'transparent',
        };
      case 'danger':
        return {
          background: isDisabled ? colors.border.medium : colors.error,
          text: '#FFFFFF',
          border: 'transparent',
        };
      default:
        return {
          background: colors.primary,
          text: '#FFFFFF',
          border: 'transparent',
        };
    }
  };

  // Obtener tamaños según size
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          fontSize: fonts.sm,
          minHeight: touch.min,
          iconSize: 16,
          gap: space.xs,
        };
      case 'lg':
        return {
          paddingVertical: space.lg,
          paddingHorizontal: space.xl,
          fontSize: fonts.lg,
          minHeight: touch.large,
          iconSize: 24,
          gap: space.sm,
        };
      default: // md
        return {
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          fontSize: fonts.base,
          minHeight: touch.comfortable,
          iconSize: 20,
          gap: space.sm,
        };
    }
  };

  const buttonColors = getColors();
  const buttonSizes = getSizes();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: buttonColors.background,
          borderColor: buttonColors.border,
          borderWidth: variant === 'outline' ? 2 : 0,
          paddingVertical: buttonSizes.paddingVertical,
          paddingHorizontal: buttonSizes.paddingHorizontal,
          minHeight: buttonSizes.minHeight,
          borderRadius: radius.md,
          opacity: disabled ? 0.6 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      <View style={[styles.content, { gap: buttonSizes.gap }]}>
        {loading ? (
          <ActivityIndicator size="small" color={buttonColors.text} />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <Text
              style={[
                styles.text,
                {
                  color: buttonColors.text,
                  fontSize: buttonSizes.fontSize,
                },
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
