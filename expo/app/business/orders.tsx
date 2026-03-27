import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ORDENES DEL NEGOCIO
// Usa ScreenContainer para diseno unificado
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, MapPin, CheckCircle, ClipboardList, Package, CookingPot, XCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { getBusinessOrders, acceptOrder, updateOrderStatus, validatePickupAndHandover, businessRejectOrder, REJECTION_REASONS, RejectionReason } from '@/services/orders';
import { markOrderReadyAndAssign } from '@/services/driver-assignment';
import { Order } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { useBusinessOrderSubscription } from '@/hooks/useRealtimeOrders';
import PriorityClientBadge from '@/components/PriorityClientBadge';
import { OrderSounds, SoundFeedback, ArrivalSounds } from '@/services/sounds';

// Theme colors via useTheme() — no local COLORS needed

export default function BusinessOrdersScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark, colors } = useTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickupCodeInputs, setPickupCodeInputs] = useState<Record<string, string>>({});
  const [validatingPickup, setValidatingPickup] = useState<string | null>(null);
  const [showPrepTimeFor, setShowPrepTimeFor] = useState<string | null>(null);
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'done'>('new');
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Track orders where driver has arrived to avoid duplicate sounds
  const driverArrivedOrdersRef = useRef<Set<string>>(new Set());

  // Realtime subscription - auto-reload when orders change
  useBusinessOrderSubscription(businessId, () => {
    // Play sound for new incoming orders
    OrderSounds.newOrder();
    loadOrders();
  });

  const loadOrders = useCallback(async () => {
    if (!user || !token) return;

    try {
      // Get the business record for this user
      const { data: businessRows } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const business = businessRows?.[0];
      if (!business) {
        console.error('No business found for user');
        setOrders([]);
        return;
      }

      // Store businessId for realtime subscription
      if (businessId !== business.id) {
        setBusinessId(business.id);
      }

      const fetchedOrders = await getBusinessOrders(business.id);

      // Check for driver arrivals and play sound
      for (const order of fetchedOrders) {
        const orderId = order.id.toString();
        if (order.driverAtBusiness && !driverArrivedOrdersRef.current.has(orderId)) {
          // Driver just arrived at business - play arrival sound
          ArrivalSounds.atBusiness();
          driverArrivedOrdersRef.current.add(orderId);
        }
      }

      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las ordenes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleAcceptOrder = async (orderId: string, prepTime: number) => {
    if (!token) return;

    try {
      await acceptOrder(orderId, prepTime);
      setShowPrepTimeFor(null);
      OrderSounds.accepted();
      Alert.alert('Exito', `Orden aceptada - ${prepTime} min de preparacion`);
      loadOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      SoundFeedback.error();
      Alert.alert('Error', 'No se pudo aceptar la orden');
    }
  };

  // Business validates pickup code from driver and hands over order
  const handleValidatePickup = async (orderId: string) => {
    const code = pickupCodeInputs[orderId]?.trim();
    if (!code || code.length !== 4) {
      SoundFeedback.error();
      Alert.alert('Error', 'Ingresa el codigo de recoleccion del repartidor (4 caracteres)');
      return;
    }

    setValidatingPickup(orderId);
    try {
      const result = await validatePickupAndHandover(orderId, code);
      if (result.success) {
        Alert.alert(
          'Pedido Entregado',
          'El repartidor tiene el pedido. Ahora debe confirmar la recepcion para iniciar el viaje al cliente.'
        );
        setPickupCodeInputs(prev => ({ ...prev, [orderId]: '' }));
        loadOrders();
      } else {
        SoundFeedback.error();
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      SoundFeedback.error();
      Alert.alert('Error', 'No se pudo validar el codigo');
    } finally {
      setValidatingPickup(null);
    }
  };

  const handleStartPreparing = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'preparing');
      loadOrders();
    } catch (error) {
      SoundFeedback.error();
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      // Mark as ready AND auto-assign nearest driver
      const result = await markOrderReadyAndAssign(orderId);
      OrderSounds.ready();
      if (result.success) {
        Alert.alert(
          'Pedido Listo',
          result.assignedDriver
            ? `Repartidor asignado: ${result.assignedDriver.name} (a ${result.assignedDriver.distanceMeters}m)`
            : result.driversNotified && result.driversNotified > 0
              ? `Buscando entre ${result.driversNotified} repartidores cercanos...`
              : 'Buscando repartidores disponibles...'
        );
      } else {
        Alert.alert('Listo', result.message || 'Pedido marcado como listo para recoger');
      }
      loadOrders();
    } catch (error) {
      SoundFeedback.error();
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleRejectOrder = async (orderId: string, reason: RejectionReason) => {
    setRejectingOrder(orderId);
    try {
      await businessRejectOrder(orderId, reason);
      Alert.alert(
        'Orden Rechazada',
        'El cliente ha sido notificado y podra buscar alternativas.',
        [{ text: 'OK' }]
      );
      setShowRejectFor(null);
      loadOrders();
    } catch (error: any) {
      SoundFeedback.error();
      Alert.alert('Error', error.message || 'No se pudo rechazar la orden');
    } finally {
      setRejectingOrder(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusLabel = (status: string, driverAtBusiness?: boolean) => {
    // Special case: order ready and driver waiting
    if (status === 'ready' && driverAtBusiness) {
      return 'Repartidor esperando';
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      preparing: 'Preparando',
      ready: 'Lista para recoger',
      assigned: 'Repartidor en camino',
      handed_to_driver: 'Entregado a repartidor',
      in_transit: 'En camino al cliente',
      arrived: 'Repartidor en domicilio',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'pending') return colors.warning;
    if (status === 'accepted' || status === 'preparing') return colors.accent;
    if (status === 'ready' || status === 'assigned') return colors.primary;
    if (status === 'handed_to_driver' || status === 'in_transit' || status === 'arrived') return colors.success;
    if (status === 'delivered') return colors.success;
    if (status === 'cancelled') return colors.error;
    return colors.text.muted;
  };

  const renderOrder = (order: Order) => {
    const isPending = order.status === 'pending';

    return (
      <TouchableSound
        key={order.id}
        style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border.light }]}
        onPress={() => router.push(`/business/comanda/${order.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <Text style={[styles.orderNumber, { color: colors.text.primary }]}>Orden #{order.id.toString().slice(0, 8)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(order.status)}15` },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusLabel(order.status, order.driverAtBusiness)}
            </Text>
          </View>
        </View>

        {/* Badge Cliente Prioritario */}
        {(order as any).isPriorityClient && (
          <View style={styles.priorityBadgeContainer}>
            <PriorityClientBadge
              reason={(order as any).priorityReason}
              compact={true}
            />
          </View>
        )}

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text.secondary }]} numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color={colors.accent} />
            <Text style={[styles.detailText, { color: colors.text.secondary }]}>
              {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {order.items && order.items.length > 0 && (
            <View style={[styles.itemsList, { borderTopColor: colors.border.light }]}>
              <Text style={[styles.itemsTitle, { color: colors.text.primary }]}>Productos:</Text>
              {order.items.map((item, index) => (
                <Text key={index} style={[styles.itemText, { color: colors.text.secondary }]}>
                  - {item.quantity}x {item.name}
                </Text>
              ))}
            </View>
          )}

          <Text style={[styles.totalText, { color: colors.secondary }]}>Total: ${order.total.toFixed(2)} MXN</Text>
        </View>

        {/* Boton: Comenzar preparacion (accepted -> preparing) */}
        {order.status === 'accepted' && (
          <TouchableSound
            style={[styles.acceptButton, { backgroundColor: colors.accent }]}
            onPress={() => handleStartPreparing(order.id.toString())}
          >
            <CookingPot size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Comenzar Preparacion</Text>
          </TouchableSound>
        )}

        {/* Boton: Marcar como lista (preparing -> ready) */}
        {order.status === 'preparing' && (
          <TouchableSound
            style={[styles.acceptButton, { backgroundColor: colors.primary }]}
            onPress={() => handleMarkReady(order.id.toString())}
          >
            <Package size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Marcar como Lista</Text>
          </TouchableSound>
        )}

        {/* Repartidor asignado pero no ha llegado al negocio */}
        {order.status === 'assigned' && !order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: colors.accent + '15' }]}>
            <Clock size={24} color={colors.accent} />
            <Text style={[styles.codeInstruction, { color: colors.accent, fontWeight: '600', marginTop: 8 }]}>
              Repartidor en camino al negocio...
            </Text>
          </View>
        )}

        {/* Repartidor en el negocio pero orden aun no lista */}
        {order.status === 'assigned' && order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: colors.warning + '15' }]}>
            <Clock size={24} color={colors.warning} />
            <Text style={[styles.codeInstruction, { color: colors.warning, fontWeight: '600', marginTop: 8 }]}>
              Repartidor esperando - Termina de preparar el pedido
            </Text>
          </View>
        )}

        {/* Orden lista Y repartidor en el negocio = Pedir codigo de recoleccion */}
        {order.status === 'ready' && order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: colors.success + '15' }]}>
            <Package size={24} color={colors.success} />
            <Text style={[styles.codeLabel, { marginTop: 8, fontWeight: '700', fontSize: 14, color: colors.success }]}>
              Repartidor listo para recoger
            </Text>
            <Text style={[styles.codeInstruction, { color: colors.text.secondary }]}>
              Pide el codigo de recoleccion al repartidor para entregar el pedido:
            </Text>
            <TextInput
              style={[styles.codeInput, { borderColor: colors.success, backgroundColor: colors.card, color: colors.text.primary }]}
              value={pickupCodeInputs[order.id.toString()] || ''}
              onChangeText={(text) =>
                setPickupCodeInputs(prev => ({
                  ...prev,
                  [order.id.toString()]: text.toUpperCase(),
                }))
              }
              placeholder="XXXX"
              placeholderTextColor={colors.text.muted}
              maxLength={4}
              autoCapitalize="characters"
            />
            <TouchableSound
              style={[
                styles.acceptButton,
                { backgroundColor: colors.success },
                validatingPickup === order.id.toString() && { opacity: 0.6 },
              ]}
              onPress={() => handleValidatePickup(order.id.toString())}
              disabled={validatingPickup === order.id.toString()}
            >
              <Package size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>
                {validatingPickup === order.id.toString() ? 'Validando...' : 'Entregar Pedido'}
              </Text>
            </TouchableSound>
          </View>
        )}

        {/* Orden lista pero repartidor no ha llegado */}
        {order.status === 'ready' && !order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: colors.primary + '15' }]}>
            <Clock size={24} color={colors.primary} />
            <Text style={[styles.codeInstruction, { color: colors.primary, fontWeight: '600', marginTop: 8 }]}>
              Pedido listo - Esperando que llegue el repartidor
            </Text>
          </View>
        )}

        {/* Orden entregada al repartidor, esperando confirmacion */}
        {order.status === 'handed_to_driver' && (
          <View style={[styles.codeContainer, { backgroundColor: colors.success + '15' }]}>
            <CheckCircle size={24} color={colors.success} />
            <Text style={[styles.codeInstruction, { color: colors.success, fontWeight: '600', marginTop: 8 }]}>
              Entregado - Esperando que el repartidor confirme recepcion
            </Text>
          </View>
        )}

        {/* Orden en transito - ya fue entregada al repartidor */}
        {(order.status === 'in_transit' || order.status === 'arrived') && (
          <View style={[styles.codeContainer, { backgroundColor: colors.success + '15' }]}>
            <CheckCircle size={24} color={colors.success} />
            <Text style={[styles.codeInstruction, { color: colors.success, fontWeight: '700', marginTop: 8 }]}>
              Pedido entregado al repartidor - En camino al cliente
            </Text>
          </View>
        )}

        {/* Botones Aceptar/Rechazar para ordenes pendientes */}
        {isPending && showPrepTimeFor !== order.id.toString() && showRejectFor !== order.id.toString() && (
          <View style={styles.pendingActionsRow}>
            <TouchableSound
              style={[styles.acceptButton, { flex: 1 }]}
              onPress={() => setShowPrepTimeFor(order.id.toString())}
            >
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            </TouchableSound>
            <TouchableSound
              style={[styles.rejectButton, { backgroundColor: colors.error }]}
              onPress={() => setShowRejectFor(order.id.toString())}
            >
              <XCircle size={20} color="#fff" />
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </TouchableSound>
          </View>
        )}

        {/* Selector de tiempo de preparacion */}
        {isPending && showPrepTimeFor === order.id.toString() && (
          <View style={[styles.prepTimeContainer, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
            <Text style={[styles.prepTimeTitle, { color: colors.text.primary }]}>Tiempo de preparacion:</Text>
            <View style={styles.prepTimeRow}>
              {[10, 15, 20, 30, 45].map((min) => (
                <TouchableSound
                  key={min}
                  style={[
                    styles.prepTimeButton,
                    { borderColor: colors.success, backgroundColor: colors.card },
                    min === 20 && { backgroundColor: colors.success },
                  ]}
                  onPress={() => handleAcceptOrder(order.id.toString(), min)}
                >
                  <Text
                    style={[
                      styles.prepTimeButtonText,
                      { color: colors.success },
                      min === 20 && { color: '#FFFFFF' },
                    ]}
                  >
                    {min} min
                  </Text>
                </TouchableSound>
              ))}
            </View>
            <TouchableSound
              style={styles.prepTimeCancelButton}
              onPress={() => setShowPrepTimeFor(null)}
            >
              <Text style={[styles.prepTimeCancelText, { color: colors.text.secondary }]}>Volver</Text>
            </TouchableSound>
          </View>
        )}

        {/* Selector de motivo de rechazo */}
        {isPending && showRejectFor === order.id.toString() && (
          <View style={[styles.rejectContainer, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}>
            <Text style={[styles.rejectTitle, { color: colors.text.primary }]}>Motivo del rechazo:</Text>
            {(Object.keys(REJECTION_REASONS) as RejectionReason[]).map((key) => (
              <TouchableSound
                key={key}
                style={[
                  styles.rejectReasonButton,
                  { backgroundColor: colors.card, borderColor: colors.error },
                  rejectingOrder === order.id.toString() && styles.rejectReasonButtonDisabled,
                ]}
                onPress={() => handleRejectOrder(order.id.toString(), key)}
                disabled={rejectingOrder === order.id.toString()}
              >
                <Text style={[styles.rejectReasonText, { color: colors.error }]}>
                  {REJECTION_REASONS[key]}
                </Text>
              </TouchableSound>
            ))}
            <TouchableSound
              style={styles.prepTimeCancelButton}
              onPress={() => setShowRejectFor(null)}
            >
              <Text style={[styles.prepTimeCancelText, { color: colors.text.secondary }]}>Volver</Text>
            </TouchableSound>
          </View>
        )}
      </TouchableSound>
    );
  };

  // Tabs de filtro
  const renderTabs = () => (
    <View style={styles.tabsRow}>
      {([
        { key: 'new' as const, label: 'Nuevas', count: orders.filter(o => o.status === 'pending').length },
        { key: 'active' as const, label: 'Activas', count: orders.filter(o => ['accepted', 'preparing', 'ready', 'assigned', 'handed_to_driver', 'in_transit', 'arrived'].includes(o.status)).length },
        { key: 'done' as const, label: 'Completadas', count: orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length },
      ]).map(tab => (
        <TouchableSound
          key={tab.key}
          style={[
            styles.tab,
            { backgroundColor: colors.card, borderColor: colors.border.light },
            activeTab === tab.key && { backgroundColor: colors.secondary, borderColor: colors.secondary },
          ]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text style={[
            styles.tabText,
            { color: colors.text.secondary },
            activeTab === tab.key && { color: '#FFFFFF' },
          ]}>
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View style={[
              styles.tabBadge,
              { backgroundColor: colors.secondary + '20' },
              activeTab === tab.key && { backgroundColor: 'rgba(255,255,255,0.3)' },
            ]}>
              <Text style={[
                styles.tabBadgeText,
                { color: colors.secondary },
                activeTab === tab.key && { color: '#FFFFFF' },
              ]}>
                {tab.count}
              </Text>
            </View>
          )}
        </TouchableSound>
      ))}
    </View>
  );

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'new') return o.status === 'pending';
    if (activeTab === 'active') return ['accepted', 'preparing', 'ready', 'assigned', 'handed_to_driver', 'in_transit', 'arrived'].includes(o.status);
    return ['delivered', 'cancelled'].includes(o.status);
  });

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={ClipboardList}
      headerTitle="Ordenes"
      headerSubtitle="Gestiona tus pedidos entrantes"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {renderTabs()}

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Cargando ordenes...</Text>
      ) : filteredOrders.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          {activeTab === 'new' ? 'No hay ordenes nuevas' : activeTab === 'active' ? 'No hay ordenes activas' : 'No hay ordenes completadas'}
        </Text>
      ) : (
        filteredOrders.map(renderOrder)
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadgeContainer: {
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  itemsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    marginBottom: 2,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  codeContainer: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  codeInstruction: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    marginVertical: 8,
    width: '100%',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  prepTimeContainer: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  prepTimeTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  prepTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  prepTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  prepTimeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  prepTimeCancelButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  prepTimeCancelText: {
    fontSize: 13,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  // Pending actions row (Aceptar/Rechazar)
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectContainer: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  rejectTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  rejectReasonButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  rejectReasonButtonDisabled: {
    opacity: 0.5,
  },
  rejectReasonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
