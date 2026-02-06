import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  MessageCircle,
  Store,
  Truck,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Phone,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getOrderById, getEstimatedCompensation } from '@/services/orders';
import { Order } from '@/constants/types';

export default function CancelRequestScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

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
        // If pending, redirect to direct cancel
        if (fetchedOrder.status === 'pending') {
          router.replace(`/orders/cancel/${orderId}` as any);
          return;
        }
        // If already cancelled or delivered
        if (fetchedOrder.status === 'cancelled' || fetchedOrder.status === 'delivered') {
          setOrder(fetchedOrder);
          setLoading(false);
          return;
        }

        setOrder(fetchedOrder);

        // Calculate compensation if driver is assigned
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
    // Navigate to chat with business, prefilled with cancellation request
    const message = encodeURIComponent('Hola, quisiera solicitar la cancelacion de mi pedido. El motivo es:');
    router.push(`/chat/${orderId}?prefill=${message}` as any);
  };

  const handleCallBusiness = () => {
    // This would open phone dialer - for now just show info
    Alert.alert(
      'Llamar al negocio',
      'Funcion de llamada disponible proximamente.\nUsa el chat para contactar al negocio.',
      [{ text: 'OK' }]
    );
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
    if (status === 'accepted') return Colors.accent;
    if (status === 'preparing') return Colors.warning;
    if (status === 'ready' || status === 'assigned') return Colors.primary;
    if (status === 'delivered') return Colors.success;
    if (status === 'cancelled') return Colors.error;
    return Colors.text.secondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando orden...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Orden no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Order already cancelled
  if (order.status === 'cancelled') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pedido Cancelado</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.centeredContent}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Pedido Cancelado</Text>

          <View style={styles.refundCard}>
            <Text style={styles.refundTitle}>Resumen de cancelacion:</Text>
            {order.cancelReason && (
              <View style={styles.refundRow}>
                <Text style={styles.refundLabel}>Motivo:</Text>
                <Text style={styles.refundValue}>{order.cancelReason.split('|')[0].trim()}</Text>
              </View>
            )}
            {compensation && (
              <>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Reembolso:</Text>
                  <Text style={[styles.refundValue, { color: Colors.success }]}>
                    ${compensation.clientRefund.toFixed(2)} MXN
                  </Text>
                </View>
                {compensation.driverAmount > 0 && (
                  <View style={styles.refundRow}>
                    <Text style={styles.refundLabel}>Compensacion repartidor:</Text>
                    <Text style={styles.refundValue}>
                      ${compensation.driverAmount.toFixed(2)} MXN
                    </Text>
                  </View>
                )}
              </>
            )}
            <Text style={styles.refundNote}>
              El negocio te contactara para coordinar el reembolso.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace('/orders/history')}
          >
            <Text style={styles.doneButtonText}>Ver Historial</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Cancelacion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Message */}
        <View style={styles.infoSection}>
          <View style={styles.infoIconBg}>
            <MessageCircle size={40} color={Colors.accent} />
          </View>
          <Text style={styles.infoTitle}>Tu pedido ya fue aceptado</Text>
          <Text style={styles.infoSubtitle}>
            Para cancelar, necesitas comunicarte directamente con el negocio.
            Ellos decidiran si la cancelacion es posible.
          </Text>
        </View>

        {/* Business Info Card */}
        <View style={styles.businessCard}>
          <View style={styles.businessHeader}>
            <Store size={20} color={Colors.primary} />
            <Text style={styles.businessName}>{order.businessName}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado actual:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusLabel(order.status)}
              </Text>
            </View>
          </View>

          {/* Driver info if assigned */}
          {order.driverId && order.driverName && (
            <View style={styles.driverRow}>
              <Truck size={18} color={Colors.secondary} />
              <Text style={styles.driverText}>
                Repartidor: {order.driverName}
              </Text>
            </View>
          )}
        </View>

        {/* Main Action: Open Chat */}
        <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
          <MessageCircle size={24} color={Colors.white} />
          <Text style={styles.chatButtonText}>Abrir Chat con el Negocio</Text>
        </TouchableOpacity>

        {/* Driver Compensation Warning */}
        {order.driverId && compensation && (
          <View style={styles.compensationCard}>
            <View style={styles.compensationHeader}>
              <Truck size={22} color={Colors.warning} />
              <Text style={styles.compensationTitle}>
                Hay un repartidor asignado
              </Text>
            </View>
            <Text style={styles.compensationText}>
              Si el negocio acepta la cancelacion, el repartidor recibira una
              compensacion por su tiempo y traslado.
            </Text>

            <View style={styles.compensationBreakdown}>
              <View style={styles.compensationRow}>
                <Text style={styles.compensationLabel}>Compensacion repartidor:</Text>
                <Text style={styles.compensationAmount}>
                  ~${compensation.driverAmount.toFixed(2)} MXN
                </Text>
              </View>
              <View style={styles.compensationRow}>
                <Text style={styles.compensationLabel}>Tu reembolso estimado:</Text>
                <Text style={[styles.compensationAmount, { color: Colors.success }]}>
                  ~${compensation.clientRefund.toFixed(2)} MXN
                </Text>
              </View>
            </View>

            <Text style={styles.compensationNote}>
              El monto final depende de la decision del negocio
            </Text>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Resumen del pedido</Text>
          {order.items && order.items.map((item, index) => (
            <Text key={index} style={styles.summaryItem}>
              {item.quantity}x {item.name} - ${item.price.toFixed(2)}
            </Text>
          ))}
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Total:</Text>
            <Text style={styles.summaryTotalValue}>${order.total.toFixed(2)} MXN</Text>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backToOrderButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToOrderText}>Volver al Pedido</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.text.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centeredContent: {
    alignItems: 'center',
    paddingTop: 40,
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
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  businessCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
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
    color: Colors.text.primary,
    marginLeft: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
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
    borderTopColor: Colors.border.light,
  },
  driverText: {
    fontSize: 14,
    color: Colors.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: Colors.accent,
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
    color: Colors.white,
  },
  compensationCard: {
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
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
    color: Colors.text.primary,
  },
  compensationText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  compensationBreakdown: {
    backgroundColor: Colors.white,
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
    color: Colors.text.secondary,
  },
  compensationAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  compensationNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  orderSummary: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  summaryItem: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  backToOrderButton: {
    alignItems: 'center',
    padding: 14,
  },
  backToOrderText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  bottomPadding: {
    height: 40,
  },
  // Cancelled state styles
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 24,
  },
  refundCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  refundTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 14,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  refundLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  refundValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  refundNote: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
