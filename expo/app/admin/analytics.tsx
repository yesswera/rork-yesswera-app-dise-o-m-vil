import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ADMIN ANALYTICS DASHBOARD
// 4 tabs: General, Clientes (cohortes), Repartidores, Eventos
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView as RNScrollView,
} from 'react-native';
import {
  BarChart3,
  TrendingUp,
  Store,
  Package,
  Clock,
  Calendar,
  DollarSign,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  ShoppingBag,
  Users,
  Truck,
  Eye,
  AlertTriangle,
  Activity,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import {
  getGlobalAnalytics,
  getBusinessAnalytics,
  getBusinessesPerformance,
  getCohortAnalysis,
  getDriverPerformanceList,
  getEventInsights,
  GlobalAnalytics,
  BusinessAnalytics,
  CohortData,
  DriverPerformance,
  EventInsights,
} from '@/services/analytics-data';

// ============================================================================
// COLORES
// ============================================================================
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

const FIX = {
  primary: '#22C55E',
  primaryDark: '#15803D',
  accent: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
};

type Tab = 'overview' | 'cohorts' | 'drivers' | 'events';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'General' },
  { id: 'cohorts', label: 'Clientes' },
  { id: 'drivers', label: 'Repartidores' },
  { id: 'events', label: 'Eventos' },
];

