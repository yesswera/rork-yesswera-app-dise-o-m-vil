import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';

export default function PasswordRecoveryResetScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const getPasswordStrength = (pwd: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string } => {
    if (pwd.length === 0) {
      return { level: 'weak', label: '', color: Colors.lightGray };
    }
    
    if (pwd.length < 6) {
      return { level: 'weak', label: 'Débil', color: Colors.error };
    }
    
    if (pwd.length < 10) {
      return { level: 'medium', label: 'Media', color: Colors.secondary };
    }
    
    return { level: 'strong', label: 'Fuerte', color: Colors.success };
  };

  const validateForm = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        '¡Contraseña Cambiada!',
        'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Ir a Iniciar Sesión',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Contraseña</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Lock size={64} color={Colors.primary} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Nueva Contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu nueva contraseña para {email || 'tu cuenta'}
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.passwordInputContainer}>
            <FormInput
              label="Nueva Contraseña"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPassword}
              error={errors.password}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
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
              <View style={styles.strengthBars}>
                <View
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strength.level !== 'weak' ? strength.color : Colors.background.tertiary },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strength.level === 'strong' ? strength.color : Colors.background.tertiary },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strength.level === 'strong' ? strength.color : Colors.background.tertiary },
                  ]}
                />
              </View>
              {strength.label && (
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              )}
            </View>
          )}

          <View style={styles.passwordInputContainer}>
            <FormInput
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined });
                }
              }}
              placeholder="Repite tu contraseña"
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.7}
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
            onPress={handleChangePassword}
            loading={isLoading}
            variant="primary"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 40,
  },
  formContainer: {
    marginBottom: 20,
  },
  passwordInputContainer: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 16,
    top: 44,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  strengthContainer: {
    marginBottom: 24,
  },
  strengthBars: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.background.tertiary,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
  },
});
