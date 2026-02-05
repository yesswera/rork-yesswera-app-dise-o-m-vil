import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, User as UserIcon, Map, Key, CheckCircle, Circle, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import RatingStars from '@/components/RatingStars';
import ChatButton from '@/components/ChatButton';
import LoadingButton from '@/components/LoadingButton';
import { getOrderById } from '@/services/orders';
import { Order } from '@/constants/types';
import ErrorState from '@/components/ErrorState';
import { useState, useEffect } from 'react';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user, token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!token || !orderId) return;

      try {
        const orderData = await getOrderById(orderId as string);
        setOrder(orderData);
        setError(null);
      } catch (err) {
        console.error('Error cargando orden:', err);
        setError('No se pudo cargar la orden');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [orderId, token]);

  useEffect(() => {
    if (!order || !token || !orderId) return;

    const isActive = ['pending', 'confirmed', 'preparing', 'ready', 'accepted', 'assigned', 'driver_verified', 'in_transit']
      .includes(order.status);

    if (!isActive) return;

    const interval = setInterval(async () => {
      try {
        const updatedOrder = await getOrderById(orderId as string);
        setOrder(updatedOrder);
      } catch (err) {
        console.error('Error actualizando orden:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [order, orderId, token]);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    if (token && orderId) {
      getOrderById(orderId as string)
        .then(setOrder)
        .catch(() => setError('No se pudo cargar la orden'))
        .finally(() => setIsLoading(false));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles de Orden</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.errorText, { marginTop: 16 }]}>Cargando orden...</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles de Orden</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState message={error || 'Orden no encontrada'} onRetry={handleRetry} />
      </View>
    );
  }

  const getStatusColor = () => {
    switch (order.status) {
      case 'delivered':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      case 'in_transit':
        return Colors.accent;
      case 'driver_verified':
        return Colors.accent;
      case 'assigned':
        return Colors.secondary;
      case 'accepted':
        return Colors.secondary;
      default:
        return Colors.mediumGray;
    }
  };

  const getStatusLabel = () => {
    switch (order.status) {
      case 'delivered':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'in_transit':
        return 'En Camino';
      case 'driver_verified':
        return 'Repartidor Verificado';
      case 'assigned':
        return 'Repartidor Asignado';
      case 'accepted':
        return 'Aceptada';
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmada';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Lista';
      default:
        return 'Procesando';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderTypeName = () => {
    switch (order.type) {
      case 'food':
        return 'Alimentos';
      case 'shopping':
        return 'Compras';
      case 'delivery':
        return 'Envío';
      default:
        return 'Pedido';
    }
  };

  const canRate = order.status === 'delivered' && !order.rated;

  const timelineSteps = [
    { key: 'pending', label: 'Pedido Creado' },
    { key: 'accepted', label: 'Aceptado' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'ready', label: 'Listo' },
    { key: 'assigned', label: 'Repartidor' },
    { key: 'in_transit', label: 'En Camino' },
    { key: 'delivered', label: 'Entregado' },
  ];

  const statusOrder = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'driver_verified', 'in_transit', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  const getStepState = (stepKey: string) => {
    if (isCancelled) return 'cancelled';
    const stepIdx = statusOrder.indexOf(stepKey);
    // driver_verified counts as same level as assigned
    const effectiveIdx = stepKey === 'assigned' ? Math.max(statusOrder.indexOf('assigned'), statusOrder.indexOf('driver_verified')) : stepIdx;
    if (currentIndex > stepIdx) return 'completed';
    if (currentIndex === stepIdx || (stepKey === 'assigned' && order.status === 'driver_verified')) return 'current';
    return 'upcoming';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.orderNumber}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </View>
        </View>

        {/* Timeline de progreso */}
        {!isCancelled && (
          <View style={styles.section}>
            <View style={styles.timelineContainer}>
              {timelineSteps.map((step, index) => {
                const state = getStepState(step.key);
                const isLast = index === timelineSteps.length - 1;
                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineIconColumn}>
                      {state === 'completed' ? (
                        <CheckCircle size={22} color={Colors.success} />
                      ) : state === 'current' ? (
                        <Clock size={22} color={Colors.accent} />
                      ) : (
                        <Circle size={22} color={Colors.lightGray} />
                      )}
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            state === 'completed' && styles.timelineLineCompleted,
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        state === 'completed' && styles.timelineLabelCompleted,
                        state === 'current' && styles.timelineLabelCurrent,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Código de entrega - visible cuando el pedido está en camino */}
        {(order.status === 'in_transit' || order.status === 'driver_verified') && order.deliveryCode && (
          <View style={styles.section}>
            <View style={styles.deliveryCodeCard}>
              <Key size={24} color={Colors.primary} />
              <Text style={styles.deliveryCodeLabel}>Tu Código de Entrega</Text>
              <View style={styles.deliveryCodeBadge}>
                <Text style={styles.deliveryCodeText}>{order.deliveryCode}</Text>
              </View>
              <Text style={styles.deliveryCodeHint}>
                Dale este código al repartidor cuando llegue a tu puerta
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Servicio</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo de Servicio</Text>
              <Text style={styles.infoValue}>{getOrderTypeName()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de Creación</Text>
              <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
            </View>
            {order.deliveredAt && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha de Entrega</Text>
                  <Text style={styles.infoValue}>{formatDate(order.deliveredAt)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Pedido</Text>
          <View style={styles.card}>
            {order.type === 'food' && order.items && (
              <View>
                {order.items.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.itemRow}>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>
                          ${item.price.toFixed(2)} x {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {order.type === 'shopping' && order.shoppingList && (
              <View>
                <Text style={styles.listTitle}>Lista de Compras:</Text>
                <Text style={styles.listContent}>{order.shoppingList}</Text>
              </View>
            )}
            
            {order.type === 'delivery' && order.packageDescription && (
              <View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Descripción</Text>
                  <Text style={styles.infoValue}>{order.packageDescription}</Text>
                </View>
                {order.packageWeight && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Peso</Text>
                      <Text style={styles.infoValue}>{order.packageWeight}kg</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicaciones</Text>
          <View style={styles.card}>
            {order.pickupAddress && (
              <>
                <View style={styles.locationRow}>
                  <MapPin size={20} color={Colors.accent} />
                  <View style={styles.locationContent}>
                    <Text style={styles.locationLabel}>Origen</Text>
                    <Text style={styles.locationAddress}>{order.pickupAddress}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.locationRow}>
              <MapPin size={20} color={Colors.primary} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Destino</Text>
                <Text style={styles.locationAddress}>{order.deliveryAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costos</Text>
          <View style={styles.card}>
            {order.subtotal && (
              <>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Subtotal de productos</Text>
                  <Text style={styles.costValue}>
                    ${order.subtotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Costo de entrega</Text>
              <Text style={styles.costValue}>${order.deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.costRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {order.driverName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Repartidor</Text>
            <View style={styles.card}>
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <UserIcon size={24} color={Colors.white} />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>
                    {order.driverName}
                  </Text>
                  {order.driverRating && (
                    <View style={styles.ratingRow}>
                      <RatingStars rating={order.driverRating} size="small" readonly />
                    </View>
                  )}
                </View>
              </View>
              {canRate && (
                <View style={styles.rateButtonContainer}>
                  <LoadingButton
                    title="Calificar Repartidor"
                    onPress={() => router.push(`/ratings/create/${order.id}` as any)}
                    variant="primary"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {order.businessName && order.businessId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contacto</Text>
            <View style={styles.card}>
              <ChatButton
                orderId={order.id.toString()}
                type="client_business"
                otherPartyName={order.businessName}
              />
            </View>
          </View>
        )}

        <View style={styles.mapButtonContainer}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => router.push(`/tracking/${order.id}` as any)}
            activeOpacity={0.8}
          >
            <Map size={20} color={Colors.white} />
            <Text style={styles.mapButtonText}>Ver en Mapa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  statusCard: {
    backgroundColor: Colors.white,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row' as const,
    paddingVertical: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  listContent: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row' as const,
    paddingVertical: 8,
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  costRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  costLabel: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  costValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  driverRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  rateButtonContainer: {
    marginTop: 12,
  },
  mapButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mapButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
    marginLeft: 8,
  },
  deliveryCodeCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  deliveryCodeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginTop: 8,
    marginBottom: 12,
  },
  deliveryCodeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  deliveryCodeText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 6,
  },
  deliveryCodeHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 12,
    lineHeight: 18,
  },
  timelineContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  timelineStep: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  timelineIconColumn: {
    alignItems: 'center' as const,
    width: 24,
    marginRight: 12,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.lightGray,
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: Colors.success,
  },
  timelineLabel: {
    fontSize: 14,
    color: Colors.text.light,
    paddingTop: 2,
    paddingBottom: 16,
  },
  timelineLabelCompleted: {
    color: Colors.text.secondary,
  },
  timelineLabelCurrent: {
    color: Colors.accent,
    fontWeight: '700' as const,
  },
});
