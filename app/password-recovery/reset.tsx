import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';

export default function PasswordRecoveryResetScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: Colors.border.light };
    if (pwd.length < 6) return { strength: 1, label: 'Débil', color: Colors.error };
    if (pwd.length < 8) return { strength: 2, label: 'Media', color: Colors.warning };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { strength: 3, label: 'Fuerte', color: Colors.success };
    }
    return { strength: 2, label: 'Media', color: Colors.warning };
  };

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (value !== password) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
  };

  const handleSubmit = async () => {
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '¡Contraseña Cambiada!',
        'Tu contraseña ha sido actualizada exitosamente',
        [
          {
            text: 'Iniciar Sesión',
            onPress: () => router.replace('/login' as any),
          },
        ]
      );
    }, 1500);
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Lock size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Nueva Contraseña</Text>
        <Text style={styles.subtitle}>
          Crea una contraseña segura para tu cuenta
        </Text>

        <View style={styles.formSection}>
          <View>
            <FormInput
              label="Nueva Contraseña"
              value={password}
              onChangeText={handlePasswordChange}
              error={errors.password}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.text.secondary} />
              ) : (
                <Eye size={20} color={Colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: `${(passwordStrength.strength / 3) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                {passwordStrength.label}
              </Text>
            </View>
          )}

          <View>
            <FormInput
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              error={errors.confirmPassword}
              placeholder="Repite tu contraseña"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.text.secondary} />
              ) : (
                <Eye size={20} color={Colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>

          <LoadingButton
            title="Cambiar Contraseña"
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 40,
  },
  formSection: {
    gap: 12,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 16,
    top: 42,
    padding: 8,
  },
  strengthContainer: {
    marginTop: -8,
    marginBottom: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: Colors.border.light,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden' as const,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
  },
});
