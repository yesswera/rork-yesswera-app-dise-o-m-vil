import TouchableSound from '@/components/TouchableSound';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { UtensilsCrossed, ShoppingCart, Package } from 'lucide-react-native';
import type { Order } from '@/constants/types';
import Colors from '@/constants/colors';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  variant?: 'client' | 'driver' | 'business';
}

export default function OrderCard({ order, onPress, variant = 'client' }: OrderCardProps) {
  const getOrderIcon = () => {
    switch (order.type) {
      case 'food':
        return UtensilsCrossed;
      case 'shopping':
        return ShoppingCart;
      case 'delivery':
        return Package;
      default:
        return Package;
    }
  };

  const getOrderTypeName = () => {
    switch (order.type) {
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
      case 'delivered':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      case 'in_transit':
        return Colors.accent;
      case 'accepted':
        return Colors.secondary;
      default:
        return Colors.mediumGray;
    }
  };

  const getStatusLabel = () => {
    switch (order.status) {
      case 'delivered':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'in_transit':
        return 'En Tránsito';
      case 'accepted':
        return 'Aceptada';
      case 'pending':
        return 'Pendiente';
    }
  };

  const formatDate = (date: Date | string) => {
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if valid date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Fecha no disponible';
    }

    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const Icon = getOrderIcon();

  return (
    <TouchableSound
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <View style={[styles.iconContainer, { backgroundColor: `${Colors.primary}15` }]}>
            <Icon size={20} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.orderDetails}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <Text style={styles.orderType}>{getOrderTypeName()}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>Fecha:</Text>
          <Text style={styles.dateValue}>{formatDate(order.createdAt)}</Text>
        </View>
        <Text style={styles.total}>${order.total.toFixed(2)}</Text>
      </View>

      {order.deliveredAt && (
        <View style={styles.deliveredInfo}>
          <Text style={styles.deliveredLabel}>Entregado: </Text>
          <Text style={styles.deliveredDate}>{formatDate(order.deliveredAt)}</Text>
        </View>
      )}
    </TouchableSound>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  orderInfo: {
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
  orderDetails: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  orderType: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  dateContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  total: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  deliveredInfo: {
    flexDirection: 'row' as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  deliveredLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  deliveredDate: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
});
