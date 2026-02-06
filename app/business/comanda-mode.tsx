// Modo Comanda - Pantalla simplificada para tablet/segunda sesion
// Solo muestra ordenes entrantes en formato de comanda

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { X, Clock, CheckCircle, Package, Bell, Volume2, VolumeX } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { getBusinessOrders, acceptOrder, updateOrderStatus } from '@/services/orders';
import { markOrderReadyAndAssign } from '@/services/driver-assignment';
import { Order } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { useBusinessOrderSubscription } from '@/hooks/useRealtimeOrders';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function ComandaModeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Realtime subscription
  useBusinessOrderSubscription(businessId, () => {
    loadOrders();
    // Aqui se podria agregar sonido de notificacion
  });

  // Prevenir salir con boton atras
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Salir del Modo Comanda',
          '¿Volver al dashboard?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', onPress: () => router.back() },
          ]
        );
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  const loadOrders = useCallback(async () => {
    if (!user || !businessId) return;

    try {
      const fetchedOrders = await getBusinessOrders(businessId);
      // Filtrar solo ordenes activas (no delivered/cancelled)
      const activeOrders = fetchedOrders.filter(o =>
        !['delivered', 'cancelled'].includes(o.status)
      );
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user, businessId]);

  useEffect(() => {
    const loadBusiness = async () => {
      if (!user) return;
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (business) {
        setBusinessId(business.id);
      }
    };
    loadBusiness();
  }, [user]);

  useEffect(() => {
    if (businessId) {
      loadOrders();
      const interval = setInterval(loadOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [businessId, loadOrders]);

  const handleAccept = async (orderId: string, prepTime: number) => {
    try {
      await acceptOrder(orderId, prepTime);
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'No se pudo aceptar la orden');
    }
  };

  const handleStartPreparing = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'preparing');
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await markOrderReadyAndAssign(orderId);
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como lista');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'pending') return Colors.warning;
    if (status === 'accepted') return Colors.accent;
    if (status === 'preparing') return Colors.primary;
    if (status === 'ready') return Colors.success;
    return Colors.mediumGray;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'NUEVA',
      accepted: 'ACEPTADA',
      preparing: 'PREPARANDO',
      ready: 'LISTA',
      assigned: 'ESPERANDO REPARTIDOR',
      handed_to_driver: 'ENTREGADA',
    };
    return labels[status] || status.toUpperCase();
  };

  const renderComanda = (order: Order) => (
    <View
      key={order.id}
      style={[
        styles.comandaCard,
        { borderLeftColor: getStatusColor(order.status) },
      ]}
    >
      {/* Header */}
      <View style={styles.comandaHeader}>
        <View style={styles.comandaOrderInfo}>
          <Text style={styles.comandaNumber}>#{order.id.toString().slice(0, 6)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>
        <View style={styles.comandaTime}>
          <Clock size={16} color={Colors.text.secondary} />
          <Text style={styles.timeText}>
            {new Date(order.createdAt).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      {/* Items - Lista grande y clara */}
      <View style={styles.comandaItems}>
        {order.items && order.items.map((item, index) => (
          <View key={index} style={styles.comandaItem}>
            <Text style={styles.itemQuantity}>{item.quantity}x</Text>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
        ))}
      </View>

      {/* Notas especiales */}
      {order.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>NOTAS:</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.comandaActions}>
        {order.status === 'pending' && (
          <View style={styles.prepTimeRow}>
            {[10, 15, 20, 30].map((min) => (
              <TouchableOpacity
                key={min}
                style={styles.prepTimeButton}
                onPress={() => handleAccept(order.id.toString(), min)}
              >
                <Text style={styles.prepTimeText}>{min} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {order.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.primary }]}
            onPress={() => handleStartPreparing(order.id.toString())}
          >
            <Text style={styles.actionButtonText}>COMENZAR A PREPARAR</Text>
          </TouchableOpacity>
        )}

        {order.status === 'preparing' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.success }]}
            onPress={() => handleMarkReady(order.id.toString())}
          >
            <CheckCircle size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>MARCAR LISTA</Text>
          </TouchableOpacity>
        )}

        {(order.status === 'ready' || order.status === 'assigned') && (
          <View style={styles.waitingBadge}>
            <Package size={20} color={Colors.success} />
            <Text style={styles.waitingText}>Esperando repartidor</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MODO COMANDA</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} orden{orders.length !== 1 ? 'es' : ''} activa{orders.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.soundButton}
          onPress={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? (
            <Volume2 size={24} color={Colors.white} />
          ) : (
            <VolumeX size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Grid de comandas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Cargando...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={Colors.text.light} />
            <Text style={styles.emptyText}>Sin ordenes activas</Text>
            <Text style={styles.emptySubtext}>Las nuevas ordenes apareceran aqui</Text>
          </View>
        ) : (
          <View style={styles.comandasGrid}>
            {orders.map(renderComanda)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  soundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  comandasGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
  },
  comandaCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 6,
    width: isTablet ? (width - 48) / 2 : '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  comandaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  comandaOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  comandaNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  comandaTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  comandaItems: {
    marginBottom: 12,
  },
  comandaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemQuantity: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    width: 50,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  comandaActions: {
    marginTop: 8,
  },
  prepTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prepTimeButton: {
    flex: 1,
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  prepTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '20',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
});
