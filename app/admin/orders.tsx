import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ADMIN ORDERS
// Gestion de ordenes para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  User,
  Store,
  Truck,
  MapPin,
  Phone,
  Filter,
  ShoppingBag,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import {
  getAllOrders,
  getOrderById,
  AdminOrder,
  updateOrderStatus,
  cancelOrder,
} from '@/services/admin';

// ============================================================================
// COLORES EXPLICITOS (modo oscuro)
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

const FIXED_COLORS = {
  primary: '#22C55E',
  accent: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
  secondary: '#F97316',
};

const ORDER_STATUSES = [
  { value: '', label: 'Todos', color: '#57534E' },
  { value: 'pending', label: 'Pendiente', color: FIXED_COLORS.warning },
  { value: 'accepted', label: 'Aceptada', color: FIXED_COLORS.primary },
  { value: 'preparing', label: 'Preparando', color: FIXED_COLORS.primary },
  { value: 'ready', label: 'Lista', color: FIXED_COLORS.accent },
  { value: 'picked_up', label: 'Recogida', color: FIXED_COLORS.accent },
  { value: 'in_transit', label: 'En Camino', color: FIXED_COLORS.accent },
  { value: 'delivered', label: 'Entregada', color: FIXED_COLORS.success },
  { value: 'cancelled', label: 'Cancelada', color: FIXED_COLORS.error },
];

