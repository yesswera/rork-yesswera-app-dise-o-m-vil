import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Phone, User, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

export default function RegisterClientScreen() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [step, setStep] = useState<'phone' | 'verification' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneSubmit = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono válido (10 dígitos)');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        '📱 Código Enviado',
        `Se ha enviado un código de verificación al ${phone}`,
        [{ text: 'OK', onPress: () => setStep('verification') }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el código. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (verificationCode.length !== 4) {
      Alert.alert('Error', 'El código debe tener 4 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Integrar servicio SMS real (Twilio) para producción
      // En modo demo, cualquier código de 4 dígitos es válido
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep('name');
    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar el código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    if (name.trim().length < 3) {
      Alert.alert('Error', 'Por favor ingresa tu nombre completo');
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const email = `${cleanPhone}@yesswera.temp`;
      const password = `temp_${cleanPhone}`;

      await register(name.trim(), email, password, cleanPhone, 'client');

      Alert.alert(
        '¡Bienvenido a Yesswera! 🎉',
        'Tu cuenta ha sido creada exitosamente',
        [
          {
            text: 'Comenzar',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Error al Registrar',
        error.message || 'No se pudo crear tu cuenta. Por favor intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    Alert.alert(
      'Código Reenviado',
      `Se ha enviado un nuevo código al ${phone}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (step === 'phone') {
            router.back();
          } else if (step === 'verification') {
            setStep('phone');
          } else {
            setStep('verification');
          }
        }}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Crear Cuenta</Text>
        <Text style={styles.headerSubtitle}>Es rápido y fácil</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {step === 'phone' && (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Phone size={48} color={Colors.primary} />
            </View>

            <Text style={styles.stepTitle}>¿Cuál es tu número?</Text>
            <Text style={styles.stepDescription}>
              Te enviaremos un código de verificación por SMS
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>🇲🇽 +52</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="33-1234-5678"
                placeholderTextColor={Colors.text.light}
                keyboardType="phone-pad"
                maxLength={12}
                value={phone}
                onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handlePhoneSubmit}
              disabled={isLoading || phone.replace(/\D/g, '').length !== 10}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Enviando...' : 'Enviar Código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/login' as any)}
            >
              <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia Sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'verification' && (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <CheckCircle size={48} color={Colors.success} />
            </View>

            <Text style={styles.stepTitle}>Ingresa el código</Text>
            <Text style={styles.stepDescription}>
              Enviamos un código de 4 dígitos al {phone}
            </Text>

            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="1234"
                placeholderTextColor={Colors.text.light}
                keyboardType="number-pad"
                maxLength={4}
                value={verificationCode}
                onChangeText={setVerificationCode}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerificationSubmit}
              disabled={isLoading || verificationCode.length !== 4}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Verificando...' : 'Verificar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleResendCode}
            >
              <Text style={styles.linkText}>No recibí el código • Reenviar</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'name' && (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <User size={48} color={Colors.accent} />
            </View>

            <Text style={styles.stepTitle}>¿Cómo te llamas?</Text>
            <Text style={styles.stepDescription}>
              Solo necesitamos tu nombre para personalizar tu experiencia
            </Text>

            <View style={styles.inputWrapper}>
              <User size={20} color={Colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.nameInput}
                placeholder="Juan Pérez"
                placeholderTextColor={Colors.text.light}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleNameSubmit}
              disabled={isLoading || name.trim().length < 3}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
  },
  phonePrefix: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRightWidth: 0,
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  phoneInput: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    backgroundColor: Colors.white,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  codeInput: {
    height: 72,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 12,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  hintText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  hintCode: {
    fontWeight: '700',
    color: Colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.text.light,
    shadowOpacity: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
