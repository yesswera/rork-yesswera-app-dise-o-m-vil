import TouchableSound from '@/components/TouchableSound';
// Nearby Stores - Mapa con comercios cercanos (5km)
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Star, Store, Navigation, List } from 'lucide-react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/theme';
import { Business } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { parseLocation } from '@/utils/geo';

const COLORS = {
  light: { background: '#FFFFFF', card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#78716C' },
  dark: { background: '#1C1917', card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

const { width, height } = Dimensions.get('window');
const RADIUS_KM = 5;
const RADIUS_METERS = RADIUS_KM * 1000;

// Colores por categoría
const CATEGORY_COLORS: Record<string, string> = {
  farmacia: '#3498DB',
  abarrotes: '#FF6B6B',
  ferreteria: '#F39C12',
  carniceria: '#E74C3C',
  tienda: '#1ABC9C',
  electronica: '#9B59B6',
  supermercado: '#2ECC71',
  restaurante: '#E67E22',
  tacos: '#D35400',
  mariscos: '#16A085',
  pizza: '#C0392B',
  cafe: '#8E44AD',
};

interface BusinessWithLocation extends Business {
  latitude: number;
  longitude: number;
  distance?: number;
}

export default function NearbyStoresScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithLocation | null>(null);
  const [showList, setShowList] = useState(false);

  // Obtener ubicación del usuario con timeout y fallbacks
  useEffect(() => {
    (async () => {
      const fallbackLocation = { latitude: 19.9333, longitude: -105.2419 }; // Tomatlan centro

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para mostrar comercios cercanos');
          setUserLocation(fallbackLocation);
          return;
        }

        // Try getCurrentPosition with a 10-second timeout
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        );

        try {
          const location = await Promise.race([locationPromise, timeoutPromise]);
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          return;
        } catch {
          console.log('getCurrentPosition timed out, trying last known...');
        }

        // Fallback: try last known position (instant)
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setUserLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
          return;
        }

        // Final fallback: Tomatlan center
        setUserLocation(fallbackLocation);
      } catch (error) {
        console.error('Error getting location:', error);
        setUserLocation(fallbackLocation);
      }
    })();
  }, []);

  // Cargar negocios cercanos
  const loadNearbyBusinesses = useCallback(async () => {
    if (!userLocation) return;

    try {
      setLoading(true);

      // Obtener todos los negocios abiertos
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_open', true);

      if (error) throw error;

      // Filtrar por distancia y mapear
      const nearbyBusinesses: BusinessWithLocation[] = [];

      for (const biz of data || []) {
        const location = parseLocation(biz.location);
        if (!location) continue;

        // Calcular distancia
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.latitude,
          location.longitude
        );

        if (distance <= RADIUS_KM) {
          nearbyBusinesses.push({
            id: biz.id,
            name: biz.business_name,
            description: biz.description || '',
            category: biz.category || 'otros',
            image: biz.cover_url || biz.logo_url || '',
            rating: Number(biz.rating_average) || 0,
            deliveryTime: `${(biz.preparation_time_minutes || 20) + 10}-${(biz.preparation_time_minutes || 20) + 25} min`,
            tags: [biz.category],
            latitude: location.latitude,
            longitude: location.longitude,
            distance: Math.round(distance * 10) / 10,
          });
        }
      }

      // Ordenar por distancia
      nearbyBusinesses.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setBusinesses(nearbyBusinesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
      Alert.alert('Error', 'No se pudieron cargar los comercios');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    if (userLocation) {
      loadNearbyBusinesses();
    }
  }, [userLocation, loadNearbyBusinesses]);

  // Calcular distancia entre dos puntos (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectBusiness = (business: BusinessWithLocation) => {
    setSelectedBusiness(business);
    mapRef.current?.animateToRegion({
      latitude: business.latitude,
      longitude: business.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  };

  const handleGoToBusiness = (businessId: string) => {
    router.push(`/shopping/list/${businessId}` as any);
  };

  const centerOnUser = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  };

  if (!userLocation) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableSound style={[styles.backButton, { backgroundColor: theme.cardAlt }]} onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableSound>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Comercios Cercanos</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {businesses.length} negocios en {RADIUS_KM} km
          </Text>
        </View>
        <TouchableSound
          style={[styles.toggleButton, { backgroundColor: theme.cardAlt }, showList && styles.toggleButtonActive]}
          onPress={() => setShowList(!showList)}
        >
          <List size={20} color={showList ? Colors.white : Colors.primary} />
        </TouchableSound>
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Círculo de radio */}
          <Circle
            center={userLocation}
            radius={RADIUS_METERS}
            strokeColor={Colors.primary + '50'}
            fillColor={Colors.primary + '10'}
            strokeWidth={2}
          />

          {/* Marcadores de negocios */}
          {businesses.map((business) => (
            <Marker
              key={business.id}
              coordinate={{
                latitude: business.latitude,
                longitude: business.longitude,
              }}
              onPress={() => handleSelectBusiness(business)}
            >
              <View style={[
                styles.markerContainer,
                { backgroundColor: CATEGORY_COLORS[business.category] || Colors.accent },
                selectedBusiness?.id === business.id && styles.markerSelected,
              ]}>
                <Store size={16} color={Colors.white} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Botón centrar en usuario */}
        <TouchableSound style={[styles.centerButton, { backgroundColor: theme.card }]} onPress={centerOnUser}>
          <Navigation size={20} color={Colors.primary} />
        </TouchableSound>

        {/* Leyenda */}
        <View style={[styles.legend, { backgroundColor: theme.card }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Tú</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Comercios</Text>
          </View>
        </View>
      </View>

      {/* Card del negocio seleccionado */}
      {selectedBusiness && !showList && (
        <View style={[styles.selectedCard, { backgroundColor: theme.card }]}>
          <View style={styles.selectedHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[selectedBusiness.category] || Colors.accent }]}>
              <Text style={styles.categoryBadgeText}>{selectedBusiness.category}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Star size={12} color={Colors.warning} fill={Colors.warning} />
              <Text style={[styles.ratingText, { color: theme.text }]}>{selectedBusiness.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={[styles.selectedName, { color: theme.text }]}>{selectedBusiness.name}</Text>
          <Text style={[styles.selectedDistance, { color: theme.textSecondary }]}>
            <MapPin size={14} color={theme.textSecondary} /> {selectedBusiness.distance} km de distancia
          </Text>
          <TouchableSound
            style={styles.selectButton}
            onPress={() => handleGoToBusiness(selectedBusiness.id)}
          >
            <Text style={styles.selectButtonText}>Crear Lista de Compras</Text>
          </TouchableSound>
        </View>
      )}

      {/* Lista de negocios */}
      {showList && (
        <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : businesses.length === 0 ? (
            <View style={styles.emptyState}>
              <Store size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay comercios cercanos</Text>
            </View>
          ) : (
            businesses.map((business) => (
              <TouchableSound
                key={business.id}
                style={[
                  styles.listItem,
                  { backgroundColor: theme.cardAlt },
                  selectedBusiness?.id === business.id && styles.listItemSelected,
                ]}
                onPress={() => handleSelectBusiness(business)}
              >
                <View style={[styles.listIcon, { backgroundColor: CATEGORY_COLORS[business.category] || Colors.accent }]}>
                  <Store size={18} color={Colors.white} />
                </View>
                <View style={styles.listContent}>
                  <Text style={[styles.listName, { color: theme.text }]}>{business.name}</Text>
                  <Text style={[styles.listCategory, { color: theme.textSecondary }]}>{business.category}</Text>
                </View>
                <View style={styles.listMeta}>
                  <Text style={styles.listDistance}>{business.distance} km</Text>
                  <View style={styles.listRating}>
                    <Star size={12} color={Colors.warning} fill={Colors.warning} />
                    <Text style={[styles.listRatingText, { color: theme.textSecondary }]}>{business.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </TouchableSound>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  selectedCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    textTransform: 'capitalize',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  selectedDistance: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  listContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.4,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.background.secondary,
  },
  listItemSelected: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  listCategory: {
    fontSize: 13,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  listMeta: {
    alignItems: 'flex-end',
  },
  listDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  listRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  listRatingText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