export default function AdminAnalyticsScreen() {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  // Data
  const [globalData, setGlobalData] = useState<GlobalAnalytics | null>(null);
  const [businesses, setBusinesses] = useState<{ businessId: string; businessName: string; category: string; totalOrders: number; totalRevenue: number; rating: number }[]>([]);
  const [cohorts, setCohorts] = useState<CohortData | null>(null);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [events, setEvents] = useState<EventInsights | null>(null);

  // Business Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessAnalytics | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const [global, bizList, cohortData, driverData, eventData] = await Promise.all([
        getGlobalAnalytics(dateFrom),
        getBusinessesPerformance(),
        getCohortAnalysis(),
        getDriverPerformanceList(),
        getEventInsights(daysBack),
      ]);

      setGlobalData(global);
      setBusinesses(bizList.sort((a, b) => b.totalOrders - a.totalOrders));
      setCohorts(cohortData);
      setDrivers(driverData);
      setEvents(eventData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleViewBusiness = async (businessId: string) => {
    setLoadingDetail(true);
    setDetailModalVisible(true);
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const analytics = await getBusinessAnalytics(businessId, dateFrom);
    setSelectedBusiness(analytics);
    setLoadingDetail(false);
  };

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtHour = (h: number) => h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`;

  if (loading) {
    return (
      <ScreenContainer headerGradient="accent" headerIcon={BarChart3} headerTitle="Analytics" headerSubtitle="Cargando datos...">
        <View style={styles.center}><ActivityIndicator size="large" color={FIX.primary} /></View>
      </ScreenContainer>
    );
  }

  // ============================================================================
  // TAB: Overview (existing global + business performance)
  // ============================================================================
  const renderOverview = () => {
    const maxHourly = Math.max(...(globalData?.hourlySales.map(h => h.orderCount) || [1]), 1);
    const maxDaily = Math.max(...(globalData?.dailySales.map(d => d.orderCount) || [1]), 1);

    return (
      <>
        {/* Summary KPIs */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <ShoppingBag size={22} color={FIX.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{globalData?.totalOrders || 0}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ordenes</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <DollarSign size={22} color={FIX.accent} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{fmt(globalData?.totalRevenue || 0)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ingresos</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <TrendingUp size={22} color={FIX.warning} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{fmt(globalData?.averageOrderValue || 0)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ticket Prom.</Text>
          </View>
        </View>

        {/* Hourly Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={FIX.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ventas por Hora</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barChart}>
                {globalData?.hourlySales.map((item, idx) => {
                  const height = (item.orderCount / maxHourly) * 100;
                  return (
                    <View key={idx} style={styles.barContainer}>
                      <Text style={[styles.barValue, { color: theme.textMuted }]}>{item.orderCount || ''}</Text>
                      <View style={[styles.bar, {
                        height: Math.max(height, 4),
                        backgroundColor: item.hour >= 11 && item.hour <= 14 ? FIX.primary : item.hour >= 18 && item.hour <= 21 ? FIX.warning : FIX.accent + '60',
                      }]} />
                      <Text style={[styles.barLabel, { color: theme.textMuted }]}>{fmtHour(item.hour)}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Daily Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={FIX.accent} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ventas por Dia</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
            <View style={styles.dayChart}>
              {globalData?.dailySales.map((item, idx) => {
                const height = (item.orderCount / maxDaily) * 80;
                return (
                  <View key={idx} style={styles.dayBarContainer}>
                    <Text style={[styles.dayBarValue, { color: theme.textSecondary }]}>{item.orderCount || ''}</Text>
                    <View style={[styles.dayBarFill, { height: Math.max(height, 4), backgroundColor: FIX.accent }]} />
                    <Text style={[styles.dayBarLabel, { color: theme.textSecondary }]}>{item.dayName.slice(0, 3)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color={FIX.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Productos Mas Vendidos</Text>
          </View>
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {(globalData?.topProducts || []).length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin datos</Text>
            ) : (
              globalData?.topProducts.slice(0, 5).map((product, idx) => (
                <View key={idx} style={[styles.listRow, idx < (globalData?.topProducts.length || 0) - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Text style={[styles.listRank, { color: FIX.primary }]}>#{idx + 1}</Text>
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

        {/* Search Trends */}
        {(globalData?.searchTrends || []).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Search size={20} color={FIX.warning} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Busquedas Populares</Text>
            </View>
            <View style={[styles.tagContainer, { backgroundColor: theme.card, borderRadius: 12, padding: 12 }]}>
              {globalData?.searchTrends.slice(0, 10).map((trend, idx) => (
                <View key={idx} style={[styles.tag, { backgroundColor: FIX.purple + '15' }]}>
                  <Text style={[styles.tagText, { color: FIX.purple }]}>{trend.term} ({trend.count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Business Performance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Store size={20} color={FIX.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Rendimiento por Negocio</Text>
          </View>
          {businesses.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
              <Store size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin negocios</Text>
            </View>
          ) : (
            businesses.map((biz) => (
              <TouchableSound
                key={biz.businessId}
                style={[styles.bizCard, { backgroundColor: theme.card }]}
                onPress={() => handleViewBusiness(biz.businessId)}
              >
                <View style={styles.bizCardInfo}>
                  <Text style={[styles.bizCardName, { color: theme.text }]}>{biz.businessName}</Text>
                  <View style={styles.bizCardMeta}>
                    <View style={[styles.categoryBadge, { backgroundColor: FIX.primary + '15' }]}>
                      <Text style={[styles.categoryText, { color: FIX.primary }]}>{biz.category}</Text>
                    </View>
                    <Star size={12} color={FIX.warning} fill={FIX.warning} />
                    <Text style={[styles.bizCardRating, { color: theme.textSecondary }]}>{biz.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={styles.bizCardStats}>
                  <Text style={[styles.bizCardStatVal, { color: theme.text }]}>{biz.totalOrders}</Text>
                  <Text style={[styles.bizCardStatLbl, { color: theme.textMuted }]}>ordenes</Text>
                </View>
                <View style={styles.bizCardStats}>
                  <Text style={[styles.bizCardStatVal, { color: theme.text }]}>{fmt(biz.totalRevenue)}</Text>
                  <Text style={[styles.bizCardStatLbl, { color: theme.textMuted }]}>ingresos</Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </TouchableSound>
            ))
          )}
        </View>
      </>
    );
  };

  // ============================================================================
  // TAB: Cohorts
  // ============================================================================
  const renderCohorts = () => {
    if (!cohorts) return null;

    return (
      <>
        {/* KPI Summary */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Users size={20} color={FIX.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{cohorts.totalClients}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Clientes</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <TrendingUp size={20} color={FIX.accent} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{cohorts.repeatRate}%</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Retencion</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <DollarSign size={20} color={FIX.warning} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{fmt(cohorts.avgRevenuePerClient)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>$/Cliente</Text>
          </View>
        </View>

        {/* Cohort Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Distribucion de Clientes</Text>
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {cohorts.cohorts.map((c, i) => (
              <View key={i} style={[styles.cohortRow, i < cohorts.cohorts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={styles.cohortInfo}>
                  <Text style={[styles.cohortLabel, { color: theme.text }]}>{c.label}</Text>
                  <Text style={[styles.cohortCount, { color: theme.textMuted }]}>{c.clients} clientes</Text>
                </View>
                <View style={styles.cohortBarWrap}>
                  <View style={[styles.cohortBar, { width: `${Math.max(c.percentage, 2)}%`, backgroundColor: FIX.primary }]} />
                </View>
                <Text style={[styles.cohortPercent, { color: FIX.primary }]}>{c.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Clients */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mejores Clientes</Text>
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {cohorts.topClients.slice(0, 8).map((client, i) => (
              <View key={client.userId} style={[styles.listRow, i < cohorts.topClients.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <Text style={[styles.listRank, { color: i < 3 ? FIX.warning : theme.textMuted }]}>#{i + 1}</Text>
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, { color: theme.text }]} numberOfLines={1}>{client.name}</Text>
                  <Text style={[styles.listSub, { color: theme.textMuted }]}>{client.orderCount} ordenes</Text>
                </View>
                <Text style={[styles.listValue, { color: FIX.primary }]}>{fmt(client.totalSpent)}</Text>
              </View>
            ))}
            {cohorts.topClients.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin datos</Text>
            )}
          </View>
        </View>
      </>
    );
  };

  // ============================================================================
  // TAB: Drivers
  // ============================================================================
  const renderDrivers = () => {
    if (drivers.length === 0) {
      return (
        <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
          <Truck size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin datos de repartidores</Text>
        </View>
      );
    }

    return (
      <>
        {drivers.map((d) => {
          const isExpanded = expandedDriver === d.driverId;
          return (
            <TouchableSound
              key={d.driverId}
              style={[styles.driverCard, { backgroundColor: theme.card }]}
              onPress={() => setExpandedDriver(isExpanded ? null : d.driverId)}
            >
              <View style={styles.driverHeader}>
                <View style={styles.driverMainInfo}>
                  <Text style={[styles.driverName, { color: theme.text }]}>{d.name}</Text>
                  <Text style={[styles.driverVehicle, { color: theme.textMuted }]}>{d.vehicleType}</Text>
                </View>
                <View style={styles.driverQuickStats}>
                  <View style={styles.driverQuickStat}>
                    <Text style={[styles.driverQuickValue, { color: theme.text }]}>{d.totalDeliveries}</Text>
                    <Text style={[styles.driverQuickLabel, { color: theme.textMuted }]}>entregas</Text>
                  </View>
                  <View style={styles.driverQuickStat}>
                    <Star size={12} color={FIX.warning} fill={FIX.warning} />
                    <Text style={[styles.driverQuickValue, { color: theme.text }]}>{d.rating.toFixed(1)}</Text>
                  </View>
                  {isExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                </View>
              </View>

              {isExpanded && (
                <View style={[styles.driverDetails, { borderTopColor: theme.border }]}>
                  <View style={styles.driverDetailRow}>
                    <View style={styles.driverDetailItem}>
                      <Clock size={14} color={FIX.accent} />
                      <Text style={[styles.driverDetailValue, { color: theme.text }]}>{d.avgDeliveryTime}m</Text>
                      <Text style={[styles.driverDetailLabel, { color: theme.textMuted }]}>Tiempo prom.</Text>
                    </View>
                    <View style={styles.driverDetailItem}>
                      <TrendingUp size={14} color={FIX.primary} />
                      <Text style={[styles.driverDetailValue, { color: theme.text }]}>{d.acceptanceRate}%</Text>
                      <Text style={[styles.driverDetailLabel, { color: theme.textMuted }]}>Aceptacion</Text>
                    </View>
                    <View style={styles.driverDetailItem}>
                      <AlertTriangle size={14} color={d.cancelRate > 20 ? FIX.error : FIX.warning} />
                      <Text style={[styles.driverDetailValue, { color: d.cancelRate > 20 ? FIX.error : theme.text }]}>{d.cancelRate}%</Text>
                      <Text style={[styles.driverDetailLabel, { color: theme.textMuted }]}>Cancelacion</Text>
                    </View>
                    <View style={styles.driverDetailItem}>
                      <DollarSign size={14} color={FIX.primary} />
                      <Text style={[styles.driverDetailValue, { color: theme.text }]}>{fmt(d.totalEarned)}</Text>
                      <Text style={[styles.driverDetailLabel, { color: theme.textMuted }]}>Ganado</Text>
                    </View>
                  </View>
                  {d.pendingDebt > 0 && (
                    <View style={[styles.debtBanner, { backgroundColor: FIX.error + '10' }]}>
                      <AlertTriangle size={14} color={FIX.error} />
                      <Text style={[styles.debtText, { color: FIX.error }]}>Deuda pendiente: {fmt(d.pendingDebt)}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableSound>
          );
        })}
      </>
    );
  };

  // ============================================================================
  // TAB: Events
  // ============================================================================
  const renderEvents = () => {
    if (!events) return null;

    return (
      <>
        {/* Event KPIs */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Activity size={20} color={FIX.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{events.totalEvents}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Eventos</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Users size={20} color={FIX.accent} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{events.uniqueUsers}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Usuarios</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Search size={20} color={FIX.purple} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{events.topSearches.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Busquedas</Text>
          </View>
        </View>

        {/* Event Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipos de Evento</Text>
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {events.topEventTypes.map((et, i) => {
              const maxCount = events.topEventTypes[0]?.count || 1;
              return (
                <View key={et.type} style={[styles.eventRow, i < events.topEventTypes.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Text style={[styles.eventType, { color: theme.text }]}>{et.type}</Text>
                  <View style={styles.eventBarWrap}>
                    <View style={[styles.eventBarFill, { width: `${(et.count / maxCount) * 100}%`, backgroundColor: FIX.accent }]} />
                  </View>
                  <Text style={[styles.eventCount, { color: theme.textSecondary }]}>{et.count}</Text>
                </View>
              );
            })}
            {events.topEventTypes.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin eventos</Text>
            )}
          </View>
        </View>

        {/* Top Searches */}
        {events.topSearches.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Busquedas Top</Text>
            <View style={[styles.tagContainer, { backgroundColor: theme.card, borderRadius: 12, padding: 12 }]}>
              {events.topSearches.map((s, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: FIX.purple + '15' }]}>
                  <Search size={10} color={FIX.purple} />
                  <Text style={[styles.tagText, { color: FIX.purple }]}>{s.term} ({s.count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Viewed Businesses */}
        {events.topViewedBusinesses.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Negocios Mas Vistos</Text>
            <View style={[styles.listCard, { backgroundColor: theme.card }]}>
              {events.topViewedBusinesses.slice(0, 5).map((biz, i) => (
                <View key={biz.businessId} style={[styles.listRow, i < events.topViewedBusinesses.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Eye size={16} color={FIX.accent} />
                  <View style={[styles.listInfo, { marginLeft: 8 }]}>
                    <Text style={[styles.listName, { color: theme.text }]}>{biz.name}</Text>
                  </View>
                  <Text style={[styles.listValue, { color: FIX.accent }]}>{biz.views} vistas</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity by Day */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Actividad por Dia</Text>
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {events.eventsByDay.map((d, i) => {
              const maxDay = Math.max(...events.eventsByDay.map(x => x.count), 1);
              return (
                <View key={d.day} style={[styles.eventRow, i < events.eventsByDay.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Text style={[styles.eventType, { color: theme.text, fontWeight: '600' }]}>{d.day}</Text>
                  <View style={styles.eventBarWrap}>
                    <View style={[styles.eventBarFill, { width: `${(d.count / maxDay) * 100}%`, backgroundColor: FIX.primary }]} />
                  </View>
                  <Text style={[styles.eventCount, { color: theme.textSecondary }]}>{d.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={BarChart3}
      headerTitle="Analytics"
      headerSubtitle="Datos y rendimiento de Yesswera"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['7d', '30d', '90d'] as const).map((range) => (
          <TouchableSound
            key={range}
            style={[styles.timeRangeBtn, { backgroundColor: theme.card }, timeRange === range && { backgroundColor: FIX.primary }]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeRangeText, { color: theme.textSecondary }, timeRange === range && { color: '#FFFFFF' }]}>
              {range === '7d' ? '7 Dias' : range === '30d' ? '30 Dias' : '90 Dias'}
            </Text>
          </TouchableSound>
        ))}
      </View>

      {/* Tab Selector */}
      <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableSound
            key={tab.id}
            style={[styles.tab, { backgroundColor: theme.cardAlt }, activeTab === tab.id && { backgroundColor: FIX.accent }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === tab.id && { color: '#FFFFFF' }]}>
              {tab.label}
            </Text>
          </TouchableSound>
        ))}
      </RNScrollView>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'cohorts' && renderCohorts()}
      {activeTab === 'drivers' && renderDrivers()}
      {activeTab === 'events' && renderEvents()}

      {/* Business Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? COLORS.dark.cardAlt : '#F5F5F4' }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableSound onPress={() => setDetailModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableSound>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Analytics de Negocio</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingDetail ? (
            <View style={styles.center}><ActivityIndicator size="large" color={FIX.primary} /></View>
          ) : selectedBusiness ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <LinearGradient colors={[FIX.primary, FIX.primaryDark]} style={styles.bizModalHeader}>
                <Text style={styles.bizModalName}>{selectedBusiness.businessName}</Text>
                <View style={styles.bizModalStats}>
                  <View style={styles.bizModalStat}>
                    <Text style={styles.bizModalStatVal}>{selectedBusiness.totalOrders}</Text>
                    <Text style={styles.bizModalStatLbl}>Ordenes</Text>
                  </View>
                  <View style={styles.bizModalStat}>
                    <Text style={styles.bizModalStatVal}>{fmt(selectedBusiness.totalRevenue)}</Text>
                    <Text style={styles.bizModalStatLbl}>Ingresos</Text>
                  </View>
                  <View style={styles.bizModalStat}>
                    <Text style={styles.bizModalStatVal}>{fmt(selectedBusiness.averageOrderValue)}</Text>
                    <Text style={styles.bizModalStatLbl}>Ticket Prom.</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={[styles.peakCard, { backgroundColor: theme.card }]}>
                <View style={styles.peakItem}>
                  <Clock size={18} color={FIX.accent} />
                  <View>
                    <Text style={[styles.peakLabel, { color: theme.textSecondary }]}>Hora Pico</Text>
                    <Text style={[styles.peakValue, { color: theme.text }]}>{fmtHour(selectedBusiness.peakHour)}</Text>
                  </View>
                </View>
                <View style={[styles.peakDivider, { backgroundColor: theme.border }]} />
                <View style={styles.peakItem}>
                  <Calendar size={18} color={FIX.accent} />
                  <View>
                    <Text style={[styles.peakLabel, { color: theme.textSecondary }]}>Dia Mas Activo</Text>
                    <Text style={[styles.peakValue, { color: theme.text }]}>{selectedBusiness.peakDay}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Productos Mas Vendidos</Text>
                {selectedBusiness.topProducts.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin ventas</Text>
                ) : (
                  selectedBusiness.topProducts.map((product, idx) => (
                    <View key={idx} style={[styles.productItem, { backgroundColor: theme.card }]}>
                      <Text style={[styles.listRank, { color: FIX.primary }]}>#{idx + 1}</Text>
                      <View style={styles.listInfo}>
                        <Text style={[styles.listName, { color: theme.text }]}>{product.productName}</Text>
                        <Text style={[styles.listSub, { color: theme.textSecondary }]}>{product.totalSold} unidades</Text>
                      </View>
                      <Text style={[styles.listValue, { color: FIX.primary }]}>{fmt(product.totalRevenue)}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No se encontraron datos</Text>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },

  // Time Range
  timeRangeContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  timeRangeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  timeRangeText: { fontSize: 13, fontWeight: '600' },

  // Tabs
  tabScroll: { marginBottom: 20, marginHorizontal: -4 },
  tabContainer: { paddingHorizontal: 4, gap: 8 },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  tabText: { fontSize: 14, fontWeight: '600' },

  // Summary Grid
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 6 },
  summaryLabel: { fontSize: 11, marginTop: 2 },

  // Sections
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  // Charts
  chartCard: { borderRadius: 12, padding: 16 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, paddingBottom: 20, gap: 4 },
  barContainer: { width: 28, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, marginBottom: 2 },
  bar: { width: 16, borderRadius: 4 },
  barLabel: { fontSize: 8, marginTop: 4 },
  dayChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, paddingBottom: 20 },
  dayBarContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dayBarValue: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  dayBarFill: { width: 28, borderRadius: 6 },
  dayBarLabel: { fontSize: 11, marginTop: 6 },

  // List Card
  listCard: { borderRadius: 12, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  listRank: { fontSize: 14, fontWeight: '700', width: 28 },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '600' },
  listSub: { fontSize: 12, marginTop: 2 },
  listValue: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  emptyCard: { borderRadius: 12, padding: 32, alignItems: 'center', gap: 12 },

  // Tags
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 12, fontWeight: '500' },

  // Business Cards
  bizCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8 },
  bizCardInfo: { flex: 1 },
  bizCardName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  bizCardMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '500' },
  bizCardRating: { fontSize: 12, fontWeight: '600' },
  bizCardStats: { alignItems: 'flex-end', marginRight: 8 },
  bizCardStatVal: { fontSize: 14, fontWeight: '700' },
  bizCardStatLbl: { fontSize: 10 },

  // Cohorts
  cohortRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cohortInfo: { width: 110 },
  cohortLabel: { fontSize: 13, fontWeight: '600' },
  cohortCount: { fontSize: 11, marginTop: 2 },
  cohortBarWrap: { flex: 1, height: 12, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 6, overflow: 'hidden' },
  cohortBar: { height: '100%', borderRadius: 6 },
  cohortPercent: { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },

  // Driver Cards
  driverCard: { borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  driverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  driverMainInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '600' },
  driverVehicle: { fontSize: 12, marginTop: 2 },
  driverQuickStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverQuickStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverQuickValue: { fontSize: 14, fontWeight: '700' },
  driverQuickLabel: { fontSize: 11 },
  driverDetails: { padding: 14, borderTopWidth: 1 },
  driverDetailRow: { flexDirection: 'row', justifyContent: 'space-around' },
  driverDetailItem: { alignItems: 'center', gap: 4 },
  driverDetailValue: { fontSize: 16, fontWeight: '700' },
  driverDetailLabel: { fontSize: 10 },
  debtBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 8 },
  debtText: { fontSize: 13, fontWeight: '600' },

  // Event Rows
  eventRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  eventType: { fontSize: 12, fontWeight: '500', width: 100 },
  eventBarWrap: { flex: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' },
  eventBarFill: { height: '100%', borderRadius: 4 },
  eventCount: { fontSize: 12, fontWeight: '600', width: 40, textAlign: 'right' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { flex: 1 },
  modalSection: { padding: 16 },
  modalSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  productItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },

  // Business Modal Header
  bizModalHeader: { padding: 20, alignItems: 'center' },
  bizModalName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  bizModalStats: { flexDirection: 'row', gap: 24 },
  bizModalStat: { alignItems: 'center' },
  bizModalStatVal: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  bizModalStatLbl: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Peak Card
  peakCard: { flexDirection: 'row', margin: 16, borderRadius: 12, padding: 16 },
  peakItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  peakDivider: { width: 1, marginHorizontal: 16 },
  peakLabel: { fontSize: 11 },
  peakValue: { fontSize: 16, fontWeight: '700' },
});
