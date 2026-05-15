// ============================================================================
// YESSWERA: TRACKING DE ORDEN — Real Map with route + live driver
// Map (48%) + Bottom sheet (52%) with progress bar + driver card
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import { getOrderById } from '@/services/orders';
import { subscribeToDriverLocation, DriverLocation } from '@/services/gps';
import { getRoute } from '@/services/routing';
import type { Order, OrderStatus } from '@/constants/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.48;

// Tomatlan, Jalisco — default region when no coordinates available
const TOMATLAN_REGION = {
  latitude: 19.9333,
  longitude: -105.2500,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// -- Progress stages ----------------------------------------------------------
const STAGES = ['pending', 'preparing', 'in_transit', 'delivered'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  pending: 'Recibido',
  preparing: 'Preparando',
  in_transit: 'En camino',
  delivered: 'Entregado',
};

function mapStatusToStage(status: OrderStatus): number {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 0;
    case 'accepted':
    case 'preparing':
    case 'ready':
    case 'assigned':
    case 'driver_verified':
    case 'handed_to_driver':
      return 1;
    case 'in_transit':
    case 'arrived':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
}

function getStatusMessage(status: OrderStatus): string {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 'Tu pedido fue recibido';
    case 'accepted':
    case 'preparing':
      return 'El negocio esta preparando tu pedido';
    case 'ready':
      return 'Tu pedido esta listo';
    case 'assigned':
    case 'driver_verified':
    case 'handed_to_driver':
      return 'Un repartidor recogio tu pedido';
    case 'in_transit':
      return 'Tu repartidor va en camino';
    case 'arrived':
      return 'Tu repartidor ha llegado';
    case 'delivered':
      return 'Pedido entregado';
    case 'cancelled':
      return 'Pedido cancelado';
    default:
      return 'Procesando tu pedido';
  }
}

function getEtaMinutes(status: OrderStatus): number | null {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 25;
    case 'accepted':
    case 'preparing':
      return 18;
    case 'ready':
    case 'assigned':
    case 'driver_verified':
    case 'handed_to_driver':
      return 12;
    case 'in_transit':
      return 8;
    case 'arrived':
      return 1;
    default:
      return null;
  }
}

