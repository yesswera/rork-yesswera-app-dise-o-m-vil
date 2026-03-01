import TouchableSound from '@/components/TouchableSound';
import { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  autoFocus = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={[
      styles.container,
      isFocused && styles.containerFocused,
    ]}>
      <Search size={18} color={isFocused ? Colors.primary : Colors.text.muted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableSound onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={18} color={Colors.text.muted} />
        </TouchableSound>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    gap: 10,
  },
  containerFocused: {
    borderColor: Colors.primary,
    shadowColor: 'rgba(22, 163, 74, 0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    padding: 0,
  },
});
