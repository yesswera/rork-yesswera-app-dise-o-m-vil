// ============================================================================
// YESSWERA: RESTAURANTES v2 — Rich cards with distance, popular badge, photos
// Inspired by Uber Eats / Rappi discovery UX
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import Pill from '@/components/ui/Pill';
import { supabase } from '@/constants/supabase';
import type { Business } from '@/constants/types';

const { width } = Dimensions.get('window');
const CARD_GAP = DS.space.md;
const CARD_WIDTH = (width - DS.space.lg * 2 - CARD_GAP) / 2;

const CATEGORIES = [
  { key: 'all', label: 'Todos', emoji: '', icon: 'grid' as const },
  { key: 'tacos', label: 'Tacos', emoji: '\uD83C\uDF2E', icon: undefined },
  { key: 'mariscos', label: 'Mariscos', emoji: '\uD83E\uDD90', icon: undefined },
  { key: 'pollos', label: 'Pollos', emoji: '\uD83C\uDF57', icon: undefined },
  { key: 'bebidas', label: 'Bebidas', emoji: '\uD83E\uDD64', icon: undefined },
  { key: 'pizza', label: 'Pizza', emoji: '\uD83C\uDF55', icon: undefined },
  { key: 'hamburguesas', label: 'Burgers', emoji: '\uD83C\uDF54', icon: undefined },
];

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    tacos: '\uD83C\uDF2E',
    mariscos: '\uD83E\uDD90',
    pollos: '\uD83C\uDF57',
    bebidas: '\uD83E\uDD64',
    food: '\uD83C\uDF7D\uFE0F',
    comida: '\uD83C\uDF72',
    pizza: '\uD83C\uDF55',
    hamburguesas: '\uD83C\uDF54',
    sushi: '\uD83C\uDF63',
    postres: '\uD83C\uDF70',
    cafe: '\u2615',
  };
  return map[cat.toLowerCase()] || '\uD83C\uDF7D\uFE0F';
}

// Simulated distance based on order index (real impl would use geolocation)
function getDistance(index: number): string {
  const distances = ['350m', '500m', '800m', '1.2km', '1.5km', '1.8km', '2.1km', '2.5km', '3.0km'];
  return distances[index % distances.length];
}

