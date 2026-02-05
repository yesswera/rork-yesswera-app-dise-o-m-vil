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
import { MapPin, Clock, Package, CheckCircle, ArrowLeft, Navigation, MessageCircle, Phone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { getDriverOrders, confirmPickup, validateDeliveryCode } from '@/services/orders';
import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  // Ref for TextInput focus (Android fix)
  const deliveryInputRef = useRef<TextInput>(null);

  const loadActiveOrder = useCallback(async () => {
    if (!user || !token) return;

    try {
      // Get driver record for this user
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        Alert.alert('Error', 'No se encontró tu registro de repartidor');
        return;
      }

      const activeOrders = await getDriverOrders(driver.id);
      if (activeOrders.length > 0) {
        setOrder(activeOrders[0]);
      } else {
        Alert.alert('Sin órdenes', 'No tienes órdenes activas', [
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
    const interval = setInterval(loadActiveOrder, 10000);
    return () => clearInterval(interval);
  }, [loadActiveOrder]);

  const handleConfirmPickup = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmPickup(order.id.toString());
      if (result.success) {
        Alert.alert('En Camino', 'Orden recogida. Ahora ve al cliente.');
        await loadActiveOrder();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo confirmar la recogida');
    } finally {
      setValidating(false);
    }
  };

  const handleValidateDelivery = async () => {
    if (!order || !token || !deliveryCodeInput) {
      Alert.alert('Error', 'Ingresa el código de entrega');
      return;
    }

    setValidating(true);
    try {
      const result = await validateDeliveryCode(order.id.toString(), deliveryCodeInput);
      if (result.success) {
        Alert.alert(
          '¡Orden Completada!',
          'Entrega registrada exitosamente',
          [{ text: 'OK', onPress: () => router.push('/driver/dashboard') }]
        );
        setDeliveryCodeInput('');
      } else {
        Alert.alert('Código Incorrecto', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo validar el código');
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

  const isDriverVerified = order.driverVerification?.validated || order.status === 'driver_verified';
  const isPickedUp = order.pickupValidation?.validated || order.status === 'in_transit';
  const canShowDriverCode = !isDriverVerified && (order.status === 'assigned' || order.status === 'accepted' || order.status === 'ready');
  const canConfirmPickup = isDriverVerified && order.status === 'driver_verified';
  const canDeliver = isPickedUp && order.status === 'in_transit';

  const openNavigation = (address: string, location?: { latitude: number; longitude: number }) => {
    let url: string;

    if (location?.latitude && location?.longitude) {
      // Si tenemos coordenadas, usar navegación directa
      url = Platform.select({
        ios: `maps:?daddr=${location.latitude},${location.longitude}&dirflg=d`,
        android: `google.navigation:q=${location.latitude},${location.longitude}`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

      // Intentar Waze primero
      Linking.canOpenURL('waze://').then((supported) => {
        if (supported) {
          Linking.openURL(`waze://?ll=${location.latitude},${location.longitude}&navigate=yes`);
        } else {
          Linking.openURL(url);
        }
      });
    } else {
      // Si solo tenemos dirección, buscar en Google Maps
      const encodedAddress = encodeURIComponent(address);
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  const callClient = () => {
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    } else {
      Alert.alert('Sin teléfono', 'No hay número de contacto disponible');
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
          <View style={styles.statusCard}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalles de la Orden</Text>

            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <MapPin size={18} color={Colors.primary} />
                <Text style={styles.addressTitle}>Recogida</Text>
              </View>
              <Text style={styles.addressText}>{order.pickupAddress || 'N/A'}</Text>
              {!isPickedUp && (
                <TouchableOpacity
                  style={styles.navButtonSmall}
                  onPress={() => openNavigation(order.pickupAddress || '', order.pickupLocation)}
                >
                  <Navigation size={16} color={Colors.white} />
                  <Text style={styles.navButtonSmallText}>Ir al negocio</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <MapPin size={18} color={Colors.success} />
                <Text style={styles.addressTitle}>Entrega</Text>
              </View>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
              {isPickedUp && (
                <TouchableOpacity
                  style={[styles.navButtonSmall, styles.navButtonGreen]}
                  onPress={() => openNavigation(order.deliveryAddress, order.deliveryLocation)}
                >
                  <Navigation size={16} color={Colors.white} />
                  <Text style={styles.navButtonSmallText}>Ir al cliente</Text>
                </TouchableOpacity>
              )}
            </View>

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

          {canShowDriverCode && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Package size={24} color={Colors.primary} />
                <Text style={styles.stepTitle}>Paso 1: Identificarte</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Muestra este codigo al negocio para que te identifiquen:
              </Text>
              <View style={styles.codeDisplayContainer}>
                <Text style={styles.codeDisplayLabel}>Tu codigo de repartidor:</Text>
                <Text style={styles.codeDisplay}>{order.driverCode}</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Espera a que el negocio valide tu codigo y te entregue el pedido.
              </Text>
            </View>
          )}

          {isDriverVerified && !isPickedUp && (
            <View style={[styles.card, styles.successCard]}>
              <CheckCircle size={32} color={Colors.success} />
              <Text style={styles.successText}>Negocio te verifico</Text>
            </View>
          )}

          {canConfirmPickup && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Package size={24} color={Colors.primary} />
                <Text style={styles.stepTitle}>Paso 2: Confirmar Recogida</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Ya tienes el pedido en mano? Confirma para iniciar el viaje al cliente.
              </Text>
              <TouchableOpacity
                style={[styles.validateButton, validating && styles.validateButtonDisabled]}
                onPress={handleConfirmPickup}
                disabled={validating}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <CheckCircle size={20} color={Colors.white} />
                    <Text style={styles.validateButtonText}>Confirmar Recogida</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isPickedUp && (
            <View style={[styles.card, styles.successCard]}>
              <CheckCircle size={32} color={Colors.success} />
              <Text style={styles.successText}>
                Orden recogida - En camino al cliente
              </Text>
            </View>
          )}

          {canDeliver && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <MapPin size={24} color={Colors.success} />
                <Text style={styles.stepTitle}>Paso 3: Entregar Orden</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Pide el codigo de entrega al cliente (5 caracteres)
              </Text>
              <TextInput
                ref={deliveryInputRef}
                style={styles.codeInput}
                placeholder="Codigo (5 chars)"
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
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    assigned: 'Asignada - Ve al negocio',
    accepted: 'Aceptada - Lista para recoger',
    preparing: 'En preparación',
    ready: 'Lista para recoger',
    driver_verified: 'Verificado - Recoge el pedido',
    picked_up: 'Recogida - En camino',
    in_transit: 'En camino al cliente',
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
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeDisplayLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  codeDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
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
  deliveryButton: {
    backgroundColor: Colors.success,
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
