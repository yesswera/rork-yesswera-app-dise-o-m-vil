import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Store,
  Truck,
  ShoppingBag,
  Package,
  BarChart3,
  Settings,
  ChevronRight,
  CheckCircle,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { DS } from '@/constants/design';
import StatBox from '@/components/ui/StatBox';
import YCard from '@/components/ui/YCard';
import Pill from '@/components/ui/Pill';
import SectionHeader from '@/components/ui/SectionHeader';
import {
  getAdminStats,
  AdminStats,
  getOrdersInProgress,
  AdminOrder,
} from '@/services/admin';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  preparing: 'Preparando',
  ready: 'Lista',
  in_transit: 'En camino',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: DS.colors.green,
  preparing: DS.colors.green,
  ready: DS.colors.blue,
  in_transit: DS.colors.blue,
  delivered: DS.colors.green,
  cancelled: DS.colors.red,
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [inProgress, setInProgress] = useState<AdminOrder[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [s, ip] = await Promise.all([
        getAdminStats(),
        getOrdersInProgress(),
      ]);
      setStats(s);
      setInProgress(ip);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesion', 'Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={DS.colors.green} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Panel Admin</Text>
            <Text style={styles.headerSub}>Yesswera Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={DS.colors.red} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox value={String(stats?.totalUsers || 0)} label="Usuarios" color={DS.colors.green} />
          <StatBox value={String(stats?.totalOrders || 0)} label="Ordenes" color={DS.colors.blue} />
        </View>
        <View style={styles.statsRow}>
          <StatBox value={String(stats?.totalBusinesses || 0)} label="Negocios" color={DS.colors.orange} />
          <StatBox value={String(stats?.totalDrivers || 0)} label="Repartidores" color={DS.colors.blue} />
        </View>

        {/* In Progress */}
        <SectionHeader title="Ordenes en Proceso" subtitle={`${inProgress.length} activas`} />
        {inProgress.length === 0 ? (
          <YCard>
            <View style={styles.emptyRow}>
              <CheckCircle size={24} color={DS.colors.green} />
              <Text style={styles.emptyText}>Todo al dia</Text>
            </View>
          </YCard>
        ) : (
          inProgress.slice(0, 5).map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderRow}
              onPress={() => router.push('/admin/orders' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.orderInfo}>
                <Text style={styles.orderClient}>{order.clientName}</Text>
                <Text style={styles.orderBiz}>{order.businessName || 'N/A'}</Text>
              </View>
              <Pill
                text={STATUS_LABELS[order.status] || order.status}
                color={STATUS_COLORS[order.status] || DS.colors.muted}
              />
            </TouchableOpacity>
          ))
        )}

        {/* Quick Actions */}
        <SectionHeader title="Acciones" />
        <View style={styles.actionsGrid}>
          {[
            { icon: Package, label: 'Ordenes', color: DS.colors.blue, route: '/admin/orders' },
            { icon: Truck, label: 'Repartidores', color: DS.colors.green, route: '/admin/drivers' },
            { icon: Users, label: 'Usuarios', color: DS.colors.orange, route: '/admin/users' },
            { icon: Settings, label: 'Config', color: DS.colors.muted, route: '/admin/settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.actionCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
              <ChevronRight size={16} color={DS.colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.xl, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.xxl },
  headerTitle: { ...DS.fonts.hero, color: DS.colors.dark },
  headerSub: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  logoutBtn: { padding: DS.space.sm },
  statsRow: { flexDirection: 'row', gap: DS.space.md, marginBottom: DS.space.md },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, justifyContent: 'center', paddingVertical: DS.space.lg },
  emptyText: { ...DS.fonts.body, color: DS.colors.muted },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    marginBottom: DS.space.sm,
    ...DS.shadow.card,
  },
  orderInfo: { flex: 1 },
  orderClient: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  orderBiz: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  actionsGrid: { gap: DS.space.sm },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    gap: DS.space.md,
    ...DS.shadow.card,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { ...DS.fonts.bodyMed, color: DS.colors.dark, flex: 1 },
});
