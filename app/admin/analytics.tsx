// ============================================================================
// YESSWERA: ADMIN ANALYTICS
// Analiticas para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
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
  Star,
  ShoppingBag,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import {
  getGlobalAnalytics,
  getBusinessAnalytics,
  getBusinessesPerformance,
  GlobalAnalytics,
  BusinessAnalytics,
} from '@/services/analytics-data';

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

const FIXED_COLORS = {
  primary: '#22C55E',
  primaryDark: '#15803D',
  accent: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdminAnalyticsScreen() {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalAnalytics | null>(null);
  const [businesses, setBusinesses] = useState<{
    businessId: string;
    businessName: string;
    category: string;
    totalOrders: number;
    totalRevenue: number;
    rating: number;
  }[]>([]);

  // Business Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessAnalytics | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Time range
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadData = useCallback(async () => {
    try {
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const [global, bizList] = await Promise.all([
        getGlobalAnalytics(dateFrom),
        getBusinessesPerformance(),
      ]);

      setGlobalData(global);
      setBusinesses(bizList.sort((a, b) => b.totalOrders - a.totalOrders));
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleViewBusiness = async (businessId: string) => {
    setLoadingDetail(true);
    setDetailModalVisible(true);

    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const analytics = await getBusinessAnalytics(businessId, dateFrom);
    setSelectedBusiness(analytics);
    setLoadingDetail(false);
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando analytics...</Text>
      </View>
    );
  }

  const maxHourlyOrders = Math.max(...(globalData?.hourlySales.map(h => h.orderCount) || [1]), 1);
  const maxDailyOrders = Math.max(...(globalData?.dailySales.map(d => d.orderCount) || [1]), 1);

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={BarChart3}
      headerTitle="Analytics"
      headerSubtitle="Metricas y rendimiento"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['7d', '30d', '90d'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeBtn,
              { backgroundColor: theme.card },
              timeRange === range && { backgroundColor: FIXED_COLORS.primary },
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              { color: theme.textSecondary },
              timeRange === range && styles.timeRangeTextActive,
            ]}>
              {range === '7d' ? '7 Dias' : range === '30d' ? '30 Dias' : '90 Dias'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <ShoppingBag size={22} color={FIXED_COLORS.primary} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{globalData?.totalOrders || 0}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ordenes</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <DollarSign size={22} color={FIXED_COLORS.success} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(globalData?.totalRevenue || 0)}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ingresos</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <TrendingUp size={22} color={FIXED_COLORS.accent} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(globalData?.averageOrderValue || 0)}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ticket Prom.</Text>
        </View>
      </View>

      {/* Hourly Sales Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={20} color={FIXED_COLORS.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ventas por Hora</Text>
        </View>
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {globalData?.hourlySales.map((item, idx) => {
                const height = (item.orderCount / maxHourlyOrders) * 100;
                return (
                  <View key={idx} style={styles.barContainer}>
                    <Text style={[styles.barValue, { color: theme.textMuted }]}>{item.orderCount || ''}</Text>
                    <View style={[styles.bar, { height: Math.max(height, 4), backgroundColor: FIXED_COLORS.primary }]} />
                    <Text style={[styles.barLabel, { color: theme.textMuted }]}>{formatHour(item.hour)}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          {globalData && globalData.hourlySales.some(h => h.orderCount > 0) && (
            <View style={[styles.chartInsight, { borderTopColor: theme.border }]}>
              <Clock size={14} color={FIXED_COLORS.accent} />
              <Text style={[styles.chartInsightText, { color: theme.textSecondary }]}>
                Hora pico: {formatHour(globalData.hourlySales.reduce((max, h) => h.orderCount > max.orderCount ? h : max, globalData.hourlySales[0]).hour)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Daily Sales Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={20} color={FIXED_COLORS.accent} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ventas por Dia</Text>
        </View>
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <View style={styles.dayChart}>
            {globalData?.dailySales.map((item, idx) => {
              const height = (item.orderCount / maxDailyOrders) * 80;
              return (
                <View key={idx} style={styles.dayBarContainer}>
                  <Text style={[styles.dayBarValue, { color: theme.textSecondary }]}>{item.orderCount || ''}</Text>
                  <View style={[styles.dayBar, { height: Math.max(height, 4), backgroundColor: FIXED_COLORS.accent }]} />
                  <Text style={[styles.dayBarLabel, { color: theme.textSecondary }]}>{item.dayName.slice(0, 3)}</Text>
                </View>
              );
            })}
          </View>
          {globalData && globalData.dailySales.some(d => d.orderCount > 0) && (
            <View style={[styles.chartInsight, { borderTopColor: theme.border }]}>
              <Calendar size={14} color={FIXED_COLORS.accent} />
              <Text style={[styles.chartInsightText, { color: theme.textSecondary }]}>
                Dia mas activo: {globalData.dailySales.reduce((max, d) => d.orderCount > max.orderCount ? d : max, globalData.dailySales[0]).dayName}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Top Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Package size={20} color={FIXED_COLORS.success} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Productos Mas Vendidos</Text>
        </View>
        <View style={[styles.listCard, { backgroundColor: theme.card }]}>
          {(globalData?.topProducts || []).length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin datos suficientes</Text>
          ) : (
            globalData?.topProducts.slice(0, 5).map((product, idx) => (
              <View key={idx} style={[styles.listItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.rankBadge, { backgroundColor: FIXED_COLORS.primary + '20' }]}>
                  <Text style={[styles.rankText, { color: FIXED_COLORS.primary }]}>{idx + 1}</Text>
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={[styles.listItemName, { color: theme.text }]}>{product.productName}</Text>
                  <Text style={[styles.listItemMeta, { color: theme.textSecondary }]}>{product.totalSold} vendidos</Text>
                </View>
                <Text style={[styles.listItemValue, { color: FIXED_COLORS.success }]}>{formatCurrency(product.totalRevenue)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Search Trends */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Search size={20} color={FIXED_COLORS.warning} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Busquedas Populares</Text>
        </View>
        <View style={[styles.tagsCard, { backgroundColor: theme.card }]}>
          {(globalData?.searchTrends || []).length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin busquedas registradas</Text>
          ) : (
            <View style={styles.tagsContainer}>
              {globalData?.searchTrends.slice(0, 10).map((trend, idx) => (
                <View key={idx} style={[styles.tag, { backgroundColor: theme.cardAlt }]}>
                  <Text style={[styles.tagText, { color: theme.text }]}>{trend.term}</Text>
                  <Text style={[styles.tagCount, { color: theme.textSecondary, backgroundColor: theme.card }]}>{trend.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Business Performance */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Store size={20} color={FIXED_COLORS.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Rendimiento por Negocio</Text>
        </View>
        <View style={styles.businessList}>
          {businesses.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
              <Store size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin negocios registrados</Text>
            </View>
          ) : (
            businesses.map((biz) => (
              <TouchableOpacity
                key={biz.businessId}
                style={[styles.businessCard, { backgroundColor: theme.card }]}
                onPress={() => handleViewBusiness(biz.businessId)}
              >
                <View style={styles.businessInfo}>
                  <Text style={[styles.businessName, { color: theme.text }]}>{biz.businessName}</Text>
                  <View style={styles.businessMeta}>
                    <View style={[styles.categoryBadge, { backgroundColor: FIXED_COLORS.primary + '15' }]}>
                      <Text style={[styles.categoryText, { color: FIXED_COLORS.primary }]}>{biz.category}</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Star size={12} color={FIXED_COLORS.warning} fill={FIXED_COLORS.warning} />
                      <Text style={[styles.ratingText, { color: theme.textSecondary }]}>{biz.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.businessStats}>
                  <View style={styles.bizStat}>
                    <Text style={[styles.bizStatValue, { color: theme.text }]}>{biz.totalOrders}</Text>
                    <Text style={[styles.bizStatLabel, { color: theme.textMuted }]}>ordenes</Text>
                  </View>
                  <View style={styles.bizStat}>
                    <Text style={[styles.bizStatValue, { color: theme.text }]}>{formatCurrency(biz.totalRevenue)}</Text>
                    <Text style={[styles.bizStatLabel, { color: theme.textMuted }]}>ingresos</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Business Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? COLORS.dark.cardAlt : '#F5F5F4' }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Analytics de Negocio</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingDetail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
            </View>
          ) : selectedBusiness ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Business Header */}
              <LinearGradient colors={[FIXED_COLORS.primary, FIXED_COLORS.primaryDark]} style={styles.bizHeader}>
                <Text style={styles.bizHeaderName}>{selectedBusiness.businessName}</Text>
                <View style={styles.bizHeaderStats}>
                  <View style={styles.bizHeaderStat}>
                    <Text style={styles.bizHeaderStatValue}>{selectedBusiness.totalOrders}</Text>
                    <Text style={styles.bizHeaderStatLabel}>Ordenes</Text>
                  </View>
                  <View style={styles.bizHeaderStat}>
                    <Text style={styles.bizHeaderStatValue}>{formatCurrency(selectedBusiness.totalRevenue)}</Text>
                    <Text style={styles.bizHeaderStatLabel}>Ingresos</Text>
                  </View>
                  <View style={styles.bizHeaderStat}>
                    <Text style={styles.bizHeaderStatValue}>{formatCurrency(selectedBusiness.averageOrderValue)}</Text>
                    <Text style={styles.bizHeaderStatLabel}>Ticket Prom.</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Peak Info */}
              <View style={[styles.peakCard, { backgroundColor: theme.card }]}>
                <View style={styles.peakItem}>
                  <Clock size={18} color={FIXED_COLORS.accent} />
                  <View>
                    <Text style={[styles.peakLabel, { color: theme.textSecondary }]}>Hora Pico</Text>
                    <Text style={[styles.peakValue, { color: theme.text }]}>{formatHour(selectedBusiness.peakHour)}</Text>
                  </View>
                </View>
                <View style={[styles.peakDivider, { backgroundColor: theme.border }]} />
                <View style={styles.peakItem}>
                  <Calendar size={18} color={FIXED_COLORS.accent} />
                  <View>
                    <Text style={[styles.peakLabel, { color: theme.textSecondary }]}>Dia Mas Activo</Text>
                    <Text style={[styles.peakValue, { color: theme.text }]}>{selectedBusiness.peakDay}</Text>
                  </View>
                </View>
              </View>

              {/* Top Products */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Productos Mas Vendidos</Text>
                {selectedBusiness.topProducts.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin ventas registradas</Text>
                ) : (
                  selectedBusiness.topProducts.map((product, idx) => (
                    <View key={idx} style={[styles.productItem, { backgroundColor: theme.card }]}>
                      <View style={[styles.productRank, { backgroundColor: FIXED_COLORS.success + '20' }]}>
                        <Text style={[styles.productRankText, { color: FIXED_COLORS.success }]}>{idx + 1}</Text>
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={[styles.productName, { color: theme.text }]}>{product.productName}</Text>
                        <Text style={[styles.productMeta, { color: theme.textSecondary }]}>{product.totalSold} unidades vendidas</Text>
                      </View>
                      <Text style={[styles.productRevenue, { color: FIXED_COLORS.success }]}>{formatCurrency(product.totalRevenue)}</Text>
                    </View>
                  ))
                )}
              </View>

              {/* Hourly Chart */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Ventas por Hora</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.miniChart, { backgroundColor: theme.card }]}>
                    {selectedBusiness.hourlySales.map((item, idx) => {
                      const maxH = Math.max(...selectedBusiness.hourlySales.map(h => h.orderCount), 1);
                      const height = (item.orderCount / maxH) * 60;
                      return (
                        <View key={idx} style={styles.miniBarContainer}>
                          <View style={[styles.miniBar, { height: Math.max(height, 2), backgroundColor: FIXED_COLORS.primary }]} />
                          <Text style={[styles.miniLabel, { color: theme.textMuted }]}>{item.hour}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Daily Chart */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Ventas por Dia</Text>
                <View style={[styles.dailyBars, { backgroundColor: theme.card }]}>
                  {selectedBusiness.dailySales.map((item, idx) => {
                    const maxD = Math.max(...selectedBusiness.dailySales.map(d => d.orderCount), 1);
                    const width = (item.orderCount / maxD) * 100;
                    return (
                      <View key={idx} style={styles.dailyRow}>
                        <Text style={[styles.dailyLabel, { color: theme.textSecondary }]}>{item.dayName.slice(0, 3)}</Text>
                        <View style={[styles.dailyBarBg, { backgroundColor: theme.cardAlt }]}>
                          <View style={[styles.dailyBarFill, { width: `${Math.max(width, 2)}%`, backgroundColor: FIXED_COLORS.accent }]} />
                        </View>
                        <Text style={[styles.dailyCount, { color: theme.text }]}>{item.orderCount}</Text>
                      </View>
                    );
                  })}
                </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeRangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 20,
    gap: 4,
  },
  barContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 9,
    marginBottom: 2,
  },
  bar: {
    width: 16,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 8,
    marginTop: 4,
  },
  dayChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingBottom: 20,
  },
  dayBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dayBarValue: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayBar: {
    width: 28,
    borderRadius: 6,
  },
  dayBarLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  chartInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  chartInsightText: {
    fontSize: 12,
  },
  listCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  listItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  tagsCard: {
    borderRadius: 12,
    padding: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
  },
  tagCount: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  businessList: {
    gap: 10,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  businessMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  businessStats: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 8,
  },
  bizStat: {
    alignItems: 'flex-end',
  },
  bizStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  bizStatLabel: {
    fontSize: 10,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
  },
  bizHeader: {
    padding: 20,
    alignItems: 'center',
  },
  bizHeaderName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  bizHeaderStats: {
    flexDirection: 'row',
    gap: 24,
  },
  bizHeaderStat: {
    alignItems: 'center',
  },
  bizHeaderStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bizHeaderStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  peakCard: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  peakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  peakDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  peakLabel: {
    fontSize: 11,
  },
  peakValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSection: {
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  productMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  miniBarContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  miniBar: {
    width: 12,
    borderRadius: 3,
  },
  miniLabel: {
    fontSize: 8,
    marginTop: 4,
  },
  dailyBars: {
    borderRadius: 10,
    padding: 12,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyLabel: {
    width: 40,
    fontSize: 12,
  },
  dailyBarBg: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  dailyBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  dailyCount: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
});
