import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: GANANCIAS DEL NEGOCIO
// Resumen financiero con filtros por periodo, desglose de ordenes,
// productos mas vendidos y metodos de pago.
// Usa ScreenContainer para diseno unificado
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { DollarSign, TrendingUp, ShoppingBag, CreditCard, Banknote, XCircle, Clock, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';


// ============================================================================
// TIPOS
// ============================================================================

type Period = 'today' | 'week' | 'month';

interface OrderData {
  id: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  tip: number;
  status: string;
  payment_method: string;
  created_at: string;
}

interface TopProduct {
  product_name: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface DailyRevenue {
  date: string;
  amount: number;
  count: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(period: Period): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)} MXN`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function BusinessEarningsScreen() {
  const { user } = useAuth();
  const { colors, space, radius } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  const loadBusinessId = useCallback(async () => {
    if (!user) return null;

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (business) {
      setBusinessId(business.id);
      return business.id;
    }
    return null;
  }, [user]);

  const loadData = useCallback(async (bId?: string | null) => {
    const id = bId || businessId;
    if (!id) return;

    try {
      const { startDate, endDate } = getDateRange(period);

      // Fetch orders for period
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, total, subtotal, delivery_fee, tip, status, payment_method, created_at')
        .eq('business_id', id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      setOrders(orderData || []);

      // Fetch top products
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal, order_id, orders!inner(business_id, created_at)')
        .eq('orders.business_id', id)
        .gte('orders.created_at', startDate.toISOString());

      // Aggregate top products
      if (itemsData && itemsData.length > 0) {
        const productMap = new Map<string, { totalQuantity: number; totalRevenue: number }>();

        for (const item of itemsData) {
          const name = item.product_name || 'Sin nombre';
          const existing = productMap.get(name) || { totalQuantity: 0, totalRevenue: 0 };
          existing.totalQuantity += item.quantity || 0;
          existing.totalRevenue += item.subtotal || 0;
          productMap.set(name, existing);
        }

        const sorted = Array.from(productMap.entries())
          .map(([product_name, data]) => ({ product_name, ...data }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5);

        setTopProducts(sorted);
      } else {
        setTopProducts([]);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, period]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const bId = await loadBusinessId();
      if (bId) {
        await loadData(bId);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (businessId) {
      setLoading(true);
      loadData();
    }
  }, [period]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ============================================================================
  // CALCULOS
  // ============================================================================

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'delivered');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const pending = orders.filter(o =>
      !['delivered', 'cancelled'].includes(o.status)
    );

    const totalRevenue = delivered.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = delivered.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const cancelledAmount = cancelled.reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingAmount = pending.reduce((sum, o) => sum + (o.total || 0), 0);

    const cashOrders = delivered.filter(o => o.payment_method === 'cash');
    const cardOrders = delivered.filter(o => o.payment_method === 'card');
    const cashAmount = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const cardAmount = cardOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalRevenue,
      totalOrders,
      avgTicket,
      cancelledCount: cancelled.length,
      cancelledAmount,
      pendingCount: pending.length,
      pendingAmount,
      cashCount: cashOrders.length,
      cashAmount,
      cardCount: cardOrders.length,
      cardAmount,
    };
  }, [orders]);

  const dailyRevenue = useMemo((): DailyRevenue[] => {
    const delivered = orders.filter(o => o.status === 'delivered');
    const dayMap = new Map<string, { amount: number; count: number }>();

    for (const order of delivered) {
      const dateKey = new Date(order.created_at).toISOString().split('T')[0];
      const existing = dayMap.get(dateKey) || { amount: 0, count: 0 };
      existing.amount += order.total || 0;
      existing.count += 1;
      dayMap.set(dateKey, existing);
    }

    return Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [orders]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const periodLabels: Record<Period, string> = {
    today: 'Hoy',
    week: 'Semana',
    month: 'Mes',
  };

  const hasData = orders.length > 0;

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={DollarSign}
      headerTitle="Ganancias"
      headerSubtitle="Resumen financiero de tu negocio"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* ================================================================ */}
      {/* SELECTOR DE PERIODO                                              */}
      {/* ================================================================ */}

      <View style={[styles.tabsRow, { marginBottom: space.md }]}>
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <TouchableSound
            key={p}
            style={[
              styles.tab,
              {
                backgroundColor: colors.card,
                borderColor: colors.border.light,
                borderRadius: radius.md,
              },
              period === p && {
                backgroundColor: colors.secondary,
                borderColor: colors.secondary,
              },
            ]}
            onPress={() => setPeriod(p)}
          >
            <ThemedText
              variant="label"
              bold
              style={[
                { color: colors.text.secondary },
                period === p && { color: '#FFFFFF' },
              ]}
            >
              {periodLabels[p]}
            </ThemedText>
          </TouchableSound>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <ThemedText variant="body" color="secondary" style={{ marginTop: space.sm }}>
            Cargando datos...
          </ThemedText>
        </View>
      ) : !hasData ? (
        /* ================================================================ */
        /* EMPTY STATE                                                      */
        /* ================================================================ */
        <View style={styles.emptyContainer}>
          <DollarSign size={48} color={colors.text.muted} />
          <ThemedText variant="subtitle" color="muted" style={{ marginTop: space.md, textAlign: 'center' }}>
            Sin datos
          </ThemedText>
          <ThemedText variant="body" color="muted" style={{ marginTop: space.xs, textAlign: 'center' }}>
            No hay ordenes en este periodo
          </ThemedText>
        </View>
      ) : (
        <>
          {/* ================================================================ */}
          {/* RESUMEN DE INGRESOS                                              */}
          {/* ================================================================ */}

          <View style={[styles.card, {
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: space.md,
            marginBottom: space.md,
          }]}>
            <View style={styles.cardHeader}>
              <TrendingUp size={20} color={colors.success} />
              <ThemedText variant="subtitle" bold style={{ marginLeft: 8, color: colors.text.primary }}>
                Resumen de Ingresos
              </ThemedText>
            </View>

            <View style={[styles.revenueRow, { marginTop: space.md }]}>
              <View style={styles.revenueStat}>
                <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                  Total Ingresos
                </ThemedText>
                <ThemedText variant="h3" bold style={{ color: colors.success, marginTop: 4 }}>
                  {formatCurrency(stats.totalRevenue)}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.revenueRow, { marginTop: space.sm }]}>
              <View style={styles.revenueStat}>
                <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                  Ordenes Completadas
                </ThemedText>
                <ThemedText variant="title" bold style={{ color: colors.text.primary, marginTop: 2 }}>
                  {stats.totalOrders}
                </ThemedText>
              </View>
              <View style={[styles.revenueStat, { alignItems: 'flex-end' }]}>
                <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                  Ticket Promedio
                </ThemedText>
                <ThemedText variant="title" bold style={{ color: colors.text.primary, marginTop: 2 }}>
                  {formatCurrency(stats.avgTicket)}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* ================================================================ */}
          {/* DESGLOSE POR STATUS                                              */}
          {/* ================================================================ */}

          <View style={[styles.card, {
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: space.md,
            marginBottom: space.md,
          }]}>
            <View style={styles.cardHeader}>
              <ShoppingBag size={20} color={colors.secondary} />
              <ThemedText variant="subtitle" bold style={{ marginLeft: 8, color: colors.text.primary }}>
                Desglose de Ordenes
              </ThemedText>
            </View>

            {/* Completadas */}
            <View style={[styles.statusRow, { marginTop: space.md, borderBottomColor: colors.border.light }]}>
              <View style={styles.statusLeft}>
                <CheckCircle size={18} color={colors.success} />
                <ThemedText variant="body" style={{ marginLeft: 8, color: colors.text.primary }}>
                  Completadas
                </ThemedText>
              </View>
              <View style={styles.statusRight}>
                <ThemedText variant="body" bold style={{ color: colors.text.primary }}>
                  {stats.totalOrders}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: colors.success, marginLeft: 8 }}>
                  {formatCurrency(stats.totalRevenue)}
                </ThemedText>
              </View>
            </View>

            {/* Canceladas */}
            <View style={[styles.statusRow, { borderBottomColor: colors.border.light }]}>
              <View style={styles.statusLeft}>
                <XCircle size={18} color={colors.error} />
                <ThemedText variant="body" style={{ marginLeft: 8, color: colors.text.primary }}>
                  Canceladas
                </ThemedText>
              </View>
              <View style={styles.statusRight}>
                <ThemedText variant="body" bold style={{ color: colors.text.primary }}>
                  {stats.cancelledCount}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: colors.error, marginLeft: 8 }}>
                  {formatCurrency(stats.cancelledAmount)}
                </ThemedText>
              </View>
            </View>

            {/* Pendientes */}
            <View style={[styles.statusRow, { borderBottomWidth: 0 }]}>
              <View style={styles.statusLeft}>
                <Clock size={18} color={colors.warning} />
                <ThemedText variant="body" style={{ marginLeft: 8, color: colors.text.primary }}>
                  Pendientes
                </ThemedText>
              </View>
              <View style={styles.statusRight}>
                <ThemedText variant="body" bold style={{ color: colors.text.primary }}>
                  {stats.pendingCount}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: colors.warning, marginLeft: 8 }}>
                  {formatCurrency(stats.pendingAmount)}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* ================================================================ */}
          {/* INGRESOS POR DIA                                                 */}
          {/* ================================================================ */}

          {dailyRevenue.length > 0 && (
            <View style={[styles.card, {
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: space.md,
              marginBottom: space.md,
            }]}>
              <View style={styles.cardHeader}>
                <TrendingUp size={20} color={colors.accent} />
                <ThemedText variant="subtitle" bold style={{ marginLeft: 8, color: colors.text.primary }}>
                  Ingresos por Dia
                </ThemedText>
              </View>

              {dailyRevenue.map((day, index) => (
                <View
                  key={day.date}
                  style={[
                    styles.dailyRow,
                    {
                      borderBottomColor: colors.border.light,
                      borderBottomWidth: index < dailyRevenue.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <View>
                    <ThemedText variant="body" style={{ color: colors.text.primary }}>
                      {formatDate(day.date)}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ color: colors.text.muted, marginTop: 2 }}>
                      {day.count} {day.count === 1 ? 'orden' : 'ordenes'}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" bold style={{ color: colors.success }}>
                    {formatCurrency(day.amount)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* ================================================================ */}
          {/* TOP PRODUCTOS                                                    */}
          {/* ================================================================ */}

          {topProducts.length > 0 && (
            <View style={[styles.card, {
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: space.md,
              marginBottom: space.md,
            }]}>
              <View style={styles.cardHeader}>
                <ShoppingBag size={20} color={colors.primary} />
                <ThemedText variant="subtitle" bold style={{ marginLeft: 8, color: colors.text.primary }}>
                  Productos Mas Vendidos
                </ThemedText>
              </View>

              {topProducts.map((product, index) => (
                <View
                  key={product.product_name}
                  style={[
                    styles.productRow,
                    {
                      borderBottomColor: colors.border.light,
                      borderBottomWidth: index < topProducts.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <View style={styles.productRank}>
                    <View style={[styles.rankBadge, {
                      backgroundColor: index === 0 ? colors.warning + '20' : colors.background.secondary,
                    }]}>
                      <ThemedText variant="label" bold style={{
                        color: index === 0 ? colors.warning : colors.text.muted,
                      }}>
                        #{index + 1}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.productInfo}>
                    <ThemedText variant="body" style={{ color: colors.text.primary }} numberOfLines={1}>
                      {product.product_name}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ color: colors.text.muted, marginTop: 2 }}>
                      {product.totalQuantity} {product.totalQuantity === 1 ? 'unidad' : 'unidades'}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" bold style={{ color: colors.success }}>
                    {formatCurrency(product.totalRevenue)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* ================================================================ */}
          {/* METODOS DE PAGO                                                  */}
          {/* ================================================================ */}

          <View style={[styles.card, {
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: space.md,
            marginBottom: space.xl || 32,
          }]}>
            <View style={styles.cardHeader}>
              <CreditCard size={20} color={colors.tertiary} />
              <ThemedText variant="subtitle" bold style={{ marginLeft: 8, color: colors.text.primary }}>
                Metodos de Pago
              </ThemedText>
            </View>

            {/* Efectivo */}
            <View style={[styles.paymentRow, { marginTop: space.md, borderBottomColor: colors.border.light }]}>
              <View style={styles.paymentLeft}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.success + '15' }]}>
                  <Banknote size={18} color={colors.success} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <ThemedText variant="body" style={{ color: colors.text.primary }}>
                    Efectivo
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                    {stats.cashCount} {stats.cashCount === 1 ? 'orden' : 'ordenes'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText variant="body" bold style={{ color: colors.text.primary }}>
                {formatCurrency(stats.cashAmount)}
              </ThemedText>
            </View>

            {/* Tarjeta */}
            <View style={[styles.paymentRow, { borderBottomWidth: 0 }]}>
              <View style={styles.paymentLeft}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.tertiary + '15' }]}>
                  <CreditCard size={18} color={colors.tertiary} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <ThemedText variant="body" style={{ color: colors.text.primary }}>
                    Tarjeta
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                    {stats.cardCount} {stats.cardCount === 1 ? 'orden' : 'ordenes'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText variant="body" bold style={{ color: colors.text.primary }}>
                {formatCurrency(stats.cardAmount)}
              </ThemedText>
            </View>

            {/* Barra visual de proporcion */}
            {(stats.cashCount > 0 || stats.cardCount > 0) && (
              <View style={[styles.paymentBar, { marginTop: space.sm }]}>
                {stats.cashCount > 0 && (
                  <View style={[
                    styles.paymentBarSegment,
                    {
                      backgroundColor: colors.success,
                      flex: stats.cashAmount,
                      borderTopLeftRadius: 4,
                      borderBottomLeftRadius: 4,
                      borderTopRightRadius: stats.cardAmount === 0 ? 4 : 0,
                      borderBottomRightRadius: stats.cardAmount === 0 ? 4 : 0,
                    },
                  ]} />
                )}
                {stats.cardCount > 0 && (
                  <View style={[
                    styles.paymentBarSegment,
                    {
                      backgroundColor: colors.tertiary,
                      flex: stats.cardAmount,
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                      borderTopLeftRadius: stats.cashAmount === 0 ? 4 : 0,
                      borderBottomLeftRadius: stats.cashAmount === 0 ? 4 : 0,
                    },
                  ]} />
                )}
              </View>
            )}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  // Tabs de periodo
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },

  // Cards
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Resumen ingresos
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueStat: {
    flex: 1,
  },

  // Desglose por status
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Ingresos por dia
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },

  // Top productos
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  productRank: {
    marginRight: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },

  // Metodos de pago
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBar: {
    flexDirection: 'row',
    height: 6,
    overflow: 'hidden',
  },
  paymentBarSegment: {
    height: 6,
  },
});
