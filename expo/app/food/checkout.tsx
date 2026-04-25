import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS, colorShadow } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import BigButton from '@/components/ui/BigButton';
import { useCart } from '@/contexts/cart';
import { useAuth } from '@/contexts/auth';
import { createOrder } from '@/services/orders';
import { getUserAddresses } from '@/services/addresses';
import { getBusinessLocation } from '@/services/products';
import { calculateDistance, calculateDeliveryFee, formatDistance } from '@/utils/distance';
import type { SavedAddress } from '@/constants/types';

export default function CheckoutScreen() {
  const { items, updateQuantity, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [businessLocation, setBizLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const businessId = items[0]?.businessId;

  // Load addresses + business location on mount
  useEffect(() => {
    if (user?.id) {
      getUserAddresses(user.id).then((addrs) => {
        setAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0] || null;
        setSelectedAddress(def);
      }).catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (businessId) {
      getBusinessLocation(businessId).then(setBizLocation).catch(console.error);
    }
  }, [businessId]);

  // Calculate delivery fee
  const distance = useMemo(() => {
    if (!businessLocation || !selectedAddress) return null;
    if (!selectedAddress.latitude || !selectedAddress.longitude) return null;
    return calculateDistance(businessLocation, {
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
    });
  }, [businessLocation, selectedAddress]);

  const deliveryFee = distance !== null ? calculateDeliveryFee(distance) : 0;
  const isFreeDelivery = deliveryFee <= 15 && distance !== null && distance <= 2;
  const grandTotal = total + deliveryFee;

  // Handle confirm order
  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Inicia sesion', 'Necesitas iniciar sesion para hacer un pedido', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar Sesion', onPress: () => router.push('/login' as any) },
      ]);
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Selecciona direccion', 'Elige una direccion de entrega para continuar');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Carrito vacio', 'Agrega productos antes de confirmar');
      return;
    }
    if (!businessId) {
      Alert.alert('Error', 'No se pudo identificar el negocio');
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createOrder({
        clientId: user.id,
        businessId,
        serviceType: 'food',
        deliveryAddress: selectedAddress.address,
        deliveryLocation: selectedAddress.latitude && selectedAddress.longitude
          ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
          : undefined,
        deliveryInstructions: selectedAddress.instructions || '',
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          variants: item.selectedVariants?.length
            ? item.selectedVariants.map((v) => ({ name: v.name, group: v.group, price: v.priceAdjustment }))
            : undefined,
        })),
        subtotal: total,
        deliveryFee,
        paymentMethod,
      });

      clearCart();

      Alert.alert(
        'Pedido creado',
        `Tu codigo de entrega es:\n\n${order.deliveryCode}\n\nMuestra este codigo al repartidor.`,
        [
          {
            text: 'Ver tracking',
            onPress: () => router.replace(`/tracking/${order.id}` as any),
          },
          {
            text: 'Ir al inicio',
            onPress: () => router.replace('/' as any),
            style: 'cancel',
          },
        ]
      );
    } catch (err: any) {
      console.error('Checkout error:', err);
      Alert.alert('Error', err.message || 'No se pudo crear el pedido. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty cart guard
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>{'\uD83D\uDED2'}</Text>
          <Text style={styles.emptyTitle}>Tu carrito esta vacio</Text>
          <BigButton
            title="Ver restaurantes"
            onPress={() => router.replace('/food/restaurants' as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={24} color={DS.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Order summary (collapsible) */}
        <YCard style={styles.section}>
          <TouchableOpacity
            style={styles.collapseRow}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <View style={styles.collapseLeft}>
              <Feather name="shopping-bag" size={18} color={DS.colors.green} />
              <Text style={styles.collapseTitle}>{itemCount} producto{itemCount !== 1 ? 's' : ''}</Text>
            </View>
            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={DS.colors.muted} />
          </TouchableOpacity>

          {expanded && (
            <View style={styles.itemsList}>
              {items.map((item) => {
                const key = item.cartItemKey || item.id;
                return (
                  <View key={key} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.quantity}x {item.name}
                      </Text>
                      {item.selectedVariants?.length ? (
                        <Text style={styles.itemVariants}>
                          {item.selectedVariants.map((v) => v.name).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(key, item.quantity - 1)}
                      >
                        <Feather name="minus" size={16} color={DS.colors.green} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(key, item.quantity + 1)}
                      >
                        <Feather name="plus" size={16} color={DS.colors.green} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </YCard>

        {/* Delivery address */}
        <YCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={18} color={DS.colors.green} />
            <Text style={styles.sectionTitle}>A donde enviamos?</Text>
          </View>
          {selectedAddress ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
              <Text style={styles.addressLine}>{selectedAddress.address}</Text>
              {selectedAddress.instructions ? (
                <Text style={styles.addressRef}>{selectedAddress.instructions}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.noAddress}>No hay direccion seleccionada</Text>
          )}
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setShowAddressPicker(true)}
          >
            <Feather name="edit-2" size={14} color={DS.colors.green} />
            <Text style={styles.changeBtnText}>Cambiar direccion</Text>
          </TouchableOpacity>
        </YCard>

        {/* Payment method */}
        <YCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="credit-card" size={18} color={DS.colors.green} />
            <Text style={styles.sectionTitle}>Como pagaras?</Text>
          </View>
          <View style={styles.paymentRow}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cash' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('cash')}
              activeOpacity={0.8}
            >
              <Feather
                name="dollar-sign"
                size={20}
                color={paymentMethod === 'cash' ? '#FFFFFF' : DS.colors.dark}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentMethod === 'cash' && styles.paymentTextActive,
                ]}
              >
                Efectivo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.8}
            >
              <Feather
                name="credit-card"
                size={20}
                color={paymentMethod === 'card' ? '#FFFFFF' : DS.colors.dark}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentMethod === 'card' && styles.paymentTextActive,
                ]}
              >
                Tarjeta
              </Text>
            </TouchableOpacity>
          </View>
        </YCard>

        {/* Totals */}
        <YCard style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Envio{distance !== null ? ` (${formatDistance(distance)})` : ''}
            </Text>
            <Text style={[styles.totalValue, isFreeDelivery && styles.freeText]}>
              {distance !== null
                ? isFreeDelivery
                  ? 'GRATIS'
                  : `$${deliveryFee.toFixed(2)}`
                : 'Selecciona direccion'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>${grandTotal.toFixed(2)}</Text>
          </View>
        </YCard>

        {/* Spacer for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={[styles.bottomBar, DS.shadow.float]}>
        <BigButton
          title={`Confirmar Pedido - $${grandTotal.toFixed(2)}`}
          onPress={handleConfirm}
          loading={isProcessing}
          disabled={isProcessing || !selectedAddress}
          icon={<Feather name="check-circle" size={20} color="#FFFFFF" />}
        />
      </View>

      {/* Address picker modal */}
      <Modal
        visible={showAddressPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mis direcciones</Text>
              <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
                <Feather name="x" size={24} color={DS.colors.dark} />
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No tienes direcciones guardadas</Text>
                <TouchableOpacity
                  style={styles.addAddressBtn}
                  onPress={() => {
                    setShowAddressPicker(false);
                    router.push('/addresses/add' as any);
                  }}
                >
                  <Feather name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.addAddressBtnText}>Agregar direccion</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {addresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[
                        styles.addrOption,
                        isSelected && styles.addrOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedAddress(addr);
                        setShowAddressPicker(false);
                      }}
                    >
                      <View style={styles.addrIcon}>
                        <Feather
                          name="map-pin"
                          size={16}
                          color={isSelected ? '#FFFFFF' : DS.colors.green}
                        />
                      </View>
                      <View style={styles.addrInfo}>
                        <Text style={[styles.addrLabel, isSelected && { color: '#FFFFFF' }]}>
                          {addr.label}
                        </Text>
                        <Text
                          style={[styles.addrLine, isSelected && { color: 'rgba(255,255,255,0.8)' }]}
                          numberOfLines={1}
                        >
                          {addr.address}
                        </Text>
                      </View>
                      {isSelected && <Feather name="check" size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.addAddrRow}
                  onPress={() => {
                    setShowAddressPicker(false);
                    router.push('/addresses/add' as any);
                  }}
                >
                  <Feather name="plus-circle" size={18} color={DS.colors.green} />
                  <Text style={styles.addAddrText}>Agregar nueva direccion</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.lg },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.xl,
  },
  headerTitle: { ...DS.fonts.title, color: DS.colors.dark },

  // Sections
  section: { marginBottom: DS.space.lg },

  // Collapsible order summary
  collapseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapseLeft: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm },
  collapseTitle: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  itemsList: { marginTop: DS.space.md, gap: DS.space.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  itemInfo: { flex: 1 },
  itemName: { ...DS.fonts.body, color: DS.colors.dark },
  itemVariants: { ...DS.fonts.small, color: DS.colors.muted },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: { ...DS.fonts.bodyMed, color: DS.colors.dark, minWidth: 20, textAlign: 'center' },
  itemPrice: { ...DS.fonts.bodyMed, color: DS.colors.green, minWidth: 65, textAlign: 'right' },

  // Address
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    marginBottom: DS.space.md,
  },
  sectionTitle: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  addressBox: { gap: 2, marginBottom: DS.space.sm },
  addressLabel: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  addressLine: { ...DS.fonts.body, color: DS.colors.body },
  addressRef: { ...DS.fonts.small, color: DS.colors.muted },
  noAddress: { ...DS.fonts.body, color: DS.colors.muted, marginBottom: DS.space.sm },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeBtnText: { ...DS.fonts.label, color: DS.colors.green },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    gap: DS.space.md,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    height: DS.touch.min,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.card,
    borderWidth: 1.5,
    borderColor: DS.colors.hairline,
  },
  paymentOptionActive: {
    backgroundColor: DS.colors.green,
    borderColor: DS.colors.green,
  },
  paymentText: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  paymentTextActive: { color: '#FFFFFF' },

  // Totals
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.space.sm,
  },
  totalLabel: { ...DS.fonts.body, color: DS.colors.muted },
  totalValue: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  freeText: { color: DS.colors.green, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginVertical: DS.space.sm,
  },
  grandLabel: { ...DS.fonts.title, color: DS.colors.dark },
  grandValue: { ...DS.fonts.title, color: DS.colors.green },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DS.colors.card,
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.md,
    paddingBottom: 30,
  },

  // Empty
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.lg,
    gap: DS.space.lg,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { ...DS.fonts.title, color: DS.colors.dark },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: DS.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DS.colors.card,
    borderTopLeftRadius: DS.radius.xxl,
    borderTopRightRadius: DS.radius.xxl,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DS.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.hairline,
  },
  modalTitle: { ...DS.fonts.section, color: DS.colors.dark },
  modalList: { padding: DS.space.lg },
  modalEmpty: {
    padding: DS.space.xxl,
    alignItems: 'center',
    gap: DS.space.lg,
  },
  modalEmptyText: { ...DS.fonts.body, color: DS.colors.muted },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addAddressBtnText: { ...DS.fonts.bodyMed, color: '#FFFFFF' },

  addrOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    padding: DS.space.md,
    borderRadius: DS.radius.lg,
    marginBottom: DS.space.sm,
    backgroundColor: DS.colors.divider,
  },
  addrOptionActive: {
    backgroundColor: DS.colors.green,
  },
  addrIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addrInfo: { flex: 1, gap: 2 },
  addrLabel: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  addrLine: { ...DS.fonts.small, color: DS.colors.muted },
  addAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.md,
    justifyContent: 'center',
  },
  addAddrText: { ...DS.fonts.bodyMed, color: DS.colors.green },
});
