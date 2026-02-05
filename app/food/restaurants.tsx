import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Star, Clock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { Business } from '@/constants/types';
import { getBusinesses } from '@/services/products';
import EmptyState from '@/components/EmptyState';

export default function RestaurantsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBusinesses = useCallback(async () => {
    try {
      const data = await getBusinesses();
      setBusinesses(data);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBusinesses();
  };

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.name.toLowerCase().includes(search.toLowerCase()) ||
      business.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar restaurantes..."
            placeholderTextColor={Colors.text.light}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

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
            {filteredBusinesses.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                message={search ? 'No hay negocios que coincidan con tu búsqueda' : 'No hay negocios disponibles aún'}
              />
            ) : (
              filteredBusinesses.map((business) => (
                <TouchableOpacity
                  key={business.id}
                  style={styles.businessCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/food/menu/${business.id}` as any)}
                >
                  {business.image ? (
                    <Image
                      source={{ uri: business.image }}
                      style={styles.businessImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.businessImage, styles.imagePlaceholder]}>
                      <Text style={styles.imagePlaceholderText}>{business.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.name}</Text>
                    <Text style={styles.businessDescription} numberOfLines={1}>
                      {business.description}
                    </Text>
                    <View style={styles.businessMeta}>
                      <View style={styles.metaItem}>
                        <Star size={14} color={Colors.warning} fill={Colors.warning} />
                        <Text style={styles.metaText}>{business.rating.toFixed(1)}</Text>
                      </View>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Clock size={14} color={Colors.text.secondary} />
                        <Text style={styles.metaText}>{business.deliveryTime}</Text>
                      </View>
                    </View>
                    <View style={styles.tagsContainer}>
                      {business.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
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
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
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
    gap: 16,
  },
  businessCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  businessImage: {
    width: '100%' as const,
    height: 180,
    backgroundColor: Colors.background.tertiary,
  },
  imagePlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  imagePlaceholderText: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.text.light,
  },
  businessInfo: {
    padding: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  businessDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  businessMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border.light,
    marginHorizontal: 12,
  },
  metaText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  tagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
});
