import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: CONTROLES DE ACCESIBILIDAD
// Botones para cambiar tema (claro/oscuro) y tamaño de UI
// Siempre visible en el Home
// ============================================================================

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { Sun, Moon, Type, Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme';

// Colores explícitos para el componente
const COLORS = {
  light: {
    containerBg: '#F5F5F4',
    buttonBg: '#FFFFFF',
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    border: '#E7E5E4',
  },
  dark: {
    containerBg: '#292524',
    buttonBg: '#44403C',
    textPrimary: '#FAFAFA',
    textSecondary: '#D6D3D1',
    border: '#44403C',
  },
};

interface AccessibilityControlsProps {
  variant?: 'full' | 'compact' | 'minimal';
  showLabels?: boolean;
}

export default function AccessibilityControls({
  variant = 'compact',
  showLabels = true,
}: AccessibilityControlsProps) {
  const {
    isDark,
    toggleTheme,
    sizeLevel,
    cycleSizeLevel,
    sizeLevelLabel,
    colors,
    fonts,
    space,
    radius,
    icons,
  } = useTheme();

  // Usar colores explícitos basados en isDark
  const themeColors = isDark ? COLORS.dark : COLORS.light;

  const handleThemePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  };

  const handleSizePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cycleSizeLevel();
  };

  // Icono de tamaño según nivel actual
  const getSizeIcon = () => {
    const iconColor = themeColors.textPrimary;
    switch (sizeLevel) {
      case 'compact':
        return <Minus size={icons.md} color={iconColor} />;
      case 'large':
        return <Plus size={icons.md} color={iconColor} />;
      default:
        return <Type size={icons.md} color={iconColor} />;
    }
  };

  if (variant === 'minimal') {
    return (
      <View style={styles.minimalContainer}>
        <TouchableSound
          onPress={handleThemePress}
          style={[
            styles.minimalButton,
            { backgroundColor: themeColors.buttonBg },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isDark ? (
            <Sun size={icons.sm} color={colors.primary} />
          ) : (
            <Moon size={icons.sm} color={colors.primary} />
          )}
        </TouchableSound>

        <TouchableSound
          onPress={handleSizePress}
          style={[
            styles.minimalButton,
            { backgroundColor: themeColors.buttonBg },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {getSizeIcon()}
        </TouchableSound>
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactContainer,
          {
            backgroundColor: themeColors.containerBg,
            borderRadius: radius.lg,
            padding: space.sm,
          },
        ]}
      >
        {/* Botón de tema */}
        <TouchableSound
          onPress={handleThemePress}
          style={[
            styles.compactButton,
            {
              backgroundColor: themeColors.buttonBg,
              borderRadius: radius.md,
              padding: space.sm,
            },
          ]}
        >
          {isDark ? (
            <Sun size={icons.md} color={colors.primary} />
          ) : (
            <Moon size={icons.md} color={colors.primary} />
          )}
          {showLabels && (
            <Text
              style={[
                styles.compactLabel,
                { color: themeColors.textSecondary, fontSize: fonts.xs },
              ]}
            >
              {isDark ? 'Oscuro' : 'Claro'}
            </Text>
          )}
        </TouchableSound>

        {/* Separador */}
        <View
          style={[styles.separator, { backgroundColor: themeColors.border }]}
        />

        {/* Botón de tamaño */}
        <TouchableSound
          onPress={handleSizePress}
          style={[
            styles.compactButton,
            {
              backgroundColor: themeColors.buttonBg,
              borderRadius: radius.md,
              padding: space.sm,
            },
          ]}
        >
          {getSizeIcon()}
          {showLabels && (
            <Text
              style={[
                styles.compactLabel,
                { color: themeColors.textSecondary, fontSize: fonts.xs },
              ]}
            >
              {sizeLevelLabel}
            </Text>
          )}
        </TouchableSound>
      </View>
    );
  }

  // Variant: full
  return (
    <View
      style={[
        styles.fullContainer,
        {
          backgroundColor: colors.background.secondary,
          borderRadius: radius.lg,
          padding: space.md,
        },
      ]}
    >
      <Text
        style={[
          styles.fullTitle,
          { color: colors.text.primary, fontSize: fonts.sm },
        ]}
      >
        Accesibilidad
      </Text>

      <View style={styles.fullButtonsRow}>
        {/* Tema */}
        <TouchableSound
          onPress={handleThemePress}
          style={[
            styles.fullButton,
            {
              backgroundColor: colors.background.primary,
              borderRadius: radius.md,
              padding: space.md,
              borderColor: colors.border.light,
            },
          ]}
        >
          <View
            style={[
              styles.fullIconContainer,
              { backgroundColor: isDark ? colors.accentLight : colors.primaryLight },
            ]}
          >
            {isDark ? (
              <Sun size={icons.lg} color={colors.accent} />
            ) : (
              <Moon size={icons.lg} color={colors.primary} />
            )}
          </View>
          <Text
            style={[
              styles.fullButtonTitle,
              { color: colors.text.primary, fontSize: fonts.sm },
            ]}
          >
            Tema
          </Text>
          <Text
            style={[
              styles.fullButtonValue,
              { color: colors.text.secondary, fontSize: fonts.xs },
            ]}
          >
            {isDark ? 'Oscuro' : 'Claro'}
          </Text>
        </TouchableSound>

        {/* Tamaño */}
        <TouchableSound
          onPress={handleSizePress}
          style={[
            styles.fullButton,
            {
              backgroundColor: colors.background.primary,
              borderRadius: radius.md,
              padding: space.md,
              borderColor: colors.border.light,
            },
          ]}
        >
          <View
            style={[
              styles.fullIconContainer,
              { backgroundColor: colors.secondaryLight },
            ]}
          >
            {getSizeIcon()}
          </View>
          <Text
            style={[
              styles.fullButtonTitle,
              { color: colors.text.primary, fontSize: fonts.sm },
            ]}
          >
            Tamaño
          </Text>
          <Text
            style={[
              styles.fullButtonValue,
              { color: colors.text.secondary, fontSize: fonts.xs },
            ]}
          >
            {sizeLevelLabel}
          </Text>
        </TouchableSound>
      </View>

      {/* Indicador visual de tamaño */}
      <View style={styles.sizeIndicator}>
        {(['compact', 'default', 'large'] as const).map((level) => (
          <View
            key={level}
            style={[
              styles.sizeIndicatorDot,
              {
                backgroundColor:
                  level === sizeLevel ? colors.primary : colors.border.medium,
                width: level === 'compact' ? 8 : level === 'default' ? 12 : 16,
                height: level === 'compact' ? 8 : level === 'default' ? 12 : 16,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Minimal variant
  minimalContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  minimalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  compactLabel: {
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },

  // Full variant
  fullContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  fullTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  fullButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fullButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  fullIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fullButtonTitle: {
    fontWeight: '600',
  },
  fullButtonValue: {
    marginTop: 2,
  },
  sizeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  sizeIndicatorDot: {
    borderRadius: 100,
  },
});
