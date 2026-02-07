// ============================================================================
// YESSWERA: SOLICITAR CANCELACION
// Pantalla para solicitar cancelacion de pedidos ya aceptados
// Actualizado para usar ScreenContainer
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MessageCircle,
  Store,
  Truck,
  CheckCircle,
} from 'lucide-react-native';
import { getOrderById, getEstimatedCompensation } from '@/services/orders';
import { Order } from '@/constants/types';
import ScreenContainer from '@/components/ScreenContainer';
import { useTheme } from '@/contexts/theme';

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

const STATUS_COLORS = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  accent: '#3B82F6',
  primary: '#22C55E',
  secondary: '#F97316',
};

export default function CancelRequestScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [compensation, setCompensation] = useState<{ driverAmount: number; clientRefund: number } | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const fetchedOrder = await getOrderById(orderId);
      if (fetchedOrder) {
        if (fetchedOrder.status === 'pending') {
          router.replace(`/orders/cancel/${orderId}` as any);
          return;
        }
        if (fetchedOrder.status === 'cancelled' || fetchedOrder.status === 'delivered') {
          setOrder(fetchedOrder);
          setLoading(false);
          return;
        }

        setOrder(fetchedOrder);

        if (fetchedOrder.driverId) {
          const comp = await getEstimatedCompensation(orderId);
          setCompensation({
            driverAmount: comp.driverCompensation,
            clientRefund: comp.clientRefund,
          });
        }
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = () => {
    if (!order) return;
    const message = encodeURIComponent('Hola, quisiera solicitar la cancelacion de mi pedido. El motivo es:');
    router.push(`/chat/${orderId}?prefill=${message}` as any);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      accepted: 'Aceptada',
      preparing: 'Preparando',
      ready: 'Lista para recoger',
      assigned: 'Repartidor asignado',
      driver_verified: 'Repartidor verificado',
      handed_to_driver: 'En manos del repartidor',
      in_transit: 'En camino',
      arrived: 'Repartidor en tu ubicacion',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return STATUS_COLORS.accent;
    if (status === 'preparing') return STATUS_COLORS.warning;
    if (status === 'ready' || status === 'assigned') return STATUS_COLORS.primary;
    if (status === 'delivered') return STATUS_COLORS.success;
    if (status === 'cancelled') return STATUS_COLORS.error;
    return theme.textSecondary;
  };

  // Loading state
  if (loading) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={MessageCircle}
        headerTitle="Solicitar Cancelacion"
        headerSubtitle="Cargando informacion..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando orden...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (!order) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={MessageCircle}
        headerTitle="Solicitar Cancelacion"
        headerSubtitle="Orden no encontrada"
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: STATUS_COLORS.error }]}>
            Orden no encontrada
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Order already cancelled
  if (order.status === 'cancelled') {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={CheckCircle}
        headerTitle="Pedido Cancelado"
        headerSubtitle="Tu pedido ha sido cancelado"
      >
        <View style={styles.centeredContent}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={STATUS_COLORS.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>Pedido Cancelado</Text>

          <View style={[styles.refundCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.refundTitle, { color: theme.text }]}>Resumen de cancelacion:</Text>
            {order.cancelReason && (
              <View style={styles.refundRow}>
                <Text style={[styles.refundLabel, { color: theme.textSecondary }]}>Motivo:</Text>
                <Text style={[styles.refundValue, { color: theme.text }]}>
                  {order.cancelReason.split('|')[0].trim()}
                </Text>
              </View>
            )}
            {compensation && (
              <>
                <View style={styles.refundRow}>
                  <Text style={[styles.refundLabel, { color: theme.textSecondary }]}>Reembolso:</Text>
                  <Text style={[styles.refundValue, { color: STATUS_COLORS.success }]}>
                    ${compensation.clientRefund.toFixed(2)} MXN
                  </Text>
                </View>
                {compensation.driverAmount > 0 && (
                  <View style={styles.refundRow}>
                    <Text style={[styles.refundLabel, { color: theme.textSecondary }]}>
                      Compensacion repartidor:
                    </Text>
                    <Text style={[styles.refundValue, { color: theme.text }]}>
                      ${compensation.driverAmount.toFixed(2)} MXN
                    </Text>
                  </View>
                )}
              </>
            )}
            <Text style={[styles.refundNote, { color: theme.textSecondary }]}>
              El negocio te contactara para coordinar el reembolso.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/orders/history')}
          >
            <Text style={styles.doneButtonText}>Ver Historial</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={MessageCircle}
      headerTitle="Solicitar Cancelacion"
      headerSubtitle="Contacta al negocio para cancelar"
    >
      {/* Info Message */}
      <View style={styles.infoSection}>
        <View style={[styles.infoIconBg, { backgroundColor: `${STATUS_COLORS.accent}20` }]}>
          <MessageCircle size={40} color={STATUS_COLORS.accent} />
        </View>
        <Text style={[styles.infoTitle, { color: theme.text }]}>Tu pedido ya fue aceptado</Text>
        <Text style={[styles.infoSubtitle, { color: theme.textSecondary }]}>
          Para cancelar, necesitas comunicarte directamente con el negocio.
          Ellos decidiran si la cancelacion es posible.
        </Text>
      </View>

      {/* Business Info Card */}
      <View style={[styles.businessCard, { backgroundColor: theme.card }]}>
        <View style={styles.businessHeader}>
          <Store size={20} color={colors.primary} />
          <Text style={[styles.businessName, { color: theme.text }]}>{order.businessName}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Estado actual:</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
        </View>

        {order.driverId && order.driverName && (
          <View style={[styles.driverRow, { borderTopColor: theme.border }]}>
            <Truck size={18} color={STATUS_COLORS.secondary} />
            <Text style={[styles.driverText, { color: STATUS_COLORS.secondary }]}>
              Repartidor: {order.driverName}
            </Text>
          </View>
        )}
      </View>

      {/* Main Action: Open Chat */}
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: STATUS_COLORS.accent }]}
        onPress={handleOpenChat}
      >
        <MessageCircle size={24} color="#FFFFFF" />
        <Text style={styles.chatButtonText}>Abrir Chat con el Negocio</Text>
      </TouchableOpacity>

      {/* Driver Compensation Warning */}
      {order.driverId && compensation && (
        <View style={[styles.compensationCard, { borderColor: `${STATUS_COLORS.warning}40` }]}>
          <View style={styles.compensationHeader}>
            <Truck size={22} color={STATUS_COLORS.warning} />
            <Text style={[styles.compensationTitle, { color: theme.text }]}>
              Hay un repartidor asignado
            </Text>
          </View>
          <Text style={[styles.compensationText, { color: theme.textSecondary }]}>
            Si el negocio acepta la cancelacion, el repartidor recibira una
            compensacion por su tiempo y traslado.
          </Text>

          <View style={[styles.compensationBreakdown, { backgroundColor: theme.card }]}>
            <View style={styles.compensationRow}>
              <Text style={[styles.compensationLabel, { color: theme.textSecondary }]}>
                Compensacion repartidor:
              </Text>
              <Text style={[styles.compensationAmount, { color: theme.text }]}>
                ~${compensation.driverAmount.toFixed(2)} MXN
              </Text>
            </View>
            <View style={styles.compensationRow}>
              <Text style={[styles.compensationLabel, { color: theme.textSecondary }]}>
                Tu reembolso estimado:
              </Text>
              <Text style={[styles.compensationAmount, { color: STATUS_COLORS.success }]}>
                ~${compensation.clientRefund.toFixed(2)} MXN
              </Text>
            </View>
          </View>

          <Text style={[styles.compensationNote, { color: theme.textSecondary }]}>
            El monto final depende de la decision del negocio
          </Text>
        </View>
      )}

      {/* Order Summary */}
      <View style={[styles.orderSummary, { backgroundColor: theme.card }]}>
        <Text style={[styles.summaryTitle, { color: theme.text }]}>Resumen del pedido</Text>
        {order.items && order.items.map((item, index) => (
          <Text key={index} style={[styles.summaryItem, { color: theme.textSecondary }]}>
            {item.quantity}x {item.name} - ${item.price.toFixed(2)}
          </Text>
        ))}
        <View style={[styles.summaryTotal, { borderTopColor: theme.border }]}>
          <Text style={[styles.summaryTotalLabel, { color: theme.text }]}>Total:</Text>
          <Text style={[styles.summaryTotalValue, { color: STATUS_COLORS.secondary }]}>
            ${order.total.toFixed(2)} MXN
          </Text>
        </View>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backToOrderButton}
        onPress={() => router.back()}
      >
        <Text style={[styles.backToOrderText, { color: theme.textSecondary }]}>Volver al Pedido</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  centeredContent: {
    alignItems: 'center',
    paddingTop: 40,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  businessCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  driverText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compensationCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  compensationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  compensationTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  compensationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  compensationBreakdown: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  compensationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compensationLabel: {
    fontSize: 14,
  },
  compensationAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  compensationNote: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  orderSummary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  backToOrderButton: {
    alignItems: 'center',
    padding: 14,
    marginBottom: 20,
  },
  backToOrderText: {
    fontSize: 15,
  },
  // Cancelled state styles
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  refundCard: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  refundTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  refundLabel: {
    fontSize: 14,
  },
  refundValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  refundNote: {
    fontSize: 13,
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