const SERVICE_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'food', label: 'Comida' },
  { value: 'shopping', label: 'Compras' },
  { value: 'delivery', label: 'Paqueteria' },
];

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getAllOrders(
        {
          status: statusFilter || undefined,
          serviceType: serviceFilter || undefined,
        },
        searchQuery || undefined
      );
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las ordenes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, serviceFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleViewOrder = async (order: AdminOrder) => {
    setLoadingDetail(true);
    setDetailModalVisible(true);
    try {
      const fullOrder = await getOrderById(order.id);
      setSelectedOrder(fullOrder);
    } catch (error) {
      console.error('Error loading order:', error);
      setSelectedOrder(order);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    Alert.alert(
      'Cambiar Estado',
      `¿Cambiar estado a "${getStatusLabel(newStatus)}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, newStatus);
              Alert.alert('Exito', 'Estado actualizado');
              setDetailModalVisible(false);
              loadOrders();
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'No se pudo actualizar el estado');
            }
          },
        },
      ]
    );
  };

  const handleCancelOrder = (orderId: string) => {
    Alert.alert(
      'Cancelar Orden',
      '¿Estas seguro de cancelar esta orden?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelOrder(orderId, 'Cancelado por admin');
              Alert.alert('Exito', 'Orden cancelada');
              setDetailModalVisible(false);
              loadOrders();
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'No se pudo cancelar la orden');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const found = ORDER_STATUSES.find((s) => s.value === status);
    return found?.color || theme.textSecondary;
  };

  const getStatusLabel = (status: string) => {
    const found = ORDER_STATUSES.find((s) => s.value === status);
    return found?.label || status;
  };

  const getServiceLabel = (service: string) => {
    const found = SERVICE_TYPES.find((s) => s.value === service);
    return found?.label || service;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  // Stats
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inProgressCount = orders.filter((o) =>
    ['accepted', 'preparing', 'ready', 'picked_up', 'in_transit'].includes(o.status)
  ).length;
  const completedCount = orders.filter((o) => o.status === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando ordenes...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={ShoppingBag}
      headerTitle="Ordenes"
      headerSubtitle="Gestion de pedidos"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.warning }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.accent }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{inProgressCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Proceso</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.success }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{completedCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.error }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{cancelledCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Canceladas</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Search size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar por cliente, negocio o ID..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableSound onPress={() => setSearchQuery('')}>
            <X size={18} color={theme.textSecondary} />
          </TouchableSound>
        )}
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {ORDER_STATUSES.map((status) => (
          <TouchableSound
            key={status.value}
            style={[
              styles.filterButton,
              { backgroundColor: theme.card, borderColor: theme.border },
              statusFilter === status.value && { backgroundColor: status.color, borderColor: status.color },
            ]}
            onPress={() => setStatusFilter(status.value)}
          >
            <Text
              style={[
                styles.filterText,
                { color: theme.textSecondary },
                statusFilter === status.value && styles.filterTextActive,
              ]}
            >
              {status.label}
            </Text>
          </TouchableSound>
        ))}
      </ScrollView>

      {/* Service Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <Filter size={16} color={theme.textSecondary} style={{ marginRight: 8, alignSelf: 'center' }} />
        {SERVICE_TYPES.map((service) => (
          <TouchableSound
            key={service.value}
            style={[
              styles.serviceFilterButton,
              { backgroundColor: theme.cardAlt },
              serviceFilter === service.value && { backgroundColor: FIXED_COLORS.primary },
            ]}
            onPress={() => setServiceFilter(service.value)}
          >
            <Text
              style={[
                styles.serviceFilterText,
                { color: theme.textSecondary },
                serviceFilter === service.value && styles.serviceFilterTextActive,
              ]}
            >
              {service.label}
            </Text>
          </TouchableSound>
        ))}
      </ScrollView>

      {/* Orders List */}
      <View style={styles.ordersList}>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No se encontraron ordenes</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableSound
              key={order.id}
              style={[styles.orderCard, { backgroundColor: theme.card }]}
              onPress={() => handleViewOrder(order)}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <Text style={[styles.orderId, { color: theme.text }]}>#{order.id.slice(0, 8)}</Text>
                  <View style={[styles.serviceBadge, { backgroundColor: theme.cardAlt }]}>
                    <Text style={[styles.serviceText, { color: theme.textSecondary }]}>{getServiceLabel(order.serviceType)}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderBody}>
                <View style={styles.orderRow}>
                  <User size={14} color={theme.textSecondary} />
                  <Text style={[styles.orderText, { color: theme.textSecondary }]}>{order.clientName}</Text>
                </View>
                {order.businessName && (
                  <View style={styles.orderRow}>
                    <Store size={14} color={theme.textSecondary} />
                    <Text style={[styles.orderText, { color: theme.textSecondary }]}>{order.businessName}</Text>
                  </View>
                )}
                {order.driverName && (
                  <View style={styles.orderRow}>
                    <Truck size={14} color={theme.textSecondary} />
                    <Text style={[styles.orderText, { color: theme.textSecondary }]}>{order.driverName}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.orderFooter, { borderTopColor: theme.border }]}>
                <View style={styles.orderMeta}>
                  <Clock size={12} color={theme.textMuted} />
                  <Text style={[styles.orderMetaText, { color: theme.textMuted }]}>{formatDateTime(order.createdAt)}</Text>
                </View>
                <View style={styles.orderTotal}>
                  <Text style={[styles.orderTotalText, { color: theme.text }]}>{formatCurrency(order.total)}</Text>
                  <ChevronRight size={16} color={theme.textMuted} />
                </View>
              </View>
            </TouchableSound>
          ))
        )}
      </View>

      {/* Order Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? COLORS.dark.cardAlt : '#F5F5F4' }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableSound onPress={() => setDetailModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableSound>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Detalle de Orden</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingDetail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
            </View>
          ) : selectedOrder ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Status Section */}
              <View style={styles.modalSection}>
                <View style={[styles.statusLarge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                  {selectedOrder.status === 'delivered' ? (
                    <CheckCircle size={24} color={FIXED_COLORS.success} />
                  ) : selectedOrder.status === 'cancelled' ? (
                    <XCircle size={24} color={FIXED_COLORS.error} />
                  ) : (
                    <Package size={24} color={getStatusColor(selectedOrder.status)} />
                  )}
                  <Text style={[styles.statusLargeText, { color: getStatusColor(selectedOrder.status) }]}>
                    {getStatusLabel(selectedOrder.status)}
                  </Text>
                </View>
              </View>

              {/* Order Info */}
              <View style={styles.modalSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Informacion</Text>
                <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>ID:</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{selectedOrder.id.slice(0, 12)}...</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tipo:</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{getServiceLabel(selectedOrder.serviceType)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Fecha:</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(selectedOrder.createdAt)}</Text>
                  </View>
                </View>
              </View>

              {/* Client */}
              <View style={styles.modalSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Cliente</Text>
                <View style={[styles.personCard, { backgroundColor: theme.card }]}>
                  <User size={20} color={FIXED_COLORS.primary} />
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: theme.text }]}>{selectedOrder.clientName}</Text>
                    <View style={styles.personDetail}>
                      <Phone size={12} color={theme.textSecondary} />
                      <Text style={[styles.personDetailText, { color: theme.textSecondary }]}>{selectedOrder.clientPhone || 'Sin telefono'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Business */}
              {selectedOrder.businessName && (
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Negocio</Text>
                  <View style={[styles.personCard, { backgroundColor: theme.card }]}>
                    <Store size={20} color={FIXED_COLORS.success} />
                    <View style={styles.personInfo}>
                      <Text style={[styles.personName, { color: theme.text }]}>{selectedOrder.businessName}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Driver */}
              {selectedOrder.driverName && (
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Repartidor</Text>
                  <View style={[styles.personCard, { backgroundColor: theme.card }]}>
                    <Truck size={20} color={FIXED_COLORS.accent} />
                    <View style={styles.personInfo}>
                      <Text style={[styles.personName, { color: theme.text }]}>{selectedOrder.driverName}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Address */}
              <View style={styles.modalSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Entrega</Text>
                <View style={[styles.addressCard, { backgroundColor: theme.card }]}>
                  <MapPin size={20} color={FIXED_COLORS.accent} />
                  <Text style={[styles.addressText, { color: theme.text }]}>{selectedOrder.deliveryAddress}</Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.modalSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Productos ({selectedOrder.items.length})</Text>
                {selectedOrder.items.map((item, idx) => (
                  <View key={idx} style={[styles.itemRow, { backgroundColor: theme.card }]}>
                    <Text style={[styles.itemQty, { color: theme.textSecondary }]}>{item.quantity}x</Text>
                    <Text style={[styles.itemName, { color: theme.text }]}>{item.productName}</Text>
                    <Text style={[styles.itemPrice, { color: theme.text }]}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Envio:</Text>
                  <Text style={[styles.totalValue, { color: theme.text }]}>{formatCurrency(selectedOrder.deliveryFee)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabelBig, { color: theme.text }]}>Total:</Text>
                  <Text style={[styles.totalValueBig, { color: FIXED_COLORS.primary }]}>{formatCurrency(selectedOrder.total)}</Text>
                </View>
              </View>

              {/* Actions */}
              {!['delivered', 'cancelled'].includes(selectedOrder.status) && (
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Acciones</Text>
                  <View style={styles.actionsGrid}>
                    {selectedOrder.status === 'pending' && (
                      <TouchableSound
                        style={[styles.actionBtn, { backgroundColor: FIXED_COLORS.primary }]}
                        onPress={() => handleStatusChange(selectedOrder.id, 'accepted')}
                      >
                        <CheckCircle size={18} color={FIXED_COLORS.white} />
                        <Text style={styles.actionBtnText}>Aceptar</Text>
                      </TouchableSound>
                    )}
                    {selectedOrder.status === 'accepted' && (
                      <TouchableSound
                        style={[styles.actionBtn, { backgroundColor: FIXED_COLORS.primary }]}
                        onPress={() => handleStatusChange(selectedOrder.id, 'preparing')}
                      >
                        <Package size={18} color={FIXED_COLORS.white} />
                        <Text style={styles.actionBtnText}>Preparando</Text>
                      </TouchableSound>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <TouchableSound
                        style={[styles.actionBtn, { backgroundColor: FIXED_COLORS.accent }]}
                        onPress={() => handleStatusChange(selectedOrder.id, 'ready')}
                      >
                        <CheckCircle size={18} color={FIXED_COLORS.white} />
                        <Text style={styles.actionBtnText}>Lista</Text>
                      </TouchableSound>
                    )}
                    {['ready', 'picked_up', 'in_transit'].includes(selectedOrder.status) && (
                      <TouchableSound
                        style={[styles.actionBtn, { backgroundColor: FIXED_COLORS.success }]}
                        onPress={() => handleStatusChange(selectedOrder.id, 'delivered')}
                      >
                        <CheckCircle size={18} color={FIXED_COLORS.white} />
                        <Text style={styles.actionBtnText}>Entregada</Text>
                      </TouchableSound>
                    )}
                    <TouchableSound
                      style={[styles.actionBtn, { backgroundColor: FIXED_COLORS.error }]}
                      onPress={() => handleCancelOrder(selectedOrder.id)}
                    >
                      <XCircle size={18} color={FIXED_COLORS.white} />
                      <Text style={styles.actionBtnText}>Cancelar</Text>
                    </TouchableSound>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  serviceFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  serviceFilterText: {
    fontSize: 12,
  },
  serviceFilterTextActive: {
    color: '#FFFFFF',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 12,
    padding: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
  },
  serviceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serviceText: {
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderBody: {
    gap: 6,
    marginBottom: 10,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderText: {
    fontSize: 13,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderMetaText: {
    fontSize: 12,
  },
  orderTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTotalText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  statusLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusLargeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 12,
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
  },
  personDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  personDetailText: {
    fontSize: 13,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  itemQty: {
    width: 30,
    fontSize: 13,
    fontWeight: '600',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalLabelBig: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValueBig: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
