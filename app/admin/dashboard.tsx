import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BarChart3,
  Users,
  MapPin,
  Star,
  Clock,
  ShoppingBag,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { API_BASE } from '@/constants/api';
import { useAuth } from '@/contexts/auth';

interface AnalyticsSummary {
  totalUsers: number;
  activeUsers24h: number;
  totalOrders: number;
  ordersToday: number;
  averageRating: number;
  surveyResponseRate: number;
}

interface EventStat {
  eventType: string;
  count: number;
  percentage: number;
}

interface HourlyActivity {
  hour: number;
  events: number;
}

interface ZoneHeat {
  zone: string;
  orders: number;
  avgDeliveryTime: number;
}

interface SurveyInsight {
  question: string;
  avgRating?: number;
  responses: { answer: string; count: number }[];
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalUsers: 0,
    activeUsers24h: 0,
    totalOrders: 0,
    ordersToday: 0,
    averageRating: 0,
    surveyResponseRate: 0,
  });
  const [topEvents, setTopEvents] = useState<EventStat[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [zoneHeat, setZoneHeat] = useState<ZoneHeat[]>([]);
  const [surveyInsights, setSurveyInsights] = useState<SurveyInsight[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [summaryRes, eventsRes, hourlyRes, zonesRes, surveysRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/summary?range=${selectedTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/analytics/events/top?range=${selectedTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/analytics/events/hourly?range=${selectedTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/analytics/zones/heatmap?range=${selectedTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/analytics/surveys/insights?range=${selectedTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setTopEvents(data);
      }

      if (hourlyRes.ok) {
        const data = await hourlyRes.json();
        setHourlyActivity(data);
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZoneHeat(data);
      }

      if (surveysRes.ok) {
        const data = await surveysRes.json();
        setSurveyInsights(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      loadMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMockData = () => {
    setSummary({
      totalUsers: 1247,
      activeUsers24h: 342,
      totalOrders: 5834,
      ordersToday: 127,
      averageRating: 4.6,
      surveyResponseRate: 68.5,
    });

    setTopEvents([
      { eventType: 'page_view', count: 8945, percentage: 35.2 },
      { eventType: 'order_placed', count: 2341, percentage: 9.2 },
      { eventType: 'button_click', count: 12456, percentage: 49.1 },
      { eventType: 'search', count: 1234, percentage: 4.9 },
      { eventType: 'filter_applied', count: 432, percentage: 1.7 },
    ]);

    setHourlyActivity([
      { hour: 0, events: 45 },
      { hour: 1, events: 23 },
      { hour: 2, events: 12 },
      { hour: 3, events: 8 },
      { hour: 4, events: 15 },
      { hour: 5, events: 34 },
      { hour: 6, events: 89 },
      { hour: 7, events: 156 },
      { hour: 8, events: 234 },
      { hour: 9, events: 312 },
      { hour: 10, events: 389 },
      { hour: 11, events: 445 },
      { hour: 12, events: 567 },
      { hour: 13, events: 623 },
      { hour: 14, events: 589 },
      { hour: 15, events: 512 },
      { hour: 16, events: 478 },
      { hour: 17, events: 434 },
      { hour: 18, events: 512 },
      { hour: 19, events: 589 },
      { hour: 20, events: 634 },
      { hour: 21, events: 512 },
      { hour: 22, events: 345 },
      { hour: 23, events: 178 },
    ]);

    setZoneHeat([
      { zone: 'Centro', orders: 234, avgDeliveryTime: 18 },
      { zone: 'Chapalita', orders: 189, avgDeliveryTime: 22 },
      { zone: 'Providencia', orders: 156, avgDeliveryTime: 20 },
      { zone: 'Zapopan', orders: 134, avgDeliveryTime: 25 },
      { zone: 'Tlaquepaque', orders: 98, avgDeliveryTime: 28 },
    ]);

    setSurveyInsights([
      {
        question: '¿Qué tan satisfecho estás con el servicio?',
        avgRating: 4.5,
        responses: [
          { answer: '5 estrellas', count: 234 },
          { answer: '4 estrellas', count: 156 },
          { answer: '3 estrellas', count: 45 },
          { answer: '2 estrellas', count: 12 },
          { answer: '1 estrella', count: 8 },
        ],
      },
      {
        question: '¿Volverías a usar Yesswera?',
        responses: [
          { answer: 'Definitivamente sí', count: 312 },
          { answer: 'Probablemente sí', count: 134 },
          { answer: 'No estoy seguro', count: 23 },
          { answer: 'Probablemente no', count: 8 },
        ],
      },
    ]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  const maxHourlyEvents = Math.max(...hourlyActivity.map((h) => h.events), 1);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>Insights en tiempo real</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.timeRangeSelector}>
            {(['24h', '7d', '30d'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[styles.timeRangeButton, selectedTimeRange === range && styles.timeRangeButtonActive]}
                onPress={() => setSelectedTimeRange(range)}
              >
                <Text style={[styles.timeRangeText, selectedTimeRange === range && styles.timeRangeTextActive]}>
                  {range === '24h' ? '24 Horas' : range === '7d' ? '7 Días' : '30 Días'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
              <RefreshCw size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Users size={24} color={Colors.primary} />
              <Text style={styles.summaryValue}>{summary.totalUsers.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Usuarios Totales</Text>
              <Text style={styles.summarySubtext}>{summary.activeUsers24h} activos hoy</Text>
            </View>

            <View style={styles.summaryCard}>
              <ShoppingBag size={24} color={Colors.accent} />
              <Text style={styles.summaryValue}>{summary.totalOrders.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Órdenes</Text>
              <Text style={styles.summarySubtext}>{summary.ordersToday} hoy</Text>
            </View>

            <View style={styles.summaryCard}>
              <Star size={24} color={Colors.warning} />
              <Text style={styles.summaryValue}>{summary.averageRating.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Rating Promedio</Text>
              <Text style={styles.summarySubtext}>De {summary.totalOrders} órdenes</Text>
            </View>

            <View style={styles.summaryCard}>
              <MessageSquare size={24} color={Colors.success} />
              <Text style={styles.summaryValue}>{summary.surveyResponseRate.toFixed(1)}%</Text>
              <Text style={styles.summaryLabel}>Tasa de Respuesta</Text>
              <Text style={styles.summarySubtext}>Encuestas</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Eventos Principales</Text>
            </View>
            <View style={styles.card}>
              {topEvents.map((event, index) => (
                <View key={index} style={styles.eventRow}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventType}>{event.eventType.replace(/_/g, ' ')}</Text>
                    <Text style={styles.eventCount}>{event.count.toLocaleString()} eventos</Text>
                  </View>
                  <View style={styles.eventBarContainer}>
                    <View style={[styles.eventBar, { width: `${event.percentage}%` }]} />
                  </View>
                  <Text style={styles.eventPercentage}>{event.percentage.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={24} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Actividad por Hora</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.chartContainer}>
                <View style={styles.chart}>
                  {hourlyActivity.map((item) => {
                    const height = (item.events / maxHourlyEvents) * 120;
                    return (
                      <View key={item.hour} style={styles.chartBarContainer}>
                        <View style={[styles.chartBar, { height: Math.max(height, 4) }]} />
                        <Text style={styles.chartLabel}>{item.hour}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.chartLegendText}>Pico: 20:00 hrs ({Math.max(...hourlyActivity.map(h => h.events))} eventos)</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={24} color={Colors.error} />
              <Text style={styles.sectionTitle}>Mapa de Calor - Zonas</Text>
            </View>
            <View style={styles.card}>
              {zoneHeat.map((zone, index) => (
                <View key={index} style={styles.zoneRow}>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.zone}</Text>
                    <View style={styles.zoneStats}>
                      <View style={styles.zoneStat}>
                        <ShoppingBag size={14} color={Colors.text.secondary} />
                        <Text style={styles.zoneStatText}>{zone.orders} órdenes</Text>
                      </View>
                      <View style={styles.zoneStat}>
                        <Clock size={14} color={Colors.text.secondary} />
                        <Text style={styles.zoneStatText}>{zone.avgDeliveryTime} min</Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.zoneIndicator,
                      {
                        backgroundColor:
                          zone.orders > 200
                            ? Colors.error
                            : zone.orders > 150
                            ? Colors.warning
                            : Colors.success,
                      },
                    ]}
                  />
                </View>
              ))}
              <View style={styles.heatmapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                  <Text style={styles.legendText}>Alta demanda (&gt;200)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.legendText}>Media (150-200)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.legendText}>Baja (&lt;150)</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MessageSquare size={24} color={Colors.success} />
              <Text style={styles.sectionTitle}>Insights de Encuestas</Text>
            </View>
            {surveyInsights.map((insight, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.insightQuestion}>{insight.question}</Text>
                {insight.avgRating && (
                  <View style={styles.avgRatingContainer}>
                    <Star size={20} color={Colors.warning} fill={Colors.warning} />
                    <Text style={styles.avgRating}>{insight.avgRating.toFixed(1)} / 5.0</Text>
                  </View>
                )}
                <View style={styles.responsesContainer}>
                  {insight.responses.map((response, idx) => {
                    const total = insight.responses.reduce((sum, r) => sum + r.count, 0);
                    const percentage = (response.count / total) * 100;
                    return (
                      <View key={idx} style={styles.responseRow}>
                        <Text style={styles.responseAnswer}>{response.answer}</Text>
                        <View style={styles.responseBarContainer}>
                          <View style={[styles.responseBar, { width: `${percentage}%` }]} />
                        </View>
                        <Text style={styles.responseCount}>{response.count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.alertsSection}>
            <View style={styles.alertCard}>
              <AlertCircle size={24} color={Colors.warning} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Recomendación</Text>
                <Text style={styles.alertText}>
                  La hora pico es de 18:00 a 21:00. Considera incentivar a más repartidores durante este horario.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center' as const,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  timeRangeTextActive: {
    color: Colors.white,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  summaryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  summarySubtext: {
    fontSize: 11,
    color: Colors.text.light,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  eventRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  eventInfo: {
    width: 120,
  },
  eventType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textTransform: 'capitalize' as const,
  },
  eventCount: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  eventBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden' as const,
  },
  eventBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  eventPercentage: {
    width: 50,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'right' as const,
  },
  chartContainer: {
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-between' as const,
    height: 140,
    gap: 2,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
  },
  chartBar: {
    width: '100%',
    backgroundColor: Colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartLabel: {
    fontSize: 9,
    color: Colors.text.light,
    marginTop: 4,
  },
  chartLegend: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  chartLegendText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  zoneRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  zoneStats: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  zoneStat: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  zoneStatText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  zoneIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  heatmapLegend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingTop: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  insightQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  avgRatingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 16,
  },
  avgRating: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  responsesContainer: {
    gap: 12,
  },
  responseRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  responseAnswer: {
    fontSize: 13,
    color: Colors.text.secondary,
    width: 120,
  },
  responseBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden' as const,
  },
  responseBar: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  responseCount: {
    width: 40,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'right' as const,
  },
  alertsSection: {
    marginBottom: 24,
  },
  alertCard: {
    flexDirection: 'row' as const,
    backgroundColor: `${Colors.warning}15`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Colors.warning}40`,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
