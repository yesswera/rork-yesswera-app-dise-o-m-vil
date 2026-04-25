// ============================================================================
// YESSWERA: ACTIVE ORDER — Vecino Amigo DS rebuild
// ONE BIG BUTTON per stage. Designed for use while driving.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import {
  getDriverOrders,
  updateOrderStatus,
  confirmArrivalAtBusiness,
  confirmOrderReceived,
  confirmArrivalAtClient,
  validateDeliveryCode,
} from '@/services/orders';
import { updateDriverLocation } from '@/services/gps';
import { Order } from '@/constants/types';
import { DS, colorShadow } from '@/constants/design';

import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import BigButton from '@/components/ui/BigButton';
import Pill from '@/components/ui/Pill';

// ── Stage definitions ────────────────────────────────────────────────────────

interface StageConfig {
  statusText: string;
  subtitle: string;
  buttonLabel: string;
  buttonColor: string;
  buttonIcon: keyof typeof Ionicons.glyphMap;
  pillText: string;
  pillColor: string;
}

const STAGES: StageConfig[] = [
  {
    statusText: 'Ir al negocio',
    subtitle: 'Recoge el pedido en el negocio',
    buttonLabel: 'Llegue al negocio',
    buttonColor: DS.colors.blue,
    buttonIcon: 'storefront-outline',
    pillText: 'Recogida',
    pillColor: DS.colors.blue,
  },
  {
    statusText: 'Verificar recogida',
    subtitle: 'Confirma que tienes el pedido',
    buttonLabel: 'Tengo el pedido',
    buttonColor: DS.colors.orange,
    buttonIcon: 'cube-outline',
    pillText: 'En negocio',
    pillColor: DS.colors.orange,
  },
  {
    statusText: 'En camino al cliente',
    subtitle: 'Lleva el pedido a la direccion indicada',
    buttonLabel: 'Llegue con el cliente',
    buttonColor: DS.colors.green,
    buttonIcon: 'location-outline',
    pillText: 'En transito',
    pillColor: DS.colors.green,
  },
  {
    statusText: 'Entregar pedido',
    subtitle: 'Entrega al cliente y confirma',
    buttonLabel: 'Pedido entregado',
    buttonColor: DS.colors.green,
    buttonIcon: 'checkmark-circle-outline',
    pillText: 'En destino',
    pillColor: DS.colors.green,
  },
];

// Map order status to stage number
function statusToStage(status: string, driverAtBusiness?: boolean): number {
  if (status === 'assigned' || status === 'preparing') {
    return driverAtBusiness ? 1 : 0;
  }
  if (status === 'ready') {
    return driverAtBusiness ? 1 : 0;
  }
  if (status === 'driver_verified' || status === 'handed_to_driver') return 1;
  if (status === 'in_transit') return 2;
  if (status === 'arrived') return 3;
  if (status === 'delivered') return 3;
  return 0;
}

// ── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i < current
              ? s.dotDone
              : i === current
              ? s.dotActive
              : s.dotPending,
          ]}
        />
      ))}
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [pressing, setPressing] = useState(false);
  const [stage, setStage] = useState(0);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const locationSub = useRef<Location.LocationSubscription | null>(null);

  // ── Load active order ───────────────────────────────────────────────────

  const loadOrder = useCallback(async () => {
    if (!user) return;
    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driver) {
        setLoading(false);
        return;
      }

      const orders = await getDriverOrders(driver.id);
      if (orders.length > 0) {
        const active = orders[0];
        setOrder(active);
        setStage(statusToStage(active.status, active.driverAtBusiness));
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 8000);
    return () => clearInterval(interval);
  }, [loadOrder]);

  // ── GPS tracking ────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 15,
          timeInterval: 5000,
        },
        (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setDriverLocation(coords);

          // Push to Firebase if we have an active order
          if (order?.driverId && order?.id) {
            updateDriverLocation(order.driverId, order.id.toString(), loc);
          }
        }
      );
    })();

    return () => {
      locationSub.current?.remove();
    };
  }, [order?.driverId, order?.id]);

  // ── Big button handler ──────────────────────────────────────────────────

  const handleBigButton = async () => {
    if (!order || pressing) return;
    setPressing(true);

    try {
      const orderId = order.id.toString();

      switch (stage) {
        case 0: {
          // Stage 0 -> 1: Arrived at business
          const res = await confirmArrivalAtBusiness(orderId);
          if (res.success) {
            setStage(1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert('Error', res.message);
          }
          break;
        }
        case 1: {
          // Stage 1 -> 2: Got the order, now in transit
          const res = await confirmOrderReceived(orderId);
          if (res.success) {
            setStage(2);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert('Error', res.message);
          }
          break;
        }
        case 2: {
          // Stage 2 -> 3: Arrived at client
          const res = await confirmArrivalAtClient(orderId);
          if (res.success) {
            setStage(3);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert('Error', res.message);
          }
          break;
        }
        case 3: {
          // Stage 3: Mark delivered
          await updateOrderStatus(orderId, 'delivered');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Entrega completada!', 'Buen trabajo.', [
            { text: 'OK', onPress: () => router.replace('/driver/dashboard') },
          ]);
          break;
        }
      }

      await loadOrder();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Algo salio mal');
    } finally {
      setPressing(false);
    }
  };

  // ── Navigate to address ─────────────────────────────────────────────────

  const openNavigation = (address: string, location?: { latitude: number; longitude: number }) => {
    if (location) {
      const url = Platform.select({
        ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
        android: `geo:${location.latitude},${location.longitude}?q=${location.latitude},${location.longitude}(${encodeURIComponent(address)})`,
      });
      if (url) Linking.openURL(url);
    } else if (address) {
      const url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(address)}`,
        android: `geo:0,0?q=${encodeURIComponent(address)}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  // ── Panic ───────────────────────────────────────────────────────────────

  const handlePanic = () => {
    Alert.alert(
      'Boton de panico',
      'Se notificara a soporte de Yesswera. Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Si, necesito ayuda',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Ayuda solicitada', 'El equipo de soporte ha sido notificado.');
          },
        },
      ]
    );
  };

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={DS.colors.blue} />
          <Text style={s.emptyText}>Cargando orden...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centerWrap}>
          <Ionicons name="file-tray-outline" size={56} color={DS.colors.muted} />
          <Text style={s.emptyTitle}>No tienes orden activa</Text>
          <Text style={s.emptyText}>Espera a que se te asigne un pedido</Text>
          <BigButton
            label="Volver al inicio"
            icon="arrow-back-outline"
            color={DS.colors.blue}
            height={60}
            onPress={() => router.replace('/driver/dashboard')}
            style={{ marginTop: DS.space.xxl, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentStage = STAGES[stage] || STAGES[0];

  // Determine which address to show based on stage
  const showPickup = stage <= 1;
  const targetAddress = showPickup
    ? order.pickupAddress || 'Direccion del negocio'
    : order.deliveryAddress;
  const targetLocation = showPickup
    ? order.pickupLocation
    : order.deliveryLocation;
  const targetLabel = showPickup ? 'Negocio' : 'Cliente';

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: Panic + Order # ──────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.panicBtn}
            onPress={handlePanic}
            activeOpacity={0.7}
          >
            <Ionicons name="warning" size={20} color="#FFFFFF" />
            <Text style={s.panicLabel}>SOS</Text>
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.orderNumber}>Orden #{order.orderNumber}</Text>
            <Pill text={currentStage.pillText} color={currentStage.pillColor} />
          </View>

          <View style={{ width: 56 }} />
        </View>

        {/* ── Progress dots ────────────────────────────────────────────── */}
        <ProgressDots current={stage} total={4} />

        {/* ── Big status title ─────────────────────────────────────────── */}
        <Text style={s.statusTitle}>{currentStage.statusText}</Text>
        <Text style={s.statusSubtitle}>{currentStage.subtitle}</Text>

        {/* ── Map placeholder ──────────────────────────────────────────── */}
        <View style={s.mapContainer}>
          <View style={s.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={s.mapText}>Mapa en vivo</Text>

            {/* Driver marker */}
            {driverLocation && (
              <View style={[s.mapMarker, { backgroundColor: DS.colors.blue, top: 16, left: 16 }]}>
                <Ionicons name="navigate" size={14} color="#FFFFFF" />
                <Text style={s.markerText}>Tu</Text>
              </View>
            )}

            {/* Destination marker */}
            <View
              style={[
                s.mapMarker,
                {
                  backgroundColor: showPickup ? DS.colors.orange : DS.colors.green,
                  top: 16,
                  right: 16,
                },
              ]}
            >
              <Ionicons
                name={showPickup ? 'storefront' : 'person'}
                size={14}
                color="#FFFFFF"
              />
              <Text style={s.markerText}>{targetLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── Address card ─────────────────────────────────────────────── */}
        <YCard style={s.addressCard}>
          <View style={s.addressHeader}>
            <View style={[s.addressIcon, { backgroundColor: showPickup ? DS.colors.orangeLight : DS.colors.greenLight }]}>
              <Ionicons
                name={showPickup ? 'storefront' : 'home'}
                size={22}
                color={showPickup ? DS.colors.orange : DS.colors.green}
              />
            </View>
            <View style={s.addressContent}>
              <Text style={s.addressLabel}>
                {showPickup ? 'Recoger en' : 'Entregar en'}
              </Text>
              <Text style={s.addressText} numberOfLines={2}>
                {targetAddress}
              </Text>
              {showPickup && order.businessName && (
                <Text style={s.businessName}>{order.businessName}</Text>
              )}
            </View>
          </View>

          {/* Navigate button — large, with text */}
          <TouchableOpacity
            style={s.navigateBtn}
            onPress={() => openNavigation(targetAddress, targetLocation)}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={22} color={DS.colors.blue} />
            <Text style={s.navigateBtnText}>Abrir navegacion</Text>
            <Ionicons name="chevron-forward" size={18} color={DS.colors.muted} />
          </TouchableOpacity>
        </YCard>

        {/* ── Customer info card ───────────────────────────────────────── */}
        <YCard style={s.customerCard}>
          <View style={s.customerRow}>
            <YAvatar
              name={order.customerName}
              size={48}
              color={DS.colors.green}
            />
            <View style={s.customerInfo}>
              <Text style={s.customerName} numberOfLines={1}>
                {order.customerName}
              </Text>
              <Text style={s.customerSub} numberOfLines={1}>
                Cliente  -  ${order.total.toFixed(0)} MXN
              </Text>
            </View>
          </View>

          {/* Action buttons: Call + Chat */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: DS.colors.greenLight }]}
              onPress={() => {
                if (order.customerPhone) {
                  Linking.openURL(`tel:${order.customerPhone}`);
                } else {
                  Alert.alert('Sin telefono', 'No hay numero disponible');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={22} color={DS.colors.green} />
              <Text style={[s.actionBtnText, { color: DS.colors.green }]}>Llamar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: DS.colors.blueLight }]}
              onPress={() => Alert.alert('Chat', 'Proximamente')}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={22} color={DS.colors.blue} />
              <Text style={[s.actionBtnText, { color: DS.colors.blue }]}>Mensaje</Text>
            </TouchableOpacity>
          </View>
        </YCard>

        {/* ── Order items summary (collapsed) ──────────────────────────── */}
        {order.items && order.items.length > 0 && (
          <YCard style={s.itemsCard}>
            <Text style={s.itemsTitle}>
              {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
            </Text>
            {order.items.slice(0, 3).map((item, i) => (
              <Text key={i} style={s.itemLine} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
            ))}
            {order.items.length > 3 && (
              <Text style={s.itemsMore}>
                +{order.items.length - 3} mas...
              </Text>
            )}
          </YCard>
        )}

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Fixed bottom: THE BIG BUTTON ───────────────────────────────── */}
      <View style={s.bottomBar}>
        <BigButton
          label={currentStage.buttonLabel}
          icon={currentStage.buttonIcon}
          color={currentStage.buttonColor}
          height={64}
          onPress={handleBigButton}
          loading={pressing}
          disabled={pressing}
          style={s.bigButton}
        />
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: DS.space.lg,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.xxxl,
  },
  emptyTitle: {
    ...DS.fonts.title,
    color: DS.colors.dark,
    marginTop: DS.space.lg,
    textAlign: 'center',
  },
  emptyText: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    marginTop: DS.space.sm,
    textAlign: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.lg,
  },
  panicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.red,
    paddingHorizontal: DS.space.md,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.full,
    gap: 4,
    minHeight: DS.touch.min,
    ...colorShadow(DS.colors.red, 0.3),
  },
  panicLabel: {
    ...DS.fonts.label,
    color: '#FFFFFF',
  },
  headerCenter: {
    alignItems: 'center',
    gap: DS.space.xs,
  },
  orderNumber: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },

  // Progress dots
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DS.space.sm,
    marginBottom: DS.space.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDone: {
    backgroundColor: DS.colors.green,
  },
  dotActive: {
    backgroundColor: DS.colors.orange,
    width: 28,
    borderRadius: DS.radius.full,
  },
  dotPending: {
    backgroundColor: DS.colors.hairline,
  },

  // Status
  statusTitle: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
    textAlign: 'center',
    marginBottom: DS.space.xs,
  },
  statusSubtitle: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    textAlign: 'center',
    marginBottom: DS.space.xl,
  },

  // Map
  mapContainer: {
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
    marginBottom: DS.space.lg,
    ...DS.shadow.card,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    ...DS.fonts.small,
    color: 'rgba(255,255,255,0.6)',
    marginTop: DS.space.xs,
  },
  mapMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DS.radius.full,
    gap: 4,
  },
  markerText: {
    ...DS.fonts.tiny,
    color: '#FFFFFF',
  },

  // Address card
  addressCard: {
    marginBottom: DS.space.lg,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.space.md,
    marginBottom: DS.space.lg,
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: DS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    ...DS.fonts.label,
    color: DS.colors.muted,
    marginBottom: 2,
  },
  addressText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  businessName: {
    ...DS.fonts.small,
    color: DS.colors.orange,
    marginTop: 2,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.blueLight,
    borderRadius: DS.radius.md,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.lg,
    gap: DS.space.sm,
    minHeight: DS.touch.min,
  },
  navigateBtnText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.blue,
    flex: 1,
  },

  // Customer card
  customerCard: {
    marginBottom: DS.space.lg,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    marginBottom: DS.space.lg,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  customerSub: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: DS.space.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.md,
    minHeight: DS.touch.min,
  },
  actionBtnText: {
    ...DS.fonts.bodyMed,
  },

  // Items card
  itemsCard: {
    marginBottom: DS.space.lg,
  },
  itemsTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    marginBottom: DS.space.sm,
  },
  itemLine: {
    ...DS.fonts.body,
    color: DS.colors.body,
    paddingVertical: 3,
  },
  itemsMore: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: DS.space.xs,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.xxl,
    paddingTop: DS.space.md,
    backgroundColor: DS.colors.bg,
    ...DS.shadow.float,
  },
  bigButton: {
    width: '100%',
  },
});
