import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import Colors from '@/constants/colors';
import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';
import { mockOrders } from '@/mocks/orders';


type FilterType = 'all' | 'delivered' | 'cancelled';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredOrders = mockOrders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const tabs = [
    { id: 'all' as FilterType, label: 'Todas' },
    { id: 'delivered' as FilterType, label: 'Completadas' },
    { id: 'cancelled' as FilterType, label: 'Canceladas' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              filter === tab.id && styles.tabActive,
            ]}
            onPress={() => setFilter(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                filter === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin órdenes"
          message={
            filter === 'all'
              ? 'Aún no has realizado ninguna orden'
              : `No tienes órdenes ${filter === 'delivered' ? 'completadas' : 'canceladas'}`
          }
          actionLabel="Explorar Servicios"
          onActionPress={() => router.push('/')}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/orders/${order.id}` as any)}
              variant="client"
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
});
