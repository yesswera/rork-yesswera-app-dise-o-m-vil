import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, MapPin, CheckCircle, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { getUserOrders, acceptOrder } from '@/services/orders';
import { Order } from '@/constants/types';

export default function BusinessOrdersScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user || !token) return;

    try {
      const fetchedOrders = await getUserOrders(user.id, token);
      const businessOrders = fetchedOrders.filter(
        (order) => order.businessId === user.id
      );
      setOrders(businessOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!token) return;

    Alert.prompt(
      'Aceptar Orden',
      '¿Cuántos minutos tardará en preparar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async (prepTime?: string) => {
            try {
              const time = parseInt(prepTime || '20', 10);
              await acceptOrder(orderId, time, token);
              Alert.alert('Éxito', 'Orden aceptada');
              loadOrders();
            } catch (error) {
              console.error('Error accepting order:', error);
              Alert.alert('Error', 'No se pudo aceptar la orden');
            }
          },
        },
      ],
      'plain-text',
      '20'
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      preparing: 'Preparando',
      ready: 'Lista',
      picked_up: 'Recogida',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'pending') return Colors.warning;
    if (status === 'accepted' || status === 'preparing') return Colors.accent;
    if (status === 'ready' || status === 'picked_up') return Colors.primary;
    if (status === 'delivered') return Colors.success;
    if (status === 'cancelled') return Colors.error;
    return Colors.mediumGray;
  };

  const renderOrder = (order: Order) => {
    const isPending = order.status === 'pending';
    const isAccepted = order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready';

    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Orden #{order.id.toString().slice(0, 8)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(order.status)}15` },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.detailText} numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color={Colors.accent} />
            <Text style={styles.detailText}>
              {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {order.items && order.items.length > 0 && (
            <View style={styles.itemsList}>
              <Text style={styles.itemsTitle}>Productos:</Text>
              {order.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  • {item.quantity}x {item.name}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.totalText}>Total: ${order.total.toFixed(2)} MXN</Text>
        </View>

        {isAccepted && order.pickupCode && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Código de Recogida:</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{order.pickupCode}</Text>
            </View>
            <Text style={styles.codeInstruction}>
              Muestra este código al repartidor cuando llegue
            </Text>
          </View>
        )}

        {isPending && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(order.id.toString())}
          >
            <CheckCircle size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Aceptar Orden</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[Colors.secondary, Colors.secondaryDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Órdenes</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <Text style={styles.loadingText}>Cargando órdenes...</Text>
          ) : orders.length === 0 ? (
            <Text style={styles.emptyText}>No hay órdenes</Text>
          ) : (
            orders.map(renderOrder)
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  itemsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 8,
  },
  codeContainer: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  codeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 4,
  },
  codeInstruction: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  acceptButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 40,
  },
});
