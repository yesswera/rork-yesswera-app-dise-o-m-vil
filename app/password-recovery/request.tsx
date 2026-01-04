import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { StatusBar } from 'expo-status-bar';

export default function PasswordRecoveryRequestScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      HapticFeedback.success();
      Toast.success('Código enviado exitosamente');
      router.push(`/password-recovery/verify?email=${encodeURIComponent(email)}` as any);
    } catch (error) {
      console.error('Send code error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo enviar el código. Intenta nuevamente.');
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
        <Text style={styles.headerTitle}>Recuperar Contraseña</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
          <Image
            source={{ uri: 'https://rork.app/pa/9eb35k949i660ayrsld5b/logo' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          ¿Olvidaste tu contraseña?
        </Animated.Text>
        
        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          Ingresa tu correo electrónico y te enviaremos un código de 6 dígitos para recuperar tu cuenta
        </Animated.Text>

        <View style={styles.form}>
          <FormInput
            label="Correo Electrónico"
            value={email}
            onChangeText={handleEmailChange}
            error={error}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <LoadingButton
            title="Enviar Código"
            onPress={handleSendCode}
            loading={isLoading}
            variant="primary"
          />

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => router.push('/login' as any)}
            disabled={isLoading}
          >
            <Text style={styles.backToLoginText}>
              Volver al inicio de sesión
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
  logoImage: {
    width: 160,
    height: 80,
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
  backToLogin: {
    alignItems: 'center' as const,
    marginTop: 8,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
