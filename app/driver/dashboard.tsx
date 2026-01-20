import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Package, DollarSign, Star, Clock, MapPin, Wallet, Power, Navigation, MessageCircle, History, User, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { useAnalytics } from '@/contexts/analytics';
import PanicButton from '@/components/PanicButton';
import SurveyPopup from '@/components/SurveyPopup';
import { API_BASE } from '@/constants/api';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { trackEvent, trackPageView, currentSurvey, closeSurvey, submitSurvey } = useAnalytics();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    rating: 0,
    totalBalance: 0,
  });
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);

  // Cargar estadísticas del repartidor
  const loadDriverStats = useCallback(async () => {
    if (!user || !token) return;

    try {
      const response = await fetch(`${API_BASE}/driver/stats/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats({
          todayDeliveries: data.todayDeliveries || 0,
          todayEarnings: data.todayEarnings || 0,
          rating: data.rating || 4.5,
          totalBalance: data.totalBalance || 0,
        });
      }
    } catch {
      console.log('Stats not available, using defaults');
    }
  }, [user, token]);

  // Cargar órdenes disponibles
  const loadAvailableOrders = useCallback(async () => {
    if (!user || !token || !isOnline) {
      setAvailableOrders([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableOrders(data.orders || []);
      }
    } catch {
      // Si no hay endpoint, usar datos de ejemplo cuando está online
      if (isOnline) {
        setAvailableOrders([
          {
            id: 'ord-001',
            type: 'food',
            businessName: 'Pizza Palace',
            distance: 3.2,
            estimatedTime: 15,
            earnings: 12.50,
            pickupAddress: 'Calle 45 #23-10',
            deliveryAddress: 'Avenida 68 #15-23',
            pickupLat: 20.6597,
            pickupLng: -103.3496,
          },
          {
            id: 'ord-002',
            type: 'shopping',
            businessName: 'Supermercado Central',
            distance: 5.1,
            estimatedTime: 25,
            earnings: 18.20,
            pickupAddress: 'Carrera 30 #50-12',
            deliveryAddress: 'Calle 85 #12-34',
            pickupLat: 20.6700,
            pickupLng: -103.3600,
          },
        ]);
      }
    }
  }, [user, token, isOnline]);

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

  const toggleOnlineStatus = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    trackEvent('driver_status_change', { newStatus: newStatus ? 'online' : 'offline' });
    if (newStatus) {
      Alert.alert('En Línea', 'Ahora recibirás órdenes disponibles');
    } else {
      Alert.alert('Desconectado', 'No recibirás nuevas órdenes');
      setAvailableOrders([]);
    }
  };

  const openNavigation = (lat: number, lng: number, label: string) => {
    const url = Platform.select({
      ios: `maps:?daddr=${lat},${lng}&dirflg=d`,
      android: `google.navigation:q=${lat},${lng}`,
    });

    // Intentar abrir Waze primero, luego Google Maps
    Linking.canOpenURL('waze://').then((supported) => {
      if (supported) {
        Linking.openURL(`waze://?ll=${lat},${lng}&navigate=yes`);
      } else {
        Linking.openURL(url || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  const handleViewActiveOrder = () => {
    router.push('/driver/active-order');
  };

  const handleViewWallet = () => {
    router.push('/wallet/index' as any);
  };

  const handleAcceptOrder = (orderId: string) => {
    trackEvent('order_accept_attempt', { orderId });
    Alert.alert(
      'Aceptar Orden',
      '¿Estás seguro de aceptar esta orden?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => trackEvent('order_accept_cancelled', { orderId })
        },
        {
          text: 'Aceptar',
          onPress: () => {
            trackEvent('order_accepted', { orderId });
            router.push(`/tracking/${orderId}` as any);
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.push('/' as any);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SurveyPopup
        survey={currentSurvey!}
        visible={!!currentSurvey}
        onClose={closeSurvey}
        onSubmit={(responses) => submitSurvey(currentSurvey!.id, responses)}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Hola, {user?.name || 'Repartidor'}!</Text>
                <Text style={styles.subtitle}>
                  {isOnline ? 'Recibiendo órdenes' : 'Desconectado'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.onlineToggle, isOnline && styles.onlineToggleActive]}
                onPress={toggleOnlineStatus}
              >
                <Power size={20} color={isOnline ? Colors.white : Colors.text.secondary} />
                <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
                  {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Package size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{stats.todayDeliveries}</Text>
              <Text style={styles.statLabel}>Entregas Hoy</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={24} color={Colors.success} />
              <Text style={styles.statValue}>${stats.todayEarnings}</Text>
              <Text style={styles.statLabel}>Ganancia Hoy</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{stats.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={24} color={Colors.accent} />
              <Text style={styles.statValue}>${stats.totalBalance}</Text>
              <Text style={styles.statLabel}>Balance Total</Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.activeOrderButton]}
              onPress={handleViewActiveOrder}
            >
              <Package size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Orden Activa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.walletButton]}
              onPress={handleViewWallet}
            >
              <Wallet size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Mi Saldo</Text>
            </TouchableOpacity>
          </View>

          <PanicButton />

          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionCard} onPress={() => {
                trackEvent('button_click', { button: 'history' });
                router.push('/driver/history' as any);
              }}>
                <History size={24} color={Colors.primary} />
                <Text style={styles.quickActionText}>Historial</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard} onPress={() => {
                trackEvent('button_click', { button: 'profile' });
                router.push('/driver/profile' as any);
              }}>
                <User size={24} color={Colors.accent} />
                <Text style={styles.quickActionText}>Mi Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard} onPress={() => {
                trackEvent('button_click', { button: 'messages' });
                router.push('/driver/messages' as any);
              }}>
                <MessageCircle size={24} color={Colors.success} />
                <Text style={styles.quickActionText}>Mensajes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard} onPress={() => Alert.alert('Soporte', 'Contacta: soporte@yesswera.com\nTel: 33-1234-5678')}>
                <HelpCircle size={24} color={Colors.warning} />
                <Text style={styles.quickActionText}>Ayuda</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>
              {isOnline ? 'Órdenes Disponibles' : 'Activa tu estado para ver órdenes'}
            </Text>
            {!isOnline && (
              <View style={styles.offlineMessage}>
                <Power size={32} color={Colors.text.light} />
                <Text style={styles.offlineText}>Presiona &quot;EN LÍNEA&quot; arriba para comenzar a recibir órdenes</Text>
              </View>
            )}
            {isOnline && availableOrders.length === 0 && (
              <View style={styles.noOrdersMessage}>
                <Package size={32} color={Colors.text.light} />
                <Text style={styles.noOrdersText}>No hay órdenes disponibles en tu zona</Text>
                <Text style={styles.noOrdersSubtext}>Te notificaremos cuando haya nuevas</Text>
              </View>
            )}
            {isOnline && availableOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderTypeTag}>
                    <Text style={styles.orderTypeText}>
                      {order.type === 'food' ? '🍔 Alimentos' : order.type === 'shopping' ? '🛒 Compras' : '📦 Envío'}
                    </Text>
                  </View>
                  <Text style={styles.earningsText}>${order.earnings?.toFixed(2)}</Text>
                </View>

                <Text style={styles.businessName}>{order.businessName}</Text>

                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={Colors.text.secondary} />
                    <Text style={styles.detailText}>{order.distance} km</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock size={16} color={Colors.text.secondary} />
                    <Text style={styles.detailText}>{order.estimatedTime} min</Text>
                  </View>
                </View>

                <View style={styles.addressSection}>
                  <Text style={styles.addressLabel}>Recogida:</Text>
                  <Text style={styles.addressText}>{order.pickupAddress}</Text>
                  <Text style={styles.addressLabel}>Entrega:</Text>
                  <Text style={styles.addressText}>{order.deliveryAddress}</Text>
                </View>

                <View style={styles.orderActions}>
                  {order.pickupLat && order.pickupLng && (
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() => openNavigation(order.pickupLat, order.pickupLng, order.businessName)}
                    >
                      <Navigation size={18} color={Colors.white} />
                      <Text style={styles.navButtonText}>Navegar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.acceptButton, !order.pickupLat && styles.acceptButtonFull]}
                    onPress={() => handleAcceptOrder(order.id)}
                  >
                    <Text style={styles.acceptButtonText}>Aceptar Orden</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 32,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  onlineToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
  },
  onlineToggleActive: {
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.secondary,
  },
  onlineTextActive: {
    color: Colors.white,
  },
  content: {
    padding: 16,
    marginTop: -16,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  ordersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  orderTypeTag: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderTypeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  earningsText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  orderDetails: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  addressSection: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 2,
    marginTop: 4,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  orderActions: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  navButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  acceptButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  acceptButtonFull: {
    flex: 1,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 8,
  },
  offlineMessage: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 12,
  },
  noOrdersMessage: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  noOrdersText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 12,
  },
  noOrdersSubtext: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  logoutButton: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginBottom: 40,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  actionButtonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeOrderButton: {
    backgroundColor: Colors.primary,
  },
  walletButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
    marginTop: 8,
  },
});
