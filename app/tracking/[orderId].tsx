// ============================================================================
// YESSWERA: TRACKING DE ORDEN
// Pantalla de seguimiento en vivo con mapa
// Actualizado para usar ScreenContainer (sin scroll, con mapa)
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Clock,
  User,
  Phone,
  Star,
  Navigation,
  X,
  AlertCircle,
  Store,
  RefreshCw,
  MapPin,
} from 'lucide-react-native';
import ChatButton from '@/components/ChatButton';
import SupportButton from '@/components/SupportButton';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getOrderById } from '@/services/orders';
import { getSimilarBusinesses } from '@/services/products';
import { getDriverLocation, DriverLocation } from '@/services/gps';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { Order, OrderStatus, Business } from '@/constants/types';
import ErrorState from '@/components/ErrorState';
import { calculateETA, formatETA } from '@/utils/distance';
import { createRating } from '@/services/ratings';
import { useOrderTracking } from '@/hooks/useRealtimeOrders';
import { OrderSounds, SoundFeedback, ArrivalSounds } from '@/services/sounds';

const { width, height } = Dimensions.get('window');

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

const STATUS_COLORS = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  accent: '#3B82F6',
  primary: '#22C55E',
  gold: '#EAB308',
};

// Timeout constants for business response
const FIRST_WARNING_SECONDS = 180;
const TIMEOUT_SECONDS = 300;

