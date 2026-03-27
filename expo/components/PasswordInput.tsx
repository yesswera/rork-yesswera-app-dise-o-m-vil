import TouchableSound from '@/components/TouchableSound';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface PasswordInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  showStrength?: boolean;
}

export default function PasswordInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  showStrength = false,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const getPasswordStrength = (): 'weak' | 'medium' | 'strong' => {
    if (value.length < 6) return 'weak';
    
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[^a-zA-Z0-9]/.test(value)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      case 'strong':
        return Colors.success;
    }
  };

  const getStrengthLabel = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak':
        return 'Débil';
      case 'medium':
        return 'Media';
      case 'strong':
        return 'Fuerte';
    }
  };

  const strength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          {...props}
        />
        <TouchableSound
          onPress={() => setIsVisible(!isVisible)}
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isVisible ? (
            <EyeOff size={20} color={Colors.text.secondary} />
          ) : (
            <Eye size={20} color={Colors.text.secondary} />
          )}
        </TouchableSound>
        {error && (
          <View style={styles.errorIcon}>
            <AlertCircle size={20} color={Colors.error} />
          </View>
        )}
      </View>

      {showStrength && value.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBars}>
            <View style={[
              styles.strengthBar,
              { backgroundColor: getStrengthColor(strength) }
            ]} />
            <View style={[
              styles.strengthBar,
              strength !== 'weak' ? { backgroundColor: getStrengthColor(strength) } : styles.strengthBarInactive
            ]} />
            <View style={[
              styles.strengthBar,
              strength === 'strong' ? { backgroundColor: getStrengthColor(strength) } : styles.strengthBarInactive
            ]} />
          </View>
          <Text style={[styles.strengthText, { color: getStrengthColor(strength) }]}>
            {getStrengthLabel(strength)}
          </Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 14,
  },
  iconButton: {
    marginLeft: 8,
  },
  errorIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row' as const,
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthBarInactive: {
    backgroundColor: Colors.border.light,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
});
