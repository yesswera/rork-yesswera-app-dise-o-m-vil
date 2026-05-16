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
  TextInput,
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
import { calculateDistance, formatDistance } from '@/utils/distance';
import { checkDriverCoverage } from '@/services/coverage';
import { isLocationInActiveZone } from '@/services/zones';
import { getRoute } from '@/services/routing';
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
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; deliveryCode: string } | null>(null);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [coverageOk, setCoverageOk] = useState<boolean | null>(null);
  const [zoneFees, setZoneFees] = useState<{ base: number; perKm: number } | null>(null);
  const [realRoute, setRealRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);

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

  // Haversine distance for quick display
  const distance = useMemo(() => {
    if (!businessLocation || !selectedAddress) return null;
    if (!selectedAddress.latitude || !selectedAddress.longitude) return null;
    return calculateDistance(businessLocation, {
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
    });
  }, [businessLocation, selectedAddress]);

  // Fetch real route + zone info + coverage when business & address are set
  useEffect(() => {
    if (!businessLocation || !selectedAddress?.latitude || !selectedAddress?.longitude) {
      setRealRoute(null);
      setCoverageOk(null);
      return;
    }

    const origin = businessLocation;
    const dest = { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude };

    // Real route (OSRM)
    getRoute(origin, dest)
      .then((r) => setRealRoute({ distanceKm: r.distanceKm, durationMin: r.durationMin }))
      .catch(() => setRealRoute(null));

    // Zone-aware pricing
    isLocationInActiveZone(origin.latitude, origin.longitude)
      .then((result) => {
        if (result.inZone && result.zone) {
          setZoneFees({ base: result.zone.deliveryBaseFee, perKm: result.zone.deliveryPerKmFee });
        } else {
          setZoneFees(null); // fallback to defaults
        }
      })
      .catch(() => setZoneFees(null));

    // Coverage check (drivers available near business)
    checkDriverCoverage(origin.latitude, origin.longitude, 5)
      .then((c) => setCoverageOk(c.hasDrivers))
      .catch(() => setCoverageOk(null));
  }, [businessLocation, selectedAddress]);

  // Calculate delivery fee using zone pricing or defaults
  const deliveryFee = useMemo(() => {
    const dist = realRoute?.distanceKm ?? distance;
    if (dist === null) return 0;
    const baseFee = zoneFees?.base ?? 15;
    const perKmFee = zoneFees?.perKm ?? 4;
    const freeKm = 2;
    if (dist <= freeKm) return baseFee;
    return Math.round((baseFee + (dist - freeKm) * perKmFee) * 100) / 100;
  }, [realRoute, distance, zoneFees]);

  const effectiveDistance = realRoute?.distanceKm ?? distance;
  const isFreeDelivery = deliveryFee <= (zoneFees?.base ?? 15) && effectiveDistance !== null && effectiveDistance <= 2;
  const grandTotal = total + deliveryFee + tip;

  // ETA: use OSRM duration if available, else estimate
  const etaRange = useMemo(() => {
    const prepMinutes = 20;
    const travelMinutes = realRoute?.durationMin
      ? realRoute.durationMin
      : (distance !== null ? Math.max(5, Math.round((distance / 30) * 60)) : 10);
    const estimated = prepMinutes + travelMinutes;
    const low = Math.round(estimated * 0.85);
    const high = Math.round(estimated * 1.2);
    return { low, high };
  }, [realRoute, distance]);

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

    // Warn if no drivers available (non-blocking — user can proceed)
    if (coverageOk === false) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Sin repartidores cerca',
          'No detectamos repartidores disponibles en este momento. Tu pedido se enviara y se asignara cuando haya uno disponible.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve() },
            { text: 'Pedir de todas formas', onPress: () => { proceedWithOrder(); resolve(); } },
          ]
        );
      });
    }

    proceedWithOrder();
  };

  const proceedWithOrder = async () => {
    if (!user || !selectedAddress || !businessId) return;
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
          specialInstructions: item.notes || undefined,
        })),
        subtotal: total,
        deliveryFee,
        tip: tip > 0 ? tip : undefined,
        paymentMethod,
      });

      clearCart();
      setConfirmedOrder({ id: order.id, deliveryCode: order.deliveryCode });
    } catch (err: any) {
      console.error('Checkout error:', err);
      Alert.alert('Error', err.message || 'No se pudo crear el pedido. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };


  // Empty cart guard (skip if showing confirmation modal)
  if (items.length === 0 && !confirmedOrder) {
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
                      {item.notes ? (
                        <Text style={styles.itemNotes}>{item.notes}</Text>
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

        {/* Tip selector */}
        <YCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="award" size={18} color={DS.colors.green} />
            <Text style={styles.sectionTitle}>Propina para el repartidor</Text>
          </View>
          <View style={styles.tipRow}>
            {[0, 10, 20, 30].map((amount) => {
              const isActive = !showCustomTip && tip === amount;
              return (
                <TouchableOpacity
                  key={amount}
                  style={[styles.tipBtn, isActive && styles.tipBtnActive]}
                  onPress={() => {
                    setTip(amount);
                    setShowCustomTip(false);
                    setCustomTip('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tipBtnText, isActive && styles.tipBtnTextActive]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.tipBtn, showCustomTip && styles.tipBtnActive]}
              onPress={() => {
                setShowCustomTip(true);
                if (!customTip) setTip(0);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tipBtnText, showCustomTip && styles.tipBtnTextActive]}>
                Otra
              </Text>
            </TouchableOpacity>
          </View>
          {showCustomTip && (
            <View style={styles.customTipRow}>
              <Text style={styles.customTipSign}>$</Text>
              <TextInput
                style={styles.customTipInput}
                placeholder="0"
                placeholderTextColor={DS.colors.placeholder}
                keyboardType="numeric"
                value={customTip}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  setCustomTip(cleaned);
                  setTip(cleaned ? parseInt(cleaned, 10) : 0);
                }}
                maxLength={4}
              />
            </View>
          )}
          <Text style={styles.tipSubtitle}>100% va para tu repartidor</Text>
        </YCard>

        {/* Totals */}
        <YCard style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Envio{effectiveDistance !== null ? ` (${formatDistance(effectiveDistance)})` : ''}
            </Text>
            <Text style={[styles.totalValue, isFreeDelivery && styles.freeText]}>
              {effectiveDistance !== null
                ? isFreeDelivery
                  ? 'GRATIS'
                  : `$${deliveryFee.toFixed(2)}`
                : 'Selecciona direccion'}
            </Text>
          </View>
          {tip > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Propina</Text>
              <Text style={styles.totalValue}>${tip.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>${grandTotal.toFixed(2)}</Text>
          </View>
        </YCard>

        {/* ETA card */}
        <YCard style={styles.section}>
          <View style={styles.etaRow}>
            <Feather name="clock" size={22} color={DS.colors.green} />
            <View style={styles.etaInfo}>
              <Text style={styles.etaTime}>Entrega estimada: {etaRange.low}-{etaRange.high} min</Text>
              <Text style={styles.etaSubtitle}>Depende de la preparacion y trafico</Text>
            </View>
          </View>
        </YCard>

        {/* Coverage warning */}
        {coverageOk === false && (
          <YCard style={[styles.section, { borderLeftWidth: 3, borderLeftColor: '#F59E0B' }] as any}>
            <View style={styles.etaRow}>
              <Feather name="alert-triangle" size={20} color="#F59E0B" />
              <View style={styles.etaInfo}>
                <Text style={[styles.etaTime, { color: '#F59E0B' }]}>Sin repartidores cerca</Text>
                <Text style={styles.etaSubtitle}>Tu pedido se asignara cuando uno este disponible</Text>
              </View>
            </View>
          </YCard>
        )}

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

      {/* Order confirmation modal */}
      <Modal visible={!!confirmedOrder} animationType="fade" transparent={false}>
        <SafeAreaView style={styles.confirmModal}>
          <ScrollView contentContainerStyle={styles.confirmScroll} showsVerticalScrollIndicator={false}>
            {/* Green checkmark circle */}
            <View style={styles.confirmCheck}>
              <Feather name="check" size={48} color="#FFFFFF" />
            </View>

            <Text style={styles.confirmTitle}>Pedido Confirmado!</Text>

            {/* Delivery code box */}
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Codigo de entrega</Text>
              <Text style={styles.codeValue}>{confirmedOrder?.deliveryCode}</Text>
            </View>
            <Text style={styles.codeHint}>Muestra este codigo al repartidor</Text>

            {/* ETA */}
            <View style={styles.confirmEta}>
              <Feather name="clock" size={20} color={DS.colors.green} />
              <Text style={styles.confirmEtaText}>
                Entrega estimada: {etaRange.low}-{etaRange.high} min
              </Text>
            </View>

            {tip > 0 && (
              <Text style={styles.confirmTipText}>
                Incluye ${tip} de propina
              </Text>
            )}

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.confirmBtnPrimary, colorShadow(DS.colors.green)]}
              onPress={() => {
                const orderId = confirmedOrder?.id;
                setConfirmedOrder(null);
                router.replace(`/tracking/${orderId}` as any);
              }}
              activeOpacity={0.85}
            >
              <Feather name="map-pin" size={20} color="#FFFFFF" />
              <Text style={styles.confirmBtnPrimaryText}>Ver Seguimiento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtnOutline}
              onPress={() => {
                setConfirmedOrder(null);
                router.replace('/' as any);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnOutlineText}>Ir al Inicio</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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

  // Tip selector
  tipRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
    marginBottom: DS.space.sm,
  },
  tipBtn: {
    flex: 1,
    height: 44,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.card,
    borderWidth: 1.5,
    borderColor: DS.colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipBtnActive: {
    backgroundColor: DS.colors.green,
    borderColor: DS.colors.green,
  },
  tipBtnText: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  tipBtnTextActive: { color: '#FFFFFF' },
  customTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    marginBottom: DS.space.sm,
  },
  customTipSign: {
    ...DS.fonts.bodyMed,
    color: DS.colors.muted,
  },
  customTipInput: {
    flex: 1,
    height: 44,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.divider,
    paddingHorizontal: DS.space.md,
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  tipSubtitle: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },

  // Confirmation tip
  confirmTipText: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    textAlign: 'center',
  },

  // Item notes
  itemNotes: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // ETA card
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  etaInfo: { flex: 1, gap: 2 },
  etaTime: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  etaSubtitle: { ...DS.fonts.small, color: DS.colors.muted },

  // Confirmation modal
  confirmModal: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  confirmScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.xl,
    gap: DS.space.lg,
  },
  confirmCheck: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.space.md,
  },
  confirmTitle: {
    ...DS.fonts.title,
    color: DS.colors.dark,
    fontSize: 26,
    textAlign: 'center',
  },
  codeBox: {
    borderWidth: 2,
    borderColor: DS.colors.green,
    borderRadius: DS.radius.xl,
    paddingVertical: DS.space.lg,
    paddingHorizontal: DS.space.xxl,
    alignItems: 'center',
    gap: DS.space.xs,
    backgroundColor: DS.colors.card,
  },
  codeLabel: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValue: {
    ...DS.fonts.title,
    color: DS.colors.green,
    fontSize: 36,
    letterSpacing: 6,
  },
  codeHint: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    textAlign: 'center',
  },
  confirmEta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    backgroundColor: DS.colors.greenLight,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.lg,
    borderRadius: DS.radius.lg,
  },
  confirmEtaText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  confirmBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.xl,
    height: DS.touch.button,
    width: '100%',
    marginTop: DS.space.md,
  },
  confirmBtnPrimaryText: {
    ...DS.fonts.button,
    color: '#FFFFFF',
  },
  confirmBtnOutline: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DS.radius.xl,
    height: DS.touch.button,
    width: '100%',
    borderWidth: 1.5,
    borderColor: DS.colors.hairline,
    backgroundColor: DS.colors.card,
  },
  confirmBtnOutlineText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.muted,
  },
});
