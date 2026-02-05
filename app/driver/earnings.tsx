import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, Package, TrendingUp, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

type Period = 'today' | 'week' | 'month';

interface EarningsData {
  totalEarned: number;
  deliveriesCompleted: number;
  tipsReceived: number;
  orders: {
    id: string;
    orderNumber: string;
    completedAt: string;
    earnings: number;
    tip: number;
  }[];
}

interface PendingSettlement {
  businessName: string;
  amount: number;
}

export default function EarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarned: 0,
    deliveriesCompleted: 0,
    tipsReceived: 0,
    orders: [],
  });
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    const loadDriverId = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (data) setDriverId(data.id);
      } catch {
        console.log('Driver record not found');
      }
    };
    loadDriverId();
  }, [user]);

  useEffect(() => {
    if (driverId) {
      loadEarnings();
    }
  }, [selectedPeriod, driverId]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    if (selectedPeriod === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate: now };
  };

  const loadEarnings = async () => {
    if (!driverId) return;

    setLoading(true);
    try {
      const { startDate } = getDateRange();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, delivered_at, delivery_fee, tip')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('delivered_at', startDate.toISOString())
        .order('delivered_at', { ascending: false });

      if (error) throw error;

      const totalEarnings = orders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;
      const totalTips = orders?.reduce((sum, o) => sum + (o.tip || 0), 0) || 0;

      setEarnings({
        totalEarned: totalEarnings + totalTips,
        deliveriesCompleted: orders?.length || 0,
        tipsReceived: totalTips,
        orders:
          orders?.map((o) => ({
            id: o.id.toString(),
            orderNumber: o.order_number,
            completedAt: o.delivered_at,
            earnings: o.delivery_fee || 0,
            tip: o.tip || 0,
          })) || [],
      });

      const { data: settlements } = await supabase
        .from('orders')
        .select('business_name, total')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .eq('payment_method', 'cash')
        .eq('payment_status', 'pending');

      if (settlements) {
        const grouped: Record<string, number> = {};
        settlements.forEach((s) => {
          const businessName = s.business_name || 'Negocio';
          grouped[businessName] = (grouped[businessName] || 0) + (s.total || 0);
        });

        setPendingSettlements(
          Object.entries(grouped).map(([businessName, amount]) => ({
            businessName,
            amount,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'today') return 'Hoy';
    if (selectedPeriod === 'week') return 'Esta Semana';
    return 'Este Mes';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Ganancias</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedPeriod === 'today' && styles.tabActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.tabText, selectedPeriod === 'today' && styles.tabTextActive]}>
              Hoy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedPeriod === 'week' && styles.tabActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.tabText, selectedPeriod === 'week' && styles.tabTextActive]}>
              Esta Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedPeriod === 'month' && styles.tabActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.tabText, selectedPeriod === 'month' && styles.tabTextActive]}>
              Este Mes
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <DollarSign size={32} color={Colors.success} />
              <Text style={styles.summaryLabel}>Total Ganado - {getPeriodLabel()}</Text>
            </View>
            <Text style={styles.summaryAmount}>${earnings.totalEarned.toFixed(2)} MXN</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Package size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{earnings.deliveriesCompleted}</Text>
                <Text style={styles.statLabel}>Entregas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <TrendingUp size={20} color={Colors.warning} />
                <Text style={styles.statValue}>${earnings.tipsReceived.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Propinas</Text>
              </View>
            </View>
          </View>

          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>Historial de Ganancias</Text>
            {loading ? (
              <Text style={styles.loadingText}>Cargando...</Text>
            ) : earnings.orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color={Colors.text.light} />
                <Text style={styles.emptyText}>No hay entregas en este período</Text>
              </View>
            ) : (
              earnings.orders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Text style={styles.orderEarnings}>
                      ${(order.earnings + order.tip).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.orderDetails}>
                    <View style={styles.orderDetailRow}>
                      <Clock size={14} color={Colors.text.secondary} />
                      <Text style={styles.orderTime}>
                        {new Date(order.completedAt).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Entrega:</Text>
                      <Text style={styles.breakdownValue}>${order.earnings.toFixed(2)}</Text>
                    </View>
                    {order.tip > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Propina:</Text>
                        <Text style={[styles.breakdownValue, styles.tipValue]}>
                          +${order.tip.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {pendingSettlements.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Liquidaciones Pendientes</Text>
              <Text style={styles.pendingSubtitle}>
                Montos que debes entregar a los negocios
              </Text>
              {pendingSettlements.map((settlement, index) => (
                <View key={index} style={styles.settlementCard}>
                  <View style={styles.settlementIcon}>
                    <DollarSign size={20} color={Colors.error} />
                  </View>
                  <View style={styles.settlementInfo}>
                    <Text style={styles.settlementBusiness}>{settlement.businessName}</Text>
                    <Text style={styles.settlementLabel}>Debes entregar:</Text>
                  </View>
                  <Text style={styles.settlementAmount}>${settlement.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginLeft: 12,
  },
  summaryAmount: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: Colors.success,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.light,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  ordersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    paddingVertical: 24,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  orderEarnings: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 12,
  },
  orderDetailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  orderTime: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginLeft: 6,
  },
  breakdownRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  tipValue: {
    color: Colors.success,
  },
  pendingSection: {
    marginBottom: 40,
  },
  pendingSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  settlementCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  settlementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.error}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  settlementInfo: {
    flex: 1,
  },
  settlementBusiness: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  settlementLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  settlementAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.error,
  },
});