export default function TrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { token, user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [order, setOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [eta, setEta] = useState<number | null>(null);
  const [gpsUnavailable, setGpsUnavailable] = useState(false);
  const gpsFailCount = useRef(0);
  const prevStatusRef = useRef<OrderStatus | null>(null);
  const markerRotation = useRef(new Animated.Value(0)).current;
  const prevLocationRef = useRef<DriverLocation | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timeout tracking
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [showTimeoutCritical, setShowTimeoutCritical] = useState(false);

  // Rejection handling
  const [wasRejected, setWasRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Business[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // Play sound based on order status change
  const playStatusSound = (newStatus: OrderStatus, oldStatus: OrderStatus | null) => {
    if (newStatus === oldStatus) return;

    switch (newStatus) {
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
      case 'handed_to_driver':
        OrderSounds.pickedUp();
        break;
      case 'arrived':
        ArrivalSounds.driverArrived(); // LOUD doorbell for client when driver arrives
        break;
      case 'delivered':
        OrderSounds.delivered();
        break;
      case 'cancelled':
        OrderSounds.cancelled();
        break;
    }
  };

  // Realtime subscription
  const handleRealtimeUpdate = useCallback(async (status: OrderStatus) => {
    if (orderId) {
      try {
        const updatedOrder = await getOrderById(orderId);
        if (updatedOrder) {
          // Play sound for status change
          playStatusSound(updatedOrder.status, order?.status || null);
          setOrder(updatedOrder);
        }
      } catch (err) {
        console.error('Error reloading order:', err);
      }
    }
  }, [orderId, order?.status]);

  useOrderTracking(orderId || null, handleRealtimeUpdate);

  // Timeout tracking for pending orders
  useEffect(() => {
    if (!order || order.status !== 'pending') {
      setWaitingSeconds(0);
      setShowTimeoutWarning(false);
      setShowTimeoutCritical(false);
      return;
    }

    const orderCreatedAt = new Date(order.createdAt).getTime();
    const initialSeconds = Math.floor((Date.now() - orderCreatedAt) / 1000);
    setWaitingSeconds(initialSeconds);

    if (initialSeconds >= TIMEOUT_SECONDS) {
      setShowTimeoutCritical(true);
      setShowTimeoutWarning(true);
    } else if (initialSeconds >= FIRST_WARNING_SECONDS) {
      setShowTimeoutWarning(true);
    }

    const timer = setInterval(() => {
      setWaitingSeconds(prev => {
        const newSeconds = prev + 1;
        if (newSeconds >= TIMEOUT_SECONDS && !showTimeoutCritical) {
          setShowTimeoutCritical(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (newSeconds >= FIRST_WARNING_SECONDS && !showTimeoutWarning) {
          setShowTimeoutWarning(true);
        }
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.status, order?.createdAt]);

  // Pulse animation for delivery code
  useEffect(() => {
    if (order?.status === 'arrived' || order?.status === 'in_transit') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [order?.status, pulseAnim]);

  // Detect rejection and load alternatives
  useEffect(() => {
    if (!order) return;

    if (order.status === 'cancelled' && order.cancelReason?.includes('Rechazado por negocio')) {
      setWasRejected(true);
      const reasonMatch = order.cancelReason.match(/Rechazado por negocio: (.+)/);
      if (reasonMatch) {
        setRejectionReason(reasonMatch[1]);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (order.businessId && alternatives.length === 0 && !loadingAlternatives) {
        setLoadingAlternatives(true);
        getSimilarBusinesses(order.businessId)
          .then(setAlternatives)
          .catch(console.error)
          .finally(() => setLoadingAlternatives(false));
      }
    }
  }, [order?.status, order?.cancelReason, order?.businessId]);

  // Load order
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

  // GPS tracking
  useEffect(() => {
    if (!order || !token || !orderId) return;
    if (order.status === 'delivered' || order.status === 'cancelled') return;
    if (!order.driverId && order.status === 'pending') return;

    const fetchData = async () => {
      try {
        const promises: Promise<any>[] = [getOrderById(orderId as string)];

        if (order.driverId) {
          promises.unshift(getDriverLocation(orderId as string));
        }

        const results = await Promise.all(promises);
        const location = order.driverId ? results[0] : null;
        const updatedOrder = order.driverId ? results[1] : results[0];

        if (location) {
          gpsFailCount.current = 0;
          setGpsUnavailable(false);

          if (prevLocationRef.current && location.heading !== undefined) {
            Animated.spring(markerRotation, {
              toValue: location.heading,
              useNativeDriver: true,
              tension: 50,
              friction: 10,
            }).start();
          }
          prevLocationRef.current = location;

          if (updatedOrder.deliveryLocation && typeof updatedOrder.deliveryLocation === 'object' && updatedOrder.deliveryLocation.latitude) {
            const calculatedETA = calculateETA(
              { latitude: location.latitude, longitude: location.longitude },
              updatedOrder.deliveryLocation,
              location.speed || 30
            );
            setEta(calculatedETA);
          }

          setDriverLocation(location);
        }

        if (prevStatusRef.current && prevStatusRef.current !== updatedOrder.status) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        prevStatusRef.current = updatedOrder.status;
        setOrder(updatedOrder);
      } catch (err) {
        console.error('Error obteniendo datos:', err);
        gpsFailCount.current += 1;
        if (gpsFailCount.current >= 3) {
          setGpsUnavailable(true);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [orderId, token, order, markerRotation]);

  const getStatusText = () => {
    if (!order) return 'Cargando...';

    if (order.status === 'cancelled' && wasRejected) {
      return 'El negocio no puede atender tu pedido';
    }

    const isDeliveryOrder = order.type === 'delivery' || !order.businessId;

    switch (order.status) {
      case 'pending':
        return 'Esperando confirmacion del negocio...';
      case 'accepted':
        return 'Negocio acepto tu pedido';
      case 'preparing':
        return 'Preparando tu pedido';
      case 'ready':
        return isDeliveryOrder ? 'Orden lista, buscando repartidor...' : 'Pedido listo, buscando repartidor...';
      case 'assigned':
        return isDeliveryOrder ? 'Repartidor asignado, va a recoger tu paquete' : 'Repartidor asignado, va al negocio';
      case 'driver_verified':
        return 'Repartidor verificado en negocio';
      case 'handed_to_driver':
        return 'Repartidor recibio tu pedido';
      case 'in_transit':
        return isDeliveryOrder ? 'Tu paquete va en camino' : 'Tu pedido va en camino';
      case 'arrived':
        return 'El repartidor llego';
      case 'delivered':
        return isDeliveryOrder ? 'Paquete entregado' : 'Pedido entregado';
      case 'cancelled':
        return 'Pedido cancelado';
      default:
        return 'Procesando';
    }
  };

  const handleCompleteDelivery = () => {
    setShowRating(true);
  };

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

  const canCancel = order?.status === 'pending' || (order?.status === 'ready' && !order?.driverId);
  const canRequestCancel = order && (['accepted', 'preparing'].includes(order.status) || (order.status === 'ready' && order.driverId));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.cardAlt }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando seguimiento...</Text>
      </View>
    );
  }

  if (error || !order) {
    return <ErrorState message={error || 'No se encontro la orden'} onRetry={handleRetry} />;
  }

  if (showRating) {
    return (
      <RatingComponent
        orderId={orderId || ''}
        driverName={order.driverName || 'el repartidor'}
        driverId={order.driverId || ''}
        onComplete={() => router.push('/' as any)}
        theme={theme}
        colors={colors}
      />
    );
  }

  const getDeliveryCoords = () => {
    if (typeof order.deliveryLocation === 'object' && order.deliveryLocation?.latitude) {
      return order.deliveryLocation;
    }
    return { latitude: 19.9333, longitude: -105.2500 };
  };

  const deliveryCoords = getDeliveryCoords();

  return (
    <View style={[styles.container, { backgroundColor: theme.cardAlt }]}>
      {/* Mapa */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: deliveryCoords.latitude,
          longitude: deliveryCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {order.pickupLocation && (
          <Marker
            coordinate={order.pickupLocation}
            pinColor={STATUS_COLORS.accent}
            title="Punto de Recogida"
            description={order.pickupAddress}
          />
        )}
        <Marker
          coordinate={deliveryCoords}
          pinColor={colors.primary}
          title="Punto de Entrega"
          description={typeof order.deliveryLocation === 'string' ? order.deliveryLocation : order.deliveryAddress}
        />
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
            title="Repartidor"
            description={order.driverName}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.View
              style={[
                styles.driverMarker,
                { backgroundColor: colors.primary },
                {
                  transform: [{
                    rotate: markerRotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }
              ]}
            >
              <Navigation size={20} color="#FFFFFF" fill="#FFFFFF" />
            </Animated.View>
          </Marker>
        )}

        {driverLocation && order.pickupLocation && (
          <Polyline
            coordinates={[
              order.pickupLocation,
              { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
              deliveryCoords
            ]}
            strokeColor={colors.primary}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Panel de informacion */}
      <View style={[styles.infoContainer, { backgroundColor: theme.cardAlt }]}>
        <ScrollView
          style={styles.infoScrollView}
          contentContainerStyle={styles.infoScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Card */}
          <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
            <View style={styles.statusHeader}>
              <Clock size={20} color={order.status === 'arrived' ? STATUS_COLORS.success : colors.primary} />
              <Text style={[styles.statusText, { color: theme.text }, order.status === 'arrived' && { color: STATUS_COLORS.success }]}>
                {getStatusText()}
              </Text>
            </View>
            {order.status === 'arrived' ? (
              <Text style={[styles.etaText, { color: theme.textSecondary }]}>Sal a recibir tu pedido</Text>
            ) : (
              <Text style={[styles.etaText, { color: theme.textSecondary }]}>
                {eta ? `Llega en ${formatETA(eta)}` : order.status === 'pending' || order.status === 'accepted' || order.status === 'preparing' ? '' : 'Calculando tiempo...'}
              </Text>
            )}
          </View>

          {/* Timeout warning */}
          {order.status === 'pending' && showTimeoutWarning && (
            <View style={[
              styles.timeoutWarningCard,
              { borderColor: `${showTimeoutCritical ? STATUS_COLORS.error : STATUS_COLORS.warning}40` },
              showTimeoutCritical && styles.timeoutWarningCardCritical
            ]}>
              <View style={styles.timeoutHeader}>
                <Clock size={22} color={showTimeoutCritical ? STATUS_COLORS.error : STATUS_COLORS.warning} />
                <Text style={[
                  styles.timeoutTitle,
                  { color: showTimeoutCritical ? STATUS_COLORS.error : STATUS_COLORS.warning }
                ]}>
                  {showTimeoutCritical ? 'El negocio no responde' : 'Esperando respuesta del negocio...'}
                </Text>
              </View>
              <Text style={[styles.timeoutTime, { color: theme.textSecondary }]}>
                Tiempo de espera: {Math.floor(waitingSeconds / 60)}:{(waitingSeconds % 60).toString().padStart(2, '0')}
              </Text>
              {showTimeoutCritical ? (
                <>
                  <Text style={[styles.timeoutMessage, { color: theme.textSecondary }]}>
                    Han pasado mas de 5 minutos sin respuesta. Puedes ver otros negocios similares o cancelar.
                  </Text>
                  <View style={styles.timeoutActions}>
                    <TouchableOpacity
                      style={[styles.timeoutAlternativesButton, { backgroundColor: colors.primary }]}
                      onPress={() => router.push(`/orders/cancel/${orderId}` as any)}
                    >
                      <Text style={styles.timeoutAlternativesText}>Ver Alternativas</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={[styles.timeoutMessage, { color: theme.textSecondary }]}>
                  El negocio tiene hasta 5 minutos para aceptar tu pedido.
                </Text>
              )}
            </View>
          )}

          {/* Rejection notice */}
          {wasRejected && (
            <View style={[styles.rejectionCard, { borderColor: `${STATUS_COLORS.error}30` }]}>
              <View style={styles.rejectionHeader}>
                <Store size={24} color={STATUS_COLORS.error} />
                <Text style={[styles.rejectionTitle, { color: STATUS_COLORS.error }]}>Negocio no disponible</Text>
              </View>
              {rejectionReason && (
                <Text style={[styles.rejectionReason, { color: theme.textSecondary, borderLeftColor: `${STATUS_COLORS.error}50` }]}>
                  "{rejectionReason}"
                </Text>
              )}
              <Text style={[styles.rejectionMessage, { color: theme.textSecondary }]}>
                No te preocupes, hay otros negocios similares disponibles para ti.
              </Text>

              {loadingAlternatives ? (
                <View style={styles.loadingAlternatives}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingAltText, { color: theme.textSecondary }]}>Buscando alternativas...</Text>
                </View>
              ) : alternatives.length > 0 ? (
                <View style={styles.alternativesList}>
                  <Text style={[styles.alternativesTitle, { color: theme.text }]}>Prueba con estos negocios:</Text>
                  {alternatives.map((biz) => (
                    <TouchableOpacity
                      key={biz.id}
                      style={[styles.alternativeItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => router.replace(`/food/menu/${biz.id}` as any)}
                    >
                      <View style={styles.alternativeInfo}>
                        <Text style={[styles.alternativeName, { color: theme.text }]}>{biz.name}</Text>
                        <Text style={[styles.alternativeRating, { color: theme.textSecondary }]}>
                          {biz.rating.toFixed(1)} estrellas - {biz.deliveryTime}
                        </Text>
                      </View>
                      <View style={[styles.alternativeButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.alternativeButtonText}>Ver Menu</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noAlternatives, { color: theme.textSecondary }]}>
                  No hay alternativas disponibles en este momento.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.goHomeButton, { backgroundColor: colors.primary }]}
                onPress={() => router.replace('/' as any)}
              >
                <RefreshCw size={18} color="#FFFFFF" />
                <Text style={styles.goHomeButtonText}>Buscar en Inicio</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Delivery Code */}
          {(order.status === 'arrived' || order.status === 'in_transit') && order.deliveryCode && (
            <Animated.View style={[styles.deliveryCodeCard, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.deliveryCodeIcon, { backgroundColor: `${STATUS_COLORS.success}20` }]}>
                <AlertCircle size={24} color={STATUS_COLORS.success} />
              </View>
              <Text style={[styles.deliveryCodeLabel, { color: theme.textSecondary }]}>
                {order.status === 'arrived' ? 'Dale este codigo al repartidor:' : 'Tu codigo de entrega:'}
              </Text>
              <View style={[styles.deliveryCodeBox, { borderColor: STATUS_COLORS.success }]}>
                <Text style={[styles.deliveryCodeValue, { color: STATUS_COLORS.success }]}>{order.deliveryCode}</Text>
              </View>
              <Text style={[styles.deliveryCodeHint, { color: theme.textMuted }]}>
                {order.status === 'arrived' ? 'El repartidor te lo pedira para completar la entrega' : 'Tenlo listo para cuando llegue el repartidor'}
              </Text>
            </Animated.View>
          )}

          {/* Cancel button */}
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: STATUS_COLORS.error }]}
              onPress={() => router.push(`/orders/cancel/${orderId}` as any)}
            >
              <X size={18} color={STATUS_COLORS.error} />
              <Text style={[styles.cancelButtonText, { color: STATUS_COLORS.error }]}>Cancelar Pedido</Text>
            </TouchableOpacity>
          )}

          {/* Request cancellation */}
          {canRequestCancel && (
            <TouchableOpacity
              style={[styles.requestCancelButton, { borderColor: STATUS_COLORS.warning }]}
              onPress={() => router.push(`/orders/cancel-request/${orderId}` as any)}
            >
              <AlertCircle size={18} color={STATUS_COLORS.warning} />
              <Text style={[styles.requestCancelText, { color: STATUS_COLORS.warning }]}>Solicitar Cancelacion</Text>
            </TouchableOpacity>
          )}

          {/* Driver Card */}
          <View style={[styles.driverCard, { backgroundColor: theme.card }]}>
            <View style={styles.driverInfo}>
              <View style={[styles.driverAvatar, { backgroundColor: `${colors.primary}15` }]}>
                <User size={24} color={colors.primary} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={[styles.driverName, { color: theme.text }]}>
                  {order.driverName || 'Buscando repartidor disponible...'}
                </Text>
                {order.driverRating && (
                  <View style={styles.driverRatingRow}>
                    <Star size={14} color={STATUS_COLORS.gold} fill={STATUS_COLORS.gold} />
                    <Text style={[styles.driverRatingText, { color: STATUS_COLORS.gold }]}>{order.driverRating}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}>
                <Phone size={20} color={colors.primary} />
              </TouchableOpacity>
              {order.driverId && (
                <ChatButton
                  orderId={orderId as string}
                  type="client_driver"
                  otherPartyName={order.driverName || 'Repartidor'}
                  compact
                />
              )}
            </View>
          </View>

          {/* Rate button */}
          {order.status === 'delivered' && !order.rated && (
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: colors.primary }]}
              onPress={handleCompleteDelivery}
            >
              <Text style={styles.completeButtonText}>Calificar Repartidor</Text>
            </TouchableOpacity>
          )}

          {/* Support */}
          {!['delivered', 'cancelled'].includes(order.status) && (
            <SupportButton orderId={orderId} variant="banner" label="Problema con tu pedido?" />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ============================================================================
// COMPONENTE DE CALIFICACION
// ============================================================================

function RatingComponent({
  orderId,
  driverName,
  driverId,
  onComplete,
  theme,
  colors,
}: {
  orderId: string;
  driverName: string;
  driverId: string;
  onComplete: () => void;
  theme: typeof COLORS.light;
  colors: { primary: string };
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || !user) return;
    setIsSubmitting(true);
    try {
      await createRating({
        orderId,
        raterId: user.id,
        ratedId: driverId,
        ratedType: 'driver',
        stars: rating,
      });
      onComplete();
    } catch (err) {
      console.error('Error enviando calificacion:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.ratingContainer, { backgroundColor: theme.cardAlt }]}
      contentContainerStyle={styles.ratingContent}
    >
      <Text style={[styles.ratingTitle, { color: theme.text }]}>Como estuvo tu entrega?</Text>
      <Text style={[styles.ratingSubtitle, { color: theme.textSecondary }]}>Califica a {driverName}</Text>

      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
            <Star
              size={40}
              color={star <= rating ? STATUS_COLORS.warning : theme.border}
              fill={star <= rating ? STATUS_COLORS.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.commentSection}>
        <Text style={[styles.commentLabel, { color: theme.text }]}>Comentarios (opcional)</Text>
        <View style={[styles.commentInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.commentPlaceholder, { color: theme.textMuted }]}>
            Cuentanos tu experiencia...
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary },
          rating === 0 && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={rating === 0}
      >
        <Text style={styles.submitButtonText}>Enviar Calificacion</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Saltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  map: {
    width: width,
    height: height * 0.55,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  infoScrollView: {
    flex: 1,
  },
  infoScrollContent: {
    gap: 12,
    paddingBottom: 20,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  etaText: {
    fontSize: 14,
  },
  deliveryCodeCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  deliveryCodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryCodeLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  deliveryCodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  deliveryCodeValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 10,
  },
  deliveryCodeHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  requestCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  requestCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  driverCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    gap: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverRatingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingContainer: {
    flex: 1,
  },
  ratingContent: {
    padding: 24,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  starButton: {
    padding: 4,
  },
  commentSection: {
    width: '100%',
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentInput: {
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    borderWidth: 1.5,
  },
  commentPlaceholder: {
    fontSize: 15,
  },
  submitButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
  },
  // Timeout warning
  timeoutWarningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  timeoutWarningCardCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  timeoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  timeoutTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeoutTime: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeoutMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeoutActions: {
    marginTop: 12,
  },
  timeoutAlternativesButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeoutAlternativesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Rejection
  rejectionCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rejectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  rejectionReason: {
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  rejectionMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingAlternatives: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  loadingAltText: {
    fontSize: 14,
  },
  alternativesList: {
    marginBottom: 16,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  alternativeItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  alternativeRating: {
    fontSize: 13,
  },
  alternativeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alternativeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noAlternatives: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  goHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  goHomeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
