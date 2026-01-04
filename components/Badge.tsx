import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'small' | 'medium' | 'large';
}

export default function Badge({ label, variant = 'primary', size = 'medium' }: BadgeProps) {
  const getColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'secondary':
        return Colors.secondary;
      case 'accent':
        return Colors.accent;
      case 'success':
        return Colors.success;
      case 'warning':
        return Colors.warning;
      case 'error':
        return Colors.error;
      case 'neutral':
        return Colors.mediumGray;
      default:
        return Colors.primary;
    }
  };

  const color = getColor();

  return (
    <View style={[
      styles.badge,
      { backgroundColor: `${color}15` },
      size === 'small' && styles.badgeSmall,
      size === 'large' && styles.badgeLarge,
    ]}>
      <Text style={[
        styles.text,
        { color },
        size === 'small' && styles.textSmall,
        size === 'large' && styles.textLarge,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start' as const,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  textSmall: {
    fontSize: 10,
  },
  textLarge: {
    fontSize: 14,
  },
});
