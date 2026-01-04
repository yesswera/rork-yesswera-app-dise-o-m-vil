import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import LoadingButton from '@/components/LoadingButton';

export default function PasswordRecoveryVerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text[0];
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa el código completo');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: '/password-recovery/reset' as any,
        params: { email, code: fullCode },
      });
    }, 1500);
  };

  const handleResend = () => {
    Alert.alert(
      'Código Reenviado',
      `Se ha enviado un nuevo código a ${email}`,
      [{ text: 'OK' }]
    );
  };

  const handleChangeEmail = () => {
    router.back();
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const isCodeComplete = code.every((digit) => digit !== '');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Verifica tu Código</Text>
        <Text style={styles.subtitle}>
          Ingresamos un código de 6 dígitos a{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.buttonsSection}>
          <LoadingButton
            title="Verificar Código"
            onPress={handleVerify}
            loading={loading}
            variant="primary"
            disabled={!isCodeComplete}
          />

          <View style={styles.linksContainer}>
            <TouchableOpacity
              onPress={handleResend}
              disabled={loading}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Reenviar código</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleChangeEmail}
              disabled={loading}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Cambiar email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 40,
  },
  email: {
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  codeContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 12,
    marginBottom: 40,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    color: Colors.text.primary,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
  },
  buttonsSection: {
    gap: 20,
  },
  linksContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 24,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
