import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Animated, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, Phone, Star, Navigation, X, AlertCircle } from 'lucide-react-native';
import ChatButton from '@/components/ChatButton';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getOrderById, cancelPendingOrder } from '@/services/orders';
import { getDriverLocation, DriverLocation } from '@/services/gps';
import { useAuth } from '@/contexts/auth';
import { Order, OrderStatus } from '@/constants/types';
import ErrorState from '@/components/ErrorState';
import { calculateETA, formatETA } from '@/utils/distance';
import { createRating } from '@/services/ratings';

const { width, height } = Dimensions.get('window');

export default function TrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { token } = useAuth();
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
  const [cancelling, setCancelling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    if (order.status === 'delivered' || order.status === 'cancelled') return;

    // Don't try to fetch GPS if there's no driver assigned yet
    if (!order.driverId && order.status === 'pending') return;

    const fetchData = async () => {
      try {
        // Only fetch driver location if there's a driver assigned
        const promises: Promise<any>[] = [
          getOrderById(orderId as string)
        ];

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

          // Only calculate ETA if deliveryLocation has coordinates
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
    switch (order.status) {
      case 'pending':
        return 'Esperando confirmación del negocio...';
      case 'accepted':
        return 'Negocio aceptó tu pedido';
      case 'preparing':
        return 'Preparando tu pedido';
      case 'ready':
        return 'Pedido listo, buscando repartidor...';
      case 'assigned':
        return 'Repartidor va al negocio';
      case 'handed_to_driver':
        return 'Repartidor recibio tu pedido';
      case 'in_transit':
        return 'Tu pedido va en camino';
      case 'arrived':
        return 'Tu repartidor llegó';
      case 'delivered':
        return 'Pedido entregado';
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

  const handleCancelOrder = () => {
    if (!order || order.status !== 'pending') return;

    Alert.alert(
      'Cancelar Pedido',
      '¿Estás seguro que deseas cancelar este pedido?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelPendingOrder(order.id.toString(), 'Cancelado por cliente');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Pedido Cancelado', 'Tu pedido ha sido cancelado exitosamente.', [
                { text: 'OK', onPress: () => router.push('/' as any) }
              ]);
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', err.message || 'No se pudo cancelar el pedido');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const canCancel = order?.status === 'pending';
  const canRequestCancel = order && ['accepted', 'preparing'].includes(order.status);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando seguimiento...</Text>
      </View>
    );
  }

  if (error || !order) {
    return <ErrorState message={error || 'No se encontró la orden'} onRetry={handleRetry} />;
  }

  if (showRating) {
    return (
      <RatingComponent
        orderId={orderId || ''}
        driverName={order.driverName || 'el repartidor'}
        driverId={order.driverId || ''}
        onComplete={() => router.push('/' as any)}
      />
    );
  }

  // Handle deliveryLocation as string or object
  const getDeliveryCoords = () => {
    if (typeof order.deliveryLocation === 'object' && order.deliveryLocation?.latitude) {
      return order.deliveryLocation;
    }
    // Default coords for Tomatlán, Jalisco if only string address
    return { latitude: 19.9333, longitude: -105.2500 };
  };

  const deliveryCoords = getDeliveryCoords();

  return (
    <View style={styles.container}>
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
            pinColor={Colors.accent}
            title="Punto de Recogida"
            description={order.pickupAddress}
          />
        )}
        <Marker
          coordinate={deliveryCoords}
          pinColor={Colors.primary}
          title="Punto de Entrega"
          description={typeof order.deliveryLocation === 'string' ? order.deliveryLocation : order.deliveryAddress}
        />
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude
            }}
            title="Repartidor"
            description={order.driverName}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.View
              style={[
                styles.driverMarker,
                {
                  transform: [
                    { rotate: markerRotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg']
                    })}
                  ]
                }
              ]}
            >
              <Navigation size={20} color={Colors.white} fill={Colors.white} />
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
            strokeColor={Colors.primary}
            strokeWidth={3}
          />
        )}
      </MapView>

      <View style={styles.infoContainer}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Clock size={20} color={order.status === 'arrived' ? Colors.success : Colors.primary} />
            <Text style={[styles.statusText, order.status === 'arrived' && { color: Colors.success }]}>{getStatusText()}</Text>
          </View>
          {order.status === 'arrived' ? (
            <Text style={styles.etaText}>Sal a recibir tu pedido</Text>
          ) : (
            <Text style={styles.etaText}>
              {eta ? `Llega en ${formatETA(eta)}` : order.status === 'pending' || order.status === 'accepted' || order.status === 'preparing' ? '' : 'Calculando tiempo...'}
            </Text>
          )}
        </View>

        {(order.status === 'arrived' || order.status === 'in_transit') && order.deliveryCode && (
          <Animated.View style={[styles.deliveryCodeCard, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.deliveryCodeIcon}>
              <AlertCircle size={24} color={Colors.success} />
            </View>
            <Text style={styles.deliveryCodeLabel}>
              {order.status === 'arrived' ? 'Dale este codigo al repartidor:' : 'Tu codigo de entrega:'}
            </Text>
            <View style={styles.deliveryCodeBox}>
              <Text style={styles.deliveryCodeValue}>{order.deliveryCode}</Text>
            </View>
            <Text style={styles.deliveryCodeHint}>
              {order.status === 'arrived' ? 'El repartidor te lo pedira para completar la entrega' : 'Tenlo listo para cuando llegue el repartidor'}
            </Text>
          </Animated.View>
        )}

        {/* Cancel button for pending orders */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            <X size={18} color={Colors.error} />
            <Text style={styles.cancelButtonText}>
              {cancelling ? 'Cancelando...' : 'Cancelar Pedido'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Info for requesting cancellation after accepted */}
        {canRequestCancel && (
          <View style={styles.cancelInfoCard}>
            <AlertCircle size={18} color={Colors.warning} />
            <Text style={styles.cancelInfoText}>
              Para cancelar, contacta al negocio por chat
            </Text>
          </View>
        )}

        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <User size={24} color={Colors.primary} />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{order.driverName || 'Asignando repartidor...'}</Text>
              {order.driverRating && (
                <View style={styles.driverRatingRow}>
                  <Star size={14} color={Colors.gold} fill={Colors.gold} />
                  <Text style={styles.driverRatingText}>{order.driverRating}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Phone size={20} color={Colors.primary} />
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

        {order.status === 'delivered' && !order.rated && (
          <TouchableOpacity style={styles.completeButton} onPress={handleCompleteDelivery}>
            <Text style={styles.completeButtonText}>Calificar Repartidor</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RatingComponent({ orderId, driverName, driverId, onComplete }: { orderId: string; driverName: string; driverId: string; onComplete: () => void }) {
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
      console.error('Error enviando calificación:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.ratingContainer} contentContainerStyle={styles.ratingContent}>
      <Text style={styles.ratingTitle}>¿Cómo estuvo tu entrega?</Text>
      <Text style={styles.ratingSubtitle}>Califica a {driverName}</Text>

      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Star
              size={40}
              color={star <= rating ? Colors.warning : Colors.border.medium}
              fill={star <= rating ? Colors.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.commentSection}>
        <Text style={styles.commentLabel}>Comentarios (opcional)</Text>
        <View style={styles.commentInput}>
          <Text style={styles.commentPlaceholder}>
            Cuéntanos tu experiencia...
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={rating === 0}
      >
        <Text style={styles.submitButtonText}>Enviar Calificación</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipButtonText}>Saltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  centerContent: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  map: {
    width: width,
    height: height * 0.6,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  etaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  deliveryCodeCard: {
    backgroundColor: Colors.success + '10',
    borderWidth: 2,
    borderColor: Colors.success,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  deliveryCodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  deliveryCodeLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  deliveryCodeBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.success,
    borderStyle: 'dashed' as const,
  },
  deliveryCodeValue: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.success,
    letterSpacing: 10,
  },
  deliveryCodeHint: {
    fontSize: 12,
    color: Colors.text.light,
    textAlign: 'center' as const,
  },
  cancelButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.error + '10',
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  cancelInfoCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.warning + '15',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  cancelInfoText: {
    fontSize: 13,
    color: Colors.warning,
    flex: 1,
  },
  driverCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  driverInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  driverDetails: {
    gap: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  driverRatingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  driverRatingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  completeButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  ratingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  ratingContent: {
    padding: 24,
    alignItems: 'center' as const,
  },
  ratingTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  starsContainer: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 32,
  },
  starButton: {
    padding: 4,
  },
  commentSection: {
    width: '100%' as const,
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  commentPlaceholder: {
    fontSize: 15,
    color: Colors.text.light,
  },
  submitButton: {
    width: '100%' as const,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.text.light,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
});
