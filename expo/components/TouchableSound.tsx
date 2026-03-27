// ============================================================================
// YESSWERA: TouchableOpacity CON SONIDO
// Drop-in replacement para TouchableOpacity que reproduce tap sound.
// Usar en lugar de TouchableOpacity de react-native.
// ============================================================================

import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { playUiTap } from '@/services/sounds';

export default function TouchableSound({ onPress, ...props }: TouchableOpacityProps) {
  const handlePress = (e: any) => {
    playUiTap();
    onPress?.(e);
  };

  return <TouchableOpacity {...props} onPress={onPress ? handlePress : undefined} />;
}
