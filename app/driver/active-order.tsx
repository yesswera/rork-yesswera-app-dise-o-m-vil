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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Package, CheckCircle, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { getActiveOrders, validatePickupCode, validateDeliveryCode } from '@/services/orders';
import { Order } from '@/constants/types';

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  // Refs for TextInput focus (Android fix)
  const pickupInputRef = useRef<TextInput>(null);
  const deliveryInputRef = useRef<TextInput>(null);

  const loadActiveOrder = useCallback(async () => {
    if (!user || !token) return;

    try {
      const activeOrders = await getActiveOrders(user.id, token);
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

  const handleValidatePickup = async () => {
    if (!order || !token || !pickupCodeInput) {
      Alert.alert('Error', 'Ingresa el código de recogida');
      return;
    }

    setValidating(true);
    try {
      const result = await validatePickupCode(order.id.toString(), pickupCodeInput, token);
      if (result.success) {
        Alert.alert('¡Éxito!', 'Orden recogida correctamente');
        setPickupCodeInput('');
        await loadActiveOrder();
      } else {
        Alert.alert('Código Incorrecto', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo validar el código');
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
      const result = await validateDeliveryCode(order.id.toString(), deliveryCodeInput, token);
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

  const isPickedUp = order.pickupValidation?.validated;
  const canPickup = order.status === 'accepted' || order.status === 'ready' || order.status === 'assigned';
  const canDeliver = isPickedUp && (order.status === 'in_transit' || order.status === 'picked_up');

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
            <View style={styles.detailRow}>
              <MapPin size={18} color={Colors.primary} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Recogida:</Text>
                <Text style={styles.detailText}>{order.pickupAddress || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={18} color={Colors.success} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Entrega:</Text>
                <Text style={styles.detailText}>{order.deliveryAddress}</Text>
              </View>
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

          {canPickup && !isPickedUp && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Package size={24} color={Colors.primary} />
                <Text style={styles.stepTitle}>Paso 1: Recoger Orden</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Muestra este código al negocio para recoger la orden:
              </Text>
              <View style={styles.codeDisplayContainer}>
                <Text style={styles.codeDisplayLabel}>Tu código de recogida:</Text>
                <Text style={styles.codeDisplay}>{order.pickupCode}</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Cuando el negocio confirme, ingresa el mismo código:
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => pickupInputRef.current?.focus()}
              >
                <TextInput
                  ref={pickupInputRef}
                  style={styles.codeInput}
                  placeholder="Código (5 caracteres)"
                  placeholderTextColor={Colors.text.light}
                  value={pickupCodeInput}
                  onChangeText={(text) => setPickupCodeInput(text.toUpperCase())}
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
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.validateButton,
                  (pickupCodeInput.length !== 5 || validating) && styles.validateButtonDisabled,
                ]}
                onPress={handleValidatePickup}
                disabled={pickupCodeInput.length !== 5 || validating}
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
                ✅ Orden recogida a las{' '}
                {new Date(order.pickupValidation!.validatedAt!).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          {canDeliver && (
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <MapPin size={24} color={Colors.success} />
                <Text style={styles.stepTitle}>Paso 2: Entregar Orden</Text>
              </View>
              <Text style={styles.stepInstruction}>
                Solicita el código al cliente al entregar
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => deliveryInputRef.current?.focus()}
              >
                <TextInput
                  ref={deliveryInputRef}
                  style={styles.codeInput}
                  placeholder="Código de entrega (5 caracteres)"
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
              </TouchableOpacity>
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
    assigned: 'Asignada - Ve a recoger',
    accepted: 'Aceptada - Lista para recoger',
    preparing: 'En preparación',
    ready: 'Lista para recoger',
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
