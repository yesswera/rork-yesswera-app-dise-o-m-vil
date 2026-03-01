import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { playUiTap } from '@/services/sounds';

interface LoadingButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'tertiary';
  disabled?: boolean;
  style?: ViewStyle;
}

export default function LoadingButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
  style,
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  const getGradientColors = (): readonly [string, string] => {
    switch (variant) {
      case 'primary':
        return [Colors.primary, Colors.primaryDark] as const;
      case 'secondary':
        return [Colors.secondary, Colors.secondaryDark] as const;
      case 'tertiary':
        return [Colors.accent, Colors.accentDark] as const;
      case 'danger':
        return [Colors.error, '#B91C1C'] as const;
      default:
        return [Colors.primary, Colors.primaryDark] as const;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        playUiTap();
        onPress();
      }}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
    >
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          {loading && (
            <ActivityIndicator
              color={Colors.white}
              size="small"
              style={styles.spinner}
            />
          )}
          <Text style={styles.text}>{title}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    overflow: 'hidden' as const,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
});
