import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Package, CheckCircle, XCircle } from 'lucide-react-native';
import { DS } from '@/constants/design';
import Pill from '@/components/ui/Pill';
import { getAllOrders, AdminOrder } from '@/services/admin';

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'in_progress', label: 'En proceso' },
  { key: 'delivered', label: 'Entregadas' },
  { key: 'cancelled', label: 'Canceladas' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', accepted: 'Aceptada', preparing: 'Preparando',
  ready: 'Lista', in_transit: 'En camino', delivered: 'Entregada', cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', accepted: DS.colors.green, preparing: DS.colors.green,
  ready: DS.colors.blue, in_transit: DS.colors.blue, delivered: DS.colors.green, cancelled: DS.colors.red,
};

const IN_PROGRESS = ['pending', 'accepted', 'preparing', 'ready', 'in_transit'];

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const loadOrders = useCallback(async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = orders.filter((o) => {
    if (filter === 'in_progress' && !IN_PROGRESS.includes(o.status)) return false;
    if (filter !== 'all' && filter !== 'in_progress' && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.clientName.toLowerCase().includes(q) ||
        (o.businessName || '').toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={DS.colors.green} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={DS.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente o negocio..."
          placeholderTextColor={DS.colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />}
      >
        <Text style={styles.count}>{filtered.length} ordenes</Text>
        {filtered.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardClient}>{order.clientName}</Text>
                <Text style={styles.cardBiz}>{order.businessName || order.serviceType}</Text>
              </View>
              <Pill
                text={STATUS_LABELS[order.status] || order.status}
                color={STATUS_COLORS[order.status] || DS.colors.muted}
              />
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.cardDate}>{formatDate(order.createdAt)} {formatTime(order.createdAt)}</Text>
              <Text style={styles.cardTotal}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Package size={40} color={DS.colors.hairline} />
            <Text style={styles.emptyText}>Sin ordenes</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    margin: DS.space.lg,
    marginBottom: 0,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.lg,
    height: DS.touch.min,
    gap: DS.space.sm,
    ...DS.shadow.card,
  },
  searchInput: { flex: 1, ...DS.fonts.body, color: DS.colors.dark },
  chips: { paddingHorizontal: DS.space.lg, paddingVertical: DS.space.md, gap: DS.space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.card,
    ...DS.shadow.card,
  },
  chipActive: { backgroundColor: DS.colors.green },
  chipText: { ...DS.fonts.label, color: DS.colors.dark },
  chipTextActive: { color: '#FFF' },
  list: { padding: DS.space.lg, paddingBottom: 40 },
  count: { ...DS.fonts.small, color: DS.colors.muted, marginBottom: DS.space.md },
  card: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    marginBottom: DS.space.sm,
    ...DS.shadow.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: DS.space.sm },
  cardClient: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  cardBiz: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: DS.space.md },
  cardDate: { ...DS.fonts.small, color: DS.colors.muted },
  cardTotal: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  empty: { alignItems: 'center', paddingTop: 60, gap: DS.space.md },
  emptyText: { ...DS.fonts.body, color: DS.colors.muted },
});
