import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: RECUPERAR CONTRASENA - SOLICITUD
// Usa ScreenContainer para diseño unificado con soporte de tema oscuro
// ============================================================================

import { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { KeyRound, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/constants/supabase';

// ============================================================================
// COLORES EXPLÍCITOS PARA MODO OSCURO
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    borderMedium: '#D6D3D1',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    borderMedium: '#57534E',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

export default function PasswordRecoveryRequestScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const validateEmail = (value: string) => {
    return Validator.email(value);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError('');
  };

  const handleSendCode = async () => {
    const emailError = validateEmail(email);

    if (emailError) {
      setError(emailError);
      HapticFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

      if (resetError) {
        console.error('Reset email error:', resetError);
        // Anti-enumeracion: no revelar si el email existe o no
      }

      // Siempre mostrar exito (seguridad: no revelar si el email existe)
      HapticFeedback.success();
      Toast.success('Si el correo existe, recibiras un codigo');
      router.push(`/password-recovery/verify?email=${encodeURIComponent(email)}` as any);
    } catch (error) {
      console.error('Send code error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo enviar el codigo. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Header content con boton de regreso
  const headerContent = (
    <View style={styles.headerControls}>
      <TouchableSound
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color="#FFFFFF" />
      </TouchableSound>
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={KeyRound}
      headerTitle="Recuperar Contrasena"
      headerSubtitle="Te enviaremos un codigo de verificacion"
      headerContent={headerContent}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logoImage}
          contentFit="contain"
        />
      </View>

      <ThemedText variant="h3" center style={styles.title}>
        Olvidaste tu contrasena?
      </ThemedText>

      <ThemedText variant="body" color="secondary" center style={styles.subtitle}>
        Ingresa tu correo electronico y te enviaremos un codigo de 6 digitos para recuperar tu cuenta
      </ThemedText>

      <View style={styles.form}>
        <FormInput
          label="Correo Electronico"
          value={email}
          onChangeText={handleEmailChange}
          error={error}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />

        <LoadingButton
          title="Enviar Codigo"
          onPress={handleSendCode}
          loading={isLoading}
          variant="primary"
        />

        <TouchableSound
          style={styles.backToLogin}
          onPress={() => router.push('/login' as any)}
          disabled={isLoading}
        >
          <ThemedText variant="body" color="primary" bold>
            Volver al inicio de sesion
          </ThemedText>
        </TouchableSound>
      </View>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  title: {
    marginBottom: 12,
  },
  subtitle: {
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  backToLogin: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
});
