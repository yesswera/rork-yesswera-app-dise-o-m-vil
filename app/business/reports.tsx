import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: REPORTES DE NEGOCIO
// Reportes avanzados: productos top, hora pico, tendencias, clientes
// Requiere plan basico o superior (durante lanzamiento: acceso total)
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView as RNScrollView,
} from 'react-native';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Star,
  Package,
  Search,
  ShoppingBag,
  Crown,
  Lock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import { getBusinessAnalytics, BusinessAnalytics } from '@/services/analytics-data';
import {
  getBusinessSubscription,
  checkFeatureAccess,
  BusinessSubscription,
  SubscriptionPlan,
  getPlanDisplayName,
  getPlanColor,
} from '@/services/subscriptions';

// ============================================================================
// COLORES
// ============================================================================
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

const FIX = {
  primary: '#22C55E',
  accent: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
};

export default function BusinessReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');

  // Customer stats
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [repeatCustomers, setRepeatCustomers] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Get business ID
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!biz) { setLoading(false); return; }
      setBusinessId(biz.id);

      // Load subscription + analytics in parallel
      const daysBack = timeRange === '7d' ? 7 : 30;
      const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const [sub, analyticsData] = await Promise.all([
        getBusinessSubscription(biz.id),
        getBusinessAnalytics(biz.id, dateFrom),
      ]);

      setSubscription(sub);
      setAnalytics(analyticsData);

      // Customer analysis
      if (checkFeatureAccess(sub?.plan || 'launch', 'customer_insights')) {
        const { data: orders } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('business_id', biz.id)
          .eq('status', 'delivered');

        if (orders) {
          const customerMap = new Map<string, number>();
          orders.forEach(o => {
            if (o.customer_id) customerMap.set(o.customer_id, (customerMap.get(o.customer_id) || 0) + 1);
          });
          setTotalCustomers(customerMap.size);
          setRepeatCustomers(Array.from(customerMap.values()).filter(c => c > 1).length);
        }
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, timeRange]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const plan = subscription?.plan || 'launch';
  const hasReportsAdvanced = checkFeatureAccess(plan, 'reports_advanced');
  const hasCustomerInsights = checkFeatureAccess(plan, 'customer_insights');
  const hasAI = checkFeatureAccess(plan, 'analytics_ai');
  const hasSearchAnalytics = checkFeatureAccess(plan, 'search_analytics');

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtHour = (h: number) => h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`;

  if (loading) {
    return (
      <ScreenContainer headerGradient="primary" headerIcon={BarChart3} headerTitle="Reportes" headerSubtitle="Cargando...">
        <View style={styles.center}><ActivityIndicator size="large" color={FIX.primary} /></View>
      </ScreenContainer>
    );
  }

  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={BarChart3}
      headerTitle="Reportes"
      headerSubtitle={analytics?.businessName || 'Tu negocio'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Plan Badge */}
      <View style={styles.planBadgeRow}>
        <View style={[styles.planBadge, { backgroundColor: getPlanColor(plan) + '20' }]}>
          <Crown size={14} color={getPlanColor(plan)} />
          <Text style={[styles.planBadgeText, { color: getPlanColor(plan) }]}>
            Plan {getPlanDisplayName(plan)}
          </Text>
        </View>
        {plan === 'free' && (
          <TouchableSound
            style={[styles.upgradeBtn, { backgroundColor: FIX.warning }]}
            onPress={() => router.push('/business/upgrade' as any)}
          >
            <Text style={styles.upgradeBtnText}>Mejorar Plan</Text>
          </TouchableSound>
        )}
      </View>

      {/* Time Range */}
      <View style={styles.timeRange}>
        {(['7d', '30d'] as const).map((range) => (
          <TouchableSound
            key={range}
            style={[styles.timeBtn, { backgroundColor: theme.card }, timeRange === range && { backgroundColor: FIX.primary }]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeBtnText, { color: theme.textSecondary }, timeRange === range && { color: '#FFFFFF' }]}>
              {range === '7d' ? '7 Dias' : '30 Dias'}
            </Text>
          </TouchableSound>
        ))}
      </View>

      {/* KPI Summary */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
          <ShoppingBag size={20} color={FIX.primary} />
          <Text style={[styles.kpiValue, { color: theme.text }]}>{analytics?.totalOrders || 0}</Text>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Ordenes</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
          <DollarSign size={20} color={FIX.accent} />
          <Text style={[styles.kpiValue, { color: theme.text }]}>{fmt(analytics?.totalRevenue || 0)}</Text>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Ingresos</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
          <TrendingUp size={20} color={FIX.warning} />
          <Text style={[styles.kpiValue, { color: theme.text }]}>{fmt(analytics?.averageOrderValue || 0)}</Text>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Ticket Prom.</Text>
        </View>
      </View>

      {/* Hora Pico y Dia Mas Activo */}
      {hasReportsAdvanced && analytics ? (
        <View style={[styles.peakCard, { backgroundColor: theme.card }]}>
          <View style={styles.peakItem}>
            <Clock size={20} color={FIX.accent} />
            <View>
              <Text style={[styles.peakLabel, { color: theme.textMuted }]}>Hora Pico</Text>
              <Text style={[styles.peakValue, { color: theme.text }]}>{fmtHour(analytics.peakHour)}</Text>
            </View>
          </View>
          <View style={[styles.peakDivider, { backgroundColor: theme.border }]} />
          <View style={styles.peakItem}>
            <Calendar size={20} color={FIX.accent} />
            <View>
              <Text style={[styles.peakLabel, { color: theme.textMuted }]}>Dia Mas Activo</Text>
              <Text style={[styles.peakValue, { color: theme.text }]}>{analytics.peakDay}</Text>
            </View>
          </View>
        </View>
      ) : !hasReportsAdvanced && (
        <LockedSection
          theme={theme}
          title="Hora Pico y Dia Mas Activo"
          description="Mejora tu plan para ver cuando tienes mas ventas"
          onUpgrade={() => router.push('/business/upgrade' as any)}
        />
      )}

      {/* Top Products */}
      {hasReportsAdvanced && analytics ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Productos Mas Vendidos</Text>
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {analytics.topProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin ventas en este periodo</Text>
            ) : (
              analytics.topProducts.slice(0, 8).map((product, idx) => (
                <View key={idx} style={[styles.listRow, idx < analytics.topProducts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Text style={[styles.listRank, { color: idx < 3 ? FIX.warning : theme.textMuted }]}>#{idx + 1}</Text>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: theme.text }]} numberOfLines={1}>{product.productName}</Text>
                    <Text style={[styles.listSub, { color: theme.textMuted }]}>{product.totalSold} vendidos</Text>
                  </View>
                  <Text style={[styles.listValue, { color: FIX.primary }]}>{fmt(product.totalRevenue)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      ) : !hasReportsAdvanced && (
        <LockedSection
          theme={theme}
          title="Productos Mas Vendidos"
          description="Descubre cuales son tus productos estrella"
          onUpgrade={() => router.push('/business/upgrade' as any)}
        />
      )}

      {/* Hourly Chart */}
      {hasReportsAdvanced && analytics && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ventas por Hora</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
            <RNScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hourChart}>
                {analytics.hourlySales.map((h) => {
                  const max = Math.max(...analytics.hourlySales.map(x => x.orderCount), 1);
                  return (
                    <View key={h.hour} style={styles.hourBar}>
                      <Text style={[styles.hourValue, { color: theme.textMuted }]}>{h.orderCount || ''}</Text>
                      <View style={[styles.hourBarFill, {
                        height: Math.max((h.orderCount / max) * 70, 2),
                        backgroundColor: h.hour >= 11 && h.hour <= 14 ? FIX.primary : h.hour >= 18 && h.hour <= 21 ? FIX.warning : FIX.accent + '60',
                      }]} />
                      <Text style={[styles.hourLabel, { color: theme.textMuted }]}>{h.hour}</Text>
                    </View>
                  );
                })}
              </View>
            </RNScrollView>
          </View>
        </View>
      )}

      {/* Customer Insights */}
      {hasCustomerInsights ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Clientes</Text>
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
              <Users size={20} color={FIX.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>{totalCustomers}</Text>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Total</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
              <Star size={20} color={FIX.warning} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>{repeatCustomers}</Text>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Recurrentes</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
              <TrendingUp size={20} color={FIX.accent} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>{repeatRate}%</Text>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Retencion</Text>
            </View>
          </View>
        </View>
      ) : (
        <LockedSection
          theme={theme}
          title="Analisis de Clientes"
          description="Conoce cuantos clientes regresan a tu negocio"
          onUpgrade={() => router.push('/business/upgrade' as any)}
        />
      )}

      {/* AI Section (Pro only) */}
      {!hasAI && plan !== 'launch' && (
        <LockedSection
          theme={theme}
          title="Analitica con IA"
          description="Predicciones de ventas, recomendaciones y mas. Disponible en Plan Pro."
          onUpgrade={() => router.push('/business/upgrade' as any)}
          isPro
        />
      )}

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

// ============================================================================
// Locked Section Component
// ============================================================================
function LockedSection({ theme, title, description, onUpgrade, isPro }: {
  theme: any;
  title: string;
  description: string;
  onUpgrade: () => void;
  isPro?: boolean;
}) {
  return (
    <View style={[styles.lockedSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Lock size={24} color={theme.textMuted} />
      <Text style={[styles.lockedTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.lockedDesc, { color: theme.textMuted }]}>{description}</Text>
      <TouchableSound
        style={[styles.lockedBtn, { backgroundColor: isPro ? FIX.warning : FIX.accent }]}
        onPress={onUpgrade}
      >
        <Crown size={14} color="#FFFFFF" />
        <Text style={styles.lockedBtnText}>
          {isPro ? 'Ver Plan Pro' : 'Mejorar Plan'}
        </Text>
      </TouchableSound>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },

  // Plan Badge
  planBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  planBadgeText: { fontSize: 13, fontWeight: '600' },
  upgradeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  upgradeBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  // Time Range
  timeRange: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  timeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  timeBtnText: { fontSize: 13, fontWeight: '600' },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 20, fontWeight: '700' },
  kpiLabel: { fontSize: 11, textAlign: 'center' },

  // Peak Card
  peakCard: { flexDirection: 'row', borderRadius: 12, padding: 16, marginBottom: 20 },
  peakItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  peakDivider: { width: 1, marginHorizontal: 12 },
  peakLabel: { fontSize: 11 },
  peakValue: { fontSize: 18, fontWeight: '700' },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  // List
  listCard: { borderRadius: 12, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  listRank: { fontSize: 14, fontWeight: '700', width: 28 },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '600' },
  listSub: { fontSize: 12, marginTop: 2 },
  listValue: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Chart
  chartCard: { borderRadius: 12, padding: 14 },
  hourChart: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4, paddingHorizontal: 4 },
  hourBar: { alignItems: 'center', width: 20 },
  hourValue: { fontSize: 8, marginBottom: 2 },
  hourBarFill: { width: 14, borderRadius: 3 },
  hourLabel: { fontSize: 8, marginTop: 2 },

  // Locked Section
  lockedSection: { borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderStyle: 'dashed' },
  lockedTitle: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  lockedDesc: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  lockedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  lockedBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});
