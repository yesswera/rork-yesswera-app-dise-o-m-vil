import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { formatVerificationCode, validateCodeFormat } from '@/utils/verification';

interface VerificationCodeInputProps {
  type: 'pickup' | 'delivery';
  onValidate: (code: string) => Promise<{ success: boolean; message: string }>;
  disabled?: boolean;
}

export default function VerificationCodeInput({
  type,
  onValidate,
  disabled = false,
}: VerificationCodeInputProps) {
  const [code, setCode] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleCodeChange = (text: string) => {
    const formatted = formatVerificationCode(text);
    setCode(formatted);
    setError('');
  };

  const handleValidate = async () => {
    if (!validateCodeFormat(code)) {
      setError('El código debe tener 5 caracteres');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const result = await onValidate(code);
      
      if (!result.success) {
        setError(result.message);
      }
    } catch {
      setError('Error al validar código');
    } finally {
      setIsValidating(false);
    }
  };

  const isValid = validateCodeFormat(code);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {type === 'pickup' ? 'Código de Recolección' : 'Código de Entrega'}
      </Text>
      
      <Text style={styles.subtitle}>
        {type === 'pickup' 
          ? 'Solicita el código al negocio para confirmar que recogiste la orden'
          : 'Solicita el código al cliente para confirmar la entrega'
        }
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            error && styles.inputError,
            isValid && styles.inputValid,
          ]}
          value={code}
          onChangeText={handleCodeChange}
          placeholder="Ej: K7M2P"
          placeholderTextColor={Colors.text.disabled}
          autoCapitalize="characters"
          maxLength={5}
          editable={!disabled && !isValidating}
        />
        {isValid && !error && (
          <View style={styles.checkIcon}>
            <CheckCircle size={20} color={Colors.success} />
          </View>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.validateButton,
          (!isValid || disabled || isValidating) && styles.validateButtonDisabled,
        ]}
        onPress={handleValidate}
        disabled={!isValid || disabled || isValidating}
        activeOpacity={0.7}
      >
        {isValidating ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.validateButtonText}>
            {type === 'pickup' ? 'Validar Recolección' : 'Validar Entrega'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    position: 'relative' as const,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: 4,
    textAlign: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },
  inputValid: {
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}10`,
  },
  checkIcon: {
    position: 'absolute' as const,
    right: 16,
    top: 18,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 8,
    marginBottom: 8,
  },
  validateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  validateButtonDisabled: {
    backgroundColor: Colors.border.light,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
