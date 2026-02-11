import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: HISTORIAL DE ORDENES
// Pantalla para ver el historial de ordenes del usuario
// Actualizado para usar ScreenContainer
// ============================================================================

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package, PackageX } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Order } from '@/constants/types';
import { getUserOrders } from '@/services/orders';
import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import RatingModal from '@/components/RatingModal';
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

type FilterTab = 'all' | 'delivered' | 'cancelled';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

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
      console.error('Error cargando ordenes:', err);
      setError('No se pudieron cargar las ordenes');
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
    if (order.status === 'delivered' && order.driverId && order.driverName) {
      setRatingOrder(order);
    } else {
      router.push(`/orders/${order.id}` as any);
    }
  };

  const handleRatingSuccess = () => {
    Alert.alert(
      'Gracias!',
      'Tu calificacion ha sido enviada',
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

  const tabs = [
    { id: 'all' as FilterTab, label: 'Todas' },
    { id: 'delivered' as FilterTab, label: 'Completadas' },
    { id: 'cancelled' as FilterTab, label: 'Canceladas' },
  ];

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Package}
        headerTitle="Historial de Ordenes"
        headerSubtitle="Cargando tus ordenes..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando ordenes...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Package}
        headerTitle="Historial de Ordenes"
        headerSubtitle="Ocurrio un problema"
      >
        <ErrorState
          message={error}
          onRetry={() => {
            setIsLoading(true);
            setError(null);
            loadOrders();
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Package}
      headerTitle="Historial de Ordenes"
      headerSubtitle={`${orders.length} ordenes en total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Tabs de filtro */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.card }]}>
        {tabs.map((tab) => (
          <TouchableSound
            key={tab.id}
            style={[
              styles.tab,
              { backgroundColor: theme.cardAlt },
              selectedTab === tab.id && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.textSecondary },
                selectedTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableSound>
        ))}
      </View>

      {/* Lista de ordenes */}
      <View style={styles.ordersContainer}>
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
            title="No hay ordenes"
            message={
              selectedTab === 'all'
                ? 'Aun no tienes ordenes en tu historial'
                : selectedTab === 'delivered'
                ? 'No tienes ordenes completadas'
                : 'No tienes ordenes canceladas'
            }
            actionLabel="Hacer un pedido"
            onActionPress={() => router.push('/' as any)}
          />
        )}
      </View>

      {/* Modal de calificacion */}
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
    fontSize: 16,
    marginTop: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  ordersContainer: {
    flex: 1,
  },
});
