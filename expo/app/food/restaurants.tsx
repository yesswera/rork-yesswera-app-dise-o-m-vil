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
import SectionHeader from '@/components/ui/SectionHeader';
import Pill from '@/components/ui/Pill';
import { supabase } from '@/constants/supabase';
import type { Business } from '@/constants/types';

const { width } = Dimensions.get('window');
const CARD_GAP = DS.space.md;
const CARD_WIDTH = (width - DS.space.lg * 2 - CARD_GAP) / 2;

const CATEGORIES = [
  { key: 'all', label: 'Todos', emoji: '' },
  { key: 'tacos', label: 'Tacos', emoji: '\uD83C\uDF2E' },
  { key: 'mariscos', label: 'Mariscos', emoji: '\uD83E\uDD90' },
  { key: 'pollos', label: 'Pollos', emoji: '\uD83C\uDF57' },
  { key: 'bebidas', label: 'Bebidas', emoji: '\uD83E\uDD64' },
];

const CARD_COLORS = ['#16A34A', '#EA580C', '#2563EB', '#D97706', '#7C3AED'];

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

function RestaurantCard({ biz, index }: { biz: Business; index: number }) {
  const bg = CARD_COLORS[index % CARD_COLORS.length];
  const emoji = categoryEmoji(biz.category);
  const isOpen = biz.isOpen !== false;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, DS.shadow.card, !isOpen && { opacity: 0.5 }]}
      onPress={() => router.push(`/food/menu/${biz.id}` as any)}
    >
      <View style={[styles.cardTop, { backgroundColor: bg }]}>
        {biz.image ? (
          <Image source={{ uri: biz.image }} style={styles.cardImage} />
        ) : (
          <Text style={styles.cardEmoji}>{emoji}</Text>
        )}
        <View style={styles.pillWrap}>
          <Pill
            text={isOpen ? 'Abierto' : 'Cerrado'}
            color={isOpen ? DS.colors.green : '#EF4444'}
          />
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardName} numberOfLines={1}>{biz.name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Feather name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>{biz.rating > 0 ? biz.rating.toFixed(1) : 'Nuevo'}</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Feather name="clock" size={11} color={DS.colors.orange} />
            <Text style={styles.deliveryTime}>{biz.deliveryTime}</Text>
          </View>
        </View>
        <Text style={styles.deliveryFee}>Envio desde $15</Text>
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={DS.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Que se te antoja hoy?"
            placeholderTextColor={DS.colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={DS.colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
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
                {cat.emoji ? <Text style={styles.chipEmoji}>{cat.emoji}</Text> : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section header */}
        <View style={styles.sectionWrap}>
          <SectionHeader
            title="Restaurantes cerca de ti"
            subtitle={`${filtered.length} disponibles`}
          />
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={DS.colors.green} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDD0D'}</Text>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyBody}>Intenta con otro nombre o categoria</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((biz, i) => (
              <RestaurantCard key={biz.id} biz={biz} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.lg, paddingBottom: 40 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
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

  chipsRow: { gap: DS.space.sm, marginBottom: DS.space.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    ...DS.shadow.card,
  },
  chipActive: { backgroundColor: DS.colors.green },
  chipEmoji: { fontSize: 16 },
  chipText: { ...DS.fonts.label, color: DS.colors.dark },
  chipTextActive: { color: '#FFFFFF' },

  sectionWrap: { marginBottom: DS.space.lg },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
  },
  cardTop: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pillWrap: {
    position: 'absolute',
    top: DS.space.xs,
    right: DS.space.xs,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardEmoji: { fontSize: 40 },
  cardBottom: {
    padding: DS.space.md,
    gap: DS.space.xs,
  },
  cardName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...DS.fonts.small,
    color: DS.colors.body,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deliveryTime: {
    ...DS.fonts.small,
    color: DS.colors.orange,
    fontWeight: '600',
  },
  deliveryFee: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
    marginTop: DS.space.xs,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: DS.space.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...DS.fonts.title, color: DS.colors.dark },
  emptyBody: { ...DS.fonts.body, color: DS.colors.muted, textAlign: 'center' },
});
