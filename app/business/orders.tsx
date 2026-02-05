import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, MapPin, CheckCircle, ArrowLeft, ShieldCheck, Package } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { getBusinessOrders, acceptOrder, validateDriverCode, updateOrderStatus } from '@/services/orders';
import { Order } from '@/constants/types';
import { supabase } from '@/constants/supabase';

export default function BusinessOrdersScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverCodeInputs, setDriverCodeInputs] = useState<Record<string, string>>({});
  const [validatingDriver, setValidatingDriver] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user || !token) return;

    try {
      // Get the business record for this user
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!business) {
        console.error('No business found for user');
        setOrders([]);
        return;
      }

      const fetchedOrders = await getBusinessOrders(business.id);
      setOrders(fetchedOrders);
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

    Alert.alert(
      'Aceptar Orden',
      '¿Confirmar aceptación? (Tiempo estimado: 20 min)',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              await acceptOrder(orderId, 20);
              Alert.alert('Éxito', 'Orden aceptada');
              loadOrders();
            } catch (error) {
              console.error('Error accepting order:', error);
              Alert.alert('Error', 'No se pudo aceptar la orden');
            }
          },
        },
      ]
    );
  };

  const handleValidateDriver = async (orderId: string) => {
    const code = driverCodeInputs[orderId]?.trim();
    if (!code || code.length !== 4) {
      Alert.alert('Error', 'Ingresa el código de 4 caracteres del repartidor');
      return;
    }

    setValidatingDriver(orderId);
    try {
      const result = await validateDriverCode(orderId, code);
      if (result.success) {
        Alert.alert(
          'Repartidor Verificado',
          `Código de comanda: ${result.comandaCode}\n\nUsa este código para identificar el pedido.`
        );
        setDriverCodeInputs(prev => ({ ...prev, [orderId]: '' }));
        loadOrders();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo validar el código');
    } finally {
      setValidatingDriver(null);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'ready');
      Alert.alert('Listo', 'Pedido marcado como listo para recoger');
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
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
      ready: 'Lista para recoger',
      assigned: 'Repartidor asignado',
      driver_verified: 'Repartidor verificado',
      in_transit: 'En camino',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'pending') return Colors.warning;
    if (status === 'accepted' || status === 'preparing') return Colors.accent;
    if (status === 'ready' || status === 'assigned') return Colors.primary;
    if (status === 'driver_verified' || status === 'in_transit') return Colors.success;
    if (status === 'delivered') return Colors.success;
    if (status === 'cancelled') return Colors.error;
    return Colors.mediumGray;
  };

  const renderOrder = (order: Order) => {
    const isPending = order.status === 'pending';
    const isAccepted = order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready';

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => router.push(`/business/comanda/${order.id}` as any)}
        activeOpacity={0.7}
      >
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

        {/* Botón: Marcar como lista (accepted → ready) */}
        {(order.status === 'accepted' || order.status === 'preparing') && (
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: Colors.primary }]}
            onPress={() => handleMarkReady(order.id.toString())}
          >
            <Package size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Marcar como Lista</Text>
          </TouchableOpacity>
        )}

        {/* Paso: Verificar repartidor (assigned → driver_verified) */}
        {order.status === 'assigned' && (
          <View style={styles.codeContainer}>
            <ShieldCheck size={24} color={Colors.primary} />
            <Text style={styles.codeLabel}>Verificar Repartidor</Text>
            <Text style={styles.codeInstruction}>
              Pide el código de 4 caracteres al repartidor
            </Text>
            <TextInput
              style={styles.codeInput}
              value={driverCodeInputs[order.id.toString()] || ''}
              onChangeText={(text) =>
                setDriverCodeInputs(prev => ({
                  ...prev,
                  [order.id.toString()]: text.toUpperCase(),
                }))
              }
              placeholder="XXXX"
              placeholderTextColor={Colors.text.secondary}
              maxLength={4}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.verifyButton,
                validatingDriver === order.id.toString() && { opacity: 0.6 },
              ]}
              onPress={() => handleValidateDriver(order.id.toString())}
              disabled={validatingDriver === order.id.toString()}
            >
              <ShieldCheck size={18} color="#fff" />
              <Text style={styles.verifyButtonText}>
                {validatingDriver === order.id.toString() ? 'Validando...' : 'Verificar Código'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mostrar código de comanda después de verificar */}
        {order.status === 'driver_verified' && order.comandaCode && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Código de Comanda:</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{order.comandaCode}</Text>
            </View>
            <Text style={styles.codeInstruction}>
              Repartidor verificado. Entrega el pedido al repartidor.
            </Text>
          </View>
        )}

        {/* Botón: Aceptar orden (pending) */}
        {isPending && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(order.id.toString())}
          >
            <CheckCircle size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Aceptar Orden</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
  codeInput: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: Colors.text.primary,
    marginVertical: 8,
    width: '100%',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 4,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 6,
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
