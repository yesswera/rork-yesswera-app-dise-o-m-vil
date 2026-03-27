import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: RECUPERAR CONTRASENA - VERIFICAR CODIGO
// Usa ScreenContainer para diseño unificado con soporte de tema oscuro
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
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

export default function PasswordRecoveryVerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const codeString = code.join('');

    if (codeString.length < 6) {
      HapticFeedback.error();
      Toast.error('Ingresa el codigo completo');
      return;
    }

    setIsLoading(true);
    try {
      const emailStr = Array.isArray(email) ? email[0] : email || '';
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: emailStr,
        token: codeString,
        type: 'recovery',
      });

      if (verifyError) {
        throw verifyError;
      }

      HapticFeedback.success();
      Toast.success('Codigo verificado correctamente');
      router.push('/password-recovery/reset' as any);
    } catch (error: any) {
      console.error('Verify code error:', error);
      HapticFeedback.error();
      const msg = error?.message?.includes('expired')
        ? 'Codigo expirado. Solicita uno nuevo.'
        : 'Codigo incorrecto. Intenta nuevamente.';
      Toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const emailStr = Array.isArray(email) ? email[0] : email || '';
      await supabase.auth.resetPasswordForEmail(emailStr);
      HapticFeedback.light();
      Toast.info('Codigo reenviado a tu correo');
    } catch (error) {
      console.error('Resend code error:', error);
      Toast.error('No se pudo reenviar. Intenta de nuevo.');
    }
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const isCodeComplete = code.every(digit => digit !== '');

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
      headerIcon={ShieldCheck}
      headerTitle="Verificar Codigo"
      headerSubtitle="Ingresa el codigo de 6 digitos"
      headerContent={headerContent}
    >
      <ThemedText variant="h3" center style={styles.title}>
        Verifica tu Codigo
      </ThemedText>

      <ThemedText variant="body" color="secondary" center style={styles.subtitle}>
        Enviamos un codigo de 6 digitos a {email || 'tu correo'}
      </ThemedText>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[
              styles.codeInput,
              {
                backgroundColor: theme.card,
                borderColor: digit ? colors.primary : theme.border,
                color: theme.text,
              },
              digit && { backgroundColor: colors.primary + '08' },
            ]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!isLoading}
          />
        ))}
      </View>

      <LoadingButton
        title="Verificar Codigo"
        onPress={handleVerifyCode}
        loading={isLoading}
        variant="primary"
        disabled={!isCodeComplete}
      />

      <View style={styles.linksContainer}>
        <TouchableSound
          onPress={handleResendCode}
          disabled={isLoading}
          style={styles.linkButton}
        >
          <ThemedText variant="body" color="primary" bold>
            Reenviar codigo
          </ThemedText>
        </TouchableSound>

        <ThemedText variant="body" color="muted" style={styles.linkSeparator}>
          -
        </ThemedText>

        <TouchableSound
          onPress={() => router.back()}
          disabled={isLoading}
          style={styles.linkButton}
        >
          <ThemedText variant="body" color="primary" bold>
            Cambiar email
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
  title: {
    marginBottom: 12,
  },
  subtitle: {
    marginBottom: 32,
    lineHeight: 22,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkSeparator: {
    fontSize: 14,
  },
});
