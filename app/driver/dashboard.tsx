import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Package, DollarSign, Star, Clock, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const stats = {
    todayDeliveries: 8,
    todayEarnings: 75.40,
    rating: 4.8,
    totalBalance: 523.20,
  };

  const availableOrders = [
    {
      id: 'ord-001',
      type: 'food',
      businessName: 'Pizza Palace',
      distance: 3.2,
      estimatedTime: 15,
      earnings: 12.50,
      pickupAddress: 'Calle 45 #23-10',
      deliveryAddress: 'Avenida 68 #15-23',
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
    },
    {
      id: 'ord-003',
      type: 'delivery',
      businessName: 'Cliente Directo',
      distance: 7.5,
      estimatedTime: 35,
      earnings: 22.50,
      pickupAddress: 'Calle 100 #20-30',
      deliveryAddress: 'Calle 127 #45-10',
    },
  ];

  const handleAcceptOrder = (orderId: string) => {
    Alert.alert(
      'Aceptar Orden',
      '¿Estás seguro de aceptar esta orden?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: () => {
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Hola, {user?.name || 'Repartidor'}!</Text>
            <Text style={styles.subtitle}>Bienvenido a tu dashboard</Text>
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

          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>Órdenes Disponibles</Text>
            {availableOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderTypeTag}>
                    <Text style={styles.orderTypeText}>
                      {order.type === 'food' ? '🍔 Alimentos' : order.type === 'shopping' ? '🛒 Compras' : '📦 Envío'}
                    </Text>
                  </View>
                  <Text style={styles.earningsText}>${order.earnings}</Text>
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

                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptOrder(order.id)}
                >
                  <Text style={styles.acceptButtonText}>Aceptar Orden</Text>
                </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 32,
  },
  headerContent: {
    marginTop: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
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
  acceptButton: {
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
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
});
