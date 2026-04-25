import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { DS } from '@/constants/design';

interface PillProps {
  text: string;
  color: string;
  style?: TextStyle;
}

export default function Pill({ text, color, style }: PillProps) {
  return (
    <Text style={[styles.pill, { color, backgroundColor: `${color}20` }, style]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    ...DS.fonts.tiny,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
