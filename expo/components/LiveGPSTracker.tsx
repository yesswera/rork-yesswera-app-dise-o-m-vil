import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Clock, MapPin, Navigation } from 'lucide-react-native';
import { getDriverLocation, type GPSResponse, type DriverLocation } from '@/services/gps';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';

interface LiveGPSTrackerProps {
  orderId: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
}

export default function LiveGPSTracker({ orderId, deliveryLocation }: LiveGPSTrackerProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const mapRef = useRef<MapView>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const fetchDriverLocation = async () => {
      try {
        const response = await getDriverLocation(orderId);
        if (response) {
          setDriverLocation(response.location);
          setEta(response.eta || null);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching GPS:', error);
        setIsLoading(false);
      }
    };

    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 10000);

    return () => clearInterval(interval);
  }, [orderId, token]);

  useEffect(() => {
    if (driverLocation && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          driverLocation,
          deliveryLocation,
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [driverLocation, deliveryLocation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando ubicación del repartidor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {eta && (
        <View style={styles.etaBanner}>
          <Clock size={20} color={Colors.white} />
          <Text style={styles.etaText}>
            Llega en aproximadamente {eta} minutos
          </Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          ...deliveryLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        <Marker
          coordinate={deliveryLocation}
          title="Tu ubicación"
          description="Dirección de entrega"
        >
          <View style={styles.destinationMarker}>
            <MapPin size={32} color={Colors.error} />
          </View>
        </Marker>

        {driverLocation && (
          <>
            <Marker
              coordinate={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              title="Repartidor"
              description="Ubicación actual"
            >
              <View style={styles.driverMarker}>
                <Navigation size={32} color={Colors.primary} />
              </View>
            </Marker>

            <Polyline
              coordinates={[
                {
                  latitude: driverLocation.latitude,
                  longitude: driverLocation.longitude,
                },
                deliveryLocation,
              ]}
              strokeColor={Colors.primary}
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          </>
        )}
      </MapView>

      {!driverLocation && (
        <View style={styles.noLocationContainer}>
          <Text style={styles.noLocationText}>
            Esperando ubicación del repartidor...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  etaBanner: {
    position: 'absolute' as const,
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    zIndex: 1000,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.error,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  noLocationContainer: {
    position: 'absolute' as const,
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  noLocationText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
});
