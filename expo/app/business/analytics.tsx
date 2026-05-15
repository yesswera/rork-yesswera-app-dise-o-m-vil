// ============================================================================
// YESSWERA: BUSINESS ANALYTICS — Vecino Amigo DS
// Comprehensive analytics dashboard for business owners
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { getBusinessAnalytics, BusinessAnalytics } from '@/services/analytics-data';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import SectionHeader from '@/components/ui/SectionHeader';
import StatBox from '@/components/ui/StatBox';
import Pill from '@/components/ui/Pill';

type DateRange = 7 | 30 | 90;

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// -- Horizontal bar chart (hours or days) ------------------------------------
function BarChart({
  data,
  labels,
  peakIndex,
}: {
  data: number[];
  labels: string[];
  peakIndex: number;
}) {
  const maxVal = Math.max(...data, 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((val, i) => {
          const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const isPeak = i === peakIndex;
          return (
            <View key={i} style={chartStyles.barCol}>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: `${Math.max(heightPct, 2)}%`,
                      backgroundColor: isPeak ? DS.colors.green : DS.colors.hairline,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={chartStyles.labelsRow}>
        {labels.map((lbl, i) => (
          <Text
            key={i}
            style={[
              chartStyles.label,
              i === peakIndex && { color: DS.colors.green, fontWeight: '700' },
            ]}
          >
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    paddingTop: DS.space.sm,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  barCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 3,
    minHeight: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: DS.space.xs,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },
});

// -- Main Screen -------------------------------------------------------------
export default function BusinessAnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(30);

  // Load business ID from user
  useEffect(() => {
    if (!user) return;
    supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBusinessId(data.id);
        else setLoading(false);
      });
  }, [user]);

  // Load analytics when businessId or range changes
  useEffect(() => {
    if (!businessId) return;
    loadAnalytics();
  }, [businessId, range]);

  async function loadAnalytics() {
    if (!businessId) return;
    setLoading(true);
    try {
      const dateTo = new Date().toISOString();
      const dateFrom = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();
      const data = await getBusinessAnalytics(businessId, dateFrom, dateTo);
      setAnalytics(data);
    } catch (e) {
      console.error('loadAnalytics error:', e);
    } finally {
      setLoading(false);
    }
  }

  // Hourly chart data
  const hourlyData = analytics
    ? analytics.hourlySales.map((h) => h.orderCount)
    : Array(24).fill(0);
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    if (i === 0 || i === 6 || i === 12 || i === 18 || i === 23) return `${i}`;
    return '';
  });
  const peakHourIndex = analytics ? analytics.peakHour : 0;

  // Daily chart data (reorder: Lun-Dom)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const dayLabels = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
  const dailyData = analytics
    ? dayOrder.map((d) => {
        const found = analytics.dailySales.find((s) => s.dayOfWeek === d);
        return found ? found.orderCount : 0;
      })
    : Array(7).fill(0);
  const peakDayName = analytics?.peakDay || '';
  const peakDayIdx = analytics
    ? dayOrder.findIndex((d) => {
        const found = analytics.dailySales.find((s) => s.dayOfWeek === d);
        return found?.dayName === peakDayName;
      })
    : -1;

  const isEmpty =
    !loading && analytics && analytics.totalOrders === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="arrow-left" size={24} color={DS.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analitica</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ===== DATE RANGE SELECTOR ===== */}
        <View style={styles.rangeRow}>
          {([7, 30, 90] as DateRange[]).map((d) => (
            <TouchableOpacity
              key={d}
              activeOpacity={0.7}
              onPress={() => setRange(d)}
              style={[
                styles.rangeChip,
                range === d && styles.rangeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.rangeText,
                  range === d && styles.rangeTextActive,
                ]}
              >
                {d}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== LOADING ===== */}
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={DS.colors.green} />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        )}

        {/* ===== EMPTY STATE ===== */}
        {isEmpty && (
          <YCard style={styles.emptyCard}>
            <View style={styles.emptyInner}>
              <View style={styles.emptyIcon}>
                <Feather name="bar-chart-2" size={32} color={DS.colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>Sin datos aun</Text>
              <Text style={styles.emptyBody}>
                Aun no tienes suficientes datos. Las estadisticas apareceran
                despues de tus primeras ordenes.
              </Text>
            </View>
          </YCard>
        )}

        {/* ===== STATS ROW ===== */}
        {!loading && analytics && analytics.totalOrders > 0 && (
          <>
            <View style={styles.statsRow}>
              <StatBox
                value={`${analytics.totalOrders}`}
                label="Ordenes"
                color={DS.colors.blue}
              />
              <StatBox
                value={formatMoney(analytics.totalRevenue)}
                label="Ventas"
                color={DS.colors.green}
              />
              <StatBox
                value={formatMoney(analytics.averageOrderValue)}
                label="Ticket Promedio"
                color={DS.colors.orange}
              />
            </View>

            {/* ===== TOP PRODUCTS ===== */}
            {analytics.topProducts.length > 0 && (
              <>
                <SectionHeader title="Productos Mas Vendidos" />
                <YCard>
                  {analytics.topProducts.slice(0, 5).map((product, index) => (
                    <View key={product.productId}>
                      <View style={styles.productRow}>
                        <View style={styles.productRank}>
                          <Text style={styles.productRankText}>{index + 1}</Text>
                        </View>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>
                            {product.productName}
                          </Text>
                          <Text style={styles.productSold}>
                            {product.totalSold} vendidos
                          </Text>
                        </View>
                        <Text style={styles.productRevenue}>
                          {formatMoney(product.totalRevenue)}
                        </Text>
                      </View>
                      {index < Math.min(analytics.topProducts.length, 5) - 1 && (
                        <View style={styles.productDivider} />
                      )}
                    </View>
                  ))}
                </YCard>
              </>
            )}

            {/* ===== PEAK HOURS ===== */}
            <SectionHeader
              title="Horas Pico"
              subtitle={`Hora pico: ${analytics.peakHour}:00 hrs`}
            />
            <YCard>
              <BarChart
                data={hourlyData}
                labels={hourLabels}
                peakIndex={peakHourIndex}
              />
            </YCard>

            {/* ===== DAYS OF WEEK ===== */}
            <SectionHeader
              title="Dias de la Semana"
              subtitle={`Dia pico: ${analytics.peakDay}`}
            />
            <YCard>
              <BarChart
                data={dailyData}
                labels={dayLabels}
                peakIndex={peakDayIdx}
              />
            </YCard>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// -- Styles ------------------------------------------------------------------
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DS.touch.min,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...DS.fonts.title,
    color: DS.colors.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Range selector
  rangeRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
    justifyContent: 'center',
  },
  rangeChip: {
    paddingHorizontal: DS.space.xl,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
  },
  rangeChipActive: {
    backgroundColor: DS.colors.green,
    borderColor: DS.colors.green,
  },
  rangeText: {
    ...DS.fonts.label,
    color: DS.colors.muted,
  },
  rangeTextActive: {
    color: '#FFFFFF',
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: DS.space.xxxl * 2,
    gap: DS.space.md,
  },
  loadingText: {
    ...DS.fonts.body,
    color: DS.colors.muted,
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
  },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: DS.space.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DS.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.space.lg,
  },
  emptyTitle: {
    ...DS.fonts.section,
    color: DS.colors.dark,
    marginBottom: DS.space.sm,
  },
  emptyBody: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    textAlign: 'center',
    paddingHorizontal: DS.space.xl,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
  },

  // Product list
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DS.touch.min,
    gap: DS.space.md,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productRankText: {
    ...DS.fonts.label,
    color: DS.colors.green,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  productSold: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },
  productRevenue: {
    ...DS.fonts.bodyMed,
    color: DS.colors.green,
  },
  productDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
  },
});
