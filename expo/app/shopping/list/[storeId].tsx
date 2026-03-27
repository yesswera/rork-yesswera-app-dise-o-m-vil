import TouchableSound from '@/components/TouchableSound';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { Business, SavedAddress, PaymentMethod } from '@/constants/types';
import { getBusinessById, getBusinessLocation } from '@/services/products';
import { createOrder } from '@/services/orders';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { calculateDistance, calculateDeliveryFee, formatDistance } from '@/utils/distance';
import { trackServiceUsage } from '@/services/user-preferences';

const COLORS = {
  light: { background: '#FFFFFF', card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { background: '#1C1917', card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

export default function ShoppingListScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { user } = useAuth();
  const [store, setStore] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [businessLocation, setBusinessLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadStore = useCallback(async () => {
    if (!storeId) return;
    try {
      const [data, loc] = await Promise.all([
        getBusinessById(storeId),
        getBusinessLocation(storeId),
      ]);
      setStore(data);
      setBusinessLocation(loc);
    } catch (error) {
      console.error('Error loading store:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  // IMPORTANT: All hooks must be called before any early returns
  // Calculate real distance from store to delivery address
  const distance = useMemo(() => {
    if (!businessLocation || !selectedAddress) return null;
    if (!selectedAddress.latitude || !selectedAddress.longitude) return null;
    return calculateDistance(
      businessLocation,
      { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
    );
  }, [businessLocation, selectedAddress]);

  const estimatedCost = 25.0;
  const deliveryCost = distance !== null ? calculateDeliveryFee(distance) : 0;
  const totalEstimated = estimatedCost + deliveryCost;

  // Early returns AFTER all hooks have been called
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Tienda no encontrada</Text>
      </View>
    );
  }

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
        paymentMethod: paymentMethod === 'cash' ? 'cash' : paymentMethod === 'card' ? 'card' : 'transfer',
      });

      // Track service usage for analytics/personalization
      const totalCost = estimatedCost + deliveryCost;
      trackServiceUsage(user.id, 'shopping', totalCost).catch(console.error);

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={[styles.storeHeader, { backgroundColor: theme.card }]}>
            <ShoppingBag size={24} color={Colors.secondary} />
            <View style={styles.storeInfo}>
              <Text style={styles.storeType}>{store.category}</Text>
              <Text style={[styles.storeName, { color: theme.text }]}>{store.name}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tu Lista de Compras</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Escribe los productos que necesitas, uno por linea
            </Text>
            <TextInput
              style={[styles.listInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              placeholder={'Ejemplo:\n- 1 kg de arroz\n- 2 litros de leche\n- Pan integral\n- Frutas variadas'}
              placeholderTextColor={theme.textMuted}
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Costo Estimado</Text>
            <View style={[styles.estimateCard, { backgroundColor: theme.card }]}>
              <View style={styles.estimateRow}>
                <Text style={[styles.estimateLabel, { color: theme.textSecondary }]}>Productos (estimado)</Text>
                <Text style={[styles.estimateValue, { color: theme.text }]}>~${estimatedCost.toFixed(2)}</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={[styles.estimateLabel, { color: theme.textSecondary }]}>Entrega {distance !== null ? `(${formatDistance(distance)})` : ''}</Text>
                <Text style={[styles.estimateValue, { color: theme.text }]}>${deliveryCost.toFixed(2)}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.estimateRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total Estimado</Text>
                <Text style={styles.totalValue}>~${totalEstimated.toFixed(2)}</Text>
              </View>
              <Text style={[styles.estimateNote, { color: theme.textMuted }]}>
                *El costo final dependera del precio real de los productos
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableSound
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Creando Orden...' : 'Crear Orden'}
          </Text>
        </TouchableSound>
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
