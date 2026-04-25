import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DS, colorShadow } from '@/constants/design';

interface BigButtonProps {
  /** Button text — accepts either `title` or `label` */
  title?: string;
  label?: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  /** Ionicons name string OR a JSX element */
  icon?: keyof typeof Ionicons.glyphMap | React.ReactNode;
  subtitle?: string;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  style?: ViewStyle;
}

export default function BigButton({
  title,
  label,
  onPress,
  color = DS.colors.blue,
  textColor = '#FFFFFF',
  icon,
  subtitle,
  disabled = false,
  loading = false,
  height = 56,
  style,
}: BigButtonProps) {
  const text = title || label || '';

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={22}
          color={textColor}
          style={styles.icon}
        />
      );
    }
    return <View style={styles.icon}>{icon}</View>;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: color, minHeight: height },
        colorShadow(color, 0.3),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {renderIcon()}
          <View style={subtitle ? styles.textCol : undefined}>
            <Text style={[styles.label, { color: textColor }]}>{text}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: textColor, opacity: 0.8 }]}>{subtitle}</Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DS.radius.xl,
    paddingHorizontal: DS.space.xxl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    alignItems: 'center',
  },
  label: {
    ...DS.fonts.button,
  },
  subtitle: {
    ...DS.fonts.small,
    marginTop: 2,
  },
  icon: {
    marginRight: DS.space.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
