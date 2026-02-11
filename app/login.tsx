import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: PANTALLA DE LOGIN
// Diseño unificado con ScreenContainer - Todo scrollea junto
// ============================================================================

import { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import AccessibilityControls from '@/components/AccessibilityControls';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { AuthSounds, SoundFeedback } from '@/services/sounds';

// Colores explícitos para garantizar consistencia
const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: { primary: '#1C1917', muted: '#A8A29E' },
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: { primary: '#FAFAFA', muted: '#78716C' },
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, space, radius, fonts, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const theme = isDark ? COLORS.dark : COLORS.light;

  const validateEmail = (value: string) => Validator.email(value);
  const validatePassword = (value: string) => Validator.required(value) || '';

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      HapticFeedback.error();
      SoundFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      const userData = await login(email, password);
      HapticFeedback.success();
      AuthSounds.login();
      Toast.success('¡Bienvenido de nuevo!');

      // Redirigir según tipo de usuario
      if (userData?.userType === 'driver') {
        router.replace('/driver/dashboard' as any);
      } else if (userData?.userType === 'business') {
        router.replace('/business/dashboard' as any);
      } else if (userData?.userType === 'admin') {
        router.replace('/admin/dashboard' as any);
      } else {
        router.replace('/' as any);
      }
    } catch (error) {
      console.error('Login error:', error);
      HapticFeedback.error();
      SoundFeedback.error();
      Toast.error('Credenciales incorrectas. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Contenido del header (controles de accesibilidad)
  const headerContent = (
    <View style={styles.accessibilityRow}>
      <AccessibilityControls variant="compact" />
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={LogIn}
      headerTitle="Bienvenido"
      headerSubtitle="Inicia sesión para continuar"
      headerContent={headerContent}
    >
      {/* Icono decorativo */}
      <View style={[styles.iconContainer, { backgroundColor: theme.cardAlt }]}>
        <LogIn size={48} color={colors.primary} />
      </View>

      <ThemedText variant="h3" center style={{ marginBottom: space.xs }}>
        Accede a tu cuenta
      </ThemedText>
      <ThemedText variant="body" color="secondary" center style={{ marginBottom: space.xl }}>
        Ingresa tus credenciales
      </ThemedText>

      {/* Email */}
      <View style={styles.inputGroup}>
        <ThemedText variant="label" bold style={{ marginBottom: space.xs }}>
          Correo Electrónico
        </ThemedText>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: errors.email ? colors.error : theme.border,
          borderRadius: radius.md,
        }]}>
          <Mail size={20} color={theme.text.muted} />
          <TextInput
            style={[styles.input, { color: theme.text.primary, fontSize: fonts.base }]}
            placeholder="tu@email.com"
            placeholderTextColor={theme.text.muted}
            value={email}
            onChangeText={(v) => { setEmail(v.toLowerCase()); setErrors(p => ({ ...p, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {errors.email ? <ThemedText variant="caption" color="error">{errors.email}</ThemedText> : null}
      </View>

      {/* Contraseña */}
      <View style={styles.inputGroup}>
        <ThemedText variant="label" bold style={{ marginBottom: space.xs }}>
          Contraseña
        </ThemedText>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: errors.password ? colors.error : theme.border,
          borderRadius: radius.md,
        }]}>
          <Lock size={20} color={theme.text.muted} />
          <TextInput
            style={[styles.input, { color: theme.text.primary, fontSize: fonts.base }]}
            placeholder="••••••••"
            placeholderTextColor={theme.text.muted}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {errors.password ? <ThemedText variant="caption" color="error">{errors.password}</ThemedText> : null}
      </View>

      {/* Olvidé contraseña */}
      <TouchableSound
        style={styles.forgotPassword}
        onPress={() => router.push('/password-recovery/request' as any)}
        disabled={isLoading}
      >
        <ThemedText variant="label" color="accent" bold>
          ¿Olvidaste tu contraseña?
        </ThemedText>
      </TouchableSound>

      {/* Botón Iniciar Sesión */}
      <TouchableSound
        style={[styles.button, {
          backgroundColor: isLoading ? theme.border : colors.primary,
          borderRadius: radius.md,
          marginTop: space.lg,
        }]}
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <ThemedText variant="subtitle" color="white" bold>
          {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
        </ThemedText>
      </TouchableSound>

      {/* Divider */}
      <View style={[styles.divider, { marginVertical: space.xl }]}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <ThemedText variant="caption" color="secondary" style={{ marginHorizontal: space.md }}>
          o
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Link a registro */}
      <TouchableSound
        style={styles.linkButton}
        onPress={() => router.push('/register' as any)}
        disabled={isLoading}
      >
        <ThemedText variant="body" color="secondary">
          ¿No tienes cuenta?{' '}
          <ThemedText variant="body" color="accent" bold>Regístrate</ThemedText>
        </ThemedText>
      </TouchableSound>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  accessibilityRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: -16, // Overlap con el header gradient
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
