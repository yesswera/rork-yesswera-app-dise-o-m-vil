import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: GANANCIAS DEL REPARTIDOR
// Usa ScreenContainer para diseño unificado con soporte de tema
// Usa headerGradient="secondary" (naranja) para diferenciarse
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, Package, TrendingUp, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';

// ============================================================================
// COLORES EXPLICITOS PARA MODO OSCURO
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

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
  const { isDark, colors, radius, space } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarned: 0,
    deliveriesCompleted: 0,
    tipsReceived: 0,
    orders: [],
  });
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        .select('total, businesses (business_name)')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .eq('payment_method', 'cash')
        .eq('payment_status', 'pending');

      if (settlements) {
        const grouped: Record<string, number> = {};
        settlements.forEach((s: any) => {
          const businessName = s.businesses?.business_name || 'Negocio';
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'today') return 'Hoy';
    if (selectedPeriod === 'week') return 'Esta Semana';
    return 'Este Mes';
  };

  // Tab selector header content
  const headerContent = (
    <View style={[styles.tabsContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md }]}>
      <TouchableSound
        style={[styles.tab, selectedPeriod === 'today' && styles.tabActive]}
        onPress={() => setSelectedPeriod('today')}
      >
        <ThemedText
          variant="caption"
          bold
          style={{ color: selectedPeriod === 'today' ? colors.secondary : 'rgba(255,255,255,0.7)' }}
        >
          Hoy
        </ThemedText>
      </TouchableSound>
      <TouchableSound
        style={[styles.tab, selectedPeriod === 'week' && styles.tabActive]}
        onPress={() => setSelectedPeriod('week')}
      >
        <ThemedText
          variant="caption"
          bold
          style={{ color: selectedPeriod === 'week' ? colors.secondary : 'rgba(255,255,255,0.7)' }}
        >
          Esta Semana
        </ThemedText>
      </TouchableSound>
      <TouchableSound
        style={[styles.tab, selectedPeriod === 'month' && styles.tabActive]}
        onPress={() => setSelectedPeriod('month')}
      >
        <ThemedText
          variant="caption"
          bold
          style={{ color: selectedPeriod === 'month' ? colors.secondary : 'rgba(255,255,255,0.7)' }}
        >
          Este Mes
        </ThemedText>
      </TouchableSound>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={DollarSign}
      headerTitle="Mis Ganancias"
      headerSubtitle="Revisa tus ingresos y entregas"
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Summary Card */}
      <ScreenCard style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <DollarSign size={32} color={theme.success} />
          <ThemedText variant="label" style={{ color: theme.textSecondary }}>
            Total Ganado - {getPeriodLabel()}
          </ThemedText>
        </View>
        <ThemedText variant="h1" style={[styles.summaryAmount, { color: theme.success }]}>
          ${earnings.totalEarned.toFixed(2)} MXN
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Package size={20} color={colors.primary} />
            <ThemedText variant="h3" style={{ color: theme.text }}>{earnings.deliveriesCompleted}</ThemedText>
            <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Entregas</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <TrendingUp size={20} color={theme.warning} />
            <ThemedText variant="h3" style={{ color: theme.text }}>${earnings.tipsReceived.toFixed(2)}</ThemedText>
            <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Propinas</ThemedText>
          </View>
        </View>
      </ScreenCard>

      {/* Orders History */}
      <ThemedText variant="h3" style={[styles.sectionTitle, { color: theme.text }]}>
        Historial de Ganancias
      </ThemedText>

      {loading ? (
        <ThemedText variant="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando...
        </ThemedText>
      ) : earnings.orders.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
          <Package size={48} color={theme.textMuted} />
          <ThemedText variant="body" style={{ color: theme.textSecondary }}>
            No hay entregas en este periodo
          </ThemedText>
        </View>
      ) : (
        earnings.orders.map((order) => (
          <View key={order.id} style={[styles.orderCard, { backgroundColor: theme.card }]}>
            <View style={styles.orderHeader}>
              <ThemedText variant="label" style={{ color: theme.textSecondary }}>
                #{order.orderNumber}
              </ThemedText>
              <ThemedText variant="h3" style={{ color: theme.success }}>
                ${(order.earnings + order.tip).toFixed(2)}
              </ThemedText>
            </View>
            <View style={[styles.orderDetails, { borderTopColor: theme.border }]}>
              <View style={styles.orderDetailRow}>
                <Clock size={14} color={theme.textSecondary} />
                <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                  {new Date(order.completedAt).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </View>
              <View style={styles.breakdownRow}>
                <ThemedText variant="body" style={{ color: theme.textSecondary }}>Entrega:</ThemedText>
                <ThemedText variant="body" bold style={{ color: theme.text }}>${order.earnings.toFixed(2)}</ThemedText>
              </View>
              {order.tip > 0 && (
                <View style={styles.breakdownRow}>
                  <ThemedText variant="body" style={{ color: theme.textSecondary }}>Propina:</ThemedText>
                  <ThemedText variant="body" bold style={{ color: theme.success }}>+${order.tip.toFixed(2)}</ThemedText>
                </View>
              )}
            </View>
          </View>
        ))
      )}

      {/* Pending Settlements */}
      {pendingSettlements.length > 0 && (
        <>
          <ThemedText variant="h3" style={[styles.sectionTitle, { color: theme.text }]}>
            Liquidaciones Pendientes
          </ThemedText>
          <ThemedText variant="body" style={[styles.pendingSubtitle, { color: theme.textSecondary }]}>
            Montos que debes entregar a los negocios
          </ThemedText>
          {pendingSettlements.map((settlement, index) => (
            <View key={index} style={[styles.settlementCard, { backgroundColor: theme.card, borderColor: theme.error }]}>
              <View style={[styles.settlementIcon, { backgroundColor: theme.error + '15' }]}>
                <DollarSign size={20} color={theme.error} />
              </View>
              <View style={styles.settlementInfo}>
                <ThemedText variant="subtitle" bold style={{ color: theme.text }}>
                  {settlement.businessName}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                  Debes entregar:
                </ThemedText>
              </View>
              <ThemedText variant="h3" style={{ color: theme.error }}>
                ${settlement.amount.toFixed(2)}
              </ThemedText>
            </View>
          ))}
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  summaryCard: {
    padding: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  summaryAmount: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    marginBottom: 16,
    marginTop: 8,
  },
  loadingText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderDetails: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pendingSubtitle: {
    marginBottom: 16,
    marginTop: -8,
  },
  settlementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  settlementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settlementInfo: {
    flex: 1,
  },
  bottomPadding: {
    height: 40,
  },
});
