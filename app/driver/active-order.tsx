import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Package, CheckCircle, ArrowLeft, Navigation, MessageCircle, Phone, Store } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import {
  getDriverOrders,
  confirmArrivalAtBusiness,
  confirmOrderReceived,
  confirmArrivalAtClient,
  validateDeliveryCode
} from '@/services/orders';
import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const deliveryInputRef = useRef<TextInput>(null);

  const loadActiveOrder = useCallback(async () => {
    if (!user || !token) return;

    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        Alert.alert('Error', 'No se encontro tu registro de repartidor');
        return;
      }

      const activeOrders = await getDriverOrders(driver.id);
      if (activeOrders.length > 0) {
        setOrder(activeOrders[0]);
      } else {
        Alert.alert('Sin ordenes', 'No tienes ordenes activas', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error loading active order:', error);
      Alert.alert('Error', 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  }, [user, token, router]);

  useEffect(() => {
    loadActiveOrder();
    const interval = setInterval(loadActiveOrder, 5000); // Poll every 5s for status changes
    return () => clearInterval(interval);
  }, [loadActiveOrder]);

  // Handler: Driver arrived at business
  const handleArrivedAtBusiness = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmArrivalAtBusiness(order.id.toString());
      if (result.success) {
        Alert.alert('Llegada Confirmada', 'Cuando el pedido este listo, te aparecera el codigo de recoleccion.');
        await loadActiveOrder();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo confirmar la llegada');
    } finally {
      setValidating(false);
    }
  };

  // Handler: Driver confirms received order from business
  const handleOrderReceived = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmOrderReceived(order.id.toString());
      if (result.success) {
        Alert.alert('Orden Recibida', 'Ahora ve al cliente para entregar.');
        await loadActiveOrder();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo confirmar la recepcion');
    } finally {
      setValidating(false);
    }
  };

  // Handler: Driver arrived at client
  const handleArrivedAtClient = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmArrivalAtClient(order.id.toString());
      if (result.success) {
        Alert.alert('Llegada Confirmada', 'El cliente fue notificado. Pide el codigo de entrega.');
        await loadActiveOrder();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo confirmar la llegada');
    } finally {
      setValidating(false);
    }
  };

  // Handler: Validate delivery code
  const handleValidateDelivery = async () => {
    if (!order || !token || !deliveryCodeInput) {
      Alert.alert('Error', 'Ingresa el codigo de entrega');
      return;
    }

    setValidating(true);
    try {
      const result = await validateDeliveryCode(order.id.toString(), deliveryCodeInput);
      if (result.success) {
        Alert.alert(
          'Orden Completada!',
          'Entrega registrada exitosamente',
          [{ text: 'OK', onPress: () => router.push('/driver/dashboard') }]
        );
        setDeliveryCodeInput('');
      } else {
        Alert.alert('Codigo Incorrecto', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo validar el codigo');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando orden...</Text>
      </View>
    );
  }

  if (!order) {
    return null;
  }

  // === STATUS LOGIC ===
  const status = order.status;
  const driverAtBusiness = order.driverAtBusiness;
  const isOrderReady = status === 'ready';

  // Phases
  const isGoingToBusiness = status === 'assigned' || status === 'preparing' || (status === 'ready' && !driverAtBusiness);
  const isWaitingAtBusiness = driverAtBusiness && (status === 'assigned' || status === 'preparing');
  const canShowPickupCode = driverAtBusiness && isOrderReady; // BOTH conditions must be true
  const isHandedToDriver = status === 'handed_to_driver';
  const isInTransit = status === 'in_transit';
  const isAtClient = status === 'arrived';
  const isDelivered = status === 'delivered';

  const openNavigation = (address: string, location?: { latitude: number; longitude: number }) => {
    let url: string;

    if (location?.latitude && location?.longitude) {
      url = Platform.select({
        ios: `maps:?daddr=${location.latitude},${location.longitude}&dirflg=d`,
        android: `google.navigation:q=${location.latitude},${location.longitude}`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

      Linking.canOpenURL('waze://').then((supported) => {
        if (supported) {
          Linking.openURL(`waze://?ll=${location.latitude},${location.longitude}&navigate=yes`);
        } else {
          Linking.openURL(url);
        }
      });
    } else {
      const encodedAddress = encodeURIComponent(address);
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  const callClient = () => {
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    } else {
      Alert.alert('Sin telefono', 'No hay numero de contacto disponible');
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Orden Activa</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status Badge */}
          <View style={styles.statusCard}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{getStatusLabel(status, driverAtBusiness)}</Text>
            </View>
          </View>

          {/* Order Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalles de la Orden</Text>

            {/* Pickup Address */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Store size={18} color={Colors.primary} />
                <Text style={styles.addressTitle}>Negocio</Text>
              </View>
              <Text style={styles.addressText}>{order.pickupAddress || 'N/A'}</Text>
              {isGoingToBusiness && (
                <TouchableOpacity
                  style={styles.navButtonSmall}
                  onPress={() => openNavigation(order.pickupAddress || '', order.pickupLocation)}
                >
                  <Navigation size={16} color={Colors.white} />
                  <Text style={styles.navButtonSmallText}>Ir al negocio</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Delivery Address */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <MapPin size={18} color={Colors.success} />
                <Text style={styles.addressTitle}>Cliente</Text>
              </View>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
              {(isInTransit || isAtClient) && (
                <TouchableOpacity
                  style={[styles.navButtonSmall, styles.navButtonGreen]}
                  onPress={() => openNavigation(order.deliveryAddress, order.deliveryLocation)}
                >
                  <Navigation size={16} color={Colors.white} />
                  <Text style={styles.navButtonSmallText}>Ir al cliente</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Contact Actions */}
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.contactButton} onPress={callClient}>
                <Phone size={18} color={Colors.primary} />
                <Text style={styles.contactButtonText}>Llamar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => router.push(`/chat/${order.id}` as any)}
              >
                <MessageCircle size={18} color={Colors.accent} />
                <Text style={styles.contactButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Time and Total */}
            <View style={styles.detailRow}>
              <Clock size={18} color={Colors.warning} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Hora:</Text>
                <Text style={styles.detailText}>
                  {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalText}>${order.total.toFixed(2)} MXN</Text>
            </View>
          </View>

          {/* === PHASE 1: Going to business === */}
          {isGoingToBusiness && !driverAtBusiness && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Store size={24} color={Colors.primary} />
                <Text style={styles.stepTitle}>Paso 1: Ir al Negocio</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Dirigete al negocio. Cuando llegues, presiona el boton para confirmar tu llegada.
              </Text>
              <TouchableOpacity
                style={[styles.validateButton, validating && styles.validateButtonDisabled]}
                onPress={handleArrivedAtBusiness}
                disabled={validating}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Store size={20} color={Colors.white} />
                    <Text style={styles.validateButtonText}>Ya Llegue al Negocio</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* === PHASE 2: Waiting at business (order not ready yet) === */}
          {isWaitingAtBusiness && (
            <View style={styles.card}>
              <View style={[styles.waitingCard]}>
                <Clock size={32} color={Colors.warning} />
                <Text style={styles.waitingText}>Esperando que el pedido este listo...</Text>
                <Text style={styles.waitingSubtext}>
                  Cuando el negocio termine de preparar, te aparecera el codigo de recoleccion automaticamente.
                </Text>
              </View>
            </View>
          )}

          {/* === PHASE 3: Order ready + Driver at business = Show pickup code === */}
          {canShowPickupCode && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Package size={24} color={Colors.success} />
                <Text style={styles.stepTitle}>Paso 2: Recoger Pedido</Text>
              </View>
              <Text style={styles.stepInstruction}>
                El pedido esta listo! Muestra este codigo al negocio para que te entreguen la comanda:
              </Text>
              <View style={styles.codeDisplayContainer}>
                <Text style={styles.codeDisplayLabel}>Codigo de recoleccion:</Text>
                <Text style={styles.codeDisplay}>{order.comandaCode}</Text>
              </View>
              <Text style={styles.stepInstruction}>
                El negocio validara tu codigo y te entregara el pedido.
              </Text>
            </View>
          )}

          {/* === PHASE 4: Business handed order, driver confirms === */}
          {isHandedToDriver && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <CheckCircle size={24} color={Colors.success} />
                <Text style={styles.stepTitle}>Paso 3: Confirmar Recepcion</Text>
              </View>
              <Text style={styles.stepInstruction}>
                El negocio te entrego el pedido? Confirma para iniciar el viaje al cliente.
              </Text>
              <TouchableOpacity
                style={[styles.validateButton, styles.successButton, validating && styles.validateButtonDisabled]}
                onPress={handleOrderReceived}
                disabled={validating}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <CheckCircle size={20} color={Colors.white} />
                    <Text style={styles.validateButtonText}>Recibi la Orden</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* === PHASE 5: In transit to client === */}
          {isInTransit && (
            <>
              <View style={[styles.card, styles.successCard]}>
                <CheckCircle size={32} color={Colors.success} />
                <Text style={styles.successText}>En camino al cliente</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.stepHeader}>
                  <MapPin size={24} color={Colors.accent} />
                  <Text style={styles.stepTitle}>Paso 4: Llegar al Cliente</Text>
                </View>
                <Text style={styles.stepInstruction}>
                  Cuando estes en el domicilio del cliente, confirma tu llegada.
                </Text>
                <TouchableOpacity
                  style={[styles.validateButton, styles.arrivalButton, validating && styles.validateButtonDisabled]}
                  onPress={handleArrivedAtClient}
                  disabled={validating}
                >
                  {validating ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MapPin size={20} color={Colors.white} />
                      <Text style={styles.validateButtonText}>Ya Llegue</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* === PHASE 6: At client, enter delivery code === */}
          {isAtClient && (
            <>
              <View style={[styles.card, styles.successCard]}>
                <CheckCircle size={32} color={Colors.success} />
                <Text style={styles.successText}>Cliente notificado - Esperando</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.stepHeader}>
                  <Package size={24} color={Colors.success} />
                  <Text style={styles.stepTitle}>Paso 5: Entregar Orden</Text>
                </View>
                <Text style={styles.stepInstruction}>
                  Pide el codigo de entrega al cliente (5 caracteres)
                </Text>
                <TextInput
                  ref={deliveryInputRef}
                  style={styles.codeInput}
                  placeholder="Codigo de entrega"
                  placeholderTextColor={Colors.text.light}
                  value={deliveryCodeInput}
                  onChangeText={(text) => setDeliveryCodeInput(text.toUpperCase())}
                  maxLength={5}
                  autoCapitalize="characters"
                  editable={!validating}
                  keyboardType="default"
                  returnKeyType="done"
                  autoCorrect={false}
                  blurOnSubmit={true}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  selectTextOnFocus={true}
                />
                <TouchableOpacity
                  style={[
                    styles.validateButton,
                    styles.deliveryButton,
                    (deliveryCodeInput.length !== 5 || validating) && styles.validateButtonDisabled,
                  ]}
                  onPress={handleValidateDelivery}
                  disabled={deliveryCodeInput.length !== 5 || validating}
                >
                  {validating ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <CheckCircle size={20} color={Colors.white} />
                      <Text style={styles.validateButtonText}>Completar Entrega</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

function getStatusLabel(status: string, driverAtBusiness?: boolean): string {
  if (driverAtBusiness && (status === 'assigned' || status === 'preparing')) {
    return 'Esperando pedido en negocio';
  }
  if (driverAtBusiness && status === 'ready') {
    return 'Pedido listo - Recoge ahora';
  }

  const labels: Record<string, string> = {
    assigned: 'Ve al negocio',
    preparing: 'En preparacion - Ve al negocio',
    ready: 'Listo - Ve al negocio',
    handed_to_driver: 'Confirma recepcion',
    in_transit: 'En camino al cliente',
    arrived: 'En domicilio del cliente',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  statusCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  navButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  navButtonGreen: {
    backgroundColor: Colors.success,
  },
  navButtonSmallText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  stepInstruction: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  codeDisplayContainer: {
    backgroundColor: Colors.success + '20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  codeDisplayLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  codeDisplay: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 8,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
    color: Colors.text.primary,
  },
  validateButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  validateButtonDisabled: {
    opacity: 0.5,
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  deliveryButton: {
    backgroundColor: Colors.success,
  },
  arrivalButton: {
    backgroundColor: Colors.accent,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 8,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  successText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  waitingCard: {
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: 12,
    padding: 20,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
    marginTop: 12,
    textAlign: 'center',
  },
  waitingSubtext: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
  },
});
