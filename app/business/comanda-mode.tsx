import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: MODO COMANDA
// Pantalla simplificada para tablet/segunda sesion
// Usa ScreenContainer para diseno unificado
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  BackHandler,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { X, Clock, CheckCircle, Package, Bell, Volume2, VolumeX, Receipt } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { getBusinessOrders, acceptOrder, updateOrderStatus } from '@/services/orders';
import { markOrderReadyAndAssign } from '@/services/driver-assignment';
import { Order } from '@/constants/types';
import { supabase } from '@/constants/supabase';
import { useBusinessOrderSubscription } from '@/hooks/useRealtimeOrders';

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

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function ComandaModeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

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
          'Volver al dashboard?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', onPress: () => router.back() },
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
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
    if (status === 'pending') return colors.warning;
    if (status === 'accepted') return colors.accent;
    if (status === 'preparing') return colors.primary;
    if (status === 'ready') return colors.success;
    return theme.textMuted;
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
        { backgroundColor: theme.card, borderLeftColor: getStatusColor(order.status) },
      ]}
    >
      {/* Header */}
      <View style={[styles.comandaHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.comandaOrderInfo}>
          <Text style={[styles.comandaNumber, { color: theme.text }]}>#{order.id.toString().slice(0, 6)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>
        <View style={styles.comandaTime}>
          <Clock size={16} color={theme.textSecondary} />
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
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
            <Text style={[styles.itemQuantity, { color: colors.primary }]}>{item.quantity}x</Text>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
          </View>
        ))}
      </View>

      {/* Notas especiales */}
      {order.notes && (
        <View style={[styles.notesContainer, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <Text style={[styles.notesLabel, { color: colors.warning }]}>NOTAS:</Text>
          <Text style={[styles.notesText, { color: theme.text }]}>{order.notes}</Text>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.comandaActions}>
        {order.status === 'pending' && (
          <View style={styles.prepTimeRow}>
            {[10, 15, 20, 30].map((min) => (
              <TouchableSound
                key={min}
                style={[styles.prepTimeButton, { backgroundColor: colors.success }]}
                onPress={() => handleAccept(order.id.toString(), min)}
              >
                <Text style={styles.prepTimeText}>{min} min</Text>
              </TouchableSound>
            ))}
          </View>
        )}

        {order.status === 'accepted' && (
          <TouchableSound
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleStartPreparing(order.id.toString())}
          >
            <Text style={styles.actionButtonText}>COMENZAR A PREPARAR</Text>
          </TouchableSound>
        )}

        {order.status === 'preparing' && (
          <TouchableSound
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => handleMarkReady(order.id.toString())}
          >
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>MARCAR LISTA</Text>
          </TouchableSound>
        )}

        {(order.status === 'ready' || order.status === 'assigned') && (
          <View style={[styles.waitingBadge, { backgroundColor: colors.success + '20' }]}>
            <Package size={20} color={colors.success} />
            <Text style={[styles.waitingText, { color: colors.success }]}>Esperando repartidor</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Header content con controles
  const headerContent = (
    <View style={styles.headerControls}>
      <TouchableSound style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => router.back()}>
        <X size={20} color="#FFFFFF" />
      </TouchableSound>
      <TouchableSound
        style={[styles.soundButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
        onPress={() => setSoundEnabled(!soundEnabled)}
      >
        {soundEnabled ? (
          <Volume2 size={20} color="#FFFFFF" />
        ) : (
          <VolumeX size={20} color="#FFFFFF" />
        )}
      </TouchableSound>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={Receipt}
      headerTitle="Modo Comanda"
      headerSubtitle={`${orders.length} orden${orders.length !== 1 ? 'es' : ''} activa${orders.length !== 1 ? 's' : ''}`}
      headerContent={headerContent}
      scrollEnabled={false}
      keyboardAvoiding={false}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Cargando...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Sin ordenes activas</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Las nuevas ordenes apareceran aqui</Text>
          </View>
        ) : (
          <View style={styles.comandasGrid}>
            {orders.map(renderComanda)}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  comandasGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
  },
  comandaCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 6,
    width: isTablet ? (width - 64) / 2 : '100%',
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
  },
  comandaOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  comandaNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  comandaTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
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
    width: 50,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  notesContainer: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  prepTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
