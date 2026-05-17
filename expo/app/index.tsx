// ============================================================================
// YESSWERA HOME v3 — Appetite-driven, trust-first, Tomatlan-proud
// Shows real restaurants, food imagery, social proof, local identity
// ============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ShoppingCart, Package, Home, Clock, User, ShoppingBag } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/auth';
import { useCart } from '@/contexts/cart';
import { getActiveOrders } from '@/services/orders';
import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';
import { DS, colorShadow } from '@/constants/design';
import ActiveOrderBanner from '@/components/ui/ActiveOrderBanner';
import YAvatar from '@/components/ui/YAvatar';
import BigButton from '@/components/ui/BigButton';

const { width: SW } = Dimensions.get('window');

const ORDER_STATUS_TEXT: Record<string, string> = {
  pending: 'Esperando confirmacion',
  accepted: 'Orden aceptada',
  preparing: 'Preparando tu orden',
  ready: 'Orden lista',
  assigned: 'Repartidor en camino al negocio',
  driver_verified: 'Repartidor en el negocio',
  handed_to_driver: 'Repartidor tiene tu orden',
  in_transit: 'Tu orden va en camino',
  arrived: 'Repartidor llego, sal a recibir',
};

interface SearchResult {
  id: string;
  type: 'business' | 'product';
  name: string;
  subtitle: string;
  businessId: string;
}

interface NearbyBiz {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  deliveryTime: string;
  isOpen: boolean;
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    tacos: '\uD83C\uDF2E', mariscos: '\uD83E\uDD90', pollos: '\uD83C\uDF57',
    bebidas: '\uD83E\uDD64', pizza: '\uD83C\uDF55', hamburguesas: '\uD83C\uDF54',
    postres: '\uD83C\uDF70', comida: '\uD83C\uDF72', cafe: '\u2615',
  };
  return map[cat?.toLowerCase()] || '\uD83C\uDF7D\uFE0F';
}

