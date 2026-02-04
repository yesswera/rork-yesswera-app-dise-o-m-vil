import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, Phone, Star, Navigation } from 'lucide-react-native';
import ChatButton from '@/components/ChatButton';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getOrderById } from '@/services/orders';
import { getDriverLocation, DriverLocation } from '@/services/gps';
import { useAuth } from '@/contexts/auth';
import { Order, OrderStatus } from '@/constants/types';
import ErrorState from '@/components/ErrorState';
import { calculateETA, formatETA } from '@/utils/distance';

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
  const prevStatusRef = useRef<OrderStatus | null>(null);
  const markerRotation = useRef(new Animated.Value(0)).current;
  const prevLocationRef = useRef<DriverLocation | null>(null);

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
        // Don't show error for GPS unavailable
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
        return 'Buscando repartidor...';
      case 'confirmed':
        return 'Orden confirmada';
      case 'preparing':
        return 'Preparando orden';
      case 'ready':
        return 'Listo para recoger';
      case 'accepted':
        return 'Repartidor asignado';
      case 'in_transit':
        return 'En camino';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelada';
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
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
          <Text style={styles.etaText}>
            {eta ? `Llega en ${formatETA(eta)}` : 'Calculando tiempo...'}
          </Text>
        </View>

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
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    console.log('Rating submitted:', { orderId, rating });
    onComplete();
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
