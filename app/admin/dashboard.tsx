// ============================================================================
// YESSWERA: ADMIN DASHBOARD
// Panel principal de administracion - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Users,
  Store,
  Truck,
  ShoppingBag,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Package,
  CheckCircle,
  XCircle,
  Settings,
  Database,
  LayoutDashboard,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/auth';
import {
  getAdminStats,
  AdminStats,
  getTodayOrders,
  getOrdersInProgress,
  AdminOrder,
  getDailyOrderSummary,
  DailyOrderSummary,
  seedAllShoppingBusinesses,
} from '@/services/admin';

// ============================================================================
// COLORES EXPLICITOS (modo oscuro)
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

// Colores fijos (no cambian con tema)
const FIXED_COLORS = {
  primary: '#22C55E',
  primaryDark: '#15803D',
  accent: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [todayOrders, setTodayOrders] = useState<AdminOrder[]>([]);
  const [ordersInProgress, setOrdersInProgress] = useState<AdminOrder[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyOrderSummary[]>([]);
  const [seeding, setSeeding] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsData, todayData, inProgressData, summaryData] = await Promise.all([
        getAdminStats(),
        getTodayOrders(),
        getOrdersInProgress(),
        getDailyOrderSummary(7),
      ]);

      setStats(statsData);
      setTodayOrders(todayData);
      setOrdersInProgress(inProgressData);
      setDailySummary(summaryData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSeedProducts = async () => {
    Alert.alert(
      'Sembrar Productos',
      '¿Deseas agregar productos de prueba a todos los negocios que no tienen productos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sembrar',
          onPress: async () => {
            setSeeding(true);
            try {
              const results = await seedAllShoppingBusinesses();
              if (results.length === 0) {
                Alert.alert('Info', 'Todos los negocios ya tienen productos');
              } else {
                const summary = results.map(r => `${r.businessName}: ${r.productsAdded} productos`).join('\n');
                Alert.alert('Productos Agregados', summary);
              }
              loadData();
            } catch (error) {
              console.error('Seed error:', error);
              Alert.alert('Error', 'No se pudieron agregar los productos');
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
  };
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return FIXED_COLORS.warning;
      case 'accepted':
      case 'preparing': return FIXED_COLORS.primary;
      case 'ready':
      case 'picked_up':
      case 'in_transit': return FIXED_COLORS.accent;
      case 'delivered': return FIXED_COLORS.success;
      case 'cancelled': return FIXED_COLORS.error;
      default: return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      preparing: 'Preparando',
      ready: 'Lista',
      picked_up: 'Recogida',
      in_transit: 'En camino',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={LayoutDashboard}
      headerTitle="Panel Admin"
      headerSubtitle="Yesswera Dashboard"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.card }]}
          onPress={() => router.push('/admin/users' as any)}
        >
          <Users size={24} color={FIXED_COLORS.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalUsers || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Usuarios</Text>
          <Text style={[styles.statSubtext, { color: theme.textMuted }]}>+{stats?.newUsersToday || 0} hoy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.card }]}
          onPress={() => router.push('/admin/orders' as any)}
        >
          <ShoppingBag size={24} color={FIXED_COLORS.accent} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalOrders || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ordenes</Text>
          <Text style={[styles.statSubtext, { color: theme.textMuted }]}>{stats?.ordersToday || 0} hoy</Text>
        </TouchableOpacity>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <DollarSign size={24} color={FIXED_COLORS.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(stats?.totalRevenue || 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ingresos</Text>
          <Text style={[styles.statSubtext, { color: theme.textMuted }]}>{formatCurrency(stats?.revenueToday || 0)} hoy</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <TrendingUp size={24} color={FIXED_COLORS.warning} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.averageRating || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
          <Text style={[styles.statSubtext, { color: theme.textMuted }]}>Promedio</Text>
        </View>
      </View>

      {/* User Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={20} color={FIXED_COLORS.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Usuarios por Tipo</Text>
        </View>
        <View style={[styles.breakdownCard, { backgroundColor: theme.card }]}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Users size={18} color={FIXED_COLORS.primary} />
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{stats?.totalClients || 0}</Text>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Clientes</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Store size={18} color={FIXED_COLORS.success} />
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{stats?.totalBusinesses || 0}</Text>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Negocios</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Truck size={18} color={FIXED_COLORS.accent} />
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{stats?.totalDrivers || 0}</Text>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Repartidores</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Orders In Progress */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={20} color={FIXED_COLORS.accent} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ordenes en Proceso ({ordersInProgress.length})</Text>
        </View>
        {ordersInProgress.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
            <CheckCircle size={32} color={FIXED_COLORS.success} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay ordenes en proceso</Text>
          </View>
        ) : (
          <View style={[styles.ordersListSmall, { backgroundColor: theme.card }]}>
            {ordersInProgress.slice(0, 5).map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCardSmall, { borderBottomColor: theme.border }]}
                onPress={() => router.push('/admin/orders' as any)}
              >
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderClient, { color: theme.text }]}>{order.clientName}</Text>
                  <Text style={[styles.orderBusiness, { color: theme.textSecondary }]}>{order.businessName || 'Sin negocio'}</Text>
                  <Text style={[styles.orderTime, { color: theme.textMuted }]}>{formatTime(order.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {ordersInProgress.length > 5 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => router.push('/admin/orders' as any)}
              >
                <Text style={[styles.seeMoreText, { color: FIXED_COLORS.primary }]}>Ver todas ({ordersInProgress.length})</Text>
                <ChevronRight size={16} color={FIXED_COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Daily Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color={FIXED_COLORS.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ultimos 7 Dias</Text>
        </View>
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <View style={styles.chartContainer}>
            {dailySummary.map((day, index) => {
              const maxOrders = Math.max(...dailySummary.map(d => d.totalOrders), 1);
              const height = (day.totalOrders / maxOrders) * 100;
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <Text style={[styles.chartBarValue, { color: theme.textSecondary }]}>{day.totalOrders}</Text>
                  <View style={[styles.chartBar, { height: Math.max(height, 4), backgroundColor: FIXED_COLORS.primary + '40' }]}>
                    <View
                      style={[
                        styles.chartBarCompleted,
                        { height: `${(day.completedOrders / Math.max(day.totalOrders, 1)) * 100}%`, backgroundColor: FIXED_COLORS.success }
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartLabel, { color: theme.textMuted }]}>{formatDate(day.date)}</Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: theme.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: FIXED_COLORS.primary }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: FIXED_COLORS.success }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Completadas</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Settings size={20} color={theme.text} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Acciones Rapidas</Text>
        </View>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card }]}
            onPress={() => router.push('/admin/users' as any)}
          >
            <Users size={24} color={FIXED_COLORS.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Gestionar Usuarios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card }]}
            onPress={() => router.push('/admin/orders' as any)}
          >
            <Package size={24} color={FIXED_COLORS.accent} />
            <Text style={[styles.actionText, { color: theme.text }]}>Ver Ordenes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card }, seeding && styles.actionCardDisabled]}
            onPress={handleSeedProducts}
            disabled={seeding}
          >
            {seeding ? (
              <ActivityIndicator size="small" color={FIXED_COLORS.success} />
            ) : (
              <Database size={24} color={FIXED_COLORS.success} />
            )}
            <Text style={[styles.actionText, { color: theme.text }]}>
              {seeding ? 'Sembrando...' : 'Sembrar Productos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card }]}
            onPress={() => router.push('/admin/settings' as any)}
          >
            <Settings size={24} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Configuracion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ShoppingBag size={20} color={FIXED_COLORS.warning} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ordenes de Hoy ({todayOrders.length})</Text>
        </View>
        {todayOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
            <AlertCircle size={32} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay ordenes hoy</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {todayOrders.slice(0, 10).map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, { backgroundColor: theme.card }]}
                onPress={() => router.push('/admin/orders' as any)}
              >
                <View style={styles.orderLeft}>
                  <View style={[styles.orderIcon, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    {order.status === 'delivered' ? (
                      <CheckCircle size={20} color={FIXED_COLORS.success} />
                    ) : order.status === 'cancelled' ? (
                      <XCircle size={20} color={FIXED_COLORS.error} />
                    ) : (
                      <Package size={20} color={getStatusColor(order.status)} />
                    )}
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={[styles.orderClientName, { color: theme.text }]}>{order.clientName}</Text>
                    <Text style={[styles.orderBusinessName, { color: theme.textSecondary }]}>{order.businessName || order.serviceType}</Text>
                    <View style={styles.orderMeta}>
                      <Text style={[styles.orderMetaText, { color: theme.textMuted }]}>{formatTime(order.createdAt)}</Text>
                      <Text style={[styles.orderMetaDot, { color: theme.textMuted }]}>•</Text>
                      <Text style={[styles.orderMetaText, { color: theme.textMuted }]}>{formatCurrency(order.total)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.orderRight}>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusTextLarge, { color: getStatusColor(order.status) }]}>
                      {getStatusLabel(order.status)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  breakdownCard: {
    borderRadius: 12,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
    gap: 6,
  },
  breakdownValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  breakdownLabel: {
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  ordersListSmall: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderCardSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  orderInfo: {
    flex: 1,
  },
  orderClient: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderBusiness: {
    fontSize: 13,
    marginTop: 2,
  },
  orderTime: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    marginBottom: 12,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarValue: {
    fontSize: 10,
    marginBottom: 4,
  },
  chartBar: {
    width: 28,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarCompleted: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
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
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  ordersList: {
    gap: 8,
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderDetails: {
    flex: 1,
  },
  orderClientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderBusinessName: {
    fontSize: 13,
    marginTop: 2,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  orderMetaText: {
    fontSize: 12,
  },
  orderMetaDot: {
    marginHorizontal: 6,
  },
  orderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusTextLarge: {
    fontSize: 11,
    fontWeight: '600',
  },
});
