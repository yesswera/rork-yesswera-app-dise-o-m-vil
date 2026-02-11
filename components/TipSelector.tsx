import { StyleSheet, Text, View } from 'react-native';
import TouchableSound from '@/components/TouchableSound';
import { DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface TipSelectorProps {
  selectedTip: number;
  onTipSelect: (tip: number) => void;
  orderTotal: number;
}

export default function TipSelector({ selectedTip, onTipSelect, orderTotal }: TipSelectorProps) {
  const tipOptions = [
    { label: 'Sin propina', value: 0, isCustom: false },
    { label: '10%', value: orderTotal * 0.1, isCustom: false },
    { label: '15%', value: orderTotal * 0.15, isCustom: false },
    { label: '20%', value: orderTotal * 0.2, isCustom: false },
  ];

  const handleTipSelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTipSelect(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DollarSign size={20} color={Colors.gold} />
        <Text style={styles.title}>Propina para el repartidor</Text>
      </View>
      <Text style={styles.subtitle}>Tu apoyo significa mucho ❤️</Text>

      <View style={styles.optionsGrid}>
        {tipOptions.map((option) => {
          const isSelected = selectedTip === option.value;
          return (
            <TouchableSound
              key={option.label}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => handleTipSelect(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionLabel,
                isSelected && styles.optionLabelSelected,
              ]}>
                {option.label}
              </Text>
              {option.value > 0 && (
                <Text style={[
                  styles.optionValue,
                  isSelected && styles.optionValueSelected,
                ]}>
                  ${option.value.toFixed(2)}
                </Text>
              )}
            </TouchableSound>
          );
        })}
      </View>

      {selectedTip > 0 && (
        <View style={styles.thankYouContainer}>
          <Text style={styles.thankYouText}>
            🌟 ¡Gracias por tu generosidad!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minWidth: '47%' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: `${Colors.gold}15`,
    borderColor: Colors.gold,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: Colors.gold,
  },
  optionValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text.secondary,
  },
  optionValueSelected: {
    color: Colors.gold,
  },
  thankYouContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: `${Colors.gold}10`,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  thankYouText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
});
