// ============================================================================
// YESSWERA: LOGIN — Vecino Amigo DS
// Clean white screen, logo, email/password, green button, register link
// ============================================================================

import { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const handleLogin = async () => {
    const emailError = Validator.email(email);
    const passwordError = Validator.required(password) || '';

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      HapticFeedback.error();
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email.trim().toLowerCase(), password);
      HapticFeedback.success();
      Toast.success('Bienvenido de nuevo');

      if (userData?.userType === 'driver') {
        try {
          const { data: driver } = await supabase
            .from('drivers')
            .select('registration_status')
            .eq('user_id', userData.id)
            .maybeSingle();

          if (driver?.registration_status === 'waitlisted') {
            router.replace('/driver/waiting' as any);
          } else if (
            driver?.registration_status === 'pending_documents' ||
            driver?.registration_status === 'documents_submitted'
          ) {
            router.replace('/driver/documents' as any);
          } else if (driver?.registration_status === 'rejected') {
            router.replace('/driver/waiting' as any);
          } else {
            router.replace('/driver/dashboard' as any);
          }
        } catch {
          router.replace('/driver/dashboard' as any);
        }
      } else if (userData?.userType === 'business') {
        router.replace('/business/dashboard' as any);
      } else if (userData?.userType === 'admin') {
        router.replace('/admin/dashboard' as any);
      } else {
        router.replace('/' as any);
      }
    } catch (err) {
      console.error('Login error:', err);
      HapticFeedback.error();
      Toast.error('Credenciales incorrectas. Intenta nuevamente.');
    } finally {
      setLoading(false);
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
          {/* -- Brand -- */}
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.appName}>Yesswera</Text>
            <Text style={styles.tagline}>Lo que quieras, cuando quieras</Text>
          </View>

          {/* -- Email -- */}
          <View style={styles.fieldGroup}>
            <View
              style={[
                styles.inputWrap,
                errors.email ? styles.inputError : null,
              ]}
            >
              <Mail size={20} color={DS.colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Correo electronico"
                placeholderTextColor={DS.colors.placeholder}
                value={email}
                onChangeText={(v) => {
                  setEmail(v.toLowerCase());
                  setErrors((p) => ({ ...p, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* -- Password -- */}
          <View style={styles.fieldGroup}>
            <View
              style={[
                styles.inputWrap,
                errors.password ? styles.inputError : null,
              ]}
            >
              <Lock size={20} color={DS.colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Contrasena"
                placeholderTextColor={DS.colors.placeholder}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setErrors((p) => ({ ...p, password: '' }));
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
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* -- Forgot password -- */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/password-recovery/request' as any)}
            disabled={loading}
          >
            <Text style={styles.forgotText}>Olvidaste tu contrasena?</Text>
          </TouchableOpacity>

          {/* -- Login button -- */}
          <BigButton
            label="Iniciar Sesion"
            onPress={handleLogin}
            color={DS.colors.orange}
            disabled={loading}
            loading={loading}
            height={DS.touch.button}
          />

          {/* -- Register link -- */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>No tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => router.push('/register' as any)}
              disabled={loading}
            >
              <Text style={styles.registerLink}>Registrate</Text>
            </TouchableOpacity>
          </View>

          {/* -- Footer -- */}
          <View style={styles.footerWrap}>
            <Text style={styles.footer}>Hecho en Tomatlan, Jalisco</Text>
            <Text style={styles.footerTrust}>18 negocios locales · Repartidores verificados</Text>
          </View>
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
    justifyContent: 'center',
    paddingHorizontal: DS.space.xxl,
    paddingVertical: 40,
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: DS.radius.xl,
    marginBottom: DS.space.lg,
  },
  appName: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
    letterSpacing: 0.5,
  },
  tagline: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    marginTop: DS.space.xs,
  },

  // Fields
  fieldGroup: {
    marginBottom: DS.space.lg,
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
  errorText: {
    ...DS.fonts.small,
    color: DS.colors.red,
    marginTop: DS.space.xs,
    marginLeft: DS.space.xs,
  },

  // Forgot
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: DS.space.xxl,
    marginTop: -DS.space.sm,
  },
  forgotText: {
    ...DS.fonts.label,
    color: DS.colors.green,
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: DS.space.xxxl,
  },
  registerPrompt: {
    ...DS.fonts.body,
    color: DS.colors.muted,
  },
  registerLink: {
    ...DS.fonts.bodyMed,
    color: DS.colors.green,
  },

  // Footer
  footerWrap: {
    alignItems: 'center',
    marginTop: DS.space.xxl,
    gap: DS.space.xs,
  },
  footer: {
    ...DS.fonts.small,
    color: DS.colors.placeholder,
    textAlign: 'center',
  },
  footerTrust: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
    textAlign: 'center',
  },
});
