import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';

export default function PasswordRecoveryRequestScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Código Enviado',
        `Hemos enviado un código de verificación a ${email}`,
        [
          {
            text: 'OK',
            onPress: () => router.push(`/password-recovery/verify?email=${encodeURIComponent(email)}` as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error sending code:', error);
      Alert.alert('Error', 'No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Recuperar Contraseña</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Mail size={64} color={Colors.primary} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Recuperar Contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo electrónico y te enviaremos un código de 6 dígitos para restablecer tu contraseña
        </Text>

        <View style={styles.formContainer}>
          <FormInput
            label="Correo Electrónico"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError('');
            }}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />

          <LoadingButton
            title="Enviar Código"
            onPress={handleSendCode}
            loading={isLoading}
            variant="primary"
          />

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.push('/login' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.backToLoginText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
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
  backToLoginButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
