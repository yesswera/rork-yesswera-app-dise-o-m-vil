import { View, StyleSheet, ViewStyle } from 'react-native';
import TouchableSound from '@/components/TouchableSound';
import Colors from '@/constants/colors';
import React from "react";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export default function Card({ children, onPress, style, variant = 'elevated' }: CardProps) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.cardElevated,
    variant === 'outlined' && styles.cardOutlined,
    variant === 'flat' && styles.cardFlat,
    style,
  ];

  if (onPress) {
    return (
      <TouchableSound style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableSound>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  cardElevated: {
    borderWidth: 1,
    borderColor: '#F5F5F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cardFlat: {
    backgroundColor: Colors.background.secondary,
  },
});