// -- Component ----------------------------------------------------------------
export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLoc, setDriverLoc] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const routeFetchedRef = useRef(false);

  // Fetch order
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initial load + auto-refresh every 5 s
  useEffect(() => {
    fetchOrder();
    pollRef.current = setInterval(fetchOrder, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOrder]);

  // Subscribe to driver GPS via Firebase
  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeToDriverLocation(orderId, (loc) => setDriverLoc(loc));
    return unsub;
  }, [orderId]);

  // Stop polling on terminal statuses
  useEffect(() => {
    if (order && (order.status === 'delivered' || order.status === 'cancelled')) {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [order?.status]);

  // Fetch route when pickup and delivery locations are available
  useEffect(() => {
    if (routeFetchedRef.current) return;
    if (!order?.pickupLocation || !order?.deliveryLocation) return;

    const pickup = order.pickupLocation;
    const delivery = order.deliveryLocation;

    if (!pickup.latitude || !pickup.longitude || !delivery.latitude || !delivery.longitude) return;

    routeFetchedRef.current = true;

    getRoute(pickup, delivery)
      .then((result) => {
        setRouteCoords(result.coordinates);
        setRouteLoaded(true);
      })
      .catch((err) => {
        console.warn('Failed to fetch route:', err);
        // Fallback: straight line
        setRouteCoords([pickup, delivery]);
        setRouteLoaded(true);
      });
  }, [order?.pickupLocation, order?.deliveryLocation]);

  // Fit map to show the full route + driver when route loads
  useEffect(() => {
    if (!routeLoaded || routeCoords.length === 0) return;

    const allCoords = [...routeCoords];
    if (driverLoc) {
      allCoords.push({ latitude: driverLoc.latitude, longitude: driverLoc.longitude });
    }

    // Small delay to let the MapView render
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 80, right: 60, bottom: 40, left: 60 },
        animated: true,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [routeLoaded]);

  // Re-fit map when driver location first becomes available (once)
  const driverFittedRef = useRef(false);
  useEffect(() => {
    if (driverFittedRef.current) return;
    if (!driverLoc || routeCoords.length === 0) return;

    driverFittedRef.current = true;
    const allCoords = [
      ...routeCoords,
      { latitude: driverLoc.latitude, longitude: driverLoc.longitude },
    ];

    mapRef.current?.fitToCoordinates(allCoords, {
      edgePadding: { top: 80, right: 60, bottom: 40, left: 60 },
      animated: true,
    });
  }, [driverLoc, routeCoords]);

  // -- Loading / error states -------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DS.colors.green} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={DS.colors.muted} />
        <Text style={styles.errorText}>Orden no encontrada</Text>
      </View>
    );
  }

  // -- Derived values ---------------------------------------------------------
  const currentStage = mapStatusToStage(order.status);
  const statusMessage = getStatusMessage(order.status);
  const eta = getEtaMinutes(order.status);

  const driverInitials = order.driverName
    ? order.driverName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'DR';

  const callDriver = () => {
    if (order.driverPhone) Linking.openURL(`tel:${order.driverPhone}`);
  };

  const hasPickup = order.pickupLocation &&
    typeof order.pickupLocation.latitude === 'number' &&
    typeof order.pickupLocation.longitude === 'number';
  const hasDelivery = order.deliveryLocation &&
    typeof order.deliveryLocation.latitude === 'number' &&
    typeof order.deliveryLocation.longitude === 'number';
  const hasLocations = hasPickup && hasDelivery;

  // Determine initial map region
  const initialRegion = hasPickup
    ? {
        latitude: order.pickupLocation!.latitude,
        longitude: order.pickupLocation!.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }
    : hasDelivery
    ? {
        latitude: order.deliveryLocation.latitude,
        longitude: order.deliveryLocation.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }
    : TOMATLAN_REGION;

  // -- Render -----------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* -- Map area (top 48 %) ----------------------------------------------- */}
      <View style={styles.mapArea}>
        {hasLocations ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            {/* Route polyline */}
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={DS.colors.green}
                strokeWidth={4}
                lineDashPattern={undefined}
              />
            )}

            {/* Business / Pickup marker — green */}
            {hasPickup && (
              <Marker
                coordinate={{
                  latitude: order.pickupLocation!.latitude,
                  longitude: order.pickupLocation!.longitude,
                }}
                title="Negocio"
                description="Punto de recogida"
                pinColor={DS.colors.green}
              />
            )}

            {/* Customer / Delivery marker — orange */}
            {hasDelivery && (
              <Marker
                coordinate={{
                  latitude: order.deliveryLocation.latitude,
                  longitude: order.deliveryLocation.longitude,
                }}
                title="Entrega"
                description={order.deliveryAddress || 'Tu direccion'}
                pinColor={DS.colors.orange}
              />
            )}

            {/* Driver marker — blue (real-time) */}
            {driverLoc && (
              <Marker
                coordinate={{
                  latitude: driverLoc.latitude,
                  longitude: driverLoc.longitude,
                }}
                title={order.driverName || 'Repartidor'}
                description="En camino"
                pinColor={DS.colors.blue}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.noLocationContainer}>
            <Ionicons name="location-outline" size={48} color={DS.colors.muted} />
            <Text style={styles.noLocationText}>Sin ubicacion disponible</Text>
            <Text style={styles.noLocationSub}>
              Las coordenadas del pedido no estan disponibles
            </Text>
          </View>
        )}

        {/* Help button */}
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => router.push(`/chat/${order.id}` as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="help-circle" size={22} color="#FFF" />
          <Text style={styles.helpText}>Ayuda</Text>
        </TouchableOpacity>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={DS.colors.dark} />
        </TouchableOpacity>
      </View>

      {/* -- Bottom sheet (bottom 52 %) ---------------------------------------- */}
      <View style={styles.sheet}>
        {/* Drag capsule */}
        <View style={styles.dragCapsule} />

        {/* Status + ETA */}
        <Text style={styles.statusBig}>{statusMessage}</Text>
        {eta !== null && <Text style={styles.etaGreen}>Llega en ~{eta} min</Text>}
        {order.status === 'delivered' && (
          <Text style={[styles.etaGreen, { color: DS.colors.green }]}>Entregado</Text>
        )}
        {order.status === 'cancelled' && (
          <Text style={[styles.etaGreen, { color: DS.colors.red }]}>Cancelado</Text>
        )}

        {/* -- Progress bar with 4 stages -------------------------------------- */}
        <View style={styles.progressRow}>
          {STAGES.map((stage, idx) => {
            const passed = idx <= currentStage;
            const isCurrent = idx === currentStage;

            return (
              <View key={stage} style={styles.stageCol}>
                {/* Connector line (before circle) */}
                {idx > 0 && (
                  <View
                    style={[
                      styles.connector,
                      { backgroundColor: passed ? DS.colors.green : DS.colors.hairline },
                    ]}
                  />
                )}

                {/* Circle */}
                <View
                  style={[
                    styles.circle,
                    passed && !isCurrent && styles.circlePassed,
                    isCurrent && styles.circleCurrent,
                  ]}
                >
                  {passed && !isCurrent && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                  {isCurrent && <View style={styles.currentDot} />}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.stageLabel,
                    passed && { color: DS.colors.dark, fontWeight: '600' },
                  ]}
                >
                  {STAGE_LABELS[stage]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* -- Driver card ----------------------------------------------------- */}
        {order.driverName ? (
          <YCard style={styles.driverCard}>
            <View style={styles.driverRow}>
              <YAvatar initials={driverInitials} size={52} color={DS.colors.green} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{order.driverName}</Text>
                <Text style={styles.driverMeta}>
                  Moto{order.driverRating ? ` \u2022 ${order.driverRating.toFixed(1)} \u2605` : ''}
                </Text>
              </View>
              {order.driverPhone && (
                <TouchableOpacity style={styles.phoneBtn} onPress={callDriver} activeOpacity={0.8}>
                  <Ionicons name="call" size={24} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </YCard>
        ) : (
          <YCard style={styles.driverCard}>
            <View style={styles.noDriverRow}>
              <Ionicons name="bicycle-outline" size={28} color={DS.colors.muted} />
              <Text style={styles.noDriverText}>Buscando repartidor...</Text>
            </View>
          </YCard>
        )}
      </View>
    </View>
  );
}

// -- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.bg,
    gap: 12,
  },
  errorText: { ...DS.fonts.body, color: DS.colors.muted },

  // Map
  mapArea: { height: MAP_HEIGHT, backgroundColor: '#E8E4DF', position: 'relative' },

  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noLocationText: { ...DS.fonts.bodyMed, color: DS.colors.muted },
  noLocationSub: { ...DS.fonts.small, color: DS.colors.placeholder, textAlign: 'center', paddingHorizontal: 40 },

  helpBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    backgroundColor: DS.colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DS.radius.full,
    gap: 6,
    ...DS.shadow.button,
  },
  helpText: { ...DS.fonts.label, color: '#FFF' },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.card,
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: DS.space.xl,
    paddingTop: 12,
    ...DS.shadow.float,
  },
  dragCapsule: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: DS.colors.hairline,
    alignSelf: 'center',
    marginBottom: DS.space.lg,
  },
  statusBig: { ...DS.fonts.title, color: DS.colors.dark, textAlign: 'center' },
  etaGreen: { ...DS.fonts.bodyMed, color: DS.colors.green, textAlign: 'center', marginTop: 4 },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: DS.space.xxl,
    marginBottom: DS.space.xxl,
    paddingHorizontal: DS.space.sm,
  },
  stageCol: { alignItems: 'center', flex: 1, position: 'relative' },
  connector: {
    position: 'absolute',
    top: 13,
    height: 3,
    borderRadius: 2,
    zIndex: -1,
    left: '-50%' as any,
    right: '50%' as any,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.colors.hairline,
    borderWidth: 2,
    borderColor: DS.colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlePassed: { backgroundColor: DS.colors.green, borderColor: DS.colors.green },
  circleCurrent: { borderWidth: 3, borderColor: DS.colors.green, backgroundColor: '#FFF' },
  currentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: DS.colors.green },
  stageLabel: { ...DS.fonts.tiny, color: DS.colors.muted, marginTop: 6, textAlign: 'center' },

  // Driver card
  driverCard: { marginTop: 'auto' as any, marginBottom: DS.space.xl },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverInfo: { flex: 1 },
  driverName: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  driverMeta: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  phoneBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.button,
  },
  noDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  noDriverText: { ...DS.fonts.body, color: DS.colors.muted },
});
