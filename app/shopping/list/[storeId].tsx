import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { Business, SavedAddress, PaymentMethod } from '@/constants/types';
import { getBusinessById } from '@/services/products';
import { createOrder } from '@/services/orders';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

export default function ShoppingListScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { user } = useAuth();
  const [store, setStore] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadStore = useCallback(async () => {
    if (!storeId) return;
    try {
      const data = await getBusinessById(storeId);
      setStore(data);
    } catch (error) {
      console.error('Error loading store:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tienda no encontrada</Text>
      </View>
    );
  }

  const estimatedCost = 25.0;
  const distance = 4;
  const deliveryCost = distance * 1.5 + estimatedCost * 0.1;
  const totalEstimated = estimatedCost + deliveryCost;

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
      const order = await createOrder({
        clientId: user.id,
        businessId: store.id,
        serviceType: 'shopping',
        deliveryAddress: selectedAddress.address,
        deliveryInstructions: shoppingList,
        items: [{
          productId: 'shopping-list',
          productName: 'Lista de compras',
          quantity: 1,
          unitPrice: estimatedCost,
        }],
        subtotal: estimatedCost,
        deliveryFee: deliveryCost,
        paymentMethod: paymentMethod === 'cash' ? 'cash' : paymentMethod === 'card' ? 'card' : 'wallet',
      });

      Alert.alert(
        '¡Orden Creada!',
        'Un repartidor irá a comprar tus productos y te los llevará.',
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.storeHeader}>
            <ShoppingBag size={24} color={Colors.secondary} />
            <View style={styles.storeInfo}>
              <Text style={styles.storeType}>{store.category}</Text>
              <Text style={styles.storeName}>{store.name}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu Lista de Compras</Text>
            <Text style={styles.sectionDescription}>
              Escribe los productos que necesitas, uno por línea
            </Text>
            <TextInput
              style={styles.listInput}
              placeholder={'Ejemplo:\n- 1 kg de arroz\n- 2 litros de leche\n- Pan integral\n- Frutas variadas'}
              placeholderTextColor={Colors.text.light}
              value={shoppingList}
              onChangeText={setShoppingList}
              multiline
              textAlignVertical="top"
            />
          </View>

          <AddressSelector
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
          />

          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />

          <View style={styles.estimateSection}>
            <Text style={styles.sectionTitle}>Costo Estimado</Text>
            <View style={styles.estimateCard}>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Productos (estimado)</Text>
                <Text style={styles.estimateValue}>~${estimatedCost.toFixed(2)}</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Entrega ({distance} km)</Text>
                <Text style={styles.estimateValue}>${deliveryCost.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.estimateRow}>
                <Text style={styles.totalLabel}>Total Estimado</Text>
                <Text style={styles.totalValue}>~${totalEstimated.toFixed(2)}</Text>
              </View>
              <Text style={styles.estimateNote}>
                *El costo final dependerá del precio real de los productos
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Creando Orden...' : 'Crear Orden'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  storeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.secondary,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  listInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 200,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  estimateSection: {
    marginBottom: 20,
  },
  estimateCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  estimateRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  estimateLabel: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  estimateValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  estimateNote: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  footer: {
    position: 'absolute' as const,
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
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.secondary,
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
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
