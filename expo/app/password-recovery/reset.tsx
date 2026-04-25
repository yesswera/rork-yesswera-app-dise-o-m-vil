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
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/constants/supabase';

export default function PasswordRecoveryResetScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const lengthOk = password.length >= 6;
  const matchOk = password === confirm && password.length > 0;

  const handleReset = async () => {
    const passErr = Validator.password(password);
    const confErr = Validator.confirmPassword(password, confirm);
    if (passErr || confErr) {
      Toast.error(passErr || confErr);
      HapticFeedback.error();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      HapticFeedback.success();
      Toast.success('Contrasena actualizada');
      router.replace('/login' as any);
    } catch (err: any) {
      HapticFeedback.error();
      const msg = err?.message?.includes('session')
        ? 'Sesion expirada. Solicita un nuevo codigo.'
        : 'No se pudo cambiar la contrasena.';
      Toast.error(msg);
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
          <View style={styles.iconCircle}>
            <CheckCircle size={32} color={DS.colors.green} />
          </View>

          <Text style={styles.title}>Nueva Contrasena</Text>
          <Text style={styles.subtitle}>
            Crea una contrasena segura para tu cuenta
          </Text>

          {/* Password */}
          <Text style={styles.label}>Nueva contrasena</Text>
          <View style={styles.inputRow}>
            <Lock size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor={DS.colors.placeholder}
              secureTextEntry={!showPass}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {showPass ? <EyeOff size={20} color={DS.colors.muted} /> : <Eye size={20} color={DS.colors.muted} />}
            </TouchableOpacity>
          </View>

          {/* Confirm */}
          <Text style={styles.label}>Confirmar contrasena</Text>
          <View style={styles.inputRow}>
            <Lock size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="********"
              placeholderTextColor={DS.colors.placeholder}
              secureTextEntry={!showConfirm}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {showConfirm ? <EyeOff size={20} color={DS.colors.muted} /> : <Eye size={20} color={DS.colors.muted} />}
            </TouchableOpacity>
          </View>

          {/* Requirements */}
          <View style={styles.reqBox}>
            <Text style={styles.reqTitle}>La contrasena debe tener:</Text>
            <View style={styles.reqRow}>
              <View style={[styles.reqDot, lengthOk && styles.reqDotOk]} />
              <Text style={[styles.reqText, lengthOk && styles.reqTextOk]}>Minimo 6 caracteres</Text>
            </View>
            <View style={styles.reqRow}>
              <View style={[styles.reqDot, matchOk && styles.reqDotOk]} />
              <Text style={[styles.reqText, matchOk && styles.reqTextOk]}>Las contrasenas coinciden</Text>
            </View>
          </View>

          <BigButton
            title="Cambiar Contrasena"
            color={DS.colors.green}
            onPress={handleReset}
            loading={loading}
          />
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
    marginBottom: DS.space.lg,
  },
  input: { flex: 1, ...DS.fonts.body, color: DS.colors.dark },
  reqBox: {
    backgroundColor: DS.colors.divider,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    marginBottom: DS.space.xxl,
  },
  reqTitle: { ...DS.fonts.label, color: DS.colors.dark, marginBottom: DS.space.md },
  reqRow: { flexDirection: 'row', alignItems: 'center', marginBottom: DS.space.sm },
  reqDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DS.colors.hairline, marginRight: DS.space.sm },
  reqDotOk: { backgroundColor: DS.colors.green },
  reqText: { ...DS.fonts.body, color: DS.colors.muted },
  reqTextOk: { color: DS.colors.green, fontWeight: '500' },
});
