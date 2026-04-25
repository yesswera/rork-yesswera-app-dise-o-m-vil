import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import { Toast } from '@/utils/toast';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/constants/supabase';

export default function PasswordRecoveryVerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKey = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const codeStr = code.join('');
    if (codeStr.length < 6) {
      Toast.error('Ingresa el codigo completo');
      return;
    }

    setLoading(true);
    try {
      const emailStr = Array.isArray(email) ? email[0] : email || '';
      const { error } = await supabase.auth.verifyOtp({
        email: emailStr,
        token: codeStr,
        type: 'recovery',
      });
      if (error) throw error;
      HapticFeedback.success();
      Toast.success('Codigo verificado');
      router.push('/password-recovery/reset' as any);
    } catch (err: any) {
      HapticFeedback.error();
      const msg = err?.message?.includes('expired')
        ? 'Codigo expirado. Solicita uno nuevo.'
        : 'Codigo incorrecto.';
      Toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const emailStr = Array.isArray(email) ? email[0] : email || '';
      await supabase.auth.resetPasswordForEmail(emailStr);
      Toast.info('Codigo reenviado');
    } catch {
      Toast.error('No se pudo reenviar');
    }
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const isComplete = code.every((d) => d !== '');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={32} color={DS.colors.green} />
          </View>

          <Text style={styles.title}>Verifica tu Codigo</Text>
          <Text style={styles.subtitle}>
            Enviamos un codigo de 6 digitos a {email || 'tu correo'}
          </Text>

          {/* Code inputs */}
          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                ]}
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={({ nativeEvent: { key } }) => handleKey(key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          <BigButton
            title="Verificar Codigo"
            color={DS.colors.green}
            onPress={handleVerify}
            loading={loading}
            disabled={!isComplete}
          />

          <View style={styles.links}>
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.linkText}>Reenviar codigo</Text>
            </TouchableOpacity>
            <Text style={styles.linkSep}>|</Text>
            <TouchableOpacity onPress={() => router.back()} disabled={loading}>
              <Text style={styles.linkText}>Cambiar email</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.xl, paddingTop: 60 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DS.colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: DS.space.xxl,
  },
  title: { ...DS.fonts.title, color: DS.colors.dark, textAlign: 'center', marginBottom: DS.space.md },
  subtitle: { ...DS.fonts.body, color: DS.colors.muted, textAlign: 'center', marginBottom: DS.space.xxxl },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: DS.space.sm,
    marginBottom: DS.space.xxxl,
  },
  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: DS.colors.hairline,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.card,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: DS.colors.dark,
  },
  codeInputFilled: {
    borderColor: DS.colors.green,
    backgroundColor: DS.colors.greenLight,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: DS.space.xxl,
    gap: DS.space.md,
  },
  linkText: { ...DS.fonts.bodyMed, color: DS.colors.green },
  linkSep: { ...DS.fonts.body, color: DS.colors.muted },
});
