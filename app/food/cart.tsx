import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, Plus, Minus } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useMemo } from 'react';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/cart';
import { useAuth } from '@/contexts/auth';
import { SavedAddress, PaymentMethod } from '@/constants/types';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import TipSelector from '@/components/TipSelector';
import { createOrder } from '@/services/orders';
import { getBusinessLocation } from '@/services/products';
import { calculateDistance, calculateDeliveryFee, formatDistance } from '@/utils/distance';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user, token } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tip, setTip] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [businessLocation, setBusinessLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Fetch business location when items change
  const businessId = items[0]?.businessId;
  useEffect(() => {
    if (businessId) {
      getBusinessLocation(businessId).then(setBusinessLocation);
    }
  }, [businessId]);

  // Calculate real distance when both locations are available
  const distance = useMemo(() => {
    if (!businessLocation || !selectedAddress) return null;
    if (!selectedAddress.latitude || !selectedAddress.longitude) return null;
    return calculateDistance(
      businessLocation,
      { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
    );
  }, [businessLocation, selectedAddress]);

  const deliveryCost = distance !== null ? calculateDeliveryFee(distance) : 0;
  const finalTotal = total + deliveryCost + tip;

  const handleCheckout = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Por favor selecciona una dirección de entrega');
      return;
    }

    if (distance === null) {
      Alert.alert('Error', 'No se pudo calcular la distancia. Verifica tu dirección.');
      return;
    }

    if (!user) {
      Alert.alert(
        'Iniciar Sesión',
        'Necesitas iniciar sesión para completar tu orden',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar Sesión',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Tu carrito está vacío');
      return;
    }

    const businessId = items[0]?.businessId;
    if (!businessId) {
      Alert.alert('Error', 'No se pudo identificar el negocio');
      return;
    }

    setIsProcessing(true);

    try {
      const order = await createOrder({
        clientId: user.id,
        businessId: businessId,
        serviceType: 'food',
        deliveryAddress: selectedAddress.address,
        deliveryInstructions: selectedAddress.instructions || '',
        items: items.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        subtotal: total,
        deliveryFee: deliveryCost,
        tip: tip,
        paymentMethod: paymentMethod as 'cash' | 'card' | 'transfer',
      });

      console.log('Orden creada exitosamente:', order);

      const orderId = order.id;
      const deliveryCode = order.deliveryCode;

      clearCart();

      Alert.alert(
        '¡Pedido Creado! 🎉',
        `Tu código de entrega es:\n\n${deliveryCode}\n\nMuestra este código al repartidor cuando llegue.`,
        [
          {
            text: 'Ver Tracking',
            onPress: () => {
              if (orderId) {
                router.replace(`/tracking/${orderId}` as any);
              } else {
                router.replace('/orders/history' as any);
              }
            },
          },
          {
            text: 'Ir al Inicio',
            onPress: () => router.replace('/' as any),
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al crear orden:', error);
      Alert.alert(
        'Error al Crear Orden',
        error.message || 'No se pudo procesar tu pedido. Por favor intenta nuevamente.',
        [
          { text: 'Reintentar', onPress: handleCheckout },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Carrito Vacío</Text>
        <Text style={styles.emptyText}>
          Agrega productos de tu restaurante favorito
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.back()}
        >
          <Text style={styles.emptyButtonText}>Ver Restaurantes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Tus Productos</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  <View style={styles.itemControls}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus size={16} color={Colors.primary} strokeWidth={3} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={16} color={Colors.primary} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Trash2 size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View pointerEvents={isProcessing ? 'none' : 'auto'} style={isProcessing ? { opacity: 0.5 } : undefined}>
            <AddressSelector
              selectedAddress={selectedAddress}
              onAddressSelect={setSelectedAddress}
            />

            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelectMethod={setPaymentMethod}
            />

            <TipSelector
              selectedTip={tip}
              onTipSelect={setTip}
              orderTotal={total}
            />
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Entrega {distance !== null ? `(${formatDistance(distance)})` : ''}
              </Text>
              <Text style={styles.summaryValue}>
                {distance !== null ? `$${deliveryCost.toFixed(2)}` : 'Selecciona dirección'}
              </Text>
            </View>
            {tip > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Propina</Text>
                <Text style={[styles.summaryValue, styles.tipValue]}>${tip.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
            </View>
            <Text style={styles.costExplanation}>
              Tarifa: $15 base {distance !== null && distance > 2 ? `+ $4 × ${(distance - 2).toFixed(1)} km extra` : '(primeros 2 km incluidos)'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkoutButton, isProcessing && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={isProcessing}
        >
          <Text style={styles.checkoutButtonText}>
            {isProcessing ? 'Procesando...' : 'Confirmar Orden'}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  itemsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  cartItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.background.tertiary,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between' as const,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  itemControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  controlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    minWidth: 24,
    textAlign: 'center' as const,
  },
  deleteButton: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingLeft: 8,
  },
  summarySection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  summaryValue: {
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
    color: Colors.primary,
  },
  costExplanation: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 8,
  },
  tipValue: {
    color: Colors.gold,
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
  checkoutButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.text.light,
    shadowOpacity: 0,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
