import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Store, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { Business } from '@/constants/types';
import { getBusinesses } from '@/services/products';
import EmptyState from '@/components/EmptyState';

export default function StoresScreen() {
  const router = useRouter();
  const [stores, setStores] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStores = useCallback(async () => {
    try {
      // Fetch all businesses - shopping stores will have category like 'tienda', 'farmacia', 'supermercado'
      const data = await getBusinesses();
      setStores(data);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStores();
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.content}>
            <Text style={styles.headerText}>
              Selecciona una tienda y crea tu lista de compras
            </Text>

            {stores.length === 0 ? (
              <EmptyState title="Sin tiendas" message="No hay tiendas disponibles aún" />
            ) : (
              stores.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={styles.storeCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/shopping/list/${store.id}` as any)}
                >
                  {store.image ? (
                    <Image
                      source={{ uri: store.image }}
                      style={styles.storeImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.storeImage, styles.imagePlaceholder]}>
                      <Store size={48} color={Colors.text.light} />
                    </View>
                  )}
                  <View style={styles.storeInfo}>
                    <View style={styles.storeHeader}>
                      <Store size={20} color={Colors.secondary} />
                      <Text style={styles.storeType}>{store.category}</Text>
                    </View>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color={Colors.warning} fill={Colors.warning} />
                      <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  storeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  storeImage: {
    width: '100%' as const,
    height: 140,
    backgroundColor: Colors.background.tertiary,
  },
  imagePlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  storeInfo: {
    padding: 16,
  },
  storeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  storeType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
});
