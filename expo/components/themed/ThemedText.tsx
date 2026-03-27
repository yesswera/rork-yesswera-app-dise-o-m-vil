// ============================================================================
// YESSWERA: TEXTO TEMATICO
// Componente de texto que responde automaticamente al tema y tamaño
// ============================================================================

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';

type TextVariant =
  | 'h1'        // Títulos principales (4xl)
  | 'h2'        // Títulos de sección (3xl)
  | 'h3'        // Subtítulos (2xl)
  | 'title'     // Títulos de cards (xl)
  | 'subtitle'  // Subtítulos (lg)
  | 'body'      // Texto normal (base)
  | 'label'     // Labels de formulario (sm)
  | 'caption'   // Texto pequeño (xs)
  | 'button';   // Texto de botones (sm, bold)

type TextColor =
  | 'primary'   // Texto principal
  | 'secondary' // Texto secundario
  | 'tertiary'  // Texto terciario
  | 'muted'     // Texto muy claro
  | 'accent'    // Color primario de la app
  | 'success'   // Verde
  | 'error'     // Rojo
  | 'white';    // Blanco (para fondos oscuros)

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  bold?: boolean;
  center?: boolean;
  children: React.ReactNode;
}

export default function ThemedText({
  variant = 'body',
  color = 'primary',
  bold = false,
  center = false,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const { colors, fonts, fontWeight } = useTheme();

  // Mapear variante a tamaño de fuente
  const getFontSize = (): number => {
    switch (variant) {
      case 'h1': return fonts['4xl'];
      case 'h2': return fonts['3xl'];
      case 'h3': return fonts['2xl'];
      case 'title': return fonts.xl;
      case 'subtitle': return fonts.lg;
      case 'body': return fonts.base;
      case 'label': return fonts.sm;
      case 'caption': return fonts.xs;
      case 'button': return fonts.sm;
      default: return fonts.base;
    }
  };

  // Mapear variante a peso de fuente
  const getFontWeight = (): '400' | '500' | '600' | '700' => {
    if (bold) return fontWeight.bold;
    switch (variant) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'title':
        return fontWeight.bold;
      case 'subtitle':
      case 'button':
        return fontWeight.semibold;
      case 'label':
        return fontWeight.medium;
      default:
        return fontWeight.regular;
    }
  };

  // Mapear color a valor real
  const getColor = (): string => {
    switch (color) {
      case 'primary': return colors.text.primary;
      case 'secondary': return colors.text.secondary;
      case 'tertiary': return colors.text.tertiary;
      case 'muted': return colors.text.muted;
      case 'accent': return colors.primary;
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'white': return '#FFFFFF';
      default: return colors.text.primary;
    }
  };

  return (
    <Text
      style={[
        {
          fontSize: getFontSize(),
          fontWeight: getFontWeight(),
          color: getColor(),
          textAlign: center ? 'center' : 'left',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
