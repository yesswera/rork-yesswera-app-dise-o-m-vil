import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

interface LoadingButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function LoadingButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
  fullWidth = true,
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  const buttonColors = {
    primary: Colors.primary,
    secondary: Colors.secondary,
    danger: Colors.error,
  };

  const backgroundColor = buttonColors[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: isDisabled ? Colors.text.light : backgroundColor },
        fullWidth && styles.fullWidth,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    paddingHorizontal: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