// ============================================================================
export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { itemCount } = useCart();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [nearby, setNearby] = useState<NearbyBiz[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Role redirect
  useEffect(() => {
    if (isLoading || !user) return;
    if (user.userType === 'business') router.replace('/business/dashboard' as any);
    else if (user.userType === 'driver') router.replace('/driver/dashboard' as any);
    else if (user.userType === 'admin') router.replace('/admin/dashboard' as any);
  }, [user, isLoading]);

  // Fetch nearby restaurants
  const fetchNearby = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(10);

      if (error) throw error;
      const mapped: NearbyBiz[] = (data || []).map((db: any) => {
        const prep = db.preparation_time_minutes || 20;
        return {
          id: db.id,
          name: db.business_name,
          category: db.category || 'food',
          image: db.cover_url || db.logo_url || '',
          rating: Number(db.rating_average) || 0,
          deliveryTime: `${prep + 10}-${prep + 25}`,
          isOpen: db.is_open ?? true,
        };
      });
      setNearby(mapped);
    } catch {
      setNearby([]);
    } finally {
      setLoadingBiz(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNearby();
      if (!user) { setActiveOrder(null); return; }
      getActiveOrders(user.id)
        .then((orders) => setActiveOrder(orders.length > 0 ? orders[0] : null))
        .catch(() => setActiveOrder(null));
    }, [user])
  );

  // Search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    searchTimer.current = setTimeout(() => performSearch(text.trim()), 300);
  };

  const performSearch = async (query: string) => {
    try {
      const q = `%${query.toLowerCase()}%`;
      const [{ data: biz }, { data: prod }] = await Promise.all([
        supabase.from('businesses').select('id, business_name, category').ilike('business_name', q).limit(4),
        supabase.from('products').select('id, name, price, business_id, businesses:business_id(business_name)').ilike('name', q).eq('available', true).limit(4),
      ]);
      const results: SearchResult[] = [];
      (biz || []).forEach((b) => results.push({ id: b.id, type: 'business', name: b.business_name, subtitle: b.category || 'Restaurante', businessId: b.id }));
      (prod || []).forEach((p: any) => results.push({ id: p.id, type: 'product', name: p.name, subtitle: p.businesses?.business_name || '', businessId: p.business_id }));
      setSearchResults(results.slice(0, 8));
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  };

  const handleResultPress = (r: SearchResult) => {
    setSearchQuery(''); setSearchResults([]);
    router.push(`/food/menu/${r.businessId}` as any);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos dias';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getPrompt = () => {
    const h = new Date().getHours();
    if (h >= 7 && h < 11) return 'Que desayunamos hoy?';
    if (h >= 11 && h < 15) return 'Hora de comer!';
    if (h >= 15 && h < 19) return 'Un antojito?';
    if (h >= 19 && h < 22) return 'Que cenamos?';
    return 'Antojo nocturno?';
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const openBiz = nearby.filter((b) => b.isOpen);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <Animated.View style={[s.header, { opacity: fadeAnim }]}>
          <View style={s.headerLeft}>
            <View style={s.locationRow}>
              <Feather name="map-pin" size={14} color={DS.colors.orange} />
              <Text style={s.locationText}>Tomatlan, Jalisco</Text>
            </View>
            <Text style={s.greeting}>{getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          </View>
          {user ? (
            <TouchableOpacity onPress={() => router.push('/profile' as any)} activeOpacity={0.8}>
              <YAvatar initials={userInitials} size={44} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.loginPill}
              onPress={() => router.push('/login' as any)}
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={16} color={DS.colors.orange} />
              <Text style={s.loginPillText}>Entrar</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Active Order Banner ──────────────────────────────── */}
        {activeOrder && user && (
          <View style={s.bannerWrap}>
            <ActiveOrderBanner
              status={ORDER_STATUS_TEXT[activeOrder.status] || 'Orden activa'}
              onPress={() => router.push(`/tracking/${activeOrder.id}` as any)}
            />
          </View>
        )}

        {/* ── Search ──────────────────────────────────────────── */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Feather name="search" size={20} color={DS.colors.muted} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar restaurante o platillo..."
              placeholderTextColor={DS.colors.placeholder}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color={DS.colors.orange} />}
            {!isSearching && searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Feather name="x" size={18} color={DS.colors.muted} />
              </TouchableOpacity>
            )}
          </View>
          {searchResults.length > 0 && (
            <View style={s.dropdown}>
              {searchResults.map((r) => (
                <TouchableOpacity key={`${r.type}-${r.id}`} style={s.dropItem} onPress={() => handleResultPress(r)}>
                  <Feather name={r.type === 'business' ? 'home' : 'tag'} size={16} color={r.type === 'business' ? DS.colors.green : DS.colors.orange} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.dropName} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.dropSub} numberOfLines={1}>{r.subtitle}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={DS.colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── HERO CTA — Pedir Comida ─────────────────────────── */}
        <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
          <TouchableOpacity
            style={s.hero}
            activeOpacity={0.92}
            onPress={() => router.push('/food/restaurants' as any)}
          >
            <LinearGradient
              colors={['#EA580C', '#F97316', '#FDBA74']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroGrad}
            >
              <View style={s.heroLeft}>
                <Text style={s.heroPrompt}>{getPrompt()}</Text>
                <Text style={s.heroTitle}>Pedir{'\n'}Comida</Text>
                <View style={s.heroCta}>
                  <Text style={s.heroCtaText}>Ver Restaurantes</Text>
                  <Feather name="arrow-right" size={14} color="#EA580C" />
                </View>
              </View>
              <View style={s.heroRight}>
                <Text style={s.heroEmoji}>{'\uD83C\uDF2E'}</Text>
                <Text style={s.heroEmoji2}>{'\uD83C\uDF54'}</Text>
                <Text style={s.heroEmoji3}>{'\uD83C\uDF55'}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Map CTA ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.mapCta}
          activeOpacity={0.9}
          onPress={() => router.push('/food/map' as any)}
        >
          <View style={s.mapCtaLeft}>
            <Feather name="map" size={20} color={DS.colors.blue} />
            <View>
              <Text style={s.mapCtaTitle}>Ver Mapa</Text>
              <Text style={s.mapCtaSub}>Negocios cerca de ti</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={DS.colors.muted} />
        </TouchableOpacity>

        {/* ── Services Row ────────────────────────────────────── */}
        <View style={s.servRow}>
          <TouchableOpacity style={s.servCard} activeOpacity={0.85} onPress={() => router.push('/shopping' as any)}>
            <View style={[s.servIcon, { backgroundColor: '#ECFDF5' }]}>
              <ShoppingCart size={20} color={DS.colors.green} strokeWidth={2} />
            </View>
            <Text style={s.servTitle}>Super</Text>
            <Text style={s.servSub}>Lista de compras</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.servCard} activeOpacity={0.85} onPress={() => router.push('/delivery/create' as any)}>
            <View style={[s.servIcon, { backgroundColor: '#EFF6FF' }]}>
              <Package size={20} color={DS.colors.blue} strokeWidth={2} />
            </View>
            <Text style={s.servTitle}>Envios</Text>
            <Text style={s.servSub}>Punto a punto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.servCard} activeOpacity={0.85} onPress={() => router.push('/orders/history' as any)}>
            <View style={[s.servIcon, { backgroundColor: '#FFF5EB' }]}>
              <Clock size={20} color={DS.colors.orange} strokeWidth={2} />
            </View>
            <Text style={s.servTitle}>Pedidos</Text>
            <Text style={s.servSub}>Historial</Text>
          </TouchableOpacity>
        </View>

        {/* ── Nearby Restaurants (REAL DATA) ───────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View>
              <Text style={s.sectionTitle}>Cerca de ti</Text>
              <Text style={s.sectionSub}>{openBiz.length} abiertos ahora</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/food/restaurants' as any)}>
              <Text style={s.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loadingBiz ? (
            <ActivityIndicator size="small" color={DS.colors.orange} style={{ paddingVertical: 30 }} />
          ) : nearby.length === 0 ? (
            <View style={s.emptyBiz}>
              <Text style={{ fontSize: 36 }}>{'\uD83C\uDF7D\uFE0F'}</Text>
              <Text style={s.emptyBizText}>Proximamente mas negocios</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bizScroll}>
              {nearby.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  style={[s.bizCard, !biz.isOpen && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/food/menu/${biz.id}` as any)}
                >
                  {biz.image ? (
                    <Image source={{ uri: biz.image }} style={s.bizImg} />
                  ) : (
                    <View style={[s.bizImg, s.bizImgFallback]}>
                      <Text style={{ fontSize: 36 }}>{categoryEmoji(biz.category)}</Text>
                    </View>
                  )}
                  {!biz.isOpen && (
                    <View style={s.bizClosed}>
                      <Text style={s.bizClosedText}>Cerrado</Text>
                    </View>
                  )}
                  <View style={s.bizInfo}>
                    <Text style={s.bizName} numberOfLines={1}>{biz.name}</Text>
                    <View style={s.bizMeta}>
                      <Feather name="star" size={11} color="#F59E0B" />
                      <Text style={s.bizRating}>{biz.rating > 0 ? biz.rating.toFixed(1) : 'Nuevo'}</Text>
                      <Text style={s.bizDot}> · </Text>
                      <Feather name="clock" size={10} color={DS.colors.orange} />
                      <Text style={s.bizTime}>{biz.deliveryTime} min</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Trust Bar ───────────────────────────────────────── */}
        <View style={s.trustBar}>
          <View style={s.trustItem}>
            <Text style={s.trustNum}>{nearby.length || 18}</Text>
            <Text style={s.trustLabel}>Negocios{'\n'}locales</Text>
          </View>
          <View style={s.trustDiv} />
          <View style={s.trustItem}>
            <Feather name="shield" size={18} color={DS.colors.green} />
            <Text style={s.trustLabel}>Repartidores{'\n'}verificados</Text>
          </View>
          <View style={s.trustDiv} />
          <View style={s.trustItem}>
            <Feather name="truck" size={18} color={DS.colors.orange} />
            <Text style={s.trustLabel}>Entrega{'\n'}rapida</Text>
          </View>
        </View>

        {/* ── Auth CTA (only if not logged in) ────────────────── */}
        {!user && (
          <View style={s.authCard}>
            <Text style={s.authTitle}>Empieza a pedir</Text>
            <Text style={s.authSub}>Crea tu cuenta gratis — sin tarjeta, 30 segundos</Text>
            <View style={s.authRow}>
              <View style={{ flex: 1 }}>
                <BigButton title="Crear Cuenta" color={DS.colors.orange} onPress={() => router.push('/register' as any)} />
              </View>
              <TouchableOpacity style={s.authLogin} onPress={() => router.push('/login' as any)} activeOpacity={0.7}>
                <Text style={s.authLoginText}>Ya tengo cuenta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Footer ──────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerMain}>Hecho en Tomatlan, Jalisco</Text>
          <Text style={s.footerSub}>Lo que quieras, cuando quieras</Text>
        </View>
      </ScrollView>

      {/* ── Yessi FAB ───────────────────────────────────────── */}
      {user && (
        <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => router.push('/yessi' as any)}>
          <Feather name="zap" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      {user && (
        <View style={s.tabBar}>
          <TouchableOpacity style={s.tab}>
            <Home size={22} color={DS.colors.orange} />
            <Text style={[s.tabText, s.tabActive]}>Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tab} onPress={() => router.push('/food/checkout' as any)}>
            <View style={{ position: 'relative' }}>
              <ShoppingBag size={22} color={DS.colors.muted} />
              {itemCount > 0 && (
                <View style={s.badge}><Text style={s.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text></View>
              )}
            </View>
            <Text style={s.tabText}>Carrito</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tab} onPress={() => router.push('/orders/history' as any)}>
            <Clock size={22} color={DS.colors.muted} />
            <Text style={s.tabText}>Pedidos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tab} onPress={() => router.push('/profile' as any)}>
            <User size={22} color={DS.colors.muted} />
            <Text style={s.tabText}>Perfil</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 56, paddingHorizontal: DS.space.xl, paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.lg },
  headerLeft: { flex: 1, marginRight: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { ...DS.fonts.small, color: DS.colors.orange, fontWeight: '600' },
  greeting: { ...DS.fonts.title, color: DS.colors.dark },
  loginPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF5EB', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: DS.radius.full,
  },
  loginPillText: { ...DS.fonts.label, color: DS.colors.orange },

  bannerWrap: { marginBottom: DS.space.lg },

  // Search
  searchWrap: { marginBottom: DS.space.xl, zIndex: 100 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: DS.colors.card,
    borderRadius: DS.radius.full, paddingHorizontal: DS.space.lg, height: 52, gap: 8, ...DS.shadow.card,
  },
  searchInput: { flex: 1, ...DS.fonts.body, color: DS.colors.dark, paddingVertical: 0 },
  dropdown: {
    position: 'absolute', top: 58, left: 0, right: 0,
    backgroundColor: DS.colors.card, borderRadius: DS.radius.md, ...DS.shadow.button, zIndex: 200,
  },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  dropName: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  dropSub: { ...DS.fonts.tiny, color: DS.colors.muted },

  // Hero
  hero: { borderRadius: DS.radius.xxl, overflow: 'hidden', marginBottom: DS.space.xl, ...DS.shadow.button },
  heroGrad: { padding: 24, minHeight: 180, flexDirection: 'row', position: 'relative' },
  heroLeft: { flex: 1, justifyContent: 'center', zIndex: 2 },
  heroPrompt: { ...DS.fonts.label, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', lineHeight: 36, marginBottom: 16 },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#FFF', borderRadius: DS.radius.full, paddingHorizontal: 16, paddingVertical: 10,
  },
  heroCtaText: { ...DS.fonts.label, color: '#EA580C' },
  heroRight: { width: 100, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  heroEmoji: { fontSize: 64, position: 'absolute', top: -10, right: -5 },
  heroEmoji2: { fontSize: 40, position: 'absolute', bottom: 10, right: 20, opacity: 0.7 },
  heroEmoji3: { fontSize: 32, position: 'absolute', top: 30, left: -10, opacity: 0.5 },

  // Map CTA
  mapCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DS.colors.card, borderRadius: DS.radius.lg,
    padding: DS.space.lg, marginBottom: DS.space.lg, ...DS.shadow.card,
  },
  mapCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapCtaTitle: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  mapCtaSub: { ...DS.fonts.tiny, color: DS.colors.muted, marginTop: 1 },

  // Services
  servRow: { flexDirection: 'row', gap: DS.space.md, marginBottom: DS.space.xxl },
  servCard: {
    flex: 1, backgroundColor: DS.colors.card, borderRadius: DS.radius.lg,
    padding: DS.space.md, alignItems: 'center', ...DS.shadow.card,
  },
  servIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  servTitle: { ...DS.fonts.label, color: DS.colors.dark, marginBottom: 2 },
  servSub: { ...DS.fonts.tiny, color: DS.colors.muted, textAlign: 'center' },

  // Nearby section
  section: { marginBottom: DS.space.xxl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.space.md },
  sectionTitle: { ...DS.fonts.section, color: DS.colors.dark },
  sectionSub: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  seeAll: { ...DS.fonts.label, color: DS.colors.blue, paddingTop: 4 },
  bizScroll: { gap: DS.space.md, paddingRight: DS.space.lg },
  bizCard: { width: 160, backgroundColor: DS.colors.card, borderRadius: DS.radius.lg, overflow: 'hidden', ...DS.shadow.card },
  bizImg: { width: 160, height: 100, resizeMode: 'cover' as any },
  bizImgFallback: { backgroundColor: '#FFF5EB', justifyContent: 'center', alignItems: 'center' },
  bizClosed: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  bizClosedText: { ...DS.fonts.label, color: '#FFF' },
  bizInfo: { padding: DS.space.sm, paddingHorizontal: DS.space.md },
  bizName: { ...DS.fonts.label, color: DS.colors.dark, marginBottom: 4 },
  bizMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bizRating: { ...DS.fonts.tiny, color: DS.colors.body, fontWeight: '600' },
  bizDot: { ...DS.fonts.tiny, color: DS.colors.muted },
  bizTime: { ...DS.fonts.tiny, color: DS.colors.orange, fontWeight: '600' },
  emptyBiz: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyBizText: { ...DS.fonts.body, color: DS.colors.muted },

  // Trust
  trustBar: {
    flexDirection: 'row', backgroundColor: DS.colors.card, borderRadius: DS.radius.lg,
    padding: DS.space.lg, marginBottom: DS.space.xxl, justifyContent: 'space-around',
    alignItems: 'center', ...DS.shadow.card,
  },
  trustItem: { alignItems: 'center', gap: 4 },
  trustNum: { fontSize: 20, fontWeight: '800', color: DS.colors.green },
  trustLabel: { ...DS.fonts.tiny, color: DS.colors.body, textAlign: 'center' },
  trustDiv: { width: 1, height: 32, backgroundColor: DS.colors.hairline },

  // Auth
  authCard: {
    backgroundColor: DS.colors.card, borderRadius: DS.radius.xxl,
    padding: DS.space.xxl, marginBottom: DS.space.xxl, ...DS.shadow.card,
  },
  authTitle: { ...DS.fonts.section, color: DS.colors.dark, marginBottom: 4 },
  authSub: { ...DS.fonts.small, color: DS.colors.muted, marginBottom: DS.space.xl },
  authRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  authLogin: { paddingVertical: 12, paddingHorizontal: 8 },
  authLoginText: { ...DS.fonts.label, color: DS.colors.orange },

  // Footer
  footer: { alignItems: 'center', gap: 4, marginTop: DS.space.md, marginBottom: DS.space.xl },
  footerMain: { ...DS.fonts.label, color: DS.colors.muted },
  footerSub: { ...DS.fonts.tiny, color: DS.colors.placeholder },

  // FAB
  fab: {
    position: 'absolute', bottom: 85, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: DS.colors.orange,
    alignItems: 'center', justifyContent: 'center', ...colorShadow('#EA580C', 0.4), zIndex: 50,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: DS.colors.card,
    borderTopWidth: 1, borderTopColor: DS.colors.hairline,
    paddingBottom: 20, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 3 },
  tabText: { ...DS.fonts.tiny, color: DS.colors.muted },
  tabActive: { color: DS.colors.orange },
  badge: {
    position: 'absolute', top: -6, right: -8,
    backgroundColor: DS.colors.orange, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
});
