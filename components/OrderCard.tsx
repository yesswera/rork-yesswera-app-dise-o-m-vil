import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UtensilsCrossed, ShoppingCart, Package, Clock, MapPin } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Order } from '@/constants/types';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  variant?: 'client' | 'driver' | 'business';
}

export default function OrderCard({ order, onPress, variant = 'client' }: OrderCardProps) {
  const getOrderIcon = () => {
    switch (order.orderType) {
      case 'food':
        return UtensilsCrossed;
      case 'shopping':
        return ShoppingCart;
      case 'delivery':
        return Package;
    }
  };

  const getOrderTypeName = () => {
    switch (order.orderType) {
      case 'food':
        return 'Alimentos';
      case 'shopping':
        return 'Compras';
      case 'delivery':
        return 'Envío';
    }
  };

  const getStatusColor = () => {
    switch (order.status) {
      case 'pending':
        return Colors.warning;
      case 'accepted':
        return Colors.accent;
      case 'in_transit':
        return Colors.secondary;
      case 'delivered':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.text.light;
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'pending':
        return 'Pendiente';
      case 'accepted':
        return 'Aceptada';
      case 'in_transit':
        return 'En Tránsito';
      case 'delivered':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return order.status;
    }
  };

  const Icon = getOrderIcon();
  const statusColor = getStatusColor();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${statusColor}15` }]}>
            <Icon size={20} color={statusColor} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.orderId}>Orden #{order.id.slice(0, 8)}</Text>
            <Text style={styles.orderType}>{getOrderTypeName()}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Clock size={16} color={Colors.text.secondary} />
          <Text style={styles.infoText}>
            {new Date(order.createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color={Colors.text.secondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {order.destination.address}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.total}>${order.total.toFixed(2)}</Text>
        <Text style={styles.distance}>{order.distance.toFixed(1)} km</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  orderType: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  info: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  total: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  distance: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
});
