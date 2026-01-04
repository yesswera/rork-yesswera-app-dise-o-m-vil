import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, Phone, Star } from 'lucide-react-native';
import Colors from '@/constants/colors';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

export default function TrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [driverLocation, setDriverLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
  });
  const [showRating, setShowRating] = useState(false);
  const [orderStatus] = useState<'pending' | 'accepted' | 'in_transit' | 'delivered'>('in_transit');

  const pickupLocation = {
    latitude: 37.78725,
    longitude: -122.4334,
  };

  const deliveryLocation = {
    latitude: 37.79025,
    longitude: -122.4304,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDriverLocation((prev) => ({
        latitude: prev.latitude + (Math.random() - 0.5) * 0.001,
        longitude: prev.longitude + (Math.random() - 0.5) * 0.001,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const driver = {
    name: 'Carlos Rodríguez',
    rating: 4.8,
    phone: '+1 234 567 8900',
  };

  const getStatusText = () => {
    switch (orderStatus) {
      case 'pending':
        return 'Buscando repartidor...';
      case 'accepted':
        return 'Repartidor asignado';
      case 'in_transit':
        return 'En camino';
      case 'delivered':
        return 'Entregado';
      default:
        return 'Procesando';
    }
  };

  const handleCompleteDelivery = () => {
    setShowRating(true);
  };

  if (showRating) {
    return <RatingComponent orderId={orderId || ''} driverName={driver.name} onComplete={() => router.push('/' as any)} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={pickupLocation}
          pinColor={Colors.accent}
          title="Punto de Recogida"
        />
        <Marker
          coordinate={deliveryLocation}
          pinColor={Colors.primary}
          title="Punto de Entrega"
        />
        <Marker
          coordinate={driverLocation}
          title="Repartidor"
          description={driver.name}
        >
          <View style={styles.driverMarker}>
            <User size={20} color={Colors.white} />
          </View>
        </Marker>

        <Polyline
          coordinates={[pickupLocation, driverLocation, deliveryLocation]}
          strokeColor={Colors.primary}
          strokeWidth={3}
        />
      </MapView>

      <View style={styles.infoContainer}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
          <Text style={styles.etaText}>Tiempo estimado: 12 min</Text>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <User size={24} color={Colors.primary} />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.driverRatingRow}>
                <Star size={14} color={Colors.warning} fill={Colors.warning} />
                <Text style={styles.driverRatingText}>{driver.rating}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Phone size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {orderStatus === 'delivered' && (
          <TouchableOpacity style={styles.completeButton} onPress={handleCompleteDelivery}>
            <Text style={styles.completeButtonText}>Calificar Repartidor</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RatingComponent({ orderId, driverName, onComplete }: { orderId: string; driverName: string; onComplete: () => void }) {
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
    color: Colors.text.secondary,
  },
  callButton: {
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
