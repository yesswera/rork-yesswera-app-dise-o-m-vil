// Stores - Lista de tiendas con filtro por categoría
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Store, Star, ArrowLeft, Filter } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { Business } from '@/constants/types';
import { getBusinesses, getBusinessesByCategory } from '@/services/products';
import EmptyState from '@/components/EmptyState';

// Mapeo de categorías a nombres legibles
const CATEGORY_NAMES: Record<string, string> = {
  abarrotes: 'Abarrotes',
  carniceria: 'Carnicería',
  farmacia: 'Farmacia',
  ferreteria: 'Ferretería',
  electronica: 'Electrónica',
  tienda: 'Tienda/Oxxo',
  supermercado: 'Supermercado',
  otros: 'Otros Negocios',
};

export default function StoresScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [stores, setStores] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categoryTitle = category ? CATEGORY_NAMES[category] || category : 'Todas las Tiendas';

  const loadStores = useCallback(async () => {
    try {
      let data: Business[];
      if (category) {
        // Filtrar por categoría
        data = await getBusinessesByCategory(category);
      } else {
        // Todas las tiendas
        data = await getBusinesses();
      }
      setStores(data);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStores();
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header con categoría */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {stores.length} {stores.length === 1 ? 'negocio' : 'negocios'} disponible{stores.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {category && (
          <View style={styles.categoryBadge}>
            <Filter size={14} color={Colors.secondary} />
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Buscando negocios...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.content}>
            {stores.length === 0 ? (
              <EmptyState
                title={category ? `Sin ${categoryTitle.toLowerCase()}` : 'Sin tiendas'}
                message={category
                  ? `No hay negocios de ${categoryTitle.toLowerCase()} disponibles aún. Intenta con otra categoría.`
                  : 'No hay tiendas disponibles aún'
                }
              />
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
                      <Store size={18} color={Colors.secondary} />
                      <Text style={styles.storeType}>{store.category}</Text>
                    </View>
                    <Text style={styles.storeName}>{store.name}</Text>
                    {store.description && (
                      <Text style={styles.storeDescription} numberOfLines={2}>
                        {store.description}
                      </Text>
                    )}
                    <View style={styles.storeFooter}>
                      <View style={styles.ratingContainer}>
                        <Star size={14} color={Colors.warning} fill={Colors.warning} />
                        <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.selectText}>Seleccionar →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Tip si hay filtro */}
            {category && stores.length > 0 && (
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>
                  💡 Selecciona una tienda y escribe tu lista de compras
                </Text>
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  categoryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  storeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  storeImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.background.tertiary,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    padding: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  storeType: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
    textTransform: 'capitalize',
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  storeDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  tipCard: {
    backgroundColor: Colors.accent + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.accent,
    textAlign: 'center',
  },
});
