import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DS } from '@/constants/design';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    marginBottom: DS.space.md,
  },
  title: {
    ...DS.fonts.section,
    color: DS.colors.dark,
  },
  subtitle: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },
});
