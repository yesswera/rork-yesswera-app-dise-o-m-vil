// ============================================================================
// YESSWERA: TRACKING DE ORDEN v2 — Redesigned with premium UX
// Inspired by best-in-class delivery tracking (Uber Eats / Rappi style)
// Map top + draggable-feel bottom sheet with rich driver card
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
  Animated,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import { getOrderById, cancelOrder } from '@/services/orders';
import { subscribeToDriverLocation, DriverLocation } from '@/services/gps';
import { getRoute } from '@/services/routing';
import type { Order, OrderStatus } from '@/constants/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.45;

// Tomatlan, Jalisco — default region
const TOMATLAN_REGION = {
  latitude: 19.9333,
  longitude: -105.2500,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// -- Progress stages ----------------------------------------------------------
const STAGES = [
  { key: 'confirmed', label: 'Confirmado', icon: 'check-circle' as const },
  { key: 'preparing', label: 'En Cocina', icon: 'coffee' as const },
  { key: 'in_transit', label: 'En Camino', icon: 'truck' as const },
  { key: 'delivered', label: 'Entregado', icon: 'flag' as const },
];

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
      return 'Preparando tu pedido';
    case 'accepted':
    case 'preparing':
      return 'El negocio esta cocinando';
    case 'ready':
      return 'Tu pedido esta listo!';
    case 'assigned':
    case 'driver_verified':
    case 'handed_to_driver':
      return 'Recogiendo tu pedido';
    case 'in_transit':
      return 'Tu repartidor va en camino';
    case 'arrived':
      return 'Tu repartidor ha llegado!';
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

function getEstimatedArrival(minutes: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// -- Component ----------------------------------------------------------------
export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLoc, setDriverLoc] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [realEtaMin, setRealEtaMin] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const routeFetchedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for ETA badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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
      .catch(() => {
        setRouteCoords([pickup, delivery]);
        setRouteLoaded(true);
      });
  }, [order?.pickupLocation, order?.deliveryLocation]);

  // Fit map to route + driver
  useEffect(() => {
    if (!routeLoaded || routeCoords.length === 0) return;
    const allCoords = [...routeCoords];
    if (driverLoc) allCoords.push({ latitude: driverLoc.latitude, longitude: driverLoc.longitude });

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 80, right: 60, bottom: 40, left: 60 },
        animated: true,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [routeLoaded]);

  // Real ETA from driver position
  useEffect(() => {
    if (!driverLoc || !order?.deliveryLocation) return;
    if (order.status !== 'in_transit' && order.status !== 'arrived') return;
    const dest = order.deliveryLocation;
    if (!dest.latitude || !dest.longitude) return;

    getRoute(
      { latitude: driverLoc.latitude, longitude: driverLoc.longitude },
      { latitude: dest.latitude, longitude: dest.longitude }
    )
      .then((r) => { if (r.durationMin > 0) setRealEtaMin(r.durationMin); })
      .catch(() => {});
  }, [driverLoc?.latitude, driverLoc?.longitude, order?.status]);

  // Re-fit map when driver first appears
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
        <ActivityIndicator size="large" color={DS.colors.orange} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color={DS.colors.muted} />
        <Text style={styles.errorText}>Orden no encontrada</Text>
      </View>
    );
  }

  // -- Derived values ---------------------------------------------------------
  const currentStage = mapStatusToStage(order.status);
  const statusMessage = getStatusMessage(order.status);
  const eta = realEtaMin ?? getEtaMinutes(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isTerminal = isCancelled || isDelivered;

  const driverInitials = order.driverName
    ? order.driverName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'DR';

  const callDriver = () => {
    if (order.driverPhone) Linking.openURL(`tel:${order.driverPhone}`);
  };

  const chatDriver = () => {
    router.push(`/chat/${order.id}` as any);
  };

  const handleCancel = () => {
    const canCancel = ['pending', 'confirmed'].includes(order.status);
    if (!canCancel) {
      Alert.alert('No se puede cancelar', 'Tu pedido ya esta siendo preparado o en camino.');
      return;
    }
    Alert.alert(
      'Cancelar pedido?',
      'Esta accion no se puede deshacer. Si el negocio ya empezo a preparar tu orden, podria aplicarse un cargo.',
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Si, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelOrder(order.id, 'Cancelado por el cliente');
              Alert.alert('Pedido cancelado', 'Tu pedido ha sido cancelado exitosamente.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo cancelar el pedido.');
            }
          },
        },
      ]
    );
  };

  const hasPickup = order.pickupLocation &&
    typeof order.pickupLocation.latitude === 'number' &&
    typeof order.pickupLocation.longitude === 'number';
  const hasDelivery = order.deliveryLocation &&
    typeof order.deliveryLocation.latitude === 'number' &&
    typeof order.deliveryLocation.longitude === 'number';
  const hasLocations = hasPickup && hasDelivery;

  const initialRegion = hasPickup
    ? { latitude: order.pickupLocation!.latitude, longitude: order.pickupLocation!.longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 }
    : hasDelivery
    ? { latitude: order.deliveryLocation.latitude, longitude: order.deliveryLocation.longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 }
    : TOMATLAN_REGION;

  // -- Render -----------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* -- Map area ---------------------------------------------------------- */}
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
          >
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={DS.colors.blue}
                strokeWidth={4}
                lineDashPattern={[8, 6]}
              />
            )}
            {hasPickup && (
              <Marker
                coordinate={{ latitude: order.pickupLocation!.latitude, longitude: order.pickupLocation!.longitude }}
                title="Negocio"
                pinColor={DS.colors.green}
              />
            )}
            {hasDelivery && (
              <Marker
                coordinate={{ latitude: order.deliveryLocation.latitude, longitude: order.deliveryLocation.longitude }}
                title="Entrega"
                pinColor={DS.colors.orange}
              />
            )}
            {driverLoc && (
              <Marker
                coordinate={{ latitude: driverLoc.latitude, longitude: driverLoc.longitude }}
                title={order.driverName || 'Repartidor'}
                pinColor={DS.colors.blue}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.noLocationContainer}>
            <Feather name="map-pin" size={48} color={DS.colors.muted} />
            <Text style={styles.noLocationText}>Sin ubicacion disponible</Text>
          </View>
        )}

        {/* Status badge floating on map */}
        {!isTerminal && (
          <View style={styles.mapBadge}>
            <Feather
              name={currentStage >= 2 ? 'truck' : 'clock'}
              size={14}
              color="#FFF"
            />
            <Text style={styles.mapBadgeText}>
              {currentStage >= 2 ? 'En camino' : 'Preparando'}
            </Text>
          </View>
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="arrow-left" size={22} color={DS.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Estado del Pedido</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => router.push(`/chat/${order.id}` as any)}
            activeOpacity={0.8}
          >
            <Feather name="help-circle" size={22} color={DS.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* -- Bottom sheet ------------------------------------------------------ */}
      <View style={styles.sheet}>
        <View style={styles.dragCapsule} />

        {/* Status header with ETA */}
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusBig}>{statusMessage}</Text>
            {eta !== null && !isTerminal && (
              <Text style={styles.etaSubtext}>
                Llegada estimada: <Text style={styles.etaTime}>{getEstimatedArrival(eta)}</Text>
              </Text>
            )}
            {isDelivered && (
              <Text style={[styles.etaSubtext, { color: DS.colors.green }]}>Entregado con exito</Text>
            )}
            {isCancelled && (
              <Text style={[styles.etaSubtext, { color: DS.colors.red }]}>Pedido cancelado</Text>
            )}
          </View>
          {eta !== null && !isTerminal && (
            <Animated.View style={[styles.etaBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Feather name="clock" size={16} color={DS.colors.orange} />
              <Text style={styles.etaBadgeNum}>{eta}</Text>
              <Text style={styles.etaBadgeUnit}>min</Text>
            </Animated.View>
          )}
        </View>

        {/* -- Horizontal progress bar with icons ------------------------------ */}
        <View style={styles.progressContainer}>
          {/* Background track */}
          <View style={styles.progressTrack} />
          {/* Filled track */}
          <View style={[styles.progressFill, { width: `${(currentStage / (STAGES.length - 1)) * 100}%` }]} />

          {/* Stage icons */}
          <View style={styles.stagesRow}>
            {STAGES.map((stage, idx) => {
              const passed = idx <= currentStage;
              const isCurrent = idx === currentStage;
              return (
                <View key={stage.key} style={styles.stageItem}>
                  <View style={[
                    styles.stageCircle,
                    passed && styles.stageCirclePassed,
                    isCurrent && styles.stageCircleCurrent,
                  ]}>
                    <Feather
                      name={passed ? (idx < currentStage ? 'check' : stage.icon) : stage.icon}
                      size={14}
                      color={passed ? '#FFF' : DS.colors.placeholder}
                    />
                  </View>
                  <Text style={[
                    styles.stageLabel,
                    passed && styles.stageLabelActive,
                    isCurrent && styles.stageLabelCurrent,
                  ]}>
                    {stage.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* -- Driver card ----------------------------------------------------- */}
        {order.driverName ? (
          <YCard style={styles.driverCard}>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatarWrap}>
                <YAvatar initials={driverInitials} size={56} color={DS.colors.blue} />
                <View style={styles.ratingBadge}>
                  <Feather name="star" size={8} color="#FFF" />
                </View>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{order.driverName}</Text>
                <Text style={styles.driverMeta}>
                  Moto
                  {order.driverRating ? ` \u2022 ${order.driverRating.toFixed(2)}` : ''}
                </Text>
              </View>
              <View style={styles.driverActions}>
                <TouchableOpacity style={styles.chatBtn} onPress={chatDriver} activeOpacity={0.8}>
                  <Feather name="message-square" size={20} color="#FFF" />
                </TouchableOpacity>
                {order.driverPhone && (
                  <TouchableOpacity style={styles.callBtn} onPress={callDriver} activeOpacity={0.8}>
                    <Feather name="phone" size={20} color={DS.colors.blue} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </YCard>
        ) : (
          <YCard style={styles.driverCard}>
            <View style={styles.noDriverRow}>
              <View style={styles.noDriverIcon}>
                <Feather name="truck" size={22} color={DS.colors.orange} />
              </View>
              <Text style={styles.noDriverText}>Buscando repartidor...</Text>
            </View>
          </YCard>
        )}

        {/* -- Action buttons -------------------------------------------------- */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => router.push(`/orders/${order.id}` as any)}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={16} color={DS.colors.dark} />
            <Text style={styles.actionBtnOutlineText}>Ver recibo</Text>
          </TouchableOpacity>
          {!isTerminal && (
            <TouchableOpacity
              style={styles.actionBtnCancel}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
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
  noLocationContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  noLocationText: { ...DS.fonts.bodyMed, color: DS.colors.muted },

  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.card,
  },
  topTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },
  helpBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.card,
  },

  mapBadge: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: DS.colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: DS.radius.full,
    gap: 6,
    ...DS.shadow.button,
  },
  mapBadgeText: { ...DS.fonts.label, color: '#FFF' },

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

  // Status header
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.xl,
  },
  statusLeft: { flex: 1, marginRight: 12 },
  statusBig: { ...DS.fonts.title, color: DS.colors.dark },
  etaSubtext: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 4 },
  etaTime: { color: DS.colors.blue, fontWeight: '700' },
  etaBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DS.colors.orange,
  },
  etaBadgeNum: { ...DS.fonts.title, color: DS.colors.orange, marginTop: -2 },
  etaBadgeUnit: { ...DS.fonts.tiny, color: DS.colors.orange, marginTop: -4 },

  // Progress
  progressContainer: {
    height: 70,
    marginBottom: DS.space.lg,
    position: 'relative',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    top: 17,
    left: 24,
    right: 24,
    height: 4,
    backgroundColor: DS.colors.hairline,
    borderRadius: 2,
  },
  progressFill: {
    position: 'absolute',
    top: 17,
    left: 24,
    height: 4,
    backgroundColor: DS.colors.blue,
    borderRadius: 2,
  },
  stagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  stageItem: {
    alignItems: 'center',
    width: 72,
  },
  stageCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DS.colors.hairline,
  },
  stageCirclePassed: {
    backgroundColor: DS.colors.blue,
    borderColor: DS.colors.blue,
  },
  stageCircleCurrent: {
    backgroundColor: DS.colors.blue,
    borderColor: DS.colors.blue,
    shadowColor: DS.colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  stageLabel: {
    ...DS.fonts.tiny,
    color: DS.colors.placeholder,
    marginTop: 6,
    textAlign: 'center',
  },
  stageLabelActive: { color: DS.colors.dark },
  stageLabelCurrent: { color: DS.colors.blue, fontWeight: '700' },

  // Driver card
  driverCard: { marginBottom: DS.space.md },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatarWrap: { position: 'relative' },
  ratingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  driverInfo: { flex: 1 },
  driverName: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  driverMeta: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: 10 },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: DS.colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  noDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  noDriverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDriverText: { ...DS.fonts.body, color: DS.colors.muted },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto' as any,
    marginBottom: DS.space.xxl,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: DS.radius.lg,
    backgroundColor: '#F5F5F4',
    gap: 8,
  },
  actionBtnOutlineText: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  actionBtnCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: DS.radius.lg,
    backgroundColor: '#FEF2F2',
  },
  actionBtnCancelText: { ...DS.fonts.bodyMed, color: DS.colors.red },
});
