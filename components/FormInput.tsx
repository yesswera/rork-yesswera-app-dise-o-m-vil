import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
}

export default function FormInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry = false,
  ...props
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return Colors.error;
    if (isFocused) return Colors.primary;
    return Colors.border.light;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputContainer,
        {
          borderColor: getBorderColor(),
          shadowColor: isFocused ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
          shadowOpacity: isFocused ? 1 : 0,
        },
      ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {error && (
          <View style={styles.errorIcon}>
            <AlertCircle size={18} color={Colors.error} />
          </View>
        )}
      </View>
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
    fontWeight: '500' as const,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 14,
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
});
