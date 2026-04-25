import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { DS } from '@/constants/design';

interface YCardProps {
  children: React.ReactNode;
  padding?: number;
  style?: ViewStyle;
}

export default function YCard({ children, padding = DS.space.lg, style }: YCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    ...DS.shadow.card,
  },
});
