// ============================================================================
// YESSWERA: DASHBOARD DEL NEGOCIO — Orders-first
// The taquero opens the app and sees ORDERS, not 8 buttons.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  BackHandler,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ClipboardList,
  Grid3X3,
  Store,
  Check,
  X,
  Star,
  BarChart2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { getBusinessOrders, acceptOrder, businessRejectOrder } from '@/services/orders';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import SectionHeader from '@/components/ui/SectionHeader';
import StatBox from '@/components/ui/StatBox';
import Pill from '@/components/ui/Pill';
import YAvatar from '@/components/ui/YAvatar';
import type { Order } from '@/constants/types';

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Hace ${hrs}h`;
}

function formatMoney(n: number): string {
  return `$${n.toFixed(0)}`;
}

export default function BusinessDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Mi Negocio');
  const [isOpen, setIsOpen] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Stats derived from orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(
    (o) => o.createdAt >= todayStart && o.status !== 'cancelled'
  );
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending');

  // Load business info
  useEffect(() => {
    loadBusiness();
  }, [user]);

  // Refresh orders on focus
  useFocusEffect(
    useCallback(() => {
      if (businessId) loadOrders();
    }, [businessId])
  );

  // Back button prevention
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Cerrar Sesion', 'Quieres cerrar sesion?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Si', onPress: () => logout() },
        ]);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

  async function loadBusiness() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, business_name, is_open, rating_average')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.business_name || 'Mi Negocio');
        setIsOpen(data.is_open ?? true);
        loadOrders(data.id);
      }
    } catch (e) {
      console.error('loadBusiness error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders(bId?: string) {
    const id = bId || businessId;
    if (!id) return;
    try {
      const data = await getBusinessOrders(id);
      setOrders(data);
    } catch (e) {
      console.error('loadOrders error:', e);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }

  async function toggleOpen() {
    if (!businessId) return;
    const next = !isOpen;
    try {
      await supabase
        .from('businesses')
        .update({ is_open: next })
        .eq('id', businessId);
      setIsOpen(next);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  }

  async function handleAccept(orderId: string) {
    setAcceptingId(orderId);
    try {
      await acceptOrder(orderId, 20);
      await loadOrders();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo aceptar');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(orderId: string) {
    Alert.alert(
      'Rechazar Orden',
      'Seguro que quieres rechazar esta orden?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setRejectingId(orderId);
            try {
              await businessRejectOrder(orderId, 'too_busy');
              await loadOrders();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo rechazar');
            } finally {
              setRejectingId(null);
            }
          },
        },
      ]
    );
  }

  // Rating from DB
  const [rating, setRating] = useState(0);
  useEffect(() => {
    if (!businessId) return;
    supabase
      .from('businesses')
      .select('rating_average')
      .eq('id', businessId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.rating_average) setRating(Number(data.rating_average));
      });
  }, [businessId]);

  const initials = businessName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER CARD ===== */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerName}>{businessName}</Text>
              <Text style={styles.headerSub}>Panel de ordenes</Text>
            </View>
            <YAvatar initials={initials} size={52} color={DS.colors.orange} />
          </View>

          <TouchableOpacity
            onPress={toggleOpen}
            activeOpacity={0.8}
            style={[
              styles.toggleBtn,
              { backgroundColor: isOpen ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' },
            ]}
          >
            <View
              style={[
                styles.toggleDot,
                { backgroundColor: isOpen ? '#4ADE80' : DS.colors.red },
              ]}
            />
            <Text style={styles.toggleText}>
              {isOpen ? 'Negocio Abierto' : 'Negocio Cerrado'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===== STATS ROW ===== */}
        <View style={styles.statsRow}>
          <StatBox
            value={`${todayOrders.length}`}
            label="Ordenes hoy"
            color={DS.colors.blue}
          />
          <StatBox
            value={formatMoney(todaySales)}
            label="Ventas hoy"
            color={DS.colors.green}
          />
          <StatBox
            value={rating > 0 ? rating.toFixed(1) : '--'}
            label="Rating"
            color={DS.colors.orange}
          />
        </View>

        {/* ===== PENDING ORDERS ===== */}
        <View style={styles.sectionRow}>
          <SectionHeader title="Ordenes Pendientes" />
          {pendingOrders.length > 0 && (
            <Pill
              text={`${pendingOrders.length}`}
              color={DS.colors.orange}
            />
          )}
        </View>

        {pendingOrders.length === 0 ? (
          <YCard style={styles.emptyCard}>
            <View style={styles.emptyInner}>
              <View style={styles.emptyIcon}>
                <Check size={32} color={DS.colors.green} />
              </View>
              <Text style={styles.emptyTitle}>Al dia!</Text>
              <Text style={styles.emptyBody}>
                No tienes ordenes pendientes
              </Text>
            </View>
          </YCard>
        ) : (
          pendingOrders.map((order) => (
            <YCard key={order.id} style={styles.orderCard}>
              {/* Order header */}
              <View style={styles.orderHeader}>
                <YAvatar
                  initials={
                    order.customerName
                      ? order.customerName[0].toUpperCase()
                      : '?'
                  }
                  size={40}
                  color={DS.colors.blue}
                />
                <View style={styles.orderHeaderText}>
                  <Text style={styles.orderCustomer}>
                    {order.customerName}
                  </Text>
                  <Text style={styles.orderTime}>
                    {timeAgo(order.createdAt)}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>
                  {formatMoney(order.total)}
                </Text>
              </View>

              {/* Items */}
              {order.items && order.items.length > 0 && (
                <View style={styles.orderItems}>
                  <Text style={styles.orderItemsText} numberOfLines={3}>
                    {order.items
                      .map((i) => `${i.quantity} ${i.name}`)
                      .join(', ')}
                  </Text>
                </View>
              )}

              {/* Customer note */}
              {order.notes ? (
                <Text style={styles.orderNote} numberOfLines={2}>
                  {order.notes}
                </Text>
              ) : null}

              {/* Action buttons */}
              <View style={styles.orderActions}>
                <TouchableOpacity
                  onPress={() => handleReject(order.id)}
                  disabled={rejectingId === order.id}
                  activeOpacity={0.7}
                  style={styles.rejectBtn}
                >
                  <X size={18} color={DS.colors.red} />
                  <Text style={styles.rejectText}>Rechazar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAccept(order.id)}
                  disabled={acceptingId === order.id}
                  activeOpacity={0.7}
                  style={styles.acceptBtn}
                >
                  <Check size={18} color="#FFF" />
                  <Text style={styles.acceptText}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            </YCard>
          ))
        )}

        {/* Spacer for bottom nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ===== BOTTOM NAV ===== */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} activeOpacity={0.7}>
          <ClipboardList size={24} color={DS.colors.orange} />
          <Text style={[styles.navLabel, { color: DS.colors.orange }]}>
            Ordenes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => router.push('/business/products')}
        >
          <Grid3X3 size={24} color={DS.colors.muted} />
          <Text style={styles.navLabel}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => router.push('/business/analytics' as any)}
        >
          <BarChart2 size={24} color={DS.colors.muted} />
          <Text style={styles.navLabel}>Analitica</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => router.push('/business/profile')}
        >
          <Store size={24} color={DS.colors.muted} />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: DS.space.lg,
    gap: DS.space.lg,
  },

  // Header card
  headerCard: {
    backgroundColor: DS.colors.orange,
    borderRadius: DS.radius.xl,
    padding: DS.space.xl,
    gap: DS.space.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    marginRight: DS.space.md,
  },
  headerName: {
    ...DS.fonts.title,
    color: '#FFFFFF',
  },
  headerSub: {
    ...DS.fonts.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    gap: DS.space.sm,
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  toggleText: {
    ...DS.fonts.bodyMed,
    color: '#FFFFFF',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
  },

  // Section
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
  },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: DS.space.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DS.colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.space.md,
  },
  emptyTitle: {
    ...DS.fonts.section,
    color: DS.colors.dark,
  },
  emptyBody: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    marginTop: 4,
  },

  // Order card
  orderCard: {
    gap: DS.space.md,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  orderHeaderText: {
    flex: 1,
  },
  orderCustomer: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  orderTime: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },
  orderTotal: {
    ...DS.fonts.title,
    color: DS.colors.green,
  },
  orderItems: {
    backgroundColor: DS.colors.divider,
    borderRadius: DS.radius.md,
    padding: DS.space.md,
  },
  orderItemsText: {
    ...DS.fonts.body,
    color: DS.colors.body,
  },
  orderNote: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    fontStyle: 'italic',
  },
  orderActions: {
    flexDirection: 'row',
    gap: DS.space.sm,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DS.colors.redLight,
    borderRadius: DS.radius.lg,
    height: 50,
  },
  rejectText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.red,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.lg,
    height: 50,
  },
  acceptText: {
    ...DS.fonts.bodyMed,
    color: '#FFFFFF',
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: DS.colors.card,
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
    paddingBottom: 20,
    paddingTop: DS.space.sm,
    ...DS.shadow.float,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: DS.space.xs,
  },
  navLabel: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },
});
