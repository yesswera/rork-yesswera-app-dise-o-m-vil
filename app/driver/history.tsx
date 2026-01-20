import { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, SlidersHorizontal, Calendar, Package, ShoppingBag, Truck, X, Download, Star, Clock, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { format, isToday, isYesterday, isThisWeek, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface DeliveryHistory {
  id: string;
  orderNumber: string;
  type: 'food' | 'shopping' | 'delivery';
  businessName: string;
  earnings: number;
  rating?: number;
  distance: number;
  duration: number;
  pickupAddress: string;
  deliveryAddress: string;
  completedAt: Date;
  status: 'completed' | 'cancelled';
}

const MOCK_HISTORY: DeliveryHistory[] = [
  {
    id: '1',
    orderNumber: 'YS-1234',
    type: 'food',
    businessName: 'Pizza Palace',
    earnings: 45.00,
    rating: 5.0,
    distance: 3.2,
    duration: 18,
    pickupAddress: 'Av. Vallarta #1234',
    deliveryAddress: 'Col. Centro',
    completedAt: new Date(2024, 0, 4, 14, 45),
    status: 'completed',
  },
  {
    id: '2',
    orderNumber: 'YS-1230',
    type: 'shopping',
    businessName: 'Super Central',
    earnings: 32.00,
    rating: 4.5,
    distance: 5.1,
    duration: 25,
    pickupAddress: 'Plaza del Sol',
    deliveryAddress: 'Chapalita',
    completedAt: new Date(2024, 0, 4, 13, 20),
    status: 'completed',
  },
  {
    id: '3',
    orderNumber: 'YS-1228',
    type: 'delivery',
    businessName: 'Envío Express',
    earnings: 28.50,
    rating: 5.0,
    distance: 4.3,
    duration: 20,
    pickupAddress: 'Centro Comercial Andares',
    deliveryAddress: 'Zapopan Centro',
    completedAt: new Date(2024, 0, 4, 12, 10),
    status: 'completed',
  },
  {
    id: '4',
    orderNumber: 'YS-1225',
    type: 'food',
    businessName: 'Tacos El Güero',
    earnings: 38.50,
    rating: 4.8,
    distance: 2.8,
    duration: 15,
    pickupAddress: 'Av. México #890',
    deliveryAddress: 'Col. Americana',
    completedAt: new Date(2024, 0, 4, 11, 30),
    status: 'completed',
  },
  {
    id: '5',
    orderNumber: 'YS-1220',
    type: 'food',
    businessName: 'Sushi Master',
    earnings: 43.50,
    rating: 5.0,
    distance: 6.2,
    duration: 28,
    pickupAddress: 'Av. Patria #456',
    deliveryAddress: 'Col. Providencia',
    completedAt: new Date(2024, 0, 4, 10, 15),
    status: 'completed',
  },
  {
    id: '6',
    orderNumber: 'YS-1215',
    type: 'shopping',
    businessName: 'Farmacia Guadalajara',
    earnings: 25.00,
    distance: 3.5,
    duration: 18,
    pickupAddress: 'Av. López Mateos #1500',
    deliveryAddress: 'Col. Chapalita',
    completedAt: new Date(2024, 0, 3, 18, 45),
    status: 'completed',
  },
  {
    id: '7',
    orderNumber: 'YS-1210',
    type: 'food',
    businessName: 'Burger King',
    earnings: 30.00,
    rating: 4.0,
    distance: 2.1,
    duration: 12,
    pickupAddress: 'Plaza Galerías',
    deliveryAddress: 'Col. Del Valle',
    completedAt: new Date(2024, 0, 3, 17, 30),
    status: 'completed',
  },
  {
    id: '8',
    orderNumber: 'YS-1205',
    type: 'delivery',
    businessName: 'Paquetería Rápida',
    earnings: 35.00,
    rating: 5.0,
    distance: 7.8,
    duration: 32,
    pickupAddress: 'Zona Industrial',
    deliveryAddress: 'Tlaquepaque Centro',
    completedAt: new Date(2024, 0, 3, 15, 20),
    status: 'completed',
  },
];

type FilterType = 'all' | 'food' | 'shopping' | 'delivery';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export default function DriverHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const filteredHistory = useMemo(() => {
    let filtered = MOCK_HISTORY;

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
  }, [searchQuery, typeFilter, dateFilter, statusFilter]);

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
    const totalKm = thisMonth.reduce((sum, item) => sum + item.distance, 0);
    const ratingsCount = thisMonth.filter(item => item.rating).length;
    const avgRating = ratingsCount > 0 
      ? thisMonth.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingsCount 
      : 0;

    return { totalDeliveries, totalEarned, totalKm, avgRating };
  }, [filteredHistory]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'food': return '🍔';
      case 'shopping': return '🛒';
      case 'delivery': return '📦';
      default: return '📦';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'food': return 'Alimentos';
      case 'shopping': return 'Compras';
      case 'delivery': return 'Envío';
      default: return 'Envío';
    }
  };

  const handleExportPDF = () => {
    Alert.alert(
      'Exportar PDF',
      'Se generará un PDF con tu historial de entregas para fines fiscales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Generar', onPress: () => Alert.alert('PDF Generado', 'El archivo se guardó en Descargas') },
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Entregas</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por negocio o número..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.text.light}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <SlidersHorizontal size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedHistory).length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={Colors.text.light} />
            <Text style={styles.emptyText}>No hay entregas que mostrar</Text>
            <Text style={styles.emptySubtext}>Intenta cambiar los filtros</Text>
          </View>
        ) : (
          <>
            {Object.entries(groupedHistory).map(([groupKey, items]) => {
              const groupEarnings = items.reduce((sum, item) => sum + item.earnings, 0);
              const groupCount = items.length;

              return (
                <View key={groupKey} style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{groupKey}</Text>
                    <Text style={styles.groupSubtitle}>
                      {groupCount} {groupCount === 1 ? 'entrega' : 'entregas'} - ${groupEarnings.toFixed(2)}
                    </Text>
                  </View>

                  {items.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.historyCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.typeTag}>
                          <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
                          <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
                        </View>
                        <Text style={styles.earningsText}>${item.earnings.toFixed(2)}</Text>
                      </View>

                      <Text style={styles.businessName}>{item.businessName}</Text>
                      
                      <View style={styles.cardDetails}>
                        {item.rating && (
                          <View style={styles.detailItem}>
                            <Star size={14} color={Colors.gold} fill={Colors.gold} />
                            <Text style={styles.detailText}>{item.rating.toFixed(1)}</Text>
                          </View>
                        )}
                        <View style={styles.detailItem}>
                          <MapPin size={14} color={Colors.text.secondary} />
                          <Text style={styles.detailText}>{item.distance} km</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Clock size={14} color={Colors.text.secondary} />
                          <Text style={styles.detailText}>{item.duration} min</Text>
                        </View>
                      </View>

                      <View style={styles.addressSection}>
                        <Text style={styles.addressFrom}>📍 {item.pickupAddress} → {item.deliveryAddress}</Text>
                      </View>

                      <View style={styles.cardFooter}>
                        <Text style={styles.orderNumber}>Orden: {item.orderNumber}</Text>
                        <Text style={styles.completedTime}>
                          {item.status === 'completed' ? '✅' : '❌'} {format(item.completedAt, 'h:mm a', { locale: es })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Calendar size={24} color={Colors.primary} />
                <Text style={styles.summaryTitle}>Resumen del Mes</Text>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{monthSummary.totalDeliveries}</Text>
                  <Text style={styles.summaryLabel}>Entregas</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>${monthSummary.totalEarned.toFixed(0)}</Text>
                  <Text style={styles.summaryLabel}>Ganado</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{monthSummary.avgRating.toFixed(1)} ⭐</Text>
                  <Text style={styles.summaryLabel}>Rating</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{monthSummary.totalKm.toFixed(0)} km</Text>
                  <Text style={styles.summaryLabel}>Recorrido</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
              <Download size={20} color={Colors.white} />
              <Text style={styles.exportButtonText}>Exportar PDF para Impuestos</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Fecha</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'all', label: 'Todo' },
                  { value: 'today', label: 'Hoy' },
                  { value: 'yesterday', label: 'Ayer' },
                  { value: 'week', label: 'Esta Semana' },
                  { value: 'month', label: 'Este Mes' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterOption, dateFilter === option.value && styles.filterOptionActive]}
                    onPress={() => setDateFilter(option.value as DateFilter)}
                  >
                    <Text style={[styles.filterOptionText, dateFilter === option.value && styles.filterOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tipo</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'all', label: 'Todos', icon: '📦' },
                  { value: 'food', label: 'Alimentos', icon: '🍔' },
                  { value: 'shopping', label: 'Compras', icon: '🛒' },
                  { value: 'delivery', label: 'Envíos', icon: '📦' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterOption, typeFilter === option.value && styles.filterOptionActive]}
                    onPress={() => setTypeFilter(option.value as FilterType)}
                  >
                    <Text style={[styles.filterOptionText, typeFilter === option.value && styles.filterOptionTextActive]}>
                      {option.icon} {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Estado</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'completed', label: 'Completadas' },
                  { value: 'cancelled', label: 'Canceladas' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterOption, statusFilter === option.value && styles.filterOptionActive]}
                    onPress={() => setStatusFilter(option.value as any)}
                  >
                    <Text style={[styles.filterOptionText, statusFilter === option.value && styles.filterOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Resetear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    flex: 1,
    textAlign: 'center' as const,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scrollView: {
    flex: 1,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  groupSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  historyCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  typeTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  earningsText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  cardDetails: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  addressSection: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  addressFrom: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  completedTime: {
    fontSize: 12,
    color: Colors.text.light,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  summaryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%' as const,
    alignItems: 'center' as const,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  exportButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginBottom: 32,
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '80%' as const,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  filterOptionTextActive: {
    color: Colors.white,
  },
  modalActions: {
    flexDirection: 'row' as const,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
