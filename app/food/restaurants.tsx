import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ALIMENTOS Y BEBIDAS
// Grid compacto de 2 columnas con filtro de categorias
// ============================================================================

import {
  View,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView as RNScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Star, Clock, UtensilsCrossed } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { Business } from '@/constants/types';
import { getBusinesses } from '@/services/products';
import EmptyState from '@/components/EmptyState';
import ScreenContainer from '@/components/ScreenContainer';
import { useAnalytics } from '@/contexts/analytics';

// ============================================================================
// CATEGORIAS CON NOMBRES LEGIBLES
// ============================================================================
const CATEGORY_LABELS: Record<string, string> = {
  tacos: 'Tacos',
  comida_mexicana: 'Comida',
  mariscos: 'Mariscos',
  pizza: 'Pizza',
  cafe: 'Cafe',
  bebidas: 'Bebidas',
  panaderia: 'Panaderia',
  jugos: 'Jugos',
  loncheria: 'Loncheria',
  pollos: 'Pollos',
  neveria: 'Nieves',
  miscelanea: 'Miscelanea',
  hotdogs: 'Hot Dogs',
  food: 'Comida',
  restaurant: 'Restaurante',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2; // 16px padding each side (ScreenContainer)

export default function RestaurantsScreen() {
  const router = useRouter();
  const { isDark, colors, space, radius, fonts } = useTheme();

  const cardBg = isDark ? '#292524' : '#FFFFFF';
  const borderColor = isDark ? '#44403C' : '#F5F5F4';
  const chipBg = isDark ? '#44403C' : '#F5F5F4';
  const chipActiveBg = isDark ? '#16A34A' : '#16A34A';

  const { trackEvent } = useAnalytics();
  const [search, setSearch] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Extract unique categories from loaded businesses
  const categories = useMemo(() => {
    const cats = new Set(businesses.map(b => b.category));
    return Array.from(cats).sort();
  }, [businesses]);

  // Filter by search + category
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        (business.name || '').toLowerCase().includes(searchLower) ||
        (business.category || '').toLowerCase().includes(searchLower);
      const matchesCategory = !selectedCategory || business.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [businesses, search, selectedCategory]);

  // Search bar in header
  const searchBar = (
    <View style={[styles.searchContainer, {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      height: 48,
    }]}>
      <Search size={20} color="rgba(255, 255, 255, 0.8)" />
      <TextInput
        style={[styles.searchInput, {
          color: '#FFFFFF',
          fontSize: fonts.base,
          marginLeft: space.sm,
        }]}
        placeholder="Buscar negocios..."
        placeholderTextColor="rgba(255, 255, 255, 0.6)"
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          // Debounced search tracking (1.5s after typing stops)
          if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
          if (text.trim().length >= 2) {
            searchTimerRef.current = setTimeout(() => {
              trackEvent('search', { term: text.trim().toLowerCase(), source: 'restaurants', results_count: filteredBusinesses.length });
            }, 1500);
          }
        }}
      />
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="secondary"
        headerIcon={UtensilsCrossed}
        headerTitle="Alimentos y Bebidas"
        headerSubtitle="Cargando..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={UtensilsCrossed}
      headerTitle="Alimentos y Bebidas"
      headerSubtitle="Todo lo que necesitas en Tomatlan"
      headerContent={searchBar}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Category filter chips */}
      {categories.length > 1 && (
        <RNScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
          style={styles.chipContainer}
        >
          <TouchableSound
            style={[styles.chip, {
              backgroundColor: selectedCategory === null ? chipActiveBg : chipBg,
              borderColor: selectedCategory === null ? chipActiveBg : borderColor,
            }]}
            onPress={() => setSelectedCategory(null)}
          >
            <ThemedText
              variant="caption"
              bold
              style={{ color: selectedCategory === null ? '#FFFFFF' : (isDark ? '#D6D3D1' : '#57534E') }}
            >
              Todos
            </ThemedText>
          </TouchableSound>
          {categories.map((cat) => (
            <TouchableSound
              key={cat}
              style={[styles.chip, {
                backgroundColor: selectedCategory === cat ? chipActiveBg : chipBg,
                borderColor: selectedCategory === cat ? chipActiveBg : borderColor,
              }]}
              onPress={() => {
              const newCat = selectedCategory === cat ? null : cat;
              setSelectedCategory(newCat);
              trackEvent('category_filter', { category: newCat || 'all', source: 'restaurants' });
            }}
            >
              <ThemedText
                variant="caption"
                bold
                style={{ color: selectedCategory === cat ? '#FFFFFF' : (isDark ? '#D6D3D1' : '#57534E') }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </ThemedText>
            </TouchableSound>
          ))}
        </RNScrollView>
      )}

      {/* Business grid */}
      {filteredBusinesses.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin resultados"
          message={search ? 'No hay negocios que coincidan con tu busqueda' : 'No hay negocios disponibles aun'}
        />
      ) : (
        <View style={styles.grid}>
          {filteredBusinesses.map((business) => (
            <TouchableSound
              key={business.id}
              style={[styles.gridCard, {
                backgroundColor: cardBg,
                borderColor: borderColor,
                width: CARD_WIDTH,
              }]}
              activeOpacity={0.8}
              onPress={() => {
                trackEvent('business_view', { business_id: business.id, business_name: business.name, category: business.category });
                router.push(`/food/menu/${business.id}` as any);
              }}
            >
              {/* Image or placeholder */}
              {business.image ? (
                <Image
                  source={{ uri: business.image }}
                  style={styles.gridImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.gridImage, styles.gridImagePlaceholder, {
                  backgroundColor: isDark ? '#44403C' : '#E7E5E4',
                }]}>
                  <ThemedText variant="h2" color="secondary">
                    {(business.name || '?').charAt(0)}
                  </ThemedText>
                </View>
              )}

              {/* Info */}
              <View style={styles.gridInfo}>
                <ThemedText variant="body" bold numberOfLines={1}>
                  {business.name}
                </ThemedText>

                <View style={styles.gridMeta}>
                  <Star size={12} color={colors.warning} fill={colors.warning} />
                  <ThemedText variant="caption" bold style={styles.gridRating}>
                    {business.rating.toFixed(1)}
                  </ThemedText>
                  <Clock size={12} color={isDark ? '#A8A29E' : '#78716C'} />
                  <ThemedText variant="caption" color="secondary" style={styles.gridTime}>
                    {business.deliveryTime}
                  </ThemedText>
                </View>

                <View style={[styles.gridTag, {
                  backgroundColor: (isDark ? '#16A34A' : '#16A34A') + '15',
                }]}>
                  <ThemedText variant="caption" color="accent" style={{ fontSize: 11 }}>
                    {CATEGORY_LABELS[business.category] || business.category}
                  </ThemedText>
                </View>
              </View>
            </TouchableSound>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },

  // Category chips
  chipContainer: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  chipScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Grid layout
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  gridImage: {
    width: '100%',
    height: 100,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridInfo: {
    padding: 10,
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  gridRating: {
    marginRight: 6,
  },
  gridTime: {},
  gridTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
});
