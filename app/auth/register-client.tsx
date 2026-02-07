// ============================================================================
// YESSWERA: REGISTRO DE CLIENTE
// Usa ScreenContainer para diseño unificado con soporte de tema oscuro
// Campos: Email, Teléfono, Nombre, Contraseña (todos obligatorios)
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, Phone, User, Lock, UserPlus, Gift, CheckCircle, XCircle, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import AccessibilityControls from '@/components/AccessibilityControls';
import { validateReferralCode, processReferral } from '@/services/referrals';

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

export default function RegisterClientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { register } = useAuth();
  const { colors, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

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
    } catch {
      setReferralValid(false);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
  };

  const validateForm = () => {
    const newErrors = { name: '', email: '', phone: '', password: '' };
    let isValid = true;

    if (!name.trim() || name.trim().length < 3) {
      newErrors.name = 'Nombre debe tener al menos 3 caracteres';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.email = 'Ingresa un email valido';
      isValid = false;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      newErrors.phone = 'Telefono debe tener 10 digitos';
      isValid = false;
    }

    if (!password || password.length < 6) {
      newErrors.password = 'Contrasena minimo 6 caracteres';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      await register(name.trim(), email, password, cleanPhone, 'client');

      // Process referral if valid
      if (referralCode && referralValid) {
        try {
          const referralResult = await processReferral(referralCode, 'manual_entry');
          if (referralResult.success) {
            Alert.alert(
              'Bienvenido a Yesswera!',
              `Tu cuenta ha sido creada.\n\nGracias a ${referrerName || 'tu amigo'}, tienes:\n- $15 de credito de bienvenida\n- 1 entrada al sorteo mensual`,
              [{ text: 'Comenzar', onPress: () => router.replace('/') }]
            );
            return;
          }
        } catch (refError) {
          console.error('Error processing referral:', refError);
        }
      }

      Alert.alert(
        'Bienvenido a Yesswera!',
        'Tu cuenta ha sido creada exitosamente',
        [{ text: 'Comenzar', onPress: () => router.replace('/') }]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'No se pudo crear tu cuenta. Intenta nuevamente.';

      if (error?.message?.includes('already registered') || error?.message?.includes('already exists')) {
        errorMessage = 'Este correo ya esta registrado. Intenta iniciar sesion.';
      }

      Alert.alert('Error al Registrar', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReferralCodeChange = (value: string) => {
    const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setReferralCode(code);
    if (code.length >= 6) {
      validateCode(code);
    } else {
      setReferralValid(null);
      setReferrerName('');
    }
  };

  // Header content con boton de regreso y controles de accesibilidad
  const headerContent = (
    <View style={styles.headerControls}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <AccessibilityControls variant="minimal" />
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={UserPlus}
      headerTitle="Crear Cuenta"
      headerSubtitle="Es rapido y facil"
      headerContent={headerContent}
    >
      {/* Icono decorativo */}
      <View style={[styles.iconContainer, { backgroundColor: theme.cardAlt }]}>
        <User size={48} color={colors.primary} />
      </View>

      <ThemedText variant="h3" center style={styles.sectionTitle}>
        Informacion de Cuenta
      </ThemedText>
      <ThemedText variant="body" color="secondary" center style={styles.sectionSubtitle}>
        Todos los campos son obligatorios
      </ThemedText>

      {/* Nombre */}
      <View style={styles.inputGroup}>
        <ThemedText variant="label" bold style={styles.inputLabel}>
          Nombre Completo
        </ThemedText>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: errors.name ? colors.error : theme.border,
        }]}>
          <User size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Juan Perez"
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
            autoCapitalize="words"
            editable={!isLoading}
          />
        </View>
        {errors.name ? <ThemedText variant="caption" color="error">{errors.name}</ThemedText> : null}
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <ThemedText variant="label" bold style={styles.inputLabel}>
          Correo Electronico
        </ThemedText>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: errors.email ? colors.error : theme.border,
        }]}>
          <Mail size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="tu@email.com"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={(v) => { setEmail(v.toLowerCase()); setErrors(p => ({ ...p, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {errors.email ? <ThemedText variant="caption" color="error">{errors.email}</ThemedText> : null}
      </View>

      {/* Telefono */}
      <View style={styles.inputGroup}>
        <ThemedText variant="label" bold style={styles.inputLabel}>
          Telefono
        </ThemedText>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: errors.phone ? colors.error : theme.border,
        }]}>
          <View style={[styles.phonePrefix, { borderRightColor: theme.border }]}>
            <ThemedText variant="label" bold>+52</ThemedText>
          </View>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="33-1234-5678"
            placeholderTextColor={theme.textMuted}
            value={phone}
            onChangeText={(v) => { setPhone(formatPhoneNumber(v)); setErrors(p => ({ ...p, phone: '' })); }}
            keyboardType="phone-pad"
            maxLength={12}
            editable={!isLoading}
          />
        </View>
        {errors.phone ? <ThemedText variant="caption" color="error">{errors.phone}</ThemedText> : null}
      </View>

      {/* Contrasena */}
      <View style={styles.inputGroup}>
        <ThemedText variant="label" bold style={styles.inputLabel}>
          Contrasena
        </ThemedText>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: errors.password ? colors.error : theme.border,
        }]}>
          <Lock size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Minimo 6 caracteres"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {errors.password ? <ThemedText variant="caption" color="error">{errors.password}</ThemedText> : null}
      </View>

      {/* Codigo de referido (opcional) */}
      <View style={[styles.referralSection, {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary + '30',
      }]}>
        <View style={styles.referralHeader}>
          <Gift size={20} color={colors.primary} />
          <ThemedText variant="label" bold style={styles.referralLabel}>
            Codigo de Referido
          </ThemedText>
          <ThemedText variant="caption" color="muted">
            (opcional)
          </ThemedText>
        </View>

        <View style={[styles.inputWrapper, {
          backgroundColor: theme.card,
          borderColor: theme.border,
        }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="ABC123"
            placeholderTextColor={theme.textMuted}
            value={referralCode}
            onChangeText={handleReferralCodeChange}
            autoCapitalize="characters"
            maxLength={8}
            editable={!isLoading && !isValidatingCode}
          />
          {isValidatingCode && <ThemedText variant="caption" color="secondary">Validando...</ThemedText>}
          {referralValid === true && <CheckCircle size={20} color={colors.success} />}
          {referralValid === false && referralCode.length >= 6 && <XCircle size={20} color={colors.error} />}
        </View>

        {referralValid && referrerName && (
          <View style={[styles.referrerInfo, {
            backgroundColor: colors.success + '15',
          }]}>
            <ThemedText variant="label">
              Invitado por <ThemedText variant="label" color="success" bold>{referrerName}</ThemedText>
            </ThemedText>
            <ThemedText variant="caption" color="success">
              Recibiras $15 de credito + entrada al sorteo
            </ThemedText>
          </View>
        )}
      </View>

      {/* Boton Crear Cuenta */}
      <TouchableOpacity
        style={[styles.button, {
          backgroundColor: isLoading ? theme.borderMedium : colors.primary,
        }]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        <ThemedText variant="subtitle" color="white" bold>
          {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </ThemedText>
      </TouchableOpacity>

      {/* Link a login */}
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push('/login' as any)}
        disabled={isLoading}
      >
        <ThemedText variant="body" color="secondary">
          Ya tienes cuenta?{' '}
          <ThemedText variant="body" color="accent" bold>Inicia Sesion</ThemedText>
        </ThemedText>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionSubtitle: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    gap: 12,
  },
  phonePrefix: {
    paddingRight: 12,
    borderRightWidth: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  referralSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralLabel: {
    marginLeft: 8,
    marginRight: 8,
  },
  referrerInfo: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
