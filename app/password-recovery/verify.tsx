import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { HapticFeedback } from '@/utils/haptics';
import { StatusBar } from 'expo-status-bar';

export default function PasswordRecoveryVerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    inputRefs.current[0]?.focus();
  }, [fadeAnim]);

  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const codeString = code.join('');
    
    if (codeString.length < 6) {
      HapticFeedback.error();
      Toast.error('Ingresa el código completo');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      HapticFeedback.success();
      Toast.success('Código verificado correctamente');
      router.push(`/password-recovery/reset?code=${codeString}` as any);
    } catch (error) {
      console.error('Verify code error:', error);
      HapticFeedback.error();
      Toast.error('Código incorrecto. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    HapticFeedback.light();
    Toast.info('Código reenviado a tu correo');
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const isCodeComplete = code.every(digit => digit !== '');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Verifica tu Código</Text>
          
          <Text style={styles.subtitle}>
            Enviamos un código de 6 dígitos a {email || 'tu correo'}
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  digit && styles.codeInputFilled,
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!isLoading}
              />
            ))}
          </View>

          <LoadingButton
            title="Verificar Código"
            onPress={handleVerifyCode}
            loading={isLoading}
            variant="primary"
            disabled={!isCodeComplete}
          />

          <View style={styles.linksContainer}>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={isLoading}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Reenviar código</Text>
            </TouchableOpacity>

            <Text style={styles.linkSeparator}>•</Text>

            <TouchableOpacity
              onPress={() => router.back()}
              disabled={isLoading}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Cambiar email</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 22,
  },
  codeContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 32,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 12,
    textAlign: 'center' as const,
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  linksContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 24,
    gap: 12,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  linkSeparator: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
