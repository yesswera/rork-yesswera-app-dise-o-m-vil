import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: LISTA DE RESTAURANTES
// Usa ScreenContainer para diseño unificado con gradiente naranja
// ============================================================================

import {
  View,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Star, Clock, UtensilsCrossed } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { Business } from '@/constants/types';
import { getBusinesses } from '@/services/products';
import EmptyState from '@/components/EmptyState';
import ScreenContainer from '@/components/ScreenContainer';

// ============================================================================
// COLORES EXPLÍCITOS PARA MODO OSCURO
// ============================================================================
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C' },
};

export default function RestaurantsScreen() {
  const router = useRouter();
  const { isDark, colors, space, radius, fonts } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

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

  // Barra de búsqueda como contenido custom del header
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
        placeholder="Buscar restaurantes..."
        placeholderTextColor="rgba(255, 255, 255, 0.6)"
        value={search}
        onChangeText={setSearch}
      />
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="secondary"
        headerIcon={UtensilsCrossed}
        headerTitle="Restaurantes"
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
      headerTitle="Restaurantes"
      headerSubtitle="Encuentra tu comida favorita en Tomatlan"
      headerContent={searchBar}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {filteredBusinesses.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          message={search ? 'No hay negocios que coincidan con tu busqueda' : 'No hay negocios disponibles aun'}
        />
      ) : (
        filteredBusinesses.map((business) => (
          <TouchableSound
            key={business.id}
            style={[styles.businessCard, {
              backgroundColor: theme.card,
              borderRadius: radius.lg,
              marginBottom: space.md,
            }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/food/menu/${business.id}` as any)}
          >
            {business.image ? (
              <Image
                source={{ uri: business.image }}
                style={[styles.businessImage, { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.businessImage, styles.imagePlaceholder, {
                backgroundColor: colors.primary,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
              }]}>
                <ThemedText variant="h2" color="white">{business.name.charAt(0)}</ThemedText>
              </View>
            )}

            <View style={[styles.businessInfo, { padding: space.md }]}>
              <ThemedText variant="subtitle" bold>{business.name}</ThemedText>
              <ThemedText variant="caption" color="secondary" numberOfLines={1}>
                {business.description}
              </ThemedText>

              <View style={[styles.businessMeta, { marginTop: space.sm, gap: space.md }]}>
                <View style={styles.metaItem}>
                  <Star size={14} color={colors.warning} fill={colors.warning} />
                  <ThemedText variant="caption" bold style={{ marginLeft: 4 }}>
                    {business.rating.toFixed(1)}
                  </ThemedText>
                </View>
                <View style={[styles.metaDivider, { backgroundColor: theme.border }]} />
                <View style={styles.metaItem}>
                  <Clock size={14} color={isDark ? '#D6D3D1' : colors.text.secondary} />
                  <ThemedText variant="caption" color="secondary" style={{ marginLeft: 4 }}>
                    {business.deliveryTime}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.tagsContainer, { marginTop: space.sm, gap: space.xs }]}>
                {business.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.tag, {
                    backgroundColor: colors.primary + '15',
                    borderRadius: radius.full,
                    paddingHorizontal: space.sm,
                    paddingVertical: space.xs,
                  }]}>
                    <ThemedText variant="caption" color="accent">{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </TouchableSound>
        ))
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
  businessCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  businessImage: {
    width: '100%',
    height: 150,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessInfo: {},
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {},
});
