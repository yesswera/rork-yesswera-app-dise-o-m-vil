import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: CARRITO DE COMPRAS
// Usa ScreenContainer para diseño unificado con gradiente verde
// ============================================================================

import {
  StyleSheet,
  View,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, Plus, Minus, Users, Shield, Check, ShoppingCart } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { useCart } from '@/contexts/cart';
import { useAuth } from '@/contexts/auth';
import { SavedAddress, PaymentMethod } from '@/constants/types';
import { formatPriceWithUnit } from '@/constants/units';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import TipSelector from '@/components/TipSelector';
import { createOrder } from '@/services/orders';
import { getBusinessLocation } from '@/services/products';
import { calculateDistance, calculateDeliveryFee, formatDistance } from '@/utils/distance';
import ScreenContainer from '@/components/ScreenContainer';
import { OrderSounds, SoundFeedback } from '@/services/sounds';
import { trackServiceUsage } from '@/services/user-preferences';

// ============================================================================
// COLORES EXPLÍCITOS PARA MODO OSCURO
// ============================================================================
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

// Relationships for minor protection
const RELATIONSHIPS = [
  { id: 'hijo', label: 'Hijo/a' },
  { id: 'familiar', label: 'Familiar' },
  { id: 'conocido', label: 'Conocido' },
  { id: 'otro', label: 'Otro' },
];

