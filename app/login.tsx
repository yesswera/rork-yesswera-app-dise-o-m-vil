import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const validateEmail = (value: string) => {
    return Validator.email(value);
  };

  const validatePassword = (value: string) => {
    return Validator.required(value) || '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      HapticFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      const userData = await login(email, password);
      HapticFeedback.success();
      Toast.success('¡Bienvenido de nuevo!');
      
      // Redirigir según el tipo de usuario
      if (userData && userData.userType) {
        if (userData.userType === 'repartidor') {
          router.replace('/driver/dashboard' as any);
        } else if (userData.userType === 'negocio') {
          router.replace('/business/dashboard' as any);
        } else if (userData.userType === 'admin') {
          router.replace('/admin/dashboard' as any);
        } else {
          // Cliente o cualquier otro tipo
          router.replace('/' as any);
        }
      } else {
        router.replace('/' as any);
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      HapticFeedback.error();
      Toast.error('Credenciales incorrectas. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.iconContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image
            source={{ uri: 'https://rork.app/pa/9eb35k949i660ayrsld5b/logo' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>Bienvenido de nuevo</Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>Inicia sesión para continuar</Animated.Text>

        <View style={styles.form}>
          <FormInput
            label="Correo Electrónico"
            value={email}
            onChangeText={handleEmailChange}
            error={errors.email}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <FormInput
            label="Contraseña"
            value={password}
            onChangeText={handlePasswordChange}
            error={errors.password}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/password-recovery/request' as any)}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <LoadingButton
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerPrompt}
            onPress={() => router.push('/register' as any)}
            disabled={isLoading}
          >
            <Text style={styles.registerPromptText}>
              ¿No tienes cuenta? <Text style={styles.registerPromptLink}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
  logoImage: {
    width: 160,
    height: 80,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  form: {
    width: '100%' as const,
    gap: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end' as const,
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  registerPrompt: {
    alignItems: 'center' as const,
  },
  registerPromptText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  registerPromptLink: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
