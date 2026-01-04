import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  spacing?: number;
}

export default function Divider({ 
  orientation = 'horizontal', 
  thickness = 1,
  color = Colors.border.light,
  spacing = 0,
}: DividerProps) {
  return (
    <View 
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        { 
          [orientation === 'horizontal' ? 'height' : 'width']: thickness,
          backgroundColor: color,
          [orientation === 'horizontal' ? 'marginVertical' : 'marginHorizontal']: spacing,
        },
      ]} 
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%' as const,
  },
  vertical: {
    height: '100%' as const,
  },
});
