import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: RECUPERAR CONTRASENA - NUEVA CONTRASENA
// Usa ScreenContainer para diseño unificado con soporte de tema oscuro
// ============================================================================

import { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LockKeyhole, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import PasswordInput from '@/components/PasswordInput';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';

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

export default function PasswordRecoveryResetScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
  };

  const handleResetPassword = async () => {
    const passwordError = Validator.password(password);
    const confirmPasswordError = Validator.confirmPassword(password, confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      HapticFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      HapticFeedback.success();
      Toast.success('Contrasena actualizada exitosamente');
      router.replace('/login' as any);
    } catch (error) {
      console.error('Reset password error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo cambiar la contrasena. Intenta nuevamente.');
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

  // Indicadores de requisitos
  const passwordLengthOk = password.length >= 6;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={LockKeyhole}
      headerTitle="Nueva Contrasena"
      headerSubtitle="Crea una contrasena segura"
      headerContent={headerContent}
    >
      {/* Icono de exito */}
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
        <CheckCircle size={48} color={colors.primary} />
      </View>

      <ThemedText variant="h3" center style={styles.title}>
        Nueva Contrasena
      </ThemedText>

      <ThemedText variant="body" color="secondary" center style={styles.subtitle}>
        Crea una nueva contrasena segura para tu cuenta
      </ThemedText>

      <View style={styles.form}>
        <PasswordInput
          label="Nueva Contrasena"
          value={password}
          onChangeText={handlePasswordChange}
          error={errors.password}
          placeholder="********"
          showStrength
          editable={!isLoading}
        />

        <PasswordInput
          label="Confirmar Contrasena"
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          error={errors.confirmPassword}
          placeholder="********"
          editable={!isLoading}
        />

        <View style={[styles.requirementsContainer, { backgroundColor: theme.cardAlt }]}>
          <ThemedText variant="label" bold style={styles.requirementsTitle}>
            La contrasena debe tener:
          </ThemedText>

          <View style={styles.requirement}>
            <View style={[
              styles.requirementBullet,
              { backgroundColor: passwordLengthOk ? colors.primary : theme.borderMedium }
            ]} />
            <ThemedText
              variant="caption"
              color={passwordLengthOk ? 'primary' : 'secondary'}
              style={passwordLengthOk ? styles.requirementTextActive : undefined}
            >
              Minimo 6 caracteres
            </ThemedText>
          </View>

          <View style={styles.requirement}>
            <View style={[
              styles.requirementBullet,
              { backgroundColor: passwordsMatch ? colors.primary : theme.borderMedium }
            ]} />
            <ThemedText
              variant="caption"
              color={passwordsMatch ? 'primary' : 'secondary'}
              style={passwordsMatch ? styles.requirementTextActive : undefined}
            >
              Las contrasenas coinciden
            </ThemedText>
          </View>
        </View>

        <LoadingButton
          title="Cambiar Contrasena"
          onPress={handleResetPassword}
          loading={isLoading}
          variant="primary"
        />
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
  },
  subtitle: {
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  requirementsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  requirementsTitle: {
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  requirementTextActive: {
    fontWeight: '500',
  },
});
