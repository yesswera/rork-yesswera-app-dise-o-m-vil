import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: DASHBOARD DEL REPARTIDOR
// Usa ScreenContainer para diseño unificado con soporte de tema
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Alert,
  Linking,
  Platform,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Package, DollarSign, Star, Power, MessageCircle, History, User, HelpCircle, AlertTriangle, Truck } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { useAnalytics } from '@/contexts/analytics';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import AccessibilityControls from '@/components/AccessibilityControls';
import PanicModal from '@/components/PanicModal';
import SurveyPopup from '@/components/SurveyPopup';
import { getAvailableOrdersForDriver, assignOrderToDriver } from '@/services/orders';
import { getDriverAllDebts } from '@/services/driver-debt';
import { supabase } from '@/constants/supabase';
import { Order, DriverDebtSummary } from '@/constants/types';
import { useDriverOrderSubscription } from '@/hooks/useRealtimeOrders';
import { useDriverMonitoring } from '@/hooks/useDriverMonitoring';
import { Toast } from '@/utils/toast';
import { OrderSounds, SoundFeedback, AuthSounds } from '@/services/sounds';

// Theme colors via useTheme() — no local COLORS needed

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, space, radius, isDark } = useTheme();
  const { trackEvent, trackPageView, currentSurvey, closeSurvey, submitSurvey } = useAnalytics();

  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    rating: 0,
    totalBalance: 0,
  });
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debtAlerts, setDebtAlerts] = useState<DriverDebtSummary[]>([]);

  // GPS Monitoring hook
  const { isTracking, goOnline, goOffline } = useDriverMonitoring({
    driverId: driverId || '',
    orderId: activeOrderId || undefined,
    enabled: !!driverId,
    onAlert: (alert) => console.log('Driver alert:', alert),
  });

  // Load driver record ID and active order
  useEffect(() => {
    const loadDriverData = async () => {
      if (!user) return;
      try {
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (driver) {
          setDriverId(driver.id);

          const { data: activeOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('driver_id', driver.id)
            .in('status', ['assigned', 'driver_verified', 'in_transit', 'arrived'])
            .maybeSingle();

          if (activeOrder) {
            setActiveOrderId(activeOrder.id);
          }
        }
      } catch {
        console.log('Driver record not found');
      }
    };
    loadDriverData();
  }, [user]);

  // Prevenir boton atras
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Cerrar Sesion', 'Quieres cerrar sesion?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesion', style: 'destructive', onPress: handleLogout },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // Realtime subscription
  useDriverOrderSubscription(
    isOnline ? driverId : null,
    () => {
      OrderSounds.newOrder(); // Sound when new order is available
      loadAvailableOrders();
      loadDriverStats();
    },
    () => { loadAvailableOrders(); }
  );

  const loadDriverStats = useCallback(async () => {
    if (!user || !driverId) return;
    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('rating_average')
        .eq('id', driverId)
        .single();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total, delivery_fee')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('delivered_at', today.toISOString());

      const deliveries = todayOrders?.length || 0;
      const earnings = todayOrders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;

      setStats({
        todayDeliveries: deliveries,
        todayEarnings: earnings,
        rating: driver?.rating_average || 0,
        totalBalance: earnings,
      });

      // Load debt alerts (> 70% of limit)
      try {
        const allDebts = await getDriverAllDebts(driverId);
        setDebtAlerts(allDebts.filter(d => d.percentUsed >= 70));
      } catch {
        // Non-critical
      }
    } catch {
      console.log('Stats not available');
    }
  }, [user, driverId]);

  const loadAvailableOrders = useCallback(async () => {
    if (!user || !isOnline) {
      setAvailableOrders([]);
      return;
    }
    try {
      const orders = await getAvailableOrdersForDriver(driverId || undefined);
      setAvailableOrders(orders);

      // Auto-navigate to active order if one was just assigned to us
      const assignedToMe = orders.find(o => o.status === 'assigned' && o.driverId === driverId);
      if (assignedToMe && !activeOrderId) {
        OrderSounds.newOrder();
        setActiveOrderId(assignedToMe.id.toString());
        Alert.alert(
          'Orden Asignada',
          `Se te asigno una orden de ${assignedToMe.businessName || 'un negocio'}. Total: $${assignedToMe.total?.toFixed(2)} MXN`,
          [
            { text: 'Ver Orden', onPress: () => router.push('/driver/active-order' as any) },
            { text: 'OK' },
          ]
        );
      }
    } catch {
      setAvailableOrders([]);
    }
  }, [user, isOnline, driverId, activeOrderId]);

  useEffect(() => {
    trackPageView('driver_dashboard', { status: isOnline ? 'online' : 'offline' });
    loadDriverStats();
    const interval = setInterval(loadDriverStats, 30000);
    return () => clearInterval(interval);
  }, [loadDriverStats, trackPageView, isOnline]);

  useEffect(() => {
    loadAvailableOrders();
    if (isOnline) {
      const interval = setInterval(loadAvailableOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [loadAvailableOrders, isOnline]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDriverStats(), loadAvailableOrders()]);
    setRefreshing(false);
  }, [loadDriverStats, loadAvailableOrders]);

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    trackEvent('driver_status_change', { newStatus: newStatus ? 'online' : 'offline' });

    if (newStatus) {
      try {
        await goOnline();
        setIsOnline(true);
        AuthSounds.login(); // Sound when driver goes online
        Toast.success('Ahora estas EN LINEA - GPS activo');
      } catch {
        SoundFeedback.error(); // Sound on error
        Toast.error('Error al activar GPS');
        return;
      }
    } else {
      if (activeOrderId) {
        Alert.alert(
          'Tienes una orden activa',
          'No puedes desconectarte mientras tienes una orden en curso.',
          [
            { text: 'Ver Orden Activa', onPress: () => router.push('/driver/active-order' as any) },
            { text: 'Entendido', style: 'cancel' },
          ]
        );
        return;
      }

      try {
        await goOffline();
        setIsOnline(false);
        setAvailableOrders([]);
        AuthSounds.logout(); // Sound when driver goes offline
        Toast.info('Desconectado - GPS detenido');
      } catch (error) {
        SoundFeedback.error(); // Sound on error
        console.error('Error going offline:', error);
      }
    }
  };

  const handleAcceptOrder = (orderId: string) => {
    trackEvent('order_accept_attempt', { orderId });
    Alert.alert('Aceptar Orden', 'Estas seguro de aceptar esta orden?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aceptar',
        onPress: async () => {
          try {
            if (!driverId) {
              SoundFeedback.error(); // Sound on error
              Alert.alert('Error', 'No se encontro tu registro de repartidor');
              return;
            }
            await assignOrderToDriver(orderId, driverId);
            setActiveOrderId(orderId);
            OrderSounds.accepted(); // Sound when order is accepted
            trackEvent('order_accepted', { orderId });
            loadAvailableOrders();
            router.push('/driver/active-order' as any);
          } catch (error) {
            SoundFeedback.error(); // Sound on error
            Alert.alert('Error', 'No se pudo aceptar la orden');
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    if (activeOrderId) {
      Alert.alert(
        'Tienes una orden activa',
        'No puedes cerrar sesion mientras tienes una orden en curso.',
        [
          { text: 'Ver Orden Activa', onPress: () => router.push('/driver/active-order' as any) },
          { text: 'Entendido', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert('Cerrar Sesion', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          if (isOnline) await goOffline();
          await logout();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  // Custom header content with online toggle
  const headerContent = (
    <View style={styles.headerContentContainer}>
      <View style={styles.accessibilityRow}>
        <AccessibilityControls variant="minimal" />
      </View>
      <View style={styles.headerTop}>
        <View>
          <ThemedText variant="body" style={styles.headerSubtitleText}>
            {isOnline
              ? isTracking ? 'GPS activo - Recibiendo ordenes' : 'Conectando GPS...'
              : 'Desconectado'}
          </ThemedText>
        </View>
        <TouchableSound
          style={[
            styles.onlineToggle,
            {
              backgroundColor: isOnline ? colors.success : 'rgba(255,255,255,0.9)',
              borderRadius: radius.full,
            },
          ]}
          onPress={toggleOnlineStatus}
        >
          <Power size={20} color={isOnline ? '#fff' : colors.text.secondary} />
          <ThemedText
            variant="caption"
            color={isOnline ? 'white' : 'secondary'}
            bold
          >
            {isOnline ? 'EN LINEA' : 'OFFLINE'}
          </ThemedText>
        </TouchableSound>
      </View>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Truck}
      headerTitle={`Hola, ${user?.name || 'Repartidor'}!`}
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <PanicModal
        visible={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        driverId={driverId || ''}
        orderId={activeOrderId}
        onTransferRequested={() => {
          setActiveOrderId(null);
          loadAvailableOrders();
        }}
      />

      <SurveyPopup
        survey={currentSurvey!}
        visible={!!currentSurvey}
        onClose={closeSurvey}
        onSubmit={(responses) => submitSurvey(currentSurvey!.id, responses)}
      />

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { gap: space.sm, marginBottom: space.lg }]}>
        {[
          { icon: Package, value: stats.todayDeliveries, label: 'Entregas Hoy', color: colors.primary },
          { icon: DollarSign, value: `$${stats.todayEarnings}`, label: 'Ganancia Hoy', color: colors.success },
          { icon: Star, value: stats.rating.toFixed(1), label: 'Rating', color: colors.warning },
          { icon: DollarSign, value: `$${stats.totalBalance}`, label: 'Balance Total', color: colors.accent },
        ].map((stat, index) => (
          <View
            key={index}
            style={[styles.statCard, {
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: space.md,
            }]}
          >
            <stat.icon size={24} color={stat.color} />
            <ThemedText variant="h3" style={[styles.statValue, { color: colors.text.primary }]}>{stat.value}</ThemedText>
            <ThemedText variant="caption" style={[styles.statLabel, { color: colors.text.secondary }]}>{stat.label}</ThemedText>
          </View>
        ))}
      </View>

      {/* Debt Alert Banners */}
      {debtAlerts.map((debt) => (
        <TouchableSound
          key={debt.businessId}
          style={[styles.debtBanner, {
            backgroundColor: debt.isBlocked ? colors.error + '15' : colors.warning + '15',
            borderColor: debt.isBlocked ? colors.error : colors.warning,
            borderRadius: radius.md,
            padding: space.sm,
            marginBottom: space.sm,
          }]}
          onPress={() => router.push('/driver/debts' as any)}
        >
          <AlertTriangle size={20} color={debt.isBlocked ? colors.error : colors.warning} />
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <ThemedText variant="label" bold style={{ color: debt.isBlocked ? colors.error : colors.warning }}>
              {debt.isBlocked ? 'BLOQUEADO' : 'Deuda alta'}
            </ThemedText>
            <ThemedText variant="caption" style={{ color: colors.text.primary }}>
              Debes ${debt.totalPending.toFixed(0)} a {debt.businessName} ({Math.round(debt.percentUsed)}%)
            </ThemedText>
          </View>
          <ThemedText variant="caption" bold style={{ color: colors.primary }}>Ver</ThemedText>
        </TouchableSound>
      ))}

      {/* Action Buttons */}
      <View style={[styles.actionButtonsRow, { gap: space.sm, marginBottom: space.lg }]}>
        <TouchableSound
          style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: radius.md, padding: space.md }]}
          onPress={() => router.push('/driver/active-order')}
        >
          <Package size={24} color="#fff" />
          <ThemedText variant="label" color="white" bold style={{ marginTop: space.xs }}>
            Orden Activa
          </ThemedText>
        </TouchableSound>

        <TouchableSound
          style={[styles.actionBtn, { backgroundColor: colors.success, borderRadius: radius.md, padding: space.md }]}
          onPress={() => router.push('/driver/earnings' as any)}
        >
          <DollarSign size={24} color="#fff" />
          <ThemedText variant="label" color="white" bold style={{ marginTop: space.xs }}>
            Ganancias
          </ThemedText>
        </TouchableSound>
      </View>

      {/* Panic Button */}
      <TouchableSound
        style={[styles.panicButton, { borderRadius: radius.md, padding: space.md, marginBottom: space.lg }]}
        onPress={() => setShowPanicModal(true)}
      >
        <AlertTriangle size={20} color="#fff" />
        <ThemedText variant="label" color="white" bold>Necesito Ayuda</ThemedText>
      </TouchableSound>

      {/* Quick Actions */}
      <ThemedText variant="title" style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: space.sm }]}>Acciones Rapidas</ThemedText>
      <View style={[styles.quickActionsGrid, { gap: space.sm, marginBottom: space.lg }]}>
        {[
          { icon: History, label: 'Historial', color: colors.primary, route: '/driver/history' },
          { icon: User, label: 'Mi Perfil', color: colors.accent, route: '/driver/profile' },
          { icon: DollarSign, label: 'Deudas', color: colors.error, route: '/driver/debts' },
          { icon: MessageCircle, label: 'Mensajes', color: colors.success, route: '/driver/messages' },
        ].map((action, index) => (
          <TouchableSound
            key={index}
            style={[styles.quickActionCard, {
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: space.md,
            }]}
            onPress={() => {
              if (action.route) router.push(action.route as any);
              else Alert.alert('Soporte Yesswera', 'WhatsApp: 322-100-0000\nEmail: soporte@yesswera.com');
            }}
          >
            <action.icon size={24} color={action.color} />
            <ThemedText variant="caption" bold style={[styles.quickActionLabel, { color: colors.text.primary }]}>{action.label}</ThemedText>
          </TouchableSound>
        ))}
      </View>

      {/* Orders Section */}
      <ThemedText variant="title" style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: space.sm }]}>
        {isOnline ? 'Ordenes Disponibles' : 'Activa tu estado para ver ordenes'}
      </ThemedText>

      {!isOnline && (
        <View style={[styles.emptyState, { backgroundColor: colors.background.secondary, borderRadius: radius.md, padding: space.xl }]}>
          <Power size={32} color={colors.text.muted} />
          <ThemedText variant="body" style={[styles.emptyStateText, { color: colors.text.secondary }]}>
            Presiona "EN LINEA" arriba para comenzar a recibir ordenes
          </ThemedText>
        </View>
      )}

      {isOnline && availableOrders.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderRadius: radius.md, padding: space.xl }]}>
          <Package size={32} color={colors.text.muted} />
          <ThemedText variant="subtitle" style={[styles.emptyStateTitle, { color: colors.text.primary }]}>
            No hay ordenes disponibles en tu zona
          </ThemedText>
          <ThemedText variant="caption" style={[styles.emptyStateText, { color: colors.text.secondary }]}>
            Te notificaremos cuando haya nuevas
          </ThemedText>
        </View>
      )}

      {isOnline && availableOrders.map((order) => {
        const isAssignedToMe = order.status === 'assigned' && order.driverId === driverId;
        return (
        <View
          key={order.id}
          style={[styles.orderCard, {
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: space.md,
            marginBottom: space.sm,
            borderLeftWidth: isAssignedToMe ? 4 : 0,
            borderLeftColor: isAssignedToMe ? colors.success : 'transparent',
          }]}
        >
          {isAssignedToMe && (
            <View style={[styles.assignedBadge, { backgroundColor: colors.success + '15', borderRadius: radius.sm, padding: space.xs, marginBottom: space.sm }]}>
              <ThemedText variant="caption" bold style={{ color: colors.success }}>
                ASIGNADA A TI
              </ThemedText>
            </View>
          )}
          <View style={styles.orderHeader}>
            <View style={[styles.orderTypeTag, { backgroundColor: colors.background.secondary, borderRadius: radius.sm, padding: space.xs }]}>
              <ThemedText variant="caption" bold style={{ color: colors.text.primary }}>
                {order.type === 'food' ? 'Alimentos' : order.type === 'shopping' ? 'Compras' : 'Envio'}
              </ThemedText>
            </View>
            <ThemedText variant="title" style={{ color: colors.success }}>${order.deliveryFee?.toFixed(2)}</ThemedText>
          </View>

          <ThemedText variant="subtitle" bold style={[styles.orderBusinessName, { color: colors.text.primary }]}>
            {order.businessName || 'Negocio'}
          </ThemedText>

          <View style={[styles.addressSection, { backgroundColor: colors.background.secondary, borderRadius: radius.sm, padding: space.sm }]}>
            <ThemedText variant="caption" bold style={{ color: colors.text.secondary }}>Recogida:</ThemedText>
            <ThemedText variant="label" style={{ color: colors.text.primary }}>{order.pickupAddress || 'N/A'}</ThemedText>
            <ThemedText variant="caption" bold style={[styles.addressLabel, { color: colors.text.secondary }]}>Entrega:</ThemedText>
            <ThemedText variant="label" style={{ color: colors.text.primary }}>{order.deliveryAddress}</ThemedText>
          </View>

          <ThemedText variant="body" style={[styles.orderTotal, { color: colors.text.primary }]}>
            Total: ${order.total?.toFixed(2)} MXN
          </ThemedText>

          <TouchableSound
            style={[styles.acceptButton, { backgroundColor: isAssignedToMe ? colors.success : colors.primary, borderRadius: radius.md, padding: space.md }]}
            onPress={() => {
              if (isAssignedToMe) {
                setActiveOrderId(order.id.toString());
                router.push('/driver/active-order' as any);
              } else {
                handleAcceptOrder(order.id.toString());
              }
            }}
          >
            <ThemedText variant="label" color="white" bold center>
              {isAssignedToMe ? 'Ir a Orden' : 'Aceptar Orden'}
            </ThemedText>
          </TouchableSound>
        </View>
        );
      })}

      {/* Logout */}
      <TouchableSound
        style={[styles.logoutButton, {
          borderColor: colors.error,
          borderRadius: radius.md,
          padding: space.md,
          marginVertical: space.xl,
        }]}
        onPress={handleLogout}
      >
        <ThemedText variant="body" color="error" bold center>Cerrar Sesion</ThemedText>
      </TouchableSound>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContentContainer: {
    marginTop: 12,
  },
  accessibilityRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    marginTop: 8,
  },
  statLabel: {
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  panicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionLabel: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    marginTop: 8,
    textAlign: 'center',
  },
  orderCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  assignedBadge: {
    alignItems: 'center',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTypeTag: {},
  orderBusinessName: {
    marginVertical: 8,
  },
  addressSection: {},
  addressLabel: {
    marginTop: 8,
  },
  orderTotal: {
    marginTop: 8,
  },
  acceptButton: {
    marginTop: 12,
  },
  logoutButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  debtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
