import TouchableSound from '@/components/TouchableSound';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { AuthSounds, SoundFeedback } from '@/services/sounds';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, space, radius, fonts, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const bg = isDark ? '#1C1917' : '#FAFAF9';
  const cardBg = isDark ? '#292524' : '#FFFFFF';
  const borderColor = isDark ? '#44403C' : '#E7E5E4';
  const textPrimary = isDark ? '#FAFAFA' : '#1C1917';
  const textSecondary = isDark ? '#D6D3D1' : '#57534E';
  const textMuted = isDark ? '#78716C' : '#A8A29E';

  const validateEmail = (value: string) => Validator.email(value);
  const validatePassword = (value: string) => Validator.required(value) || '';

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      HapticFeedback.error();
      SoundFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      const userData = await login(email, password);
      HapticFeedback.success();
      AuthSounds.login();
      Toast.success('Bienvenido de nuevo');

      if (userData?.userType === 'driver') {
        router.replace('/driver/dashboard' as any);
      } else if (userData?.userType === 'business') {
        router.replace('/business/dashboard' as any);
      } else if (userData?.userType === 'admin') {
        router.replace('/admin/dashboard' as any);
      } else {
        router.replace('/' as any);
      }
    } catch (error) {
      console.error('Login error:', error);
      HapticFeedback.error();
      SoundFeedback.error();
      Toast.error('Credenciales incorrectas. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInputBorder = (field: string, error: string) => {
    if (error) return '#EF4444';
    if (focusedField === field) return '#16A34A';
    return borderColor;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoBox, {
            backgroundColor: '#16A34A',
            shadowColor: '#16A34A',
          }]}>
            <Text style={styles.logoLetter}>Y</Text>
          </View>
          <Text style={[styles.appName, { color: textPrimary, fontSize: fonts['3xl'] }]}>
            Yesswera
          </Text>
          <Text style={[styles.tagline, { color: textMuted, fontSize: fonts.base }]}>
            Lo que quieras, cuando quieras
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textSecondary, fontSize: fonts.sm }]}>
              Correo Electronico
            </Text>
            <View style={[styles.inputWrap, {
              backgroundColor: cardBg,
              borderColor: getInputBorder('email', errors.email),
              shadowColor: focusedField === 'email' ? '#16A34A' : 'transparent',
              shadowOpacity: focusedField === 'email' ? 0.1 : 0,
            }]}>
              <Mail size={18} color={focusedField === 'email' ? '#16A34A' : textMuted} />
              <TextInput
                style={[styles.input, { color: textPrimary, fontSize: fonts.base }]}
                placeholder="tu@email.com"
                placeholderTextColor={textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v.toLowerCase()); setErrors(p => ({ ...p, email: '' })); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textSecondary, fontSize: fonts.sm }]}>
              Contrasena
            </Text>
            <View style={[styles.inputWrap, {
              backgroundColor: cardBg,
              borderColor: getInputBorder('password', errors.password),
              shadowColor: focusedField === 'password' ? '#16A34A' : 'transparent',
              shadowOpacity: focusedField === 'password' ? 0.1 : 0,
            }]}>
              <Lock size={18} color={focusedField === 'password' ? '#16A34A' : textMuted} />
              <TextInput
                style={[styles.input, { color: textPrimary, fontSize: fonts.base }]}
                placeholder="Tu contrasena"
                placeholderTextColor={textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Forgot password */}
          <TouchableSound
            style={styles.forgotLink}
            onPress={() => router.push('/password-recovery/request' as any)}
            disabled={isLoading}
          >
            <Text style={[styles.forgotText, { color: '#16A34A', fontSize: fonts.sm }]}>
              Olvidaste tu contrasena?
            </Text>
          </TouchableSound>

          {/* Login button */}
          <TouchableSound
            style={[styles.loginBtn, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              style={styles.loginGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginBtnText}>
                {isLoading ? 'Iniciando...' : 'Iniciar Sesion'}
              </Text>
            </LinearGradient>
          </TouchableSound>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <Text style={[styles.dividerText, { color: textMuted, fontSize: fonts.sm }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

          {/* Register link */}
          <TouchableSound
            style={[styles.registerBtn, { borderColor: borderColor, backgroundColor: cardBg }]}
            onPress={() => router.push('/register' as any)}
            disabled={isLoading}
          >
            <Text style={[styles.registerText, { color: textPrimary, fontSize: fonts.base }]}>
              Crear una cuenta
            </Text>
          </TouchableSound>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: textMuted, fontSize: fonts.xs }]}>
          Tomatlan, Jalisco
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appName: {
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tagline: {
    fontWeight: '400',
  },

  // Form
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 0,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    fontWeight: '500',
  },

  // Login button
  loginBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  loginGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },

  // Register
  registerBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontWeight: '600',
  },

  // Footer
  footer: {
    textAlign: 'center',
    marginTop: 32,
  },
});
