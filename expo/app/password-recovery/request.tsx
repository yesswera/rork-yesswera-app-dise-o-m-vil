import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/constants/supabase';

export default function PasswordRecoveryRequestScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const err = Validator.email(email);
    if (err) {
      HapticFeedback.error();
      Toast.error(err);
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email);
      HapticFeedback.success();
      Toast.success('Si el correo existe, recibiras un codigo');
      router.push(`/password-recovery/verify?email=${encodeURIComponent(email)}` as any);
    } catch {
      Toast.error('No se pudo enviar el codigo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Mail size={32} color={DS.colors.orange} />
          </View>

          <Text style={styles.title}>Olvidaste tu contrasena?</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo y te enviaremos un codigo de 6 digitos para recuperar tu cuenta
          </Text>

          {/* Email input */}
          <Text style={styles.label}>Correo electronico</Text>
          <View style={styles.inputRow}>
            <Mail size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={DS.colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <BigButton
            title="Enviar Codigo"
            color={DS.colors.orange}
            onPress={handleSend}
            loading={loading}
          />

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.backLinkText}>Volver al inicio de sesion</Text>
          </TouchableOpacity>
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
    backgroundColor: DS.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: DS.space.xxl,
  },
  title: { ...DS.fonts.title, color: DS.colors.dark, textAlign: 'center', marginBottom: DS.space.md },
  subtitle: { ...DS.fonts.body, color: DS.colors.muted, textAlign: 'center', marginBottom: DS.space.xxxl, lineHeight: 22 },
  label: { ...DS.fonts.label, color: DS.colors.dark, marginBottom: DS.space.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
    paddingHorizontal: DS.space.lg,
    height: DS.touch.min,
    gap: DS.space.sm,
    marginBottom: DS.space.xxl,
  },
  input: { flex: 1, ...DS.fonts.body, color: DS.colors.dark },
  backLink: { alignItems: 'center', marginTop: DS.space.xxl, paddingVertical: DS.space.sm },
  backLinkText: { ...DS.fonts.bodyMed, color: DS.colors.orange },
});
