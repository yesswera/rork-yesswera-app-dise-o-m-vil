import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Banknote, CreditCard, Smartphone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PaymentMethod } from '@/constants/types';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export default function PaymentMethodSelector({ selectedMethod, onSelectMethod }: PaymentMethodSelectorProps) {
  const methods = [
    { id: 'cash' as PaymentMethod, label: 'Efectivo', icon: Banknote, available: true },
    { id: 'card' as PaymentMethod, label: 'Tarjeta', icon: CreditCard, available: false },
    { id: 'transfer' as PaymentMethod, label: 'Transferencia', icon: Smartphone, available: false },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Método de Pago</Text>
      <View style={styles.methodsContainer}>
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          const isAvailable = method.available;

          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodButton,
                isSelected && styles.methodButtonSelected,
                !isAvailable && styles.methodButtonDisabled,
              ]}
              onPress={() => isAvailable && onSelectMethod(method.id)}
              disabled={!isAvailable}
              activeOpacity={0.7}
            >
              <View style={[
                styles.methodIcon,
                isSelected && styles.methodIconSelected,
                !isAvailable && styles.methodIconDisabled,
              ]}>
                <Icon
                  size={24}
                  color={isSelected ? Colors.white : (isAvailable ? Colors.primary : Colors.text.disabled)}
                />
              </View>
              <Text style={[
                styles.methodLabel,
                isSelected && styles.methodLabelSelected,
                !isAvailable && styles.methodLabelDisabled,
              ]}>
                {method.label}
              </Text>
              {!isAvailable && (
                <Text style={styles.comingSoon}>Próximamente</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  methodsContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  methodButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  methodButtonDisabled: {
    opacity: 0.5,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  methodIconSelected: {
    backgroundColor: Colors.primary,
  },
  methodIconDisabled: {
    backgroundColor: Colors.background.secondary,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  methodLabelSelected: {
    color: Colors.primary,
  },
  methodLabelDisabled: {
    color: Colors.text.disabled,
  },
  comingSoon: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
});
