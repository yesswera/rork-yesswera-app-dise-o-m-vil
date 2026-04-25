import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { DS } from '@/constants/design';

interface YAvatarProps {
  uri?: string | null;
  name?: string;
  /** Pre-computed initials — if provided, skips name parsing */
  initials?: string;
  size?: number;
  color?: string;
}

export default function YAvatar({
  uri,
  name,
  initials: initialsProp,
  size = 48,
  color = DS.colors.blue,
}: YAvatarProps) {
  const initials = initialsProp || (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const borderRadius = size / 2;
  const fontSize = size * 0.38;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: `${color}20`,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize, color }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: DS.colors.hairline,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
