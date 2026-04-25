// ============================================================================
// YESSWERA: DRIVER DASHBOARD (Simplified rebuild)
// Clean, focused UI using DS + ui components
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import {
  getAvailableOrdersForDriver,
  assignOrderToDriver,
} from '@/services/orders';
import { Order } from '@/constants/types';
import { DS, colorShadow } from '@/constants/design';

import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import StatBox from '@/components/ui/StatBox';
import SectionHeader from '@/components/ui/SectionHeader';
import BigButton from '@/components/ui/BigButton';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isAvailable, setIsAvailable] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Stats
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);

  // ── Load driver record ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, is_available')
        .eq('user_id', user.id)
        .maybeSingle();
      if (driver) {
        setDriverId(driver.id);
        setIsAvailable(driver.is_available ?? false);
      }
    })();
  }, [user]);

  // ── Load stats ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    if (!driverId) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('delivered_at', today.toISOString());

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('delivered_at', weekAgo.toISOString());

      const tEarnings = todayOrders?.reduce((s, o) => s + (o.delivery_fee || 0), 0) || 0;
      const wEarnings = weekOrders?.reduce((s, o) => s + (o.delivery_fee || 0), 0) || 0;

      setTodayEarnings(tEarnings);
      setWeekEarnings(wEarnings);
      setTodayDeliveries(todayOrders?.length || 0);
    } catch {
      // Non-critical
    }
  }, [driverId]);

  // ── Load available orders ───────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    if (!isAvailable || !driverId) {
      setAvailableOrders([]);
      return;
    }
    try {
      const orders = await getAvailableOrdersForDriver(driverId);
      setAvailableOrders(orders);
    } catch {
      setAvailableOrders([]);
    }
  }, [isAvailable, driverId]);

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadStats();
    loadOrders();
  }, [loadStats, loadOrders]);

  // Poll for new orders every 15s when available
  useEffect(() => {
    if (!isAvailable) return;
    const interval = setInterval(() => {
      loadOrders();
      loadStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAvailable, loadOrders, loadStats]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadOrders()]);
    setRefreshing(false);
  };

  const toggleAvailability = async () => {
    if (!driverId) return;
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    await supabase
      .from('drivers')
      .update({ is_available: newVal, is_online: newVal })
      .eq('id', driverId);
    if (newVal) {
      loadOrders();
    } else {
      setAvailableOrders([]);
    }
  };

  const handleAccept = async (orderId: string) => {
    if (!driverId) return;
    setAccepting(orderId);
    try {
      await assignOrderToDriver(orderId, driverId);
      router.push('/driver/active-order');
    } catch {
      Alert.alert('Error', 'No se pudo aceptar la orden. Intenta de nuevo.');
    } finally {
      setAccepting(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ── Header Card (blue gradient) ─────────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                Hola, {user?.name?.split(' ')[0] || 'Repartidor'}
              </Text>
            </View>
            <YAvatar
              uri={user?.avatar}
              name={user?.name}
              size={48}
              color="#FFFFFF"
            />
          </View>

          {/* Toggle button */}
          <TouchableOpacity
            onPress={toggleAvailability}
            activeOpacity={0.85}
            style={styles.toggleButton}
          >
            <View
              style={[
                styles.toggleDot,
                { backgroundColor: isAvailable ? '#22C55E' : '#9CA3AF' },
              ]}
            />
            <Text style={styles.toggleLabel}>
              {isAvailable ? 'Disponible' : 'Ocupado'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBox
            value={formatCurrency(todayEarnings)}
            label="Hoy"
            color={DS.colors.green}
          />
          <View style={{ width: DS.space.sm }} />
          <StatBox
            value={formatCurrency(weekEarnings)}
            label="Semana"
            color={DS.colors.blue}
          />
          <View style={{ width: DS.space.sm }} />
          <StatBox
            value={String(todayDeliveries)}
            label="Entregas"
            color={DS.colors.orange}
          />
        </View>

        {/* ── Orders Section ──────────────────────────────────────────── */}
        <SectionHeader
          title="Pedidos Disponibles"
          subtitle="Toca aceptar para tomarlo"
        />

        {availableOrders.length === 0 && (
          <YCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons
                name="moon-outline"
                size={40}
                color={DS.colors.muted}
              />
              <Text style={styles.emptyTitle}>
                No hay pedidos por ahora
              </Text>
              <Text style={styles.emptySubtitle}>
                Te avisaremos cuando haya uno
              </Text>
            </View>
          </YCard>
        )}

        {availableOrders.map((order) => (
          <YCard key={order.id} style={styles.orderCard}>
            {/* Route info */}
            <View style={styles.routeRow}>
              <View style={styles.routeLeft}>
                <View style={styles.routeItem}>
                  <View style={[styles.dot, { backgroundColor: DS.colors.orange }]} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {order.pickupAddress || 'Negocio'}
                  </Text>
                </View>
                <View style={styles.routeItem}>
                  <Ionicons name="location" size={14} color={DS.colors.green} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {order.deliveryAddress || 'Cliente'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeRight}>
                <Text style={styles.payAmount}>
                  {formatCurrency(order.deliveryFee || 0)}
                </Text>
                {order.distanceKm != null && (
                  <Text style={styles.distanceText}>
                    {order.distanceKm.toFixed(1)} km
                  </Text>
                )}
              </View>
            </View>

            {/* Accept button */}
            <BigButton
              label="Aceptar Pedido"
              icon="checkmark-circle-outline"
              color={DS.colors.blue}
              height={56}
              onPress={() => handleAccept(order.id.toString())}
              loading={accepting === order.id.toString()}
              disabled={!!accepting}
              style={{ marginTop: DS.space.md }}
            />
          </YCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Tabs ─────────────────────────────────────────────────── */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity style={styles.tab} activeOpacity={0.7}>
          <Ionicons name="file-tray-outline" size={24} color={DS.colors.blue} />
          <Text style={[styles.tabLabel, { color: DS.colors.blue }]}>
            Pedidos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          activeOpacity={0.7}
          onPress={() => router.push('/driver/profile')}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={DS.colors.muted}
          />
          <Text style={[styles.tabLabel, { color: DS.colors.muted }]}>
            Perfil
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    padding: DS.space.lg,
  },

  // Header
  headerCard: {
    backgroundColor: DS.colors.blue,
    borderRadius: DS.radius.lg,
    padding: DS.space.xl,
    marginBottom: DS.space.lg,
    ...colorShadow(DS.colors.blue, 0.25),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.space.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: DS.space.md,
  },
  greeting: {
    ...DS.fonts.title,
    color: '#FFFFFF',
  },

  // Toggle
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: DS.radius.full,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.xl,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: DS.space.sm,
  },
  toggleLabel: {
    ...DS.fonts.bodyMed,
    color: '#FFFFFF',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: DS.space.xxl,
  },

  // Empty state
  emptyCard: {
    marginBottom: DS.space.lg,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: DS.space.xxl,
  },
  emptyTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    marginTop: DS.space.md,
  },
  emptySubtitle: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: DS.space.xs,
  },

  // Order card
  orderCard: {
    marginBottom: DS.space.md,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeLeft: {
    flex: 1,
    marginRight: DS.space.md,
    gap: DS.space.sm,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeText: {
    ...DS.fonts.body,
    color: DS.colors.body,
    flex: 1,
  },
  routeRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  payAmount: {
    ...DS.fonts.title,
    color: DS.colors.green,
  },
  distanceText: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: 2,
  },

  // Bottom tabs
  bottomTabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
    backgroundColor: DS.colors.card,
    paddingVertical: DS.space.sm,
    paddingBottom: DS.space.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.xs,
  },
  tabLabel: {
    ...DS.fonts.tiny,
    marginTop: 2,
  },
});