function RestaurantCard({ biz, index }: { biz: Business; index: number }) {
  const emoji = categoryEmoji(biz.category);
  const isOpen = biz.isOpen !== false;
  const distance = getDistance(index);
  const isPopular = biz.rating >= 4.5;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, DS.shadow.card, !isOpen && { opacity: 0.55 }]}
      onPress={() => router.push(`/food/menu/${biz.id}` as any)}
      disabled={!isOpen}
    >
      {/* Image area */}
      <View style={styles.cardTop}>
        {biz.image ? (
          <Image source={{ uri: biz.image }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardEmojiWrap, { backgroundColor: DS.colors.orangeLight || '#FFF5EB' }]}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
          </View>
        )}

        {/* Distance badge */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>

        {/* Open/Closed pill */}
        {!isOpen && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Cerrado</Text>
          </View>
        )}
      </View>

      {/* Info area */}
      <View style={styles.cardBottom}>
        <Text style={styles.cardName} numberOfLines={1}>{biz.name}</Text>

        <View style={styles.cardMetaRow}>
          {/* Rating */}
          <View style={styles.ratingChip}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {biz.rating > 0 ? biz.rating.toFixed(1) : 'Nuevo'}
            </Text>
          </View>

          {/* Delivery time */}
          <View style={styles.timeChip}>
            <Feather name="clock" size={10} color={DS.colors.orange} />
            <Text style={styles.timeText}>{biz.deliveryTime}</Text>
          </View>
        </View>

        {/* Delivery fee + popular */}
        <View style={styles.cardFooter}>
          <Text style={styles.deliveryFee}>
            <Feather name="truck" size={10} color={DS.colors.muted} /> Envio $15
          </Text>
          {isPopular && (
            <View style={styles.popularBadge}>
              <Feather name="trending-up" size={9} color={DS.colors.orange} />
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RestaurantsScreen() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false });

      if (error) throw error;

      const mapped: Business[] = (data || []).map((db: any) => {
        const prepTime = db.preparation_time_minutes || 20;
        return {
          id: db.id,
          name: db.business_name,
          description: db.description || '',
          category: db.category || 'food',
          image: db.cover_url || db.logo_url || '',
          logo: db.logo_url || '',
          rating: Number(db.rating_average) || 0,
          deliveryTime: `${prepTime + 10}-${prepTime + 25} min`,
          tags: [db.category || 'Restaurante'].filter(Boolean),
          isOpen: db.is_open ?? true,
        };
      });
      setBusinesses(mapped);
    } catch (err) {
      console.error('fetchRestaurants error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = businesses;
    if (selectedCat !== 'all') {
      list = list.filter((b) =>
        b.category.toLowerCase().includes(selectedCat.toLowerCase())
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [businesses, selectedCat, search]);

  const openCount = filtered.filter((b) => b.isOpen !== false).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar — pill shape */}
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={DS.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar restaurante o platillo..."
            placeholderTextColor={DS.colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={DS.colors.muted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
              <Feather name="sliders" size={16} color={DS.colors.dark} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips — scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCat === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setSelectedCat(cat.key)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                {cat.emoji ? (
                  <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                ) : cat.icon ? (
                  <Feather name={cat.icon} size={14} color={active ? '#FFF' : DS.colors.dark} />
                ) : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Lugares populares cerca de ti</Text>
            <Text style={styles.sectionSubtitle}>
              {openCount} abiertos de {filtered.length} disponibles
            </Text>
          </View>
          <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={DS.colors.orange} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDD0D'}</Text>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyBody}>
              Intenta con otro nombre o categoria
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((biz, i) => (
              <RestaurantCard key={biz.id} biz={biz} index={i} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.lg, paddingBottom: 40 },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.full,
    paddingHorizontal: DS.space.lg,
    height: DS.touch.min,
    gap: DS.space.sm,
    ...DS.shadow.card,
    marginBottom: DS.space.lg,
  },
  searchInput: {
    flex: 1,
    ...DS.fonts.body,
    color: DS.colors.dark,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F5F5F4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chips
  chipsRow: { gap: DS.space.sm, marginBottom: DS.space.xl, paddingRight: DS.space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    ...DS.shadow.card,
  },
  chipActive: { backgroundColor: DS.colors.blue },
  chipEmoji: { fontSize: 16 },
  chipText: { ...DS.fonts.label, color: DS.colors.dark },
  chipTextActive: { color: '#FFFFFF' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DS.space.lg,
  },
  sectionTitle: { ...DS.fonts.section, color: DS.colors.dark },
  sectionSubtitle: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  viewAllBtn: { paddingTop: 4 },
  viewAllText: { ...DS.fonts.label, color: DS.colors.blue },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
  },
  cardTop: {
    height: 110,
    position: 'relative',
    backgroundColor: '#F5F5F4',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardEmojiWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 42 },

  // Distance badge
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: DS.colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DS.radius.full,
  },
  distanceText: {
    ...DS.fonts.tiny,
    color: '#FFF',
    fontWeight: '700',
  },

  // Closed overlay
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: { ...DS.fonts.label, color: '#FFF' },

  // Card bottom
  cardBottom: {
    padding: DS.space.md,
    gap: 6,
  },
  cardName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...DS.fonts.small,
    color: DS.colors.body,
    fontWeight: '600',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    ...DS.fonts.tiny,
    color: DS.colors.orange,
    fontWeight: '600',
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryFee: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DS.radius.full,
    gap: 3,
  },
  popularText: {
    ...DS.fonts.tiny,
    color: DS.colors.orange,
    fontWeight: '700',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: DS.space.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...DS.fonts.title, color: DS.colors.dark },
  emptyBody: { ...DS.fonts.body, color: DS.colors.muted, textAlign: 'center' },
});
