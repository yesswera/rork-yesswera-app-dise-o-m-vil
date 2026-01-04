import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, PackageX } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState, useMemo } from 'react';
import { mockOrders } from '@/mocks/orders';

import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';

type FilterTab = 'all' | 'delivered' | 'cancelled';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');

  const filteredOrders = useMemo(() => {
    if (!user) return [];
    let orders = mockOrders.filter(order => order.clientId === user.id);

    switch (selectedTab) {
      case 'delivered':
        return orders.filter(order => order.status === 'delivered');
      case 'cancelled':
        return orders.filter(order => order.status === 'cancelled');
      default:
        return orders;
    }
  }, [selectedTab, user]);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const tabs = [
    { id: 'all' as FilterTab, label: 'Todas' },
    { id: 'delivered' as FilterTab, label: 'Completadas' },
    { id: 'cancelled' as FilterTab, label: 'Canceladas' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Órdenes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setSelectedTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length > 0 ? (
          <>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => router.push(`/orders/${order.id}` as any)}
                variant="client"
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon={PackageX}
            title="No hay órdenes"
            message={
              selectedTab === 'all'
                ? 'Aún no tienes órdenes en tu historial'
                : selectedTab === 'delivered'
                ? 'No tienes órdenes completadas'
                : 'No tienes órdenes canceladas'
            }
            actionLabel="Hacer un pedido"
            onActionPress={() => router.push('/' as any)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center' as const,
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
