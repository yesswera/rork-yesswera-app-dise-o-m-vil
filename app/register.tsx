// ============================================================================
// YESSWERA: PANTALLA DE REGISTRO
// Diseño unificado con ScreenContainer - Todo scrollea junto
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Gift, CheckCircle, XCircle, UserPlus } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText, ThemedInput } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import AccessibilityControls from '@/components/AccessibilityControls';
import { validateReferralCode, processReferral } from '@/services/referrals';
import { AuthSounds, SoundFeedback } from '@/services/sounds';

// Colores explícitos para garantizar consistencia
const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    borderMedium: '#D6D3D1',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    borderMedium: '#57534E',
  },
};

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { register } = useAuth();
  const { colors, space, radius, isDark } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('client');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    referralCode: '',
  });

  const theme = isDark ? COLORS.dark : COLORS.light;

  // Check for referral code in URL params
  useEffect(() => {
    if (params.ref && typeof params.ref === 'string') {
      setReferralCode(params.ref.toUpperCase());
      validateCode(params.ref);
    }
  }, [params.ref]);

  const validateCode = async (code: string) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerName('');
      return;
    }

    setIsValidatingCode(true);
    try {
      const result = await validateReferralCode(code);
      setReferralValid(result.valid);
      setReferrerName(result.referrerName || '');
      if (!result.valid) {
        setErrors(prev => ({ ...prev, referralCode: result.error || 'Código inválido' }));
      } else {
        setErrors(prev => ({ ...prev, referralCode: '' }));
      }
    } catch {
      setReferralValid(false);
      setErrors(prev => ({ ...prev, referralCode: 'Error al validar código' }));
    } finally {
      setIsValidatingCode(false);
    }
  };

  const validateName = (value: string) => {
    if (!value) return 'El nombre es requerido';
    if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'El email es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Email inválido';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'La contraseña es requerida';
    if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value) return 'El teléfono es requerido';
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(value)) return 'Formato de teléfono inválido';
    if (value.replace(/\D/g, '').length < 10) return 'El teléfono debe tener al menos 10 dígitos';
    return '';
  };

  const handleReferralCodeChange = (value: string) => {
    const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setReferralCode(code);
    setErrors(prev => ({ ...prev, referralCode: '' }));

    if (code.length >= 6) {
      validateCode(code);
    } else {
      setReferralValid(null);
      setReferrerName('');
    }
  };

  const handleRegister = async () => {
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const phoneError = validatePhone(phone);

    if (nameError || emailError || passwordError || phoneError) {
      setErrors({
        ...errors,
        name: nameError,
        email: emailError,
        password: passwordError,
        phone: phoneError,
      });
      return;
    }

    if (referralCode && referralValid === false) {
      Alert.alert(
        'Código de Referido',
        'El código de referido no es válido. ¿Deseas continuar sin él?',
        [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Continuar', onPress: () => performRegistration() },
        ]
      );
      return;
    }

    performRegistration();
  };

  const performRegistration = async () => {
    setIsLoading(true);
    try {
      await register(name, email, password, phone, userType);
      AuthSounds.login(); // Sonido de bienvenida

      if (referralCode && referralValid) {
        try {
          const referralResult = await processReferral(referralCode, 'manual_entry');
          if (referralResult.success) {
            SoundFeedback.success(); // Bonus por referido
            Alert.alert(
              '¡Bienvenido a Yesswera!',
              `Tu cuenta ha sido creada.\n\nGracias a ${referrerName || 'tu amigo'}, tienes:\n• $15 de crédito de bienvenida\n• 1 entrada al sorteo mensual`,
              [{ text: 'Genial', onPress: () => navigateAfterRegister() }]
            );
            return;
          }
        } catch (refError) {
          console.error('Error processing referral:', refError);
        }
      }

      navigateAfterRegister();
    } catch (error: any) {
      console.error('Register error:', error);
      SoundFeedback.error();
      let errorMessage = 'No se pudo crear la cuenta. Intenta nuevamente.';

      if (error?.message?.includes('already registered') || error?.message?.includes('already exists')) {
        errorMessage = 'Este correo ya está registrado. Intenta iniciar sesión.';
      } else if (error?.message?.includes('invalid email')) {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (error?.message?.includes('password')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      }

      Alert.alert('Error al registrar', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateAfterRegister = () => {
    if (userType === 'driver') {
      router.replace('/driver/dashboard' as any);
    } else if (userType === 'business') {
      router.replace('/business/dashboard' as any);
    } else {
      router.replace('/' as any);
    }
  };

  const userTypes = [
    { id: 'client', label: 'Cliente', description: 'Pedir servicios' },
    { id: 'driver', label: 'Repartidor', description: 'Hacer entregas' },
    { id: 'business', label: 'Negocio', description: 'Vender productos' },
  ];

  // Contenido del header
  const headerContent = (
    <View style={styles.accessibilityRow}>
      <AccessibilityControls variant="compact" />
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={UserPlus}
      headerTitle="Crear Cuenta"
      headerSubtitle="Únete a Yesswera hoy"
      headerContent={headerContent}
    >
      {/* Nota de campos obligatorios */}
      <ThemedText variant="caption" color="muted" center style={{ marginBottom: space.lg, marginTop: -8 }}>
        * Campos obligatorios
      </ThemedText>

      {/* Tipo de usuario */}
      <View style={{ marginBottom: space.lg }}>
        <ThemedText variant="label" bold style={{ marginBottom: space.sm }}>
          ¿Cómo usarás Yesswera? *
        </ThemedText>
        <View style={{ gap: space.sm }}>
          {userTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.userTypeCard,
                {
                  padding: space.md,
                  borderRadius: radius.md,
                  borderColor: userType === type.id ? colors.primary : theme.border,
                  backgroundColor: userType === type.id
                    ? (isDark ? colors.primary + '20' : colors.primary + '10')
                    : theme.card,
                  borderWidth: userType === type.id ? 2 : 1.5,
                },
              ]}
              onPress={() => setUserType(type.id)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.userTypeContent}>
                <View style={[
                  styles.userTypeRadio,
                  {
                    borderColor: userType === type.id ? colors.primary : theme.borderMedium,
                    backgroundColor: userType === type.id ? colors.primary : 'transparent',
                  }
                ]}>
                  {userType === type.id && (
                    <View style={[styles.userTypeRadioInner, { backgroundColor: '#FFFFFF' }]} />
                  )}
                </View>
                <View style={styles.userTypeText}>
                  <ThemedText
                    variant="subtitle"
                    color={userType === type.id ? 'accent' : 'primary'}
                    bold
                  >
                    {type.label}
                  </ThemedText>
                  <ThemedText
                    variant="caption"
                    color={userType === type.id ? 'accent' : 'secondary'}
                  >
                    {type.description}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Campos del formulario */}
      <ThemedInput
        label="Nombre Completo *"
        value={name}
        onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
        error={errors.name}
        placeholder="Juan Pérez"
        autoCapitalize="words"
        editable={!isLoading}
      />

      <View style={{ height: space.md }} />

      <ThemedInput
        label="Correo Electrónico *"
        value={email}
        onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
        error={errors.email}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
      />

      <View style={{ height: space.md }} />

      <ThemedInput
        label="Teléfono *"
        value={phone}
        onChangeText={(v) => { setPhone(v); setErrors(p => ({ ...p, phone: '' })); }}
        error={errors.phone}
        placeholder="3331234567"
        keyboardType="phone-pad"
        editable={!isLoading}
      />

      <View style={{ height: space.md }} />

      <ThemedInput
        label="Contraseña *"
        value={password}
        onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
        error={errors.password}
        placeholder="Mínimo 6 caracteres"
        isPassword
        autoCapitalize="none"
        editable={!isLoading}
      />

      <View style={{ height: space.lg }} />

      {/* Código de referido */}
      <View style={[styles.referralSection, {
        backgroundColor: colors.primary + '08',
        borderColor: colors.primary + '20',
        borderRadius: radius.md,
        padding: space.md,
      }]}>
        <View style={[styles.referralHeader, { gap: space.sm, marginBottom: space.sm }]}>
          <Gift size={18} color={colors.primary} />
          <ThemedText variant="label" bold>Código de Referido</ThemedText>
          <ThemedText variant="caption" color="muted">(opcional)</ThemedText>
        </View>

        <View style={styles.referralInputRow}>
          <View style={styles.flex}>
            <ThemedInput
              value={referralCode}
              onChangeText={handleReferralCodeChange}
              error={errors.referralCode}
              placeholder="Ej: ABC123"
              autoCapitalize="characters"
              maxLength={8}
              editable={!isLoading && !isValidatingCode}
            />
          </View>
          {isValidatingCode && (
            <ThemedText variant="caption" color="secondary" style={styles.validatingText}>
              Validando...
            </ThemedText>
          )}
          {referralValid === true && <CheckCircle size={20} color={colors.success} />}
          {referralValid === false && referralCode.length >= 6 && (
            <XCircle size={20} color={colors.error} />
          )}
        </View>

        {referralValid && referrerName && (
          <View style={[styles.referrerInfo, {
            backgroundColor: colors.success + '15',
            borderRadius: radius.sm,
            padding: space.sm,
            marginTop: space.sm,
          }]}>
            <ThemedText variant="label">
              Invitado por <ThemedText variant="label" color="success" bold>{referrerName}</ThemedText>
            </ThemedText>
            <ThemedText variant="caption" color="success">
              Recibirás $15 de crédito + entrada al sorteo
            </ThemedText>
          </View>
        )}
      </View>

      <View style={{ height: space.xl }} />

      {/* Botón Crear Cuenta */}
      <TouchableOpacity
        style={[styles.button, {
          backgroundColor: isLoading ? theme.border : colors.primary,
          borderRadius: radius.md,
        }]}
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <ThemedText variant="subtitle" color="white" bold>
          {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </ThemedText>
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { marginVertical: space.lg }]}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <ThemedText variant="caption" color="secondary" style={{ marginHorizontal: space.md }}>
          o
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Login */}
      <TouchableOpacity
        style={styles.loginPrompt}
        onPress={() => router.push('/login' as any)}
        disabled={isLoading}
      >
        <ThemedText variant="body" color="secondary">
          ¿Ya tienes cuenta?{' '}
          <ThemedText variant="body" color="accent" bold>
            Inicia Sesión
          </ThemedText>
        </ThemedText>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  accessibilityRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  userTypeCard: {
    borderWidth: 1.5,
  },
  userTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTypeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTypeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  userTypeText: {
    flex: 1,
  },
  referralSection: {
    borderWidth: 1,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validatingText: {
    position: 'absolute',
    right: 40,
  },
  referrerInfo: {},
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  loginPrompt: {
    alignItems: 'center',
  },
});
