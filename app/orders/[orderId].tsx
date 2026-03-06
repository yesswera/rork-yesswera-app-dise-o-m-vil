import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: DETALLES DE ORDEN
// Pantalla para ver los detalles completos de una orden
// Actualizado para usar ScreenContainer
// ============================================================================

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  User as UserIcon,
  Map,
  Key,
  CheckCircle,
  Circle,
  Clock,
  ClipboardList,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useState, useEffect } from 'react';
import { Order } from '@/constants/types';
import { getOrderById } from '@/services/orders';
import RatingStars from '@/components/RatingStars';
import ChatButton from '@/components/ChatButton';
import SupportButton from '@/components/SupportButton';
import LoadingButton from '@/components/LoadingButton';
import ErrorState from '@/components/ErrorState';
import ScreenContainer from '@/components/ScreenContainer';
import { useTheme } from '@/contexts/theme';
import { OrderSounds, SoundFeedback } from '@/services/sounds';

// ============================================================================
// COLORES EXPLICITOS PARA MODO OSCURO
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

// Colores de estado
const STATUS_COLORS = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  accent: '#3B82F6',
  secondary: '#F97316',
  muted: '#9CA3AF',
  lightGray: '#D1D5DB',
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user, token } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

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

  // Play sound when order status changes
  const playStatusChangeSound = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'confirmed':
        OrderSounds.accepted();
        break;
      case 'preparing':
        OrderSounds.ready();
        break;
      case 'ready':
        OrderSounds.ready();
        break;
      case 'assigned':
      case 'driver_verified':
        OrderSounds.pickedUp();
        break;
      case 'in_transit':
        OrderSounds.pickedUp();
        break;
      case 'delivered':
        OrderSounds.delivered();
        break;
      case 'cancelled':
        OrderSounds.cancelled();
        break;
    }
  };

  useEffect(() => {
    if (!order || !token || !orderId) return;

    const isActive = ['pending', 'confirmed', 'preparing', 'ready', 'accepted', 'assigned', 'driver_verified', 'in_transit']
      .includes(order.status);

    if (!isActive) return;

    const interval = setInterval(async () => {
      try {
        const updatedOrder = await getOrderById(orderId as string);
        if (!updatedOrder) return;
        // Check if status changed and play sound
        if (updatedOrder.status !== order.status) {
          playStatusChangeSound(updatedOrder.status);
        }
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

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={ClipboardList}
        headerTitle="Detalles de Orden"
        headerSubtitle="Cargando informacion..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando orden...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={ClipboardList}
        headerTitle="Detalles de Orden"
        headerSubtitle="Ocurrio un problema"
      >
        <ErrorState message={error || 'Orden no encontrada'} onRetry={handleRetry} />
      </ScreenContainer>
    );
  }

  const getStatusColor = () => {
    switch (order.status) {
      case 'delivered':
        return STATUS_COLORS.success;
      case 'cancelled':
        return STATUS_COLORS.error;
      case 'in_transit':
      case 'driver_verified':
        return STATUS_COLORS.accent;
      case 'assigned':
      case 'accepted':
        return STATUS_COLORS.secondary;
      default:
        return STATUS_COLORS.muted;
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
        return 'Envio';
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
    if (currentIndex > stepIdx) return 'completed';
    if (currentIndex === stepIdx || (stepKey === 'assigned' && order.status === 'driver_verified')) return 'current';
    return 'upcoming';
  };

  // Footer con boton de mapa
  const renderFooter = () => (
    <TouchableSound
      style={[styles.mapButton, { backgroundColor: STATUS_COLORS.accent }]}
      onPress={() => router.push(`/tracking/${order.id}` as any)}
      activeOpacity={0.8}
    >
      <Map size={20} color="#FFFFFF" />
      <Text style={styles.mapButtonText}>Ver en Mapa</Text>
    </TouchableSound>
  );

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={ClipboardList}
      headerTitle={order.orderNumber || `Orden #${order.id}`}
      headerSubtitle={getStatusLabel()}
      footer={renderFooter()}
      footerPadding={80}
    >
      {/* Status Badge */}
      <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      {/* Timeline de progreso */}
      {!isCancelled && (
        <View style={[styles.timelineContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {timelineSteps.map((step, index) => {
            const state = getStepState(step.key);
            const isLast = index === timelineSteps.length - 1;
            return (
              <View key={step.key} style={styles.timelineStep}>
                <View style={styles.timelineIconColumn}>
                  {state === 'completed' ? (
                    <CheckCircle size={22} color={STATUS_COLORS.success} />
                  ) : state === 'current' ? (
                    <Clock size={22} color={STATUS_COLORS.accent} />
                  ) : (
                    <Circle size={22} color={STATUS_COLORS.lightGray} />
                  )}
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: STATUS_COLORS.lightGray },
                        state === 'completed' && { backgroundColor: STATUS_COLORS.success },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    { color: theme.textMuted },
                    state === 'completed' && { color: theme.textSecondary },
                    state === 'current' && { color: STATUS_COLORS.accent, fontWeight: '700' },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Codigo de entrega */}
      {(order.status === 'in_transit' || order.status === 'driver_verified') && order.deliveryCode && (
        <View style={[styles.deliveryCodeCard, { borderColor: colors.primary }]}>
          <Key size={24} color={colors.primary} />
          <Text style={[styles.deliveryCodeLabel, { color: theme.textSecondary }]}>
            Tu Codigo de Entrega
          </Text>
          <View style={[styles.deliveryCodeBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.deliveryCodeText}>{order.deliveryCode}</Text>
          </View>
          <Text style={[styles.deliveryCodeHint, { color: theme.textSecondary }]}>
            Dale este codigo al repartidor cuando llegue a tu puerta
          </Text>
        </View>
      )}

      {/* Informacion del Servicio */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Informacion del Servicio</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tipo de Servicio</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{getOrderTypeName()}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Fecha de Creacion</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(order.createdAt)}</Text>
          </View>
          {order.deliveredAt && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Fecha de Entrega</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(order.deliveredAt)}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Detalles del Pedido */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Detalles del Pedido</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {order.type === 'food' && order.items && (
            <View>
              {order.items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  <View style={styles.itemRow}>
                    <View style={styles.itemDetails}>
                      <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                      <Text style={[styles.itemPrice, { color: theme.textSecondary }]}>
                        ${item.price.toFixed(2)} x {item.quantity}
                      </Text>
                    </View>
                    <Text style={[styles.itemTotal, { color: colors.primary }]}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {order.type === 'shopping' && order.shoppingList && (
            <View>
              <Text style={[styles.listTitle, { color: theme.text }]}>Lista de Compras:</Text>
              <Text style={[styles.listContent, { color: theme.textSecondary }]}>{order.shoppingList}</Text>
            </View>
          )}

          {order.type === 'delivery' && order.packageDescription && (
            <View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Descripcion</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{order.packageDescription}</Text>
              </View>
              {order.packageWeight && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Peso</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{order.packageWeight}kg</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Ubicaciones */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ubicaciones</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {order.pickupAddress && (
            <>
              <View style={styles.locationRow}>
                <MapPin size={20} color={STATUS_COLORS.accent} />
                <View style={styles.locationContent}>
                  <Text style={[styles.locationLabel, { color: theme.text }]}>Origen</Text>
                  <Text style={[styles.locationAddress, { color: theme.textSecondary }]}>{order.pickupAddress}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}
          <View style={styles.locationRow}>
            <MapPin size={20} color={colors.primary} />
            <View style={styles.locationContent}>
              <Text style={[styles.locationLabel, { color: theme.text }]}>Destino</Text>
              <Text style={[styles.locationAddress, { color: theme.textSecondary }]}>{order.deliveryAddress}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Costos */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Costos</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {order.subtotal && (
            <>
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Subtotal de productos</Text>
                <Text style={[styles.costValue, { color: theme.text }]}>
                  ${order.subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}
          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Costo de entrega</Text>
            <Text style={[styles.costValue, { color: theme.text }]}>${order.deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.costRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>${order.total.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Repartidor */}
      {order.driverName && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Repartidor</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.driverRow}>
              <View style={[styles.driverAvatar, { backgroundColor: colors.primary }]}>
                <UserIcon size={24} color="#FFFFFF" />
              </View>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, { color: theme.text }]}>
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

      {/* Contacto */}
      {order.businessName && order.businessId && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contacto</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ChatButton
              orderId={order.id.toString()}
              type="client_business"
              otherPartyName={order.businessName}
            />
          </View>
        </View>
      )}

      {/* Soporte */}
      {!['delivered', 'cancelled'].includes(order.status) && (
        <View style={styles.section}>
          <SupportButton orderId={order.id} variant="banner" label="Necesitas ayuda con esta orden?" />
        </View>
      )}
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  statusCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  listContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  costLabel: {
    fontSize: 15,
  },
  costValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateButtonContainer: {
    marginTop: 12,
  },
  mapButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  deliveryCodeCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  deliveryCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  deliveryCodeBadge: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  deliveryCodeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  deliveryCodeHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  timelineContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIconColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  timelineLine: {
    width: 2,
    height: 20,
    marginVertical: 2,
  },
  timelineLabel: {
    fontSize: 14,
    paddingTop: 2,
    paddingBottom: 16,
  },
});
