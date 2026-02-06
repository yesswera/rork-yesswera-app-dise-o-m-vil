import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, MapPin, CheckCircle, ArrowLeft, ShieldCheck, Package, CookingPot, XCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { getBusinessOrders, acceptOrder, updateOrderStatus, validatePickupAndHandover, businessRejectOrder, REJECTION_REASONS, RejectionReason } from '@/services/orders';
import { Order } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { useBusinessOrderSubscription } from '@/hooks/useRealtimeOrders';
import { useBusinessResponseTimer } from '@/hooks/useOrderTimeout';
import PriorityClientBadge from '@/components/PriorityClientBadge';

export default function BusinessOrdersScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
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

  // Realtime subscription - auto-reload when orders change
  useBusinessOrderSubscription(businessId, () => {
    loadOrders();
  });

  const loadOrders = useCallback(async () => {
    if (!user || !token) return;

    try {
      // Get the business record for this user
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();

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
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
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
      Alert.alert('Éxito', `Orden aceptada — ${prepTime} min de preparación`);
      loadOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'No se pudo aceptar la orden');
    }
  };

  // Business validates pickup code from driver and hands over order
  const handleValidatePickup = async (orderId: string) => {
    const code = pickupCodeInputs[orderId]?.trim();
    if (!code || code.length !== 4) {
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
        Alert.alert('Error', result.message);
      }
    } catch (error) {
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
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'ready');
      Alert.alert('Listo', 'Pedido marcado como listo para recoger');
      loadOrders();
    } catch (error) {
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
    if (status === 'pending') return Colors.warning;
    if (status === 'accepted' || status === 'preparing') return Colors.accent;
    if (status === 'ready' || status === 'assigned') return Colors.primary;
    if (status === 'handed_to_driver' || status === 'in_transit' || status === 'arrived') return Colors.success;
    if (status === 'delivered') return Colors.success;
    if (status === 'cancelled') return Colors.error;
    return Colors.mediumGray;
  };

  const renderOrder = (order: Order) => {
    const isPending = order.status === 'pending';
    const isAccepted = order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready';

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => router.push(`/business/comanda/${order.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Orden #{order.id.toString().slice(0, 8)}</Text>
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
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.detailText} numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color={Colors.accent} />
            <Text style={styles.detailText}>
              {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {order.items && order.items.length > 0 && (
            <View style={styles.itemsList}>
              <Text style={styles.itemsTitle}>Productos:</Text>
              {order.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  • {item.quantity}x {item.name}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.totalText}>Total: ${order.total.toFixed(2)} MXN</Text>
        </View>

        {/* Botón: Comenzar preparación (accepted → preparing) */}
        {order.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: Colors.accent }]}
            onPress={() => handleStartPreparing(order.id.toString())}
          >
            <CookingPot size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Comenzar Preparación</Text>
          </TouchableOpacity>
        )}

        {/* Botón: Marcar como lista (preparing → ready) */}
        {order.status === 'preparing' && (
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: Colors.primary }]}
            onPress={() => handleMarkReady(order.id.toString())}
          >
            <Package size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Marcar como Lista</Text>
          </TouchableOpacity>
        )}

        {/* Repartidor asignado pero no ha llegado al negocio */}
        {order.status === 'assigned' && !order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: Colors.accent + '15' }]}>
            <Clock size={24} color={Colors.accent} />
            <Text style={[styles.codeInstruction, { color: Colors.accent, fontWeight: '600', marginTop: 8 }]}>
              Repartidor en camino al negocio...
            </Text>
          </View>
        )}

        {/* Repartidor en el negocio pero orden aun no lista */}
        {order.status === 'assigned' && order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: Colors.warning + '15' }]}>
            <Clock size={24} color={Colors.warning} />
            <Text style={[styles.codeInstruction, { color: Colors.warning, fontWeight: '600', marginTop: 8 }]}>
              Repartidor esperando - Termina de preparar el pedido
            </Text>
          </View>
        )}

        {/* Orden lista Y repartidor en el negocio = Pedir codigo de recoleccion */}
        {order.status === 'ready' && order.driverAtBusiness && (
          <View style={styles.codeContainer}>
            <Package size={24} color={Colors.success} />
            <Text style={[styles.codeLabel, { marginTop: 8, fontWeight: '700', fontSize: 14, color: Colors.success }]}>
              Repartidor listo para recoger
            </Text>
            <Text style={styles.codeInstruction}>
              Pide el codigo de recoleccion al repartidor para entregar el pedido:
            </Text>
            <TextInput
              style={[styles.codeInput, { borderColor: Colors.success }]}
              value={pickupCodeInputs[order.id.toString()] || ''}
              onChangeText={(text) =>
                setPickupCodeInputs(prev => ({
                  ...prev,
                  [order.id.toString()]: text.toUpperCase(),
                }))
              }
              placeholder="XXXX"
              placeholderTextColor={Colors.text.secondary}
              maxLength={4}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.acceptButton,
                { backgroundColor: Colors.success },
                validatingPickup === order.id.toString() && { opacity: 0.6 },
              ]}
              onPress={() => handleValidatePickup(order.id.toString())}
              disabled={validatingPickup === order.id.toString()}
            >
              <Package size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>
                {validatingPickup === order.id.toString() ? 'Validando...' : 'Entregar Pedido'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Orden lista pero repartidor no ha llegado */}
        {order.status === 'ready' && !order.driverAtBusiness && (
          <View style={[styles.codeContainer, { backgroundColor: Colors.primary + '15' }]}>
            <Clock size={24} color={Colors.primary} />
            <Text style={[styles.codeInstruction, { color: Colors.primary, fontWeight: '600', marginTop: 8 }]}>
              Pedido listo - Esperando que llegue el repartidor
            </Text>
          </View>
        )}

        {/* Orden entregada al repartidor, esperando confirmacion */}
        {order.status === 'handed_to_driver' && (
          <View style={[styles.codeContainer, { backgroundColor: Colors.success + '15' }]}>
            <CheckCircle size={24} color={Colors.success} />
            <Text style={[styles.codeInstruction, { color: Colors.success, fontWeight: '600', marginTop: 8 }]}>
              Entregado - Esperando que el repartidor confirme recepcion
            </Text>
          </View>
        )}

        {/* Orden en tránsito - ya fue entregada al repartidor */}
        {(order.status === 'in_transit' || order.status === 'arrived') && (
          <View style={[styles.codeContainer, { backgroundColor: Colors.success + '15' }]}>
            <CheckCircle size={24} color={Colors.success} />
            <Text style={[styles.codeInstruction, { color: Colors.success, fontWeight: '700', marginTop: 8 }]}>
              Pedido entregado al repartidor - En camino al cliente
            </Text>
          </View>
        )}

        {/* Botones Aceptar/Rechazar para ordenes pendientes */}
        {isPending && showPrepTimeFor !== order.id.toString() && showRejectFor !== order.id.toString() && (
          <View style={styles.pendingActionsRow}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => setShowPrepTimeFor(order.id.toString())}
            >
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => setShowRejectFor(order.id.toString())}
            >
              <XCircle size={20} color="#fff" />
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selector de tiempo de preparacion */}
        {isPending && showPrepTimeFor === order.id.toString() && (
          <View style={styles.prepTimeContainer}>
            <Text style={styles.prepTimeTitle}>Tiempo de preparacion:</Text>
            <View style={styles.prepTimeRow}>
              {[10, 15, 20, 30, 45].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.prepTimeButton,
                    min === 20 && styles.prepTimeButtonDefault,
                  ]}
                  onPress={() => handleAcceptOrder(order.id.toString(), min)}
                >
                  <Text
                    style={[
                      styles.prepTimeButtonText,
                      min === 20 && styles.prepTimeButtonTextDefault,
                    ]}
                  >
                    {min} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.prepTimeCancelButton}
              onPress={() => setShowPrepTimeFor(null)}
            >
              <Text style={styles.prepTimeCancelText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selector de motivo de rechazo */}
        {isPending && showRejectFor === order.id.toString() && (
          <View style={styles.rejectContainer}>
            <Text style={styles.rejectTitle}>Motivo del rechazo:</Text>
            {(Object.keys(REJECTION_REASONS) as RejectionReason[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.rejectReasonButton,
                  rejectingOrder === order.id.toString() && styles.rejectReasonButtonDisabled,
                ]}
                onPress={() => handleRejectOrder(order.id.toString(), key)}
                disabled={rejectingOrder === order.id.toString()}
              >
                <Text style={styles.rejectReasonText}>
                  {REJECTION_REASONS[key]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.prepTimeCancelButton}
              onPress={() => setShowRejectFor(null)}
            >
              <Text style={styles.prepTimeCancelText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[Colors.secondary, Colors.secondaryDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Órdenes</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Tabs de filtro */}
        <View style={styles.tabsRow}>
          {([
            { key: 'new' as const, label: 'Nuevas', count: orders.filter(o => o.status === 'pending').length },
            { key: 'active' as const, label: 'Activas', count: orders.filter(o => ['accepted', 'preparing', 'ready', 'assigned', 'handed_to_driver', 'in_transit', 'arrived'].includes(o.status)).length },
            { key: 'done' as const, label: 'Completadas', count: orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length },
          ]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <Text style={styles.loadingText}>Cargando órdenes...</Text>
          ) : (() => {
            const filtered = orders.filter(o => {
              if (activeTab === 'new') return o.status === 'pending';
              if (activeTab === 'active') return ['accepted', 'preparing', 'ready', 'assigned', 'handed_to_driver', 'in_transit', 'arrived'].includes(o.status);
              return ['delivered', 'cancelled'].includes(o.status);
            });
            return filtered.length === 0 ? (
              <Text style={styles.emptyText}>
                {activeTab === 'new' ? 'No hay órdenes nuevas' : activeTab === 'active' ? 'No hay órdenes activas' : 'No hay órdenes completadas'}
              </Text>
            ) : (
              filtered.map(renderOrder)
            );
          })()}
        </ScrollView>
      </View>
    </LinearGradient>
  );
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
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  itemsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 8,
  },
  codeContainer: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  codeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 4,
  },
  codeInstruction: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  codeInput: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: Colors.text.primary,
    marginVertical: 8,
    width: '100%',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 4,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 6,
  },
  acceptButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
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
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabBadge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },
  prepTimeContainer: {
    backgroundColor: Colors.success + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  prepTimeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  prepTimeButtonDefault: {
    backgroundColor: Colors.success,
  },
  prepTimeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  prepTimeButtonTextDefault: {
    color: Colors.white,
  },
  prepTimeCancelButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  prepTimeCancelText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
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
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  rejectContainer: {
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  rejectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  rejectReasonButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
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
    color: Colors.error,
  },
});
