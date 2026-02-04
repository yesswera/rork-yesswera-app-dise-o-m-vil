import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, PackageX } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Order } from '@/constants/types';
import { getUserOrders } from '@/services/orders';
import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import RatingModal from '@/components/RatingModal';

type FilterTab = 'all' | 'delivered' | 'cancelled';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user || !token) return;

    try {
      const userOrders = await getUserOrders(user.id);
      setOrders(userOrders);
      setError(null);
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('No se pudieron cargar las órdenes');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order: Order) => {
    // If order is delivered and has a driver, show rating modal
    if (order.status === 'delivered' && order.driverId && order.driverName) {
      setRatingOrder(order);
    } else {
      // Otherwise navigate to order details
      router.push(`/orders/${order.id}` as any);
    }
  };

  const handleRatingSuccess = () => {
    Alert.alert(
      '¡Gracias!',
      'Tu calificación ha sido enviada',
      [{ text: 'OK', onPress: loadOrders }]
    );
  };

  const filteredOrders = useMemo(() => {
    if (!user) return [];

    switch (selectedTab) {
      case 'delivered':
        return orders.filter((order: Order) => order.status === 'delivered');
      case 'cancelled':
        return orders.filter((order: Order) => order.status === 'cancelled');
      default:
        return orders;
    }
  }, [selectedTab, user, orders]);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Órdenes</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando órdenes...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Órdenes</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState message={error} onRetry={() => {
          setIsLoading(true);
          setError(null);
          loadOrders();
        }} />
      </View>
    );
  }

  const tabs = [
    { id: 'all' as FilterTab, label: 'Todas' },
    { id: 'delivered' as FilterTab, label: 'Completadas' },
    { id: 'cancelled' as FilterTab, label: 'Canceladas' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Órdenes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setSelectedTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {filteredOrders.length > 0 ? (
          <>
            {filteredOrders.map((order: Order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => handleOrderPress(order)}
                variant="client"
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon={PackageX}
            title="No hay órdenes"
            message={
              selectedTab === 'all'
                ? 'Aún no tienes órdenes en tu historial'
                : selectedTab === 'delivered'
                ? 'No tienes órdenes completadas'
                : 'No tienes órdenes canceladas'
            }
            actionLabel="Hacer un pedido"
            onActionPress={() => router.push('/' as any)}
          />
        )}
      </ScrollView>

      {ratingOrder && ratingOrder.driverId && ratingOrder.driverName && (
        <RatingModal
          visible={!!ratingOrder}
          orderId={ratingOrder.id.toString()}
          driverId={ratingOrder.driverId}
          driverName={ratingOrder.driverName}
          onClose={() => setRatingOrder(null)}
          onSuccess={handleRatingSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center' as const,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
});
