import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { UtensilsCrossed, ShoppingBag, Package, ChevronRight, Store } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { getActiveOrders } from '@/services/orders';
import { Order, OrderStatus } from '@/constants/types';
import Colors from '@/constants/colors';

interface ActiveOrderBannerProps {
  userType: 'cliente' | 'repartidor' | 'negocio';
}

export default function ActiveOrderBanner({ userType }: ActiveOrderBannerProps) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user || !token) {
      setActiveOrder(null);
      setIsLoading(false);
      return;
    }

    const loadActiveOrder = async () => {
      try {
        const orders = await getActiveOrders(user.id);
        if (orders.length > 0) {
          setActiveOrder(orders[0]);
        } else {
          setActiveOrder(null);
        }
      } catch (error) {
        console.error('Error loading active order:', error);
        setActiveOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveOrder();

    const interval = setInterval(loadActiveOrder, 10000);
    return () => clearInterval(interval);
  }, [user, token]);

  if (isLoading || !activeOrder) return null;

  const getTitle = () => {
    if (userType === 'cliente') {
      if (activeOrder.status === 'pending') return 'Orden en proceso';
      if (activeOrder.status === 'confirmed' || activeOrder.status === 'preparing') return 'Preparando tu pedido';
      if (activeOrder.status === 'ready') return 'Buscando repartidor';
      if (activeOrder.status === 'accepted' || activeOrder.status === 'in_transit') return 'En camino';
      return 'Orden activa';
    }

    if (userType === 'repartidor') {
      if (activeOrder.status === 'accepted') return 'Nueva orden asignada';
      if (activeOrder.status === 'in_transit') return 'Entrega en progreso';
      return 'Orden activa';
    }

    if (userType === 'negocio') {
      if (activeOrder.status === 'pending') return 'Nueva orden recibida';
      if (activeOrder.status === 'confirmed' || activeOrder.status === 'preparing') return 'Preparando orden';
      if (activeOrder.status === 'ready') return 'Lista para recoger';
      return 'Orden activa';
    }

    return 'Orden activa';
  };

  const getSubtitle = () => {
    if (userType === 'cliente') {
      return `${activeOrder.orderNumber} • ${activeOrder.businessName || 'Entrega'}`;
    }

    if (userType === 'repartidor') {
      return `${activeOrder.orderNumber} • ${activeOrder.customerName}`;
    }

    if (userType === 'negocio') {
      return `${activeOrder.orderNumber} • ${activeOrder.customerName}`;
    }

    return activeOrder.orderNumber;
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return '⏳ Buscando repartidor...';
      case 'confirmed': return '✅ Orden confirmada';
      case 'preparing': return '👨‍🍳 Preparando';
      case 'ready': return '📦 Lista para recoger';
      case 'accepted': return '🚴 Repartidor asignado';
      case 'in_transit': return '🚴 En camino';
      default: return 'Activa';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return Colors.warning;
      case 'preparing':
      case 'ready':
        return Colors.accent;
      case 'accepted':
      case 'in_transit':
        return Colors.success;
      default:
        return Colors.primary;
    }
  };

  const getIcon = () => {
    if (userType === 'repartidor') {
      return Package;
    }
    if (userType === 'negocio') {
      return Store;
    }
    if (activeOrder.type === 'food') {
      return UtensilsCrossed;
    }
    if (activeOrder.type === 'shopping') {
      return ShoppingBag;
    }
    return Package;
  };

  const handlePress = () => {
    if (userType === 'repartidor') {
      router.push(`/driver/order-details/${activeOrder.id}` as any);
    } else if (userType === 'negocio') {
      router.push(`/business/order-details/${activeOrder.id}` as any);
    } else {
      router.push(`/tracking/${activeOrder.id}` as any);
    }
  };

  const Icon = getIcon();

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Icon size={32} color={Colors.white} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(activeOrder.status) }]} />
          <Text style={styles.statusText}>{getStatusText(activeOrder.status)}</Text>
        </View>
      </View>

      <ChevronRight size={24} color={Colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.white}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: `${Colors.white}90`,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '600' as const,
  },
});
