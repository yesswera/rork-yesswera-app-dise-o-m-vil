import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState, useRef, useEffect } from 'react';
import LoadingButton from '@/components/LoadingButton';

export default function PasswordRecoveryVerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    inputRefs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      setError('Por favor ingresa el código completo');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      router.push(`/password-recovery/reset?email=${encodeURIComponent(email || '')}&code=${fullCode}` as any);
    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Código inválido. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    Alert.alert(
      'Código Reenviado',
      `Hemos enviado un nuevo código a ${email}`,
    );
  };

  const handleChangeEmail = () => {
    router.back();
  };

  const isCodeComplete = code.every(digit => digit !== '');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verificar Código</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <ShieldCheck size={64} color={Colors.primary} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Verifica tu Código</Text>
        <Text style={styles.subtitle}>
          Ingresamos un código de 6 dígitos a {email || 'tu correo'}
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={inputRefs[index]}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
                error && styles.codeInputError,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.buttonsContainer}>
          <LoadingButton
            title="Verificar Código"
            onPress={handleVerify}
            loading={isLoading}
            variant="primary"
            disabled={!isCodeComplete}
          />

          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleResendCode}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>Reenviar código</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleChangeEmail}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>Cambiar email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    borderRadius: 12,
    backgroundColor: Colors.white,
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    color: Colors.text.primary,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
  },
  codeInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  buttonsContainer: {
    marginTop: 24,
  },
  linksContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 24,
    marginTop: 24,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
