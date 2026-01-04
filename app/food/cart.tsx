import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, Plus, Minus, MapPin } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/cart';
import { useAuth } from '@/contexts/auth';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const distance = 5;
  const deliveryCost = distance * 1.5 + total * 0.1;
  const finalTotal = total + deliveryCost;

  const handleCheckout = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu dirección de entrega');
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

    setIsProcessing(true);

    setTimeout(() => {
      Alert.alert(
        '¡Orden Creada!',
        'Tu orden ha sido enviada. Un repartidor la aceptará pronto.',
        [
          {
            text: 'Ver Tracking',
            onPress: () => {
              clearCart();
              router.push('/tracking/order-123' as any);
            },
          },
        ]
      );
      setIsProcessing(false);
    }, 1500);
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

          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Dirección de Entrega</Text>
            <View style={styles.addressInputContainer}>
              <MapPin size={20} color={Colors.primary} />
              <TextInput
                style={styles.addressInput}
                placeholder="Ej: Calle 45 #23-10, Apto 501"
                placeholderTextColor={Colors.text.light}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Entrega ({distance} km)
              </Text>
              <Text style={styles.summaryValue}>${deliveryCost.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
            </View>
            <Text style={styles.costExplanation}>
              Costo de entrega: ${distance} km × $1.50 + {(total * 0.1).toFixed(2)} (10% comisión)
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
  addressSection: {
    marginBottom: 24,
  },
  addressInputContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  addressInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top' as const,
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
