import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface DividerProps {
  text?: string;
  spacing?: 'small' | 'medium' | 'large';
}

export default function Divider({ text, spacing = 'medium' }: DividerProps) {
  const getSpacing = () => {
    switch (spacing) {
      case 'small':
        return 12;
      case 'medium':
        return 16;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const marginVertical = getSpacing();

  if (text) {
    return (
      <View style={[styles.container, { marginVertical }]}>
        <View style={styles.line} />
        <Text style={styles.text}>{text}</Text>
        <View style={styles.line} />
      </View>
    );
  }

  return <View style={[styles.simpleLine, { marginVertical }]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  simpleLine: {
    height: 1,
    backgroundColor: Colors.border.light,
  },
  text: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
