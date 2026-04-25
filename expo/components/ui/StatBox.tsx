import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { DS } from '@/constants/design';

interface StatBoxProps {
  value: string;
  label: string;
  color: string;
  style?: ViewStyle;
}

export default function StatBox({ value, label, color, style }: StatBoxProps) {
  return (
    <View style={[styles.box, style]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    paddingHorizontal: DS.space.sm,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    ...DS.shadow.card,
  },
  value: {
    ...DS.fonts.title,
    marginBottom: 4,
  },
  label: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    textAlign: 'center',
  },
});
