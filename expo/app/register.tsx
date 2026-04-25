// ============================================================================
// YESSWERA: REGISTRO — Vecino Amigo DS
// Name, Email, Password, Confirm Password, Role selector, referral (optional)
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  Gift,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import YCard from '@/components/ui/YCard';
import { useAuth } from '@/contexts/auth';
import { validateReferralCode, processReferral } from '@/services/referrals';
import { HapticFeedback } from '@/utils/haptics';
import { Toast } from '@/utils/toast';

// -- Role options -------------------------------------------------------------
const ROLES = [
  {
    id: 'client',
    label: 'Cliente',
    description: 'Pedir comida, compras y envios',
    Icon: ShoppingBag,
  },
  {
    id: 'business',
    label: 'Negocio',
    description: 'Vender tus productos',
    Icon: Store,
  },
  {
    id: 'driver',
    label: 'Repartidor',
    description: 'Hacer entregas y ganar dinero',
    Icon: Truck,
  },
];

// -- Validation ---------------------------------------------------------------
function validate(
  name: string,
  email: string,
  phone: string,
  password: string,
  confirmPwd: string
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!name.trim()) e.name = 'El nombre es requerido';
  else if (name.trim().length < 3) e.name = 'Minimo 3 caracteres';
  if (!email.trim()) e.email = 'El correo es requerido';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo invalido';
  if (!phone.trim()) e.phone = 'El telefono es requerido';
  else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Minimo 10 digitos';
  if (!password) e.password = 'La contrasena es requerida';
  else if (password.length < 6) e.password = 'Minimo 6 caracteres';
  if (password && confirmPwd !== password) e.confirmPwd = 'Las contrasenas no coinciden';
  return e;
}

