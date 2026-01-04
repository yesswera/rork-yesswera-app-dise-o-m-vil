import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ChipProps {
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export default function Chip({ label, onPress, onRemove, selected = false, disabled = false }: ChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
      {onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={selected ? Colors.white : Colors.text.secondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  textSelected: {
    color: Colors.white,
  },
  removeButton: {
    marginLeft: 6,
  },
});
