import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: HISTORIAL DE ENTREGAS DEL REPARTIDOR
// Usa ScreenContainer para diseño unificado con soporte de tema
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal, Calendar, Package, X, Download, Star, Clock, MapPin, History } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

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
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    gold: '#EAB308',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    gold: '#EAB308',
  },
};

interface DeliveryHistory {
  id: string;
  orderNumber: string;
  type: 'food' | 'shopping' | 'delivery';
  businessName: string;
  earnings: number;
  rating?: number;
  distance: string;
  duration: string;
  pickupAddress: string;
  deliveryAddress: string;
  completedAt: Date;
  status: 'completed' | 'cancelled';
}

function mapOrderToHistory(order: any): DeliveryHistory {
  // Calculate duration from picked_up_at to delivered_at
  let duration = '-';
  if (order.picked_up_at && order.delivered_at) {
    const pickedUp = new Date(order.picked_up_at).getTime();
    const delivered = new Date(order.delivered_at).getTime();
    const diffMinutes = Math.round((delivered - pickedUp) / 60000);
    if (diffMinutes > 0) {
      duration = `${diffMinutes}`;
    }
  }

  // Calculate distance from pickup/delivery locations if coordinates exist
  let distance = '-';
  if (
    order.pickup_latitude && order.pickup_longitude &&
    order.delivery_latitude && order.delivery_longitude
  ) {
    const R = 6371; // Earth radius in km
    const dLat = ((order.delivery_latitude - order.pickup_latitude) * Math.PI) / 180;
    const dLon = ((order.delivery_longitude - order.pickup_longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((order.pickup_latitude * Math.PI) / 180) *
        Math.cos((order.delivery_latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;
    if (km > 0) {
      distance = km.toFixed(1);
    }
  }

  return {
    id: order.id,
    orderNumber: `YS-${order.order_number || order.id.slice(0, 4).toUpperCase()}`,
    type: order.service_type || 'food',
    businessName: order.businesses?.business_name || 'Pedido',
    earnings: Number(order.delivery_fee) || 0,
    distance,
    duration,
    pickupAddress: order.pickup_address || '',
    deliveryAddress: order.delivery_address || '',
    completedAt: new Date(order.delivered_at || order.cancelled_at || order.created_at),
    status: order.status === 'delivered' ? 'completed' : 'cancelled',
  };
}

type FilterType = 'all' | 'food' | 'shopping' | 'delivery';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export default function DriverHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors, radius, space } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [history, setHistory] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      // First get the driver record for this user
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError || !driver) {
        console.error('Driver not found:', driverError);
        setHistory([]);
        return;
      }

      // Load delivered/cancelled orders for this driver
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, businesses(business_name), order_items(*)')
        .eq('driver_id', driver.id)
        .in('status', ['delivered', 'cancelled'])
        .order('delivered_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading driver history:', ordersError);
        setHistory([]);
        return;
      }

      const mapped = (orders || []).map(mapOrderToHistory);
      setHistory(mapped);
    } catch (error) {
      console.error('loadHistory error:', error);
      setHistory([]);
    }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadHistory();
      setLoading(false);
    };
    init();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    let filtered = history;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      filtered = filtered.filter(item => {
        const itemDate = item.completedAt;
        if (dateFilter === 'today') return isToday(itemDate);
        if (dateFilter === 'yesterday') return isYesterday(itemDate);
        if (dateFilter === 'week') return isThisWeek(itemDate, { locale: es });
        return true;
      });
    }

    return filtered.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  }, [history, searchQuery, typeFilter, dateFilter, statusFilter]);

  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: DeliveryHistory[] } = {};

    filteredHistory.forEach(item => {
      let groupKey = '';
      if (isToday(item.completedAt)) {
        groupKey = 'Hoy';
      } else if (isYesterday(item.completedAt)) {
        groupKey = 'Ayer';
      } else if (isThisWeek(item.completedAt, { locale: es })) {
        groupKey = 'Esta Semana';
      } else {
        groupKey = format(item.completedAt, 'MMMM yyyy', { locale: es });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [filteredHistory]);

  const monthSummary = useMemo(() => {
    const thisMonth = filteredHistory.filter(item => {
      const now = new Date();
      return item.completedAt.getMonth() === now.getMonth() &&
             item.completedAt.getFullYear() === now.getFullYear() &&
             item.status === 'completed';
    });

    const totalDeliveries = thisMonth.length;
    const totalEarned = thisMonth.reduce((sum, item) => sum + item.earnings, 0);
    const totalKm = thisMonth.reduce((sum, item) => {
      const km = parseFloat(item.distance);
      return sum + (isNaN(km) ? 0 : km);
    }, 0);
    const ratingsCount = thisMonth.filter(item => item.rating).length;
    const avgRating = ratingsCount > 0
      ? thisMonth.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingsCount
      : 0;

    return { totalDeliveries, totalEarned, totalKm, avgRating };
  }, [filteredHistory]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'food': return 'Alimentos';
      case 'shopping': return 'Compras';
      case 'delivery': return 'Envio';
      default: return 'Envio';
    }
  };

  const handleExportPDF = () => {
    Alert.alert(
      'Exportar PDF',
      'Se generara un PDF con tu historial de entregas para fines fiscales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Generar', onPress: () => Alert.alert('PDF Generado', 'El archivo se guardo en Descargas') },
      ]
    );
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTypeFilter('all');
    setDateFilter('all');
    setStatusFilter('all');
  };

  // Search bar header content
  const headerContent = (
    <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md }]}>
      <Search size={20} color="rgba(255,255,255,0.8)" />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por negocio o numero..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="rgba(255,255,255,0.6)"
      />
      <TouchableSound onPress={() => setShowFilters(true)}>
        <SlidersHorizontal size={20} color="#FFFFFF" />
      </TouchableSound>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={History}
      headerTitle="Historial de Entregas"
      headerSubtitle="Revisa tus entregas completadas"
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Cargando historial...
          </ThemedText>
        </View>
      ) : Object.keys(groupedHistory).length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={48} color={theme.textMuted} />
          <ThemedText variant="subtitle" bold style={[styles.emptyText, { color: theme.text }]}>
            No hay entregas que mostrar
          </ThemedText>
          <ThemedText variant="body" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Intenta cambiar los filtros
          </ThemedText>
        </View>
      ) : (
        <>
          {Object.entries(groupedHistory).map(([groupKey, items]) => {
            const groupEarnings = items.reduce((sum, item) => sum + item.earnings, 0);
            const groupCount = items.length;

            return (
              <View key={groupKey} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <ThemedText variant="h3" style={{ color: theme.text }}>{groupKey}</ThemedText>
                  <ThemedText variant="body" style={{ color: theme.textSecondary }}>
                    {groupCount} {groupCount === 1 ? 'entrega' : 'entregas'} - ${groupEarnings.toFixed(2)}
                  </ThemedText>
                </View>

                {items.map((item) => (
                  <TouchableSound key={item.id} style={[styles.historyCard, { backgroundColor: theme.card }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.typeTag, { backgroundColor: theme.cardAlt }]}>
                        <ThemedText variant="caption" bold style={{ color: theme.text }}>
                          {getTypeIcon(item.type)}
                        </ThemedText>
                      </View>
                      <ThemedText variant="h3" style={{ color: theme.success }}>${item.earnings.toFixed(2)}</ThemedText>
                    </View>

                    <ThemedText variant="subtitle" bold style={{ color: theme.text }}>{item.businessName}</ThemedText>

                    <View style={styles.cardDetails}>
                      {item.rating && (
                        <View style={styles.detailItem}>
                          <Star size={14} color={theme.gold} />
                          <ThemedText variant="caption" style={{ color: theme.textSecondary }}>{item.rating.toFixed(1)}</ThemedText>
                        </View>
                      )}
                      <View style={styles.detailItem}>
                        <MapPin size={14} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                          {item.distance === '-' ? '-' : `${item.distance} km`}
                        </ThemedText>
                      </View>
                      <View style={styles.detailItem}>
                        <Clock size={14} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                          {item.duration === '-' ? '-' : `${item.duration} min`}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={[styles.addressSection, { backgroundColor: theme.cardAlt }]}>
                      <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                        {item.pickupAddress} - {item.deliveryAddress}
                      </ThemedText>
                    </View>

                    <View style={styles.cardFooter}>
                      <ThemedText variant="caption" bold style={{ color: theme.textSecondary }}>
                        Orden: {item.orderNumber}
                      </ThemedText>
                      <ThemedText variant="caption" style={{ color: theme.textMuted }}>
                        {item.status === 'completed' ? 'Completada' : 'Cancelada'} {format(item.completedAt, 'h:mm a', { locale: es })}
                      </ThemedText>
                    </View>
                  </TouchableSound>
                ))}
              </View>
            );
          })}

          <ScreenCard>
            <View style={styles.summaryHeader}>
              <Calendar size={24} color={colors.primary} />
              <ThemedText variant="h3" style={{ color: theme.text }}>Resumen del Mes</ThemedText>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <ThemedText variant="h2" style={{ color: theme.text }}>{monthSummary.totalDeliveries}</ThemedText>
                <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Entregas</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText variant="h2" style={{ color: theme.text }}>${monthSummary.totalEarned.toFixed(0)}</ThemedText>
                <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Ganado</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText variant="h2" style={{ color: theme.text }}>{monthSummary.avgRating.toFixed(1)}</ThemedText>
                <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Rating</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText variant="h2" style={{ color: theme.text }}>{monthSummary.totalKm.toFixed(0)} km</ThemedText>
                <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Recorrido</ThemedText>
              </View>
            </View>
          </ScreenCard>

          <TouchableSound
            style={[styles.exportButton, { backgroundColor: colors.accent, borderRadius: radius.md }]}
            onPress={handleExportPDF}
          >
            <Download size={20} color="#FFFFFF" />
            <ThemedText variant="label" bold color="white">Exportar PDF para Impuestos</ThemedText>
          </TouchableSound>
        </>
      )}

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText variant="h3" style={{ color: theme.text }}>Filtros</ThemedText>
              <TouchableSound onPress={() => setShowFilters(false)}>
                <X size={24} color={theme.text} />
              </TouchableSound>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.filterSection}>
                <ThemedText variant="label" bold style={{ color: theme.text }}>Fecha</ThemedText>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'Todo' },
                    { value: 'today', label: 'Hoy' },
                    { value: 'yesterday', label: 'Ayer' },
                    { value: 'week', label: 'Esta Semana' },
                    { value: 'month', label: 'Este Mes' },
                  ].map((option) => (
                    <TouchableSound
                      key={option.value}
                      style={[
                        styles.filterOption,
                        { backgroundColor: theme.cardAlt, borderColor: theme.border },
                        dateFilter === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setDateFilter(option.value as DateFilter)}
                    >
                      <ThemedText
                        variant="caption"
                        style={{ color: dateFilter === option.value ? '#FFFFFF' : theme.text }}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableSound>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <ThemedText variant="label" bold style={{ color: theme.text }}>Tipo</ThemedText>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'food', label: 'Alimentos' },
                    { value: 'shopping', label: 'Compras' },
                    { value: 'delivery', label: 'Envios' },
                  ].map((option) => (
                    <TouchableSound
                      key={option.value}
                      style={[
                        styles.filterOption,
                        { backgroundColor: theme.cardAlt, borderColor: theme.border },
                        typeFilter === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setTypeFilter(option.value as FilterType)}
                    >
                      <ThemedText
                        variant="caption"
                        style={{ color: typeFilter === option.value ? '#FFFFFF' : theme.text }}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableSound>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <ThemedText variant="label" bold style={{ color: theme.text }}>Estado</ThemedText>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'completed', label: 'Completadas' },
                    { value: 'cancelled', label: 'Canceladas' },
                  ].map((option) => (
                    <TouchableSound
                      key={option.value}
                      style={[
                        styles.filterOption,
                        { backgroundColor: theme.cardAlt, borderColor: theme.border },
                        statusFilter === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setStatusFilter(option.value as any)}
                    >
                      <ThemedText
                        variant="caption"
                        style={{ color: statusFilter === option.value ? '#FFFFFF' : theme.text }}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableSound>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: theme.border }]}>
              <TouchableSound
                style={[styles.resetButton, { backgroundColor: theme.cardAlt }]}
                onPress={resetFilters}
              >
                <ThemedText variant="label" bold style={{ color: theme.text }}>Resetear</ThemedText>
              </TouchableSound>
              <TouchableSound
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={applyFilters}
              >
                <ThemedText variant="label" bold color="white">Aplicar</ThemedText>
              </TouchableSound>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
  },
  emptySubtext: {
    marginTop: 4,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupHeader: {
    marginBottom: 12,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressSection: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  filterSection: {
    paddingTop: 20,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
