// ============================================================================
// YESSWERA: HISTORIAL DE ORDENES — Simplified
// FlatList with date | business | total | status pill
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import Pill from '@/components/ui/Pill';
import { useAuth } from '@/contexts/auth';
import { getUserOrders } from '@/services/orders';
import type { Order } from '@/constants/types';

// -- Helpers ------------------------------------------------------------------
function statusPillProps(status: string): { text: string; color: string } {
  switch (status) {
    case 'delivered':
      return { text: 'Entregado', color: DS.colors.green };
    case 'cancelled':
      return { text: 'Cancelado', color: DS.colors.red };
    default:
      return { text: 'En curso', color: DS.colors.orange };
  }
}

function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// -- Row component ------------------------------------------------------------
function OrderRow({ order }: { order: Order }) {
  const pill = statusPillProps(order.status);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => router.push(`/orders/${order.id}` as any)}
    >
      <Text style={styles.rowDate}>{formatShortDate(order.createdAt)}</Text>
      <View style={styles.rowCenter}>
        <Text style={styles.rowBusiness} numberOfLines={1}>
          {order.businessName || 'Pedido'}
        </Text>
        <Text style={styles.rowTotal}>${order.total.toFixed(2)}</Text>
      </View>
      <Pill text={pill.text} color={pill.color} />
    </TouchableOpacity>
  );
}

// -- Screen -------------------------------------------------------------------
export default function OrderHistoryScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserOrders(user.id);
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={DS.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={DS.colors.green} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderRow order={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DS.colors.green} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={56} color={DS.colors.hairline} />
              <Text style={styles.emptyTitle}>Aun no tienes pedidos</Text>
              <Text style={styles.emptyBody}>Tus ordenes apareceran aqui</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// -- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...DS.fonts.title, color: DS.colors.dark },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: DS.space.lg, paddingBottom: 40 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    gap: DS.space.md,
  },
  rowDate: { ...DS.fonts.label, color: DS.colors.muted, width: 52 },
  rowCenter: { flex: 1 },
  rowBusiness: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  rowTotal: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  separator: { height: 1, backgroundColor: DS.colors.divider },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { ...DS.fonts.section, color: DS.colors.dark },
  emptyBody: { ...DS.fonts.body, color: DS.colors.muted },
});
