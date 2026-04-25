// ============================================================================
// YESSWERA: DETALLE DE ORDEN — Simplified
// ScrollView with YCard sections: info, items, delivery, rate button
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import Pill from '@/components/ui/Pill';
import BigButton from '@/components/ui/BigButton';
import YAvatar from '@/components/ui/YAvatar';
import { useAuth } from '@/contexts/auth';
import { getOrderById } from '@/services/orders';
import type { Order } from '@/constants/types';

// -- Helpers ------------------------------------------------------------------
function statusPill(status: string): { text: string; color: string } {
  switch (status) {
    case 'delivered':
      return { text: 'Entregado', color: DS.colors.green };
    case 'cancelled':
      return { text: 'Cancelado', color: DS.colors.red };
    default:
      return { text: 'En curso', color: DS.colors.orange };
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// -- Screen -------------------------------------------------------------------
export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    getOrderById(orderId)
      .then(setOrder)
      .catch((err) => console.error('Error loading order:', err))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DS.colors.green} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={DS.colors.muted} />
        <Text style={styles.errorText}>Orden no encontrada</Text>
      </View>
    );
  }

  const pill = statusPill(order.status);
  const canRate = order.status === 'delivered' && !order.rated;
  const driverInitials = order.driverName
    ? order.driverName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={DS.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Orden</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* -- Order info card -- */}
        <YCard style={styles.card}>
          <Pill text={pill.text} color={pill.color} />
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          {order.businessName && <Text style={styles.businessName}>{order.businessName}</Text>}
        </YCard>

        {/* -- Items card -- */}
        {order.items && order.items.length > 0 && (
          <YCard style={styles.card}>
            <Text style={styles.sectionLabel}>Productos</Text>
            {order.items.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            {order.subtotal != null && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${order.subtotal.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Envio</Text>
              <Text style={styles.totalValue}>${order.deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>${order.total.toFixed(2)}</Text>
            </View>
          </YCard>
        )}

        {/* -- Delivery info card -- */}
        <YCard style={styles.card}>
          <Text style={styles.sectionLabel}>Entrega</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={DS.colors.green} />
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>

          {order.driverName && order.status === 'delivered' && (
            <View style={styles.driverRow}>
              <YAvatar initials={driverInitials} size={40} color={DS.colors.green} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{order.driverName}</Text>
                {order.driverRating != null && (
                  <Text style={styles.driverRating}>
                    {order.driverRating.toFixed(1)} {'\u2605'}
                  </Text>
                )}
              </View>
            </View>
          )}
        </YCard>

        {/* -- Rate button -- */}
        {canRate && (
          <View style={styles.rateWrap}>
            <BigButton
              title="Calificar servicio"
              icon={<Ionicons name="star-outline" size={22} color="#FFF" />}
              onPress={() => router.push(`/ratings/create/${order.id}` as any)}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// -- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.bg,
    gap: 12,
  },
  errorText: { ...DS.fonts.body, color: DS.colors.muted },

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

  scroll: { paddingHorizontal: DS.space.lg, paddingTop: DS.space.sm },
  card: { marginBottom: DS.space.lg },

  // Order info
  orderNumber: { ...DS.fonts.section, color: DS.colors.dark, marginTop: DS.space.md },
  orderDate: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 4 },
  businessName: { ...DS.fonts.bodyMed, color: DS.colors.body, marginTop: DS.space.sm },

  // Items
  sectionLabel: { ...DS.fonts.label, color: DS.colors.muted, marginBottom: DS.space.md },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: DS.space.sm,
  },
  itemQty: { ...DS.fonts.bodyMed, color: DS.colors.green, width: 32 },
  itemName: { ...DS.fonts.body, color: DS.colors.dark, flex: 1 },
  itemPrice: { ...DS.fonts.bodyMed, color: DS.colors.dark },

  divider: { height: 1, backgroundColor: DS.colors.divider, marginVertical: DS.space.md },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: { ...DS.fonts.body, color: DS.colors.muted },
  totalValue: { ...DS.fonts.body, color: DS.colors.dark },
  grandLabel: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  grandValue: { ...DS.fonts.title, color: DS.colors.green },

  // Delivery
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: DS.space.lg },
  addressText: { ...DS.fonts.body, color: DS.colors.body, flex: 1 },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverInfo: { flex: 1 },
  driverName: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  driverRating: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },

  // Rate
  rateWrap: { marginTop: DS.space.sm },
});
