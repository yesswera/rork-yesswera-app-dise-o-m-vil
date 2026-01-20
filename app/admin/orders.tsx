import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Search,
  ShoppingBag,
  Package,
  Utensils,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { API_BASE } from '@/constants/api';
import { useAuth } from '@/contexts/auth';
import type { Order, OrderStatus } from '@/constants/types';

interface OrderStats {
  total: number;
  hoy: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

export default function AdminOrdersScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    hoy: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | OrderStatus>('all');

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Password': 'TESTTEST123',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats || stats);
      } else {
        loadMockOrders();
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      loadMockOrders();
    } finally {
      setLoading(false);
    }
  };

  const loadMockOrders = () => {
    const mockOrders: Order[] = [
      {
        id: 1,
        orderNumber: 'YS-2024-0001',
        type: 'food',
        status: 'in_transit',
        createdAt: new Date('2024-01-20T14:30:00'),
        customerId: '1',
        customerName: 'Juan Pérez',
        customerPhone: '33-1234-5678',
        driverId: '2',
        driverName: 'Carlos Mendoza',
        driverPhone: '33-9876-5432',
        businessId: '3',
        businessName: 'Tacos El Güero',
        subtotal: 180,
        deliveryFee: 35,
        total: 215,
        deliveryAddress: 'Av. Vallarta 1234, Centro',
        deliveryLocation: { latitude: 20.6597, longitude: -103.3496 },
        rated: false,
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        pickupCode: '1234',
        deliveryCode: '5678',
        pickupValidation: { validated: true, validatedAt: '2024-01-20T14:35:00' },
        deliveryValidation: { validated: false },
      },
      {
        id: 2,
        orderNumber: 'YS-2024-0002',
        type: 'shopping',
        status: 'delivered',
        createdAt: new Date('2024-01-20T12:15:00'),
        deliveredAt: new Date('2024-01-20T13:30:00'),
        customerId: '4',
        customerName: 'María García',
        customerPhone: '33-4444-5678',
        driverId: '2',
        driverName: 'Carlos Mendoza',
        driverPhone: '33-9876-5432',
        businessId: '5',
        businessName: 'Super Central',
        subtotal: 450,
        deliveryFee: 50,
        total: 500,
        deliveryAddress: 'Col. Chapalita, Guadalajara',
        deliveryLocation: { latitude: 20.6857, longitude: -103.3998 },
        rated: true,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        pickupCode: '9876',
        deliveryCode: '4321',
        pickupValidation: { validated: true },
        deliveryValidation: { validated: true },
      },
      {
        id: 3,
        orderNumber: 'YS-2024-0003',
        type: 'delivery',
        status: 'pending',
        createdAt: new Date('2024-01-20T15:00:00'),
        customerId: '1',
        customerName: 'Juan Pérez',
        customerPhone: '33-1234-5678',
        packageDescription: 'Documentos importantes',
        deliveryFee: 80,
        total: 80,
        pickupAddress: 'Plaza del Sol',
        deliveryAddress: 'Av. Américas 1500',
        pickupLocation: { latitude: 20.6534, longitude: -103.4036 },
        deliveryLocation: { latitude: 20.6729, longitude: -103.3769 },
        rated: false,
        paymentMethod: 'transfer',
        paymentStatus: 'paid',
        pickupCode: '1111',
        deliveryCode: '2222',
        pickupValidation: { validated: false },
        deliveryValidation: { validated: false },
      },
      {
        id: 4,
        orderNumber: 'YS-2024-0004',
        type: 'food',
        status: 'cancelled',
        createdAt: new Date('2024-01-20T11:00:00'),
        customerId: '4',
        customerName: 'María García',
        customerPhone: '33-4444-5678',
        businessId: '3',
        businessName: 'Tacos El Güero',
        cancelReason: 'Cliente canceló',
        subtotal: 120,
        deliveryFee: 30,
        total: 150,
        deliveryAddress: 'Col. Providencia',
        deliveryLocation: { latitude: 20.6767, longitude: -103.3876 },
        rated: false,
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        pickupCode: '3333',
        deliveryCode: '4444',
        pickupValidation: { validated: false },
        deliveryValidation: { validated: false },
      },
    ];

    setOrders(mockOrders);
    setStats({
      total: 5834,
      hoy: 127,
      pending: 23,
      inTransit: 45,
      delivered: 5712,
      cancelled: 54,
    });
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.driverName && order.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.businessName && order.businessName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = selectedFilter === 'all' || order.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const getOrderTypeIcon = (type: Order['type']) => {
    switch (type) {
      case 'food':
        return <Utensils size={18} color={Colors.white} />;
      case 'shopping':
        return <Store size={18} color={Colors.white} />;
      case 'delivery':
        return <Package size={18} color={Colors.white} />;
    }
  };

  const getOrderTypeColor = (type: Order['type']) => {
    switch (type) {
      case 'food':
        return Colors.accent;
      case 'shopping':
        return Colors.success;
      case 'delivery':
        return Colors.primary;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return <Clock size={16} color={Colors.warning} />;
      case 'accepted':
      case 'in_transit':
        return <AlertCircle size={16} color={Colors.primary} />;
      case 'delivered':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'cancelled':
        return <XCircle size={16} color={Colors.error} />;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      preparing: 'Preparando',
      ready: 'Lista',
      accepted: 'Aceptada',
      in_transit: 'En tránsito',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return labels[status];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando órdenes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ShoppingBag size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{stats.total.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Órdenes</Text>
            </View>

            <View style={styles.statCard}>
              <Clock size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{stats.hoy}</Text>
              <Text style={styles.statLabel}>Hoy</Text>
            </View>

            <View style={styles.statCard}>
              <AlertCircle size={24} color={Colors.accent} />
              <Text style={styles.statValue}>{stats.inTransit}</Text>
              <Text style={styles.statLabel}>En Tránsito</Text>
            </View>

            <View style={styles.statCard}>
              <CheckCircle size={24} color={Colors.success} />
              <Text style={styles.statValue}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Entregadas</Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por orden, cliente, repartidor..."
              placeholderTextColor={Colors.text.light}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                Todas ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('pending')}
            >
              <Text style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>
                Pendientes ({stats.pending})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'in_transit' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('in_transit')}
            >
              <Text style={[styles.filterText, selectedFilter === 'in_transit' && styles.filterTextActive]}>
                En Tránsito ({stats.inTransit})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'delivered' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('delivered')}
            >
              <Text style={[styles.filterText, selectedFilter === 'delivered' && styles.filterTextActive]}>
                Entregadas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'cancelled' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('cancelled')}
            >
              <Text style={[styles.filterText, selectedFilter === 'cancelled' && styles.filterTextActive]}>
                Canceladas ({stats.cancelled})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <TouchableOpacity key={order.id} style={styles.orderCard}>
                <View style={[styles.orderTypeIcon, { backgroundColor: getOrderTypeColor(order.type) }]}>
                  {getOrderTypeIcon(order.type)}
                </View>

                <View style={styles.orderInfo}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <View style={styles.orderStatus}>
                      {getStatusIcon(order.status)}
                      <Text style={styles.orderStatusText}>{getStatusLabel(order.status)}</Text>
                    </View>
                  </View>

                  {order.businessName && (
                    <Text style={styles.orderBusiness}>🏪 {order.businessName}</Text>
                  )}

                  <View style={styles.orderDetails}>
                    <Text style={styles.orderDetailText}>👤 {order.customerName}</Text>
                    {order.driverName && (
                      <Text style={styles.orderDetailText}>🚗 {order.driverName}</Text>
                    )}
                    <Text style={styles.orderDetailText}>📍 {order.deliveryAddress}</Text>
                  </View>

                  <View style={styles.orderFooter}>
                    <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                    <Text style={styles.orderDate}>
                      {order.createdAt.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={20} color={Colors.text.light} />
              </TouchableOpacity>
            ))}

            {filteredOrders.length === 0 && (
              <View style={styles.emptyState}>
                <ShoppingBag size={48} color={Colors.text.light} />
                <Text style={styles.emptyText}>No se encontraron órdenes</Text>
                <Text style={styles.emptySubtext}>Intenta con otro filtro o búsqueda</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    marginBottom: 16,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  orderTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  orderBusiness: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 6,
  },
  orderDetails: {
    gap: 3,
    marginBottom: 8,
  },
  orderDetailText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  orderDate: {
    fontSize: 11,
    color: Colors.text.light,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.light,
    marginTop: 4,
  },
});
