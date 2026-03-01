import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: SCREEN CONTAINER
// Componente base para todas las pantallas - Diseño unificado
// Basado en el patrón de Lista de Compras
// ============================================================================

import React, { ReactNode } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { LucideIcon } from 'lucide-react-native';

// ============================================================================
// COLORES EXPLÍCITOS (garantizan que el tema funcione)
// ============================================================================

const THEME_COLORS = {
  light: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: {
      primary: '#1C1917',
      secondary: '#57534E',
      muted: '#A8A29E',
    },
  },
  dark: {
    background: '#1C1917',
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: {
      primary: '#FAFAFA',
      secondary: '#D6D3D1',
      muted: '#78716C',
    },
  },
};

// Colores de gradiente premium
const GRADIENT_COLORS = {
  primary: ['#16A34A', '#15803D'],      // Verde premium
  secondary: ['#EA580C', '#C2410C'],    // Naranja contenido
  accent: ['#2563EB', '#1D4ED8'],       // Azul profesional
  tertiary: ['#F59E0B', '#D97706'],     // Amarillo/Dorado
};

// ============================================================================
// TIPOS
// ============================================================================

type GradientType = 'primary' | 'secondary' | 'accent' | 'tertiary' | 'none';

interface ScreenContainerProps {
  children: ReactNode;

  // Header decorativo (opcional) - SCROLLEA con el contenido
  headerGradient?: GradientType;
  headerIcon?: LucideIcon;
  headerIconSize?: number;
  headerTitle?: string;
  headerSubtitle?: string;
  headerContent?: ReactNode; // Contenido custom (ej: barra de búsqueda)

  // Scroll
  scrollEnabled?: boolean;
  keyboardAvoiding?: boolean;

  // Refresh
  refreshing?: boolean;
  onRefresh?: () => void;

  // Footer fijo (opcional)
  footer?: ReactNode;
  footerPadding?: number;

  // Padding del contenido
  contentPadding?: number;

  // Sin padding (para pantallas con listas full-width)
  noPadding?: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ScreenContainer({
  children,
  headerGradient = 'none',
  headerIcon: HeaderIcon,
  headerIconSize = 40,
  headerTitle,
  headerSubtitle,
  headerContent,
  scrollEnabled = true,
  keyboardAvoiding = true,
  refreshing = false,
  onRefresh,
  footer,
  footerPadding = 100,
  contentPadding = 16,
  noPadding = false,
}: ScreenContainerProps) {
  const { isDark, colors } = useTheme();

  // Colores basados en el tema
  const theme = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const gradientColors = headerGradient !== 'none'
    ? GRADIENT_COLORS[headerGradient]
    : undefined;

  // ============================================================================
  // HEADER DECORATIVO (dentro del scroll)
  // ============================================================================

  const renderHeader = () => {
    if (!headerTitle && !HeaderIcon && !headerContent && headerGradient === 'none') {
      return null;
    }

    // Header con gradiente
    if (gradientColors) {
      return (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Icono */}
          {HeaderIcon && (
            <View style={styles.headerIconContainer}>
              <HeaderIcon size={headerIconSize} color="#FFFFFF" strokeWidth={1.5} />
            </View>
          )}

          {/* Título */}
          {headerTitle && (
            <ThemedText
              variant="h1"
              style={styles.headerTitle}
            >
              {headerTitle}
            </ThemedText>
          )}

          {/* Subtítulo */}
          {headerSubtitle && (
            <ThemedText
              variant="body"
              style={styles.headerSubtitle}
            >
              {headerSubtitle}
            </ThemedText>
          )}

          {/* Contenido custom (ej: barra de búsqueda) */}
          {headerContent && (
            <View style={styles.headerCustomContent}>
              {headerContent}
            </View>
          )}
        </LinearGradient>
      );
    }

    // Header simple sin gradiente
    return (
      <View style={[styles.headerSimple, { backgroundColor: theme.card }]}>
        {HeaderIcon && (
          <View style={[styles.headerIconContainerSimple, { backgroundColor: colors.primary + '15' }]}>
            <HeaderIcon size={headerIconSize} color={colors.primary} strokeWidth={1.5} />
          </View>
        )}

        {headerTitle && (
          <ThemedText variant="h2" style={styles.headerTitleSimple}>
            {headerTitle}
          </ThemedText>
        )}

        {headerSubtitle && (
          <ThemedText variant="body" color="secondary" style={styles.headerSubtitleSimple}>
            {headerSubtitle}
          </ThemedText>
        )}

        {headerContent}
      </View>
    );
  };

  // ============================================================================
  // CONTENIDO
  // ============================================================================

  const renderContent = () => {
    const contentStyle = [
      styles.content,
      !noPadding && { padding: contentPadding },
      footer && { paddingBottom: footerPadding },
    ];

    return (
      <View style={contentStyle}>
        {children}
      </View>
    );
  };

  // ============================================================================
  // SCROLL VIEW
  // ============================================================================

  const renderScrollContent = () => {
    if (!scrollEnabled) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {renderHeader()}
          {renderContent()}
        </View>
      );
    }

    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {renderHeader()}
        {renderContent()}
      </ScrollView>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  const mainContent = (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {renderScrollContent()}

      {/* Footer fijo */}
      {footer && (
        <View style={[
          styles.footer,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }
        ]}>
          {footer}
        </View>
      )}
    </View>
  );

  // Con KeyboardAvoidingView
  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.flex, { backgroundColor: theme.background }]}
      >
        {mainContent}
      </KeyboardAvoidingView>
    );
  }

  return mainContent;
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header con gradiente
  headerGradient: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  headerCustomContent: {
    marginTop: 20,
  },

  // Header simple
  headerSimple: {
    padding: 20,
    alignItems: 'center',
  },
  headerIconContainerSimple: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleSimple: {
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitleSimple: {
    textAlign: 'center',
  },

  // Contenido
  content: {
    flex: 1,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
});

// ============================================================================
// COMPONENTES AUXILIARES EXPORTADOS
// ============================================================================

// Card estándar para usar dentro del ScreenContainer
export function ScreenCard({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  const { isDark } = useTheme();
  const theme = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  const cardStyle = [
    {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : '#F5F5F4',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableSound style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableSound>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

// Input estándar para usar dentro del ScreenContainer
export function ScreenInput({
  placeholder,
  value,
  onChangeText,
  icon: Icon,
  style,
  ...props
}: {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  icon?: LucideIcon;
  style?: any;
  [key: string]: any;
}) {
  const { isDark, colors } = useTheme();
  const theme = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const { TextInput, View: RNView } = require('react-native');

  return (
    <RNView style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.cardAlt,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1.5,
        borderColor: theme.border,
      },
      style,
    ]}>
      {Icon && (
        <Icon size={20} color={theme.text.muted} style={{ marginRight: 12 }} />
      )}
      <TextInput
        style={{
          flex: 1,
          fontSize: 16,
          color: theme.text.primary,
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </RNView>
  );
}