// -- Screen -------------------------------------------------------------------
export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [userType, setUserType] = useState('client');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Referral
  const [showReferral, setShowReferral] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Pre-fill referral from URL
  useEffect(() => {
    if (params.ref && typeof params.ref === 'string') {
      setReferralCode(params.ref.toUpperCase());
      setShowReferral(true);
      checkReferral(params.ref);
    }
  }, [params.ref]);

  const clearError = (key: string) =>
    setErrors((prev) => ({ ...prev, [key]: '' }));

  // -- Referral validation --
  const checkReferral = async (code: string) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerName('');
      return;
    }
    setValidatingCode(true);
    try {
      const result = await validateReferralCode(code);
      setReferralValid(result.valid);
      setReferrerName(result.referrerName || '');
    } catch {
      setReferralValid(false);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleReferralChange = (value: string) => {
    const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setReferralCode(code);
    if (code.length >= 6) checkReferral(code);
    else {
      setReferralValid(null);
      setReferrerName('');
    }
  };

  // -- Registration --
  const handleRegister = async () => {
    // Redirect driver to dedicated onboarding
    if (userType === 'driver') {
      router.push('/auth/register-driver' as any);
      return;
    }

    const errs = validate(name, email, phone, password, confirmPwd);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      HapticFeedback.error();
      return;
    }

    if (referralCode && referralValid === false) {
      Alert.alert(
        'Codigo de Referido',
        'El codigo no es valido. Deseas continuar sin el?',
        [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Continuar', onPress: () => performRegister() },
        ]
      );
      return;
    }

    performRegister();
  };

  const performRegister = async () => {
    setLoading(true);
    try {
      await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        phone.trim(),
        userType
      );
      HapticFeedback.success();

      // Process referral if valid
      if (referralCode && referralValid) {
        try {
          const refResult = await processReferral(referralCode, 'manual_entry');
          if (refResult.success) {
            Toast.success(
              `Bienvenido! Gracias a ${referrerName || 'tu amigo'}, tienes $15 de credito.`
            );
          }
        } catch (refErr) {
          console.error('Referral error:', refErr);
        }
      }

      navigateAfterRegister();
    } catch (err: any) {
      console.error('Register error:', err);
      HapticFeedback.error();
      let msg = 'No se pudo crear la cuenta. Intenta de nuevo.';
      if (
        err?.message?.includes('already registered') ||
        err?.message?.includes('already exists')
      ) {
        msg = 'Este correo ya esta registrado. Intenta iniciar sesion.';
      }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const navigateAfterRegister = () => {
    if (userType === 'business') {
      router.replace('/business/dashboard' as any);
    } else {
      router.replace('/' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* -- Title -- */}
          <Text style={styles.hero}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Unete a Yesswera</Text>

          {/* -- Role selector -- */}
          <Text style={styles.sectionLabel}>Como usaras Yesswera?</Text>
          <View style={styles.roleRow}>
            {ROLES.map((role) => {
              const selected = userType === role.id;
              return (
                <TouchableOpacity
                  key={role.id}
                  activeOpacity={0.7}
                  onPress={() => setUserType(role.id)}
                  disabled={loading}
                  style={[
                    styles.roleCard,
                    selected && styles.roleCardSelected,
                  ]}
                >
                  <role.Icon
                    size={28}
                    color={selected ? DS.colors.green : DS.colors.muted}
                  />
                  <Text
                    style={[
                      styles.roleLabel,
                      selected && styles.roleLabelSelected,
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text style={styles.roleDesc}>{role.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* -- Name -- */}
          <Text style={styles.label}>Nombre completo</Text>
          <View
            style={[styles.inputWrap, errors.name ? styles.inputError : null]}
          >
            <User size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="Juan Perez"
              placeholderTextColor={DS.colors.placeholder}
              value={name}
              onChangeText={(v) => {
                setName(v);
                clearError('name');
              }}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>
          {errors.name ? (
            <Text style={styles.errText}>{errors.name}</Text>
          ) : null}

          {/* -- Email -- */}
          <Text style={styles.label}>Correo electronico</Text>
          <View
            style={[styles.inputWrap, errors.email ? styles.inputError : null]}
          >
            <Mail size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={DS.colors.placeholder}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearError('email');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>
          {errors.email ? (
            <Text style={styles.errText}>{errors.email}</Text>
          ) : null}

          {/* -- Phone -- */}
          <Text style={styles.label}>Telefono</Text>
          <View
            style={[styles.inputWrap, errors.phone ? styles.inputError : null]}
          >
            <Phone size={20} color={DS.colors.muted} />
            <Text style={styles.phonePrefix}>+52</Text>
            <TextInput
              style={styles.input}
              placeholder="3331234567"
              placeholderTextColor={DS.colors.placeholder}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                clearError('phone');
              }}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>
          {errors.phone ? (
            <Text style={styles.errText}>{errors.phone}</Text>
          ) : null}

          {/* -- Password -- */}
          <Text style={styles.label}>Contrasena</Text>
          <View
            style={[
              styles.inputWrap,
              errors.password ? styles.inputError : null,
            ]}
          >
            <Lock size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="Minimo 6 caracteres"
              placeholderTextColor={DS.colors.placeholder}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearError('password');
              }}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPwd((p) => !p)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {showPwd ? (
                <EyeOff size={20} color={DS.colors.muted} />
              ) : (
                <Eye size={20} color={DS.colors.muted} />
              )}
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errText}>{errors.password}</Text>
          ) : null}

          {/* -- Confirm Password -- */}
          <Text style={styles.label}>Confirmar contrasena</Text>
          <View
            style={[
              styles.inputWrap,
              errors.confirmPwd ? styles.inputError : null,
            ]}
          >
            <Lock size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="Repite tu contrasena"
              placeholderTextColor={DS.colors.placeholder}
              value={confirmPwd}
              onChangeText={(v) => {
                setConfirmPwd(v);
                clearError('confirmPwd');
              }}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
          {errors.confirmPwd ? (
            <Text style={styles.errText}>{errors.confirmPwd}</Text>
          ) : null}

          {/* -- Referral (collapsible) -- */}
          <TouchableOpacity
            style={styles.referralToggle}
            onPress={() => setShowReferral((p) => !p)}
            activeOpacity={0.7}
          >
            <Gift size={18} color={DS.colors.green} />
            <Text style={styles.referralToggleText}>
              Codigo de referido (opcional)
            </Text>
            {showReferral ? (
              <ChevronUp size={18} color={DS.colors.muted} />
            ) : (
              <ChevronDown size={18} color={DS.colors.muted} />
            )}
          </TouchableOpacity>

          {showReferral && (
            <View style={styles.referralBox}>
              <View style={styles.referralInputRow}>
                <View style={[styles.inputWrap, { flex: 1, marginBottom: 0 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: ABC123"
                    placeholderTextColor={DS.colors.placeholder}
                    value={referralCode}
                    onChangeText={handleReferralChange}
                    autoCapitalize="characters"
                    maxLength={8}
                    editable={!loading && !validatingCode}
                  />
                </View>
                {validatingCode && (
                  <Text style={styles.validatingText}>Validando...</Text>
                )}
                {referralValid === true && (
                  <CheckCircle size={22} color={DS.colors.green} />
                )}
                {referralValid === false && referralCode.length >= 6 && (
                  <XCircle size={22} color={DS.colors.red} />
                )}
              </View>
              {referralValid && referrerName ? (
                <View style={styles.referrerInfo}>
                  <Text style={styles.referrerText}>
                    Invitado por{' '}
                    <Text style={styles.referrerName}>{referrerName}</Text>
                  </Text>
                  <Text style={styles.referrerBonus}>
                    Recibiras $15 de credito + entrada al sorteo
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* -- Register button -- */}
          <View style={styles.btnWrap}>
            <BigButton
              label={loading ? 'Creando cuenta...' : 'Registrarme'}
              onPress={handleRegister}
              color={DS.colors.green}
              disabled={loading}
              loading={loading}
              height={DS.touch.button}
            />
          </View>

          {/* -- Login link -- */}
          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Ya tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => router.push('/login' as any)}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Inicia Sesion</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// -- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.card,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: DS.space.xxl,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Title
  hero: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
  },
  subtitle: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    marginTop: DS.space.xs,
    marginBottom: DS.space.xxxl,
  },

  // Section label
  sectionLabel: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    marginBottom: DS.space.md,
  },

  // Role selector
  roleRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    marginBottom: DS.space.xxl,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    paddingHorizontal: DS.space.sm,
    borderRadius: DS.radius.lg,
    borderWidth: 1.5,
    borderColor: DS.colors.hairline,
    backgroundColor: DS.colors.bg,
    gap: DS.space.sm,
  },
  roleCardSelected: {
    borderColor: DS.colors.green,
    backgroundColor: DS.colors.greenLight,
  },
  roleLabel: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  roleLabelSelected: {
    color: DS.colors.green,
  },
  roleDesc: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    textAlign: 'center',
  },

  // Labels + inputs
  label: {
    ...DS.fonts.label,
    color: DS.colors.body,
    marginBottom: DS.space.sm,
    marginTop: DS.space.lg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DS.touch.min,
    backgroundColor: DS.colors.bg,
    borderRadius: DS.radius.md,
    borderWidth: 1.5,
    borderColor: DS.colors.hairline,
    paddingHorizontal: DS.space.lg,
    gap: DS.space.md,
  },
  inputError: {
    borderColor: DS.colors.red,
  },
  input: {
    flex: 1,
    ...DS.fonts.body,
    color: DS.colors.dark,
    paddingVertical: Platform.OS === 'android' ? 10 : 16,
  },
  phonePrefix: {
    ...DS.fonts.bodyMed,
    color: DS.colors.muted,
  },
  errText: {
    ...DS.fonts.small,
    color: DS.colors.red,
    marginTop: DS.space.xs,
    marginLeft: DS.space.xs,
  },

  // Referral
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    marginTop: DS.space.xxl,
    paddingVertical: DS.space.md,
  },
  referralToggleText: {
    ...DS.fonts.label,
    color: DS.colors.green,
    flex: 1,
  },
  referralBox: {
    marginTop: DS.space.sm,
  },
  referralInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  validatingText: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },
  referrerInfo: {
    backgroundColor: DS.colors.greenLight,
    borderRadius: DS.radius.sm,
    padding: DS.space.md,
    marginTop: DS.space.md,
  },
  referrerText: {
    ...DS.fonts.body,
    color: DS.colors.dark,
  },
  referrerName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.green,
  },
  referrerBonus: {
    ...DS.fonts.small,
    color: DS.colors.green,
    marginTop: DS.space.xs,
  },

  // Button
  btnWrap: {
    marginTop: DS.space.xxxl,
  },

  // Login link
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: DS.space.xxl,
  },
  loginPrompt: {
    ...DS.fonts.body,
    color: DS.colors.muted,
  },
  loginLink: {
    ...DS.fonts.bodyMed,
    color: DS.colors.green,
  },
});
