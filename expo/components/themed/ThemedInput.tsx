import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: INPUT TEMATICO
// Campo de texto que responde automaticamente al tema y tamaño
// ============================================================================

import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export default function ThemedInput({
  label,
  error,
  hint,
  icon,
  isPassword = false,
  style,
  ...props
}: ThemedInputProps) {
  const { colors, fonts, space, radius, touch, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;

  // Color del borde según estado
  const getBorderColor = () => {
    if (hasError) return colors.error;
    if (isFocused) return colors.primary;
    return isDark ? '#57534E' : '#D6D3D1';
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: hasError ? colors.error : colors.text.secondary,
              fontSize: fonts.sm,
              marginBottom: space.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            borderRadius: radius.md,
            backgroundColor: isDark ? '#292524' : '#F5F5F4',
            minHeight: touch.comfortable,
            paddingHorizontal: space.md,
          },
        ]}
      >
        {icon && <View style={{ marginRight: space.sm }}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text.primary,
              fontSize: fonts.base,
            },
            style,
          ]}
          placeholderTextColor={colors.text.muted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword && (
          <TouchableSound
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.text.muted} />
            ) : (
              <Eye size={20} color={colors.text.muted} />
            )}
          </TouchableSound>
        )}
      </View>

      {(error || hint) && (
        <Text
          style={[
            styles.helperText,
            {
              color: hasError ? colors.error : colors.text.tertiary,
              fontSize: fonts.xs,
              marginTop: space.xs,
            },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  helperText: {
    marginLeft: 4,
  },
});
