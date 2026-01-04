import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import PasswordInput from '@/components/PasswordInput';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { StatusBar } from 'expo-status-bar';

export default function PasswordRecoveryResetScreen() {
  const router = useRouter();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
      Toast.success('Contraseña actualizada exitosamente');
      router.replace('/login' as any);
    } catch (error) {
      console.error('Reset password error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo cambiar la contraseña. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.iconContainer}>
            <CheckCircle size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Nueva Contraseña</Text>
          
          <Text style={styles.subtitle}>
            Crea una nueva contraseña segura para tu cuenta
          </Text>

          <View style={styles.form}>
            <PasswordInput
              label="Nueva Contraseña"
              value={password}
              onChangeText={handlePasswordChange}
              error={errors.password}
              placeholder="••••••••"
              showStrength
              editable={!isLoading}
            />

            <PasswordInput
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              error={errors.confirmPassword}
              placeholder="••••••••"
              editable={!isLoading}
            />

            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>La contraseña debe tener:</Text>
              <View style={styles.requirement}>
                <View style={[
                  styles.requirementBullet,
                  password.length >= 6 && styles.requirementBulletActive
                ]} />
                <Text style={[
                  styles.requirementText,
                  password.length >= 6 && styles.requirementTextActive
                ]}>
                  Mínimo 6 caracteres
                </Text>
              </View>
              <View style={styles.requirement}>
                <View style={[
                  styles.requirementBullet,
                  password === confirmPassword && password.length > 0 && styles.requirementBulletActive
                ]} />
                <Text style={[
                  styles.requirementText,
                  password === confirmPassword && password.length > 0 && styles.requirementTextActive
                ]}>
                  Las contraseñas coinciden
                </Text>
              </View>
            </View>

            <LoadingButton
              title="Cambiar Contraseña"
              onPress={handleResetPassword}
              loading={isLoading}
              variant="primary"
            />
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%' as const,
    gap: 16,
  },
  requirementsContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  requirementBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border.medium,
    marginRight: 8,
  },
  requirementBulletActive: {
    backgroundColor: Colors.primary,
  },
  requirementText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  requirementTextActive: {
    color: Colors.primary,
    fontWeight: '500' as const,
  },
});