export default function CartScreen() {
  const router = useRouter();
  const { isDark, colors, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user, token } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tip, setTip] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [businessLocation, setBusinessLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Recipient and minor protection
  const [someoneElseReceives, setSomeoneElseReceives] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientIsMinor, setRecipientIsMinor] = useState(false);
  const [minorName, setMinorName] = useState('');
  const [minorAge, setMinorAge] = useState('');
  const [minorRelationship, setMinorRelationship] = useState('');
  const [acceptMinorResponsibility, setAcceptMinorResponsibility] = useState(false);

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
      Alert.alert('Error', 'Por favor selecciona una direccion de entrega');
      return;
    }

    if (distance === null) {
      Alert.alert('Error', 'No se pudo calcular la distancia. Verifica tu direccion.');
      return;
    }

    if (!user) {
      Alert.alert(
        'Iniciar Sesion',
        'Necesitas iniciar sesion para completar tu orden',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar Sesion',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Tu carrito esta vacio');
      return;
    }

    // Validate recipient info if someone else receives
    if (someoneElseReceives) {
      if (!recipientName.trim()) {
        Alert.alert('Error', 'Ingresa el nombre de quien recibira el pedido');
        return;
      }
      if (!recipientPhone.trim()) {
        Alert.alert('Error', 'Ingresa el telefono de quien recibira el pedido');
        return;
      }

      // Validate minor protection
      if (recipientIsMinor) {
        if (!minorName.trim()) {
          Alert.alert('Error', 'Ingresa el nombre del menor');
          return;
        }
        if (!minorAge.trim()) {
          Alert.alert('Error', 'Ingresa la edad aproximada del menor');
          return;
        }
        if (!minorRelationship) {
          Alert.alert('Error', 'Selecciona tu relacion con el menor');
          return;
        }
        if (!acceptMinorResponsibility) {
          Alert.alert('Error', 'Debes aceptar la responsabilidad de la entrega al menor');
          return;
        }
      }
    }

    const currentBusinessId = items[0]?.businessId;
    if (!currentBusinessId) {
      Alert.alert('Error', 'No se pudo identificar el negocio');
      return;
    }

    setIsProcessing(true);

    try {
      // Build delivery instructions with recipient info
      let instructions = selectedAddress.instructions || '';
      if (someoneElseReceives) {
        instructions += `\n\nDESTINATARIO: ${recipientName} (Tel: ${recipientPhone})`;
        if (recipientIsMinor) {
          const rel = RELATIONSHIPS.find(r => r.id === minorRelationship);
          instructions += `\nENTREGA A MENOR: ${minorName} (~${minorAge} anos)`;
          instructions += `\nRelacion: ${rel?.label || minorRelationship}`;
          instructions += `\nAutorizado por: ${user.name}`;
        }
      }

      // Build package details for minor protection
      const packageDetails = someoneElseReceives ? {
        type: 'food',
        size: 'medium',
        weight: 'light',
        isFragile: false,
        description: items.map(i => `${i.quantity}x ${i.name}`).join(', '),
        recipientName: recipientName,
        recipientPhone: recipientPhone,
        isMinorRecipient: recipientIsMinor,
        minorDetails: recipientIsMinor ? {
          name: minorName,
          age: minorAge,
          relationship: minorRelationship,
          authorizedBy: user.name,
        } : undefined,
      } : undefined;

      const order = await createOrder({
        clientId: user.id,
        businessId: currentBusinessId,
        serviceType: 'food',
        deliveryAddress: selectedAddress.address,
        deliveryLocation: selectedAddress.latitude && selectedAddress.longitude ? {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        } : undefined,
        deliveryInstructions: instructions,
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
        packageDetails: packageDetails,
      });

      console.log('Orden creada exitosamente:', order);

      // Play success sound for order creation
      OrderSounds.accepted();

      // Track service usage for analytics/personalization
      trackServiceUsage(user.id, 'food', finalTotal).catch(console.error);

      const orderId = order.id;
      const deliveryCode = order.deliveryCode;

      clearCart();

      Alert.alert(
        'Pedido Creado!',
        `Tu codigo de entrega es:\n\n${deliveryCode}\n\nMuestra este codigo al repartidor cuando llegue.`,
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
      // Play error sound
      SoundFeedback.error();
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

  // Empty cart state
  if (items.length === 0) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={ShoppingCart}
        headerTitle="Carrito Vacio"
        headerSubtitle="Agrega productos de tu restaurante favorito"
      >
        <View style={styles.emptyContainer}>
          <TouchableSound
            style={[styles.emptyButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            onPress={() => router.back()}
          >
            <ThemedText variant="body" style={styles.emptyButtonText}>Ver Restaurantes</ThemedText>
          </TouchableSound>
        </View>
      </ScreenContainer>
    );
  }

  // Footer with checkout button
  const checkoutFooter = (
    <TouchableSound
      style={[
        styles.checkoutButton,
        { backgroundColor: colors.primary, borderRadius: radius.md },
        isProcessing && styles.checkoutButtonDisabled
      ]}
      onPress={handleCheckout}
      disabled={isProcessing}
    >
      <ThemedText variant="body" style={styles.checkoutButtonText}>
        {isProcessing ? 'Procesando...' : 'Confirmar Orden'}
      </ThemedText>
    </TouchableSound>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={ShoppingCart}
      headerTitle="Tu Carrito"
      headerSubtitle={`${items.length} producto${items.length !== 1 ? 's' : ''} - $${total.toFixed(2)}`}
      footer={checkoutFooter}
      footerPadding={100}
    >
      {/* Products section */}
      <View style={styles.itemsSection}>
        <ThemedText variant="h2" style={{ marginBottom: space.md }}>Tus Productos</ThemedText>
        {items.map((item) => (
          <View
            key={item.id}
            style={[styles.cartItem, {
              backgroundColor: theme.card,
              borderRadius: radius.md,
              marginBottom: space.sm,
              padding: space.sm,
            }]}
          >
            <Image
              source={{ uri: item.image }}
              style={[styles.itemImage, { borderRadius: radius.sm }]}
              contentFit="cover"
            />
            <View style={styles.itemInfo}>
              <ThemedText variant="subtitle" bold>{item.name}</ThemedText>
              <ThemedText variant="body" style={{ color: colors.primary }}>
                {formatPriceWithUnit(item.price, (item as any).unit || 'pieza')}
              </ThemedText>
              <View style={[styles.itemControls, { gap: space.xs }]}>
                <TouchableSound
                  style={[styles.controlButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus size={16} color={colors.primary} strokeWidth={3} />
                </TouchableSound>
                <ThemedText variant="body" bold style={styles.quantityText}>{item.quantity}</ThemedText>
                <TouchableSound
                  style={[styles.controlButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus size={16} color={colors.primary} strokeWidth={3} />
                </TouchableSound>
              </View>
            </View>
            <TouchableSound
              style={styles.deleteButton}
              onPress={() => removeItem(item.id)}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableSound>
          </View>
        ))}
      </View>

      {/* Address, payment, recipient, tip selectors */}
      <View pointerEvents={isProcessing ? 'none' : 'auto'} style={isProcessing ? { opacity: 0.5 } : undefined}>
        <AddressSelector
          selectedAddress={selectedAddress}
          onAddressSelect={setSelectedAddress}
        />

        {/* Someone else receives toggle */}
        <View style={[styles.recipientSection, { marginBottom: space.md }]}>
          <View style={[styles.toggleRow, {
            backgroundColor: theme.card,
            borderRadius: radius.md,
            padding: space.md,
          }]}>
            <View style={[styles.toggleInfo, { gap: space.sm }]}>
              <Users size={22} color={someoneElseReceives ? colors.primary : theme.textSecondary} />
              <View>
                <ThemedText variant="body" bold>Alguien mas recibira?</ThemedText>
                <ThemedText variant="caption" color="secondary">Si no estaras en casa</ThemedText>
              </View>
            </View>
            <Switch
              value={someoneElseReceives}
              onValueChange={setSomeoneElseReceives}
              trackColor={{ false: theme.border, true: colors.primary }}
              thumbColor={someoneElseReceives ? '#FFFFFF' : theme.textMuted}
            />
          </View>

          {someoneElseReceives && (
            <View style={[styles.recipientForm, { marginTop: space.sm }]}>
              <TextInput
                style={[styles.recipientInput, {
                  backgroundColor: theme.card,
                  borderRadius: radius.sm,
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="Nombre de quien recibe"
                placeholderTextColor={theme.textMuted}
                value={recipientName}
                onChangeText={setRecipientName}
              />
              <TextInput
                style={[styles.recipientInput, {
                  backgroundColor: theme.card,
                  borderRadius: radius.sm,
                  color: theme.text,
                  borderColor: theme.border,
                }]}
                placeholder="Telefono de quien recibe"
                placeholderTextColor={theme.textMuted}
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />

              {/* Minor protection toggle */}
              <View style={[styles.minorToggle, {
                backgroundColor: theme.cardAlt,
                borderRadius: radius.sm,
              }]}>
                <View style={[styles.minorToggleInfo, { gap: space.xs }]}>
                  <Shield size={18} color={recipientIsMinor ? colors.warning : theme.textSecondary} />
                  <ThemedText variant="body">Es menor de edad?</ThemedText>
                </View>
                <Switch
                  value={recipientIsMinor}
                  onValueChange={setRecipientIsMinor}
                  trackColor={{ false: theme.border, true: colors.warning }}
                  thumbColor={recipientIsMinor ? '#FFFFFF' : theme.textMuted}
                />
              </View>

              {recipientIsMinor && (
                <View style={[styles.minorForm, {
                  backgroundColor: colors.warning + '10',
                  borderRadius: radius.md,
                  borderColor: colors.warning,
                  padding: space.md,
                }]}>
                  <View style={[styles.minorWarning, {
                    backgroundColor: colors.warning + '20',
                    borderRadius: radius.sm,
                    padding: space.sm,
                    marginBottom: space.md,
                  }]}>
                    <Shield size={18} color={colors.warning} />
                    <ThemedText variant="caption" color="secondary" style={{ flex: 1, marginLeft: space.xs }}>
                      Por seguridad, necesitamos informacion del menor que recibira.
                    </ThemedText>
                  </View>

                  <TextInput
                    style={[styles.recipientInput, {
                      backgroundColor: theme.card,
                      borderRadius: radius.sm,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="Nombre del menor"
                    placeholderTextColor={theme.textMuted}
                    value={minorName}
                    onChangeText={setMinorName}
                  />
                  <TextInput
                    style={[styles.recipientInput, {
                      backgroundColor: theme.card,
                      borderRadius: radius.sm,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="Edad aproximada"
                    placeholderTextColor={theme.textMuted}
                    value={minorAge}
                    onChangeText={setMinorAge}
                    keyboardType="number-pad"
                  />

                  <ThemedText variant="body" bold style={{ marginBottom: space.xs }}>Tu relacion con el menor:</ThemedText>
                  <View style={[styles.relationshipRow, { gap: space.xs, marginBottom: space.md }]}>
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableSound
                        key={rel.id}
                        style={[
                          styles.relationshipChip,
                          {
                            backgroundColor: minorRelationship === rel.id ? colors.warning : theme.card,
                            borderColor: minorRelationship === rel.id ? colors.warning : theme.border,
                            borderRadius: radius.full,
                          }
                        ]}
                        onPress={() => setMinorRelationship(rel.id)}
                      >
                        <ThemedText
                          variant="caption"
                          style={{ color: minorRelationship === rel.id ? '#FFFFFF' : theme.text }}
                        >
                          {rel.label}
                        </ThemedText>
                      </TouchableSound>
                    ))}
                  </View>

                  <TouchableSound
                    style={[styles.responsibilityRow, { gap: space.sm }]}
                    onPress={() => setAcceptMinorResponsibility(!acceptMinorResponsibility)}
                  >
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: acceptMinorResponsibility ? colors.primary : theme.border,
                        backgroundColor: acceptMinorResponsibility ? colors.primary : 'transparent',
                      }
                    ]}>
                      {acceptMinorResponsibility && <Check size={14} color="#FFFFFF" />}
                    </View>
                    <ThemedText variant="caption" color="secondary" style={{ flex: 1 }}>
                      Soy responsable y autorizo la entrega al menor indicado.
                    </ThemedText>
                  </TouchableSound>
                </View>
              )}
            </View>
          )}
        </View>

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

      {/* Summary section */}
      <View style={[styles.summarySection, {
        backgroundColor: theme.card,
        borderRadius: radius.md,
        padding: space.md,
      }]}>
        <ThemedText variant="h2" style={{ marginBottom: space.md }}>Resumen</ThemedText>

        <View style={styles.summaryRow}>
          <ThemedText variant="body" color="secondary">Subtotal</ThemedText>
          <ThemedText variant="body" bold>${total.toFixed(2)}</ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <ThemedText variant="body" color="secondary">
            Entrega {distance !== null ? `(${formatDistance(distance)})` : ''}
          </ThemedText>
          <ThemedText variant="body" bold>
            {distance !== null ? `$${deliveryCost.toFixed(2)}` : 'Selecciona direccion'}
          </ThemedText>
        </View>

        {tip > 0 && (
          <View style={styles.summaryRow}>
            <ThemedText variant="body" color="secondary">Propina</ThemedText>
            <ThemedText variant="body" bold style={{ color: colors.warning }}>${tip.toFixed(2)}</ThemedText>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: space.sm }]} />

        <View style={styles.summaryRow}>
          <ThemedText variant="h3">Total</ThemedText>
          <ThemedText variant="h3" style={{ color: colors.primary }}>${finalTotal.toFixed(2)}</ThemedText>
        </View>

        <ThemedText variant="caption" color="secondary" style={{ marginTop: space.xs }}>
          Tarifa: $15 base {distance !== null && distance > 2 ? `+ $4 x ${(distance - 2).toFixed(1)} km extra` : '(primeros 2 km incluidos)'}
        </ThemedText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemsSection: {
    marginBottom: 24,
  },
  cartItem: {
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  recipientSection: {},
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientForm: {},
  recipientInput: {
    padding: 14,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
  },
  minorToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },
  minorToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minorForm: {
    borderWidth: 1,
  },
  minorWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  relationshipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  relationshipChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  responsibilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySection: {},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  divider: {
    height: 1,
  },
  checkoutButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
