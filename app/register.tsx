import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [userType, setUserType] = useState<string>('client');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const validateName = (value: string) => {
    if (!value) return 'El nombre es requerido';
    if (value.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'El email es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Email inválido';
    }
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'La contraseña es requerida';
    if (value.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value) return 'El teléfono es requerido';
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(value)) {
      return 'Formato de teléfono inválido';
    }
    if (value.replace(/\D/g, '').length < 10) {
      return 'El teléfono debe tener al menos 10 dígitos';
    }
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: '' }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleRegister = async () => {
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const phoneError = validatePhone(phone);

    if (nameError || emailError || passwordError || phoneError) {
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        phone: phoneError,
      });
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password, phone, userType);

      // Redirigir según el tipo de usuario registrado
      if (userType === 'driver') {
        router.replace('/driver/dashboard' as any);
      } else if (userType === 'business') {
        router.replace('/business/dashboard' as any);
      } else {
        // Cliente
        router.replace('/' as any);
      }
    } catch (error: unknown) {
      console.error('Register error:', error);
      Alert.alert('Error', 'No se pudo crear la cuenta. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const userTypes = [
    { id: 'client', label: 'Cliente', description: 'Pedir servicios' },
    { id: 'driver', label: 'Repartidor', description: 'Hacer entregas' },
    { id: 'business', label: 'Negocio', description: 'Vender productos' },
  ];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Image
            source={{ uri: 'https://rork.app/pa/9eb35k949i660ayrsld5b/logo' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Crear Cuenta</Text>
        <Text style={styles.subtitle}>Únete a Yesswera hoy</Text>

        <View style={styles.form}>
          <FormInput
            label="Nombre Completo"
            value={name}
            onChangeText={handleNameChange}
            error={errors.name}
            placeholder="Juan Pérez"
            autoCapitalize="words"
            editable={!isLoading}
          />

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
            label="Teléfono"
            value={phone}
            onChangeText={handlePhoneChange}
            error={errors.phone}
            placeholder="+52 333 123 4567"
            keyboardType="phone-pad"
            editable={!isLoading}
          />

          <FormInput
            label="Contraseña"
            value={password}
            onChangeText={handlePasswordChange}
            error={errors.password}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tipo de Usuario</Text>
            <View style={styles.userTypeContainer}>
              {userTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.userTypeCard,
                    userType === type.id && styles.userTypeCardActive,
                  ]}
                  onPress={() => setUserType(type.id)}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.userTypeLabel,
                    userType === type.id && styles.userTypeLabelActive,
                  ]}>
                    {type.label}
                  </Text>
                  <Text style={[
                    styles.userTypeDescription,
                    userType === type.id && styles.userTypeDescriptionActive,
                  ]}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <LoadingButton
            title="Crear Cuenta"
            onPress={handleRegister}
            loading={isLoading}
            variant="primary"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => router.push('/login' as any)}
            disabled={isLoading}
          >
            <Text style={styles.loginPromptText}>
              ¿Ya tienes cuenta? <Text style={styles.loginPromptLink}>Inicia Sesión</Text>
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
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center' as const,
    marginBottom: 20,
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
    marginBottom: 28,
  },
  form: {
    width: '100%' as const,
    gap: 16,
  },
  inputContainer: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  userTypeContainer: {
    gap: 10,
  },
  userTypeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  userTypeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  userTypeLabelActive: {
    color: Colors.primary,
  },
  userTypeDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  userTypeDescriptionActive: {
    color: Colors.primaryDark,
  },

  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: 20,
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
  loginPrompt: {
    alignItems: 'center' as const,
  },
  loginPromptText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  loginPromptLink: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
