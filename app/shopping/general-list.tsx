// Lista General - Cliente escribe lista, driver compra donde encuentre
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, MapPin, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { SavedAddress, PaymentMethod } from '@/constants/types';
import { createOrder } from '@/services/orders';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

export default function GeneralListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [shoppingList, setShoppingList] = useState<string>('');
  const [locationHint, setLocationHint] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Costo de servicio base (solo envío, el cliente paga productos al recibir)
  const serviceFee = 25; // Tarifa base por el servicio de compra
  const deliveryFee = 15; // Tarifa de entrega base
  const totalServiceCost = serviceFee + deliveryFee;

  const handleSubmit = async () => {
    if (!shoppingList.trim()) {
      Alert.alert('Error', 'Por favor escribe tu lista de compras');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Por favor selecciona una dirección de entrega');
      return;
    }

    if (!user) {
      Alert.alert(
        'Iniciar Sesión',
        'Necesitas iniciar sesión para crear una orden',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => router.push('/login' as any) },
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Construir las instrucciones completas
      let instructions = `LISTA DE COMPRAS:\n${shoppingList}`;
      if (locationHint.trim()) {
        instructions += `\n\nDÓNDE COMPRAR: ${locationHint}`;
      }
      if (estimatedBudget.trim()) {
        instructions += `\n\nPRESUPUESTO APROXIMADO: $${estimatedBudget}`;
      }

      const order = await createOrder({
        clientId: user.id,
        businessId: null, // Sin negocio específico - lista general
        serviceType: 'shopping',
        deliveryAddress: selectedAddress.address,
        deliveryInstructions: instructions,
        items: [{
          productId: 'general-shopping-list',
          productName: 'Lista de compras general',
          quantity: 1,
          unitPrice: serviceFee,
        }],
        subtotal: serviceFee,
        deliveryFee: deliveryFee,
        paymentMethod: 'cash', // Solo efectivo para listas generales
      });

      Alert.alert(
        '¡Orden Creada!',
        'Un repartidor tomará tu lista y comprará los productos. Te contactará si tiene dudas.',
        [
          {
            text: 'Ver Tracking',
            onPress: () => router.push(`/tracking/${order.id}` as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'No se pudo crear la orden. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerCard}>
            <ClipboardList size={24} color={Colors.primary} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Lista General</Text>
              <Text style={styles.headerDescription}>
                El repartidor comprará donde encuentre los productos
              </Text>
            </View>
          </View>

          {/* Lista de compras */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu Lista de Compras *</Text>
            <Text style={styles.sectionDescription}>
              Escribe los productos que necesitas, sé específico con cantidades
            </Text>
            <TextInput
              style={styles.listInput}
              placeholder={'Ejemplo:\n- 1 kg de carne molida\n- 2 litros de leche entera\n- 1 paquete de tortillas\n- Jabón de baño Dove\n- 6 huevos'}
              placeholderTextColor={Colors.text.light}
              value={shoppingList}
              onChangeText={setShoppingList}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Dónde comprar (opcional) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={18} color={Colors.text.secondary} />
              <Text style={styles.sectionTitle}>¿Dónde comprar? (opcional)</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Si tienes preferencia de lugar, indícalo aquí
            </Text>
            <TextInput
              style={styles.smallInput}
              placeholder="Ej: Oxxo de la esquina, Carnicería Don José, cualquier farmacia..."
              placeholderTextColor={Colors.text.light}
              value={locationHint}
              onChangeText={setLocationHint}
              multiline
            />
          </View>

          {/* Presupuesto estimado (opcional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Presupuesto Aproximado (opcional)</Text>
            <Text style={styles.sectionDescription}>
              ¿Cuánto crees que costarán los productos?
            </Text>
            <View style={styles.budgetInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.budgetInput}
                placeholder="Ej: 200"
                placeholderTextColor={Colors.text.light}
                value={estimatedBudget}
                onChangeText={setEstimatedBudget}
                keyboardType="numeric"
              />
              <Text style={styles.currencyLabel}>MXN</Text>
            </View>
          </View>

          {/* Dirección de entrega */}
          <AddressSelector
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
          />

          {/* Método de pago */}
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />

          {/* Resumen de costos */}
          <View style={styles.costCard}>
            <Text style={styles.costTitle}>Costo del Servicio</Text>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Servicio de compra</Text>
              <Text style={styles.costValue}>${serviceFee.toFixed(2)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Entrega</Text>
              <Text style={styles.costValue}>${deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.costDivider} />
            <View style={styles.costRow}>
              <Text style={styles.costTotalLabel}>Total Servicio</Text>
              <Text style={styles.costTotalValue}>${totalServiceCost.toFixed(2)}</Text>
            </View>
            <View style={styles.infoBox}>
              <Info size={16} color={Colors.accent} />
              <Text style={styles.infoText}>
                Además pagarás el costo real de los productos al recibir tu pedido
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer con botón */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Creando Orden...' : 'Enviar Lista'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  listInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 180,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    lineHeight: 22,
  },
  smallInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 60,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  budgetInput: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  currencyLabel: {
    fontSize: 14,
    color: Colors.text.light,
  },
  costCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  costLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  costDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 10,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accent + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.accent,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  submitButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.text.light,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
