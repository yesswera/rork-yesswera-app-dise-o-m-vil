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
import { UtensilsCrossed, ShoppingCart, Package, Home, Clock, User, ShoppingBag } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/auth';
import { useCart } from '@/contexts/cart';
import { getActiveOrders } from '@/services/orders';
import { getRecommendations, RecommendationSet, ProductRecommendation, BusinessRecommendation } from '@/services/recommendations';
import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';
import { DS, colorShadow } from '@/constants/design';
import ActiveOrderBanner from '@/components/ui/ActiveOrderBanner';
import YAvatar from '@/components/ui/YAvatar';
import BigButton from '@/components/ui/BigButton';
import SectionHeader from '@/components/ui/SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// ============================================================================
// TYPES
// ============================================================================

interface SearchResult {
  id: string;
  type: 'business' | 'product';
  name: string;
  subtitle: string;
  businessId: string;
}

interface RecentOrder {
  id: string;
  businessId: string;
  businessName: string;
  itemCount: number;
  total: number;
  createdAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  return `Hace ${Math.floor(diffDays / 7)} sem`;
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

// ============================================================================
// HERO FOOD EMOJIS (animated background)
// ============================================================================

const FOOD_EMOJIS = [
  '\uD83C\uDF2E', '\uD83C\uDF54', '\uD83C\uDF55', '\uD83E\uDD64',
  '\uD83C\uDF57', '\uD83E\uDD90', '\uD83C\uDF72', '\uD83C\uDF63',
  '\uD83C\uDF70', '\u2615', '\uD83C\uDF7A', '\uD83E\uDD57',
];

// ============================================================================
// HOME SCREEN
// ============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { itemCount } = useCart();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick reorder state
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendationSet | null>(null);

  // Animated pulse for hero
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Role redirect
  useEffect(() => {
    if (isLoading || !user) return;
    if (user.userType === 'business') {
      router.replace('/business/dashboard' as any);
    } else if (user.userType === 'driver') {
      router.replace('/driver/dashboard' as any);
    } else if (user.userType === 'admin') {
      router.replace('/admin/dashboard' as any);
    }
  }, [user, isLoading]);

  // Load active order + recent orders + recommendations on focus
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setActiveOrder(null);
        setRecentOrders([]);
        setRecommendations(null);
        return;
      }

      getActiveOrders(user.id)
        .then((orders) => setActiveOrder(orders.length > 0 ? orders[0] : null))
        .catch(() => setActiveOrder(null));

      fetchRecentOrders(user.id);

      getRecommendations(user.id)
        .then(setRecommendations)
        .catch(() => setRecommendations(null));
    }, [user])
  );

  // ============================================================================
  // SEARCH
  // ============================================================================

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(() => {
      performSearch(text.trim());
    }, 300);
  };

  const performSearch = async (query: string) => {
    try {
      const lowerQuery = `%${query.toLowerCase()}%`;

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name, category')
        .ilike('business_name', lowerQuery)
        .limit(4);

      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, business_id, businesses:business_id(business_name)')
        .ilike('name', lowerQuery)
        .eq('available', true)
        .limit(4);

      const results: SearchResult[] = [];

      (businesses || []).forEach((b) => {
        results.push({
          id: b.id,
          type: 'business',
          name: b.business_name,
          subtitle: b.category || 'Restaurante',
          businessId: b.id,
        });
      });

      (products || []).forEach((p: any) => {
        results.push({
          id: p.id,
          type: 'product',
          name: p.name,
          subtitle: p.businesses?.business_name || '',
          businessId: p.business_id,
        });
      });

      setSearchResults(results.slice(0, 8));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    }
  };

  const handleSearchResultPress = (result: SearchResult) => {
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/food/menu/${result.businessId}` as any);
  };

  // ============================================================================
  // RECENT ORDERS
  // ============================================================================

  const fetchRecentOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          business_id,
          total_amount,
          item_count,
          created_at,
          businesses:business_id(business_name)
        `)
        .eq('customer_id', userId)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error || !data) {
        setRecentOrders([]);
        return;
      }

      const mapped: RecentOrder[] = data.map((o: any) => ({
        id: o.id,
        businessId: o.business_id,
        businessName: o.businesses?.business_name || 'Negocio',
        itemCount: o.item_count || 0,
        total: o.total_amount || 0,
        createdAt: o.created_at,
      }));

      setRecentOrders(mapped);
    } catch {
      setRecentOrders([]);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getHungerPrompt = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 11) return 'Que se te antoja para desayunar?';
    if (hour >= 11 && hour < 15) return 'Hora de comer! Que se te antoja?';
    if (hour >= 15 && hour < 19) return 'Un antojito para la tarde?';
    if (hour >= 19 && hour < 22) return 'Que vas a cenar hoy?';
    return 'Antojo nocturno? Te lo llevamos';
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const popularItems: ProductRecommendation[] = recommendations?.popular?.length
    ? recommendations.popular.slice(0, 10)
    : [];
  const suggestedBiz: BusinessRecommendation[] =
    popularItems.length === 0 && recommendations?.suggestedBusinesses?.length
      ? recommendations.suggestedBusinesses.slice(0, 10)
      : [];
  const showPopularSection = user && (popularItems.length > 0 || suggestedBiz.length > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Bienvenido a Yesswera'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {user && (
              <TouchableOpacity
                onPress={() => router.push('/profile' as any)}
                activeOpacity={0.8}
              >
                <YAvatar initials={userInitials} size={44} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Order Banner */}
        {activeOrder && user && (
          <View style={styles.bannerWrap}>
            <ActiveOrderBanner
              status={ORDER_STATUS_TEXT[activeOrder.status] || 'Orden activa'}
              onPress={() => router.push(`/tracking/${activeOrder.id}` as any)}
            />
          </View>
        )}

        {/* HERO — Main CTA: Pedir Comida */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => router.push('/food/restaurants' as any)}
        >
          <LinearGradient
            colors={['#EA580C', '#F97316', '#FB923C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Floating food emojis background */}
            <View style={styles.heroEmojiGrid}>
              {FOOD_EMOJIS.slice(0, 6).map((emoji, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    styles.heroEmoji,
                    { transform: [{ scale: pulseAnim }], opacity: 0.2 + (i * 0.05) },
                  ]}
                >
                  {emoji}
                </Animated.Text>
              ))}
            </View>

            {/* Hero content */}
            <View style={styles.heroContent}>
              <Text style={styles.heroPrompt}>{getHungerPrompt()}</Text>
              <Text style={styles.heroTitle}>Pedir Comida</Text>
              <Text style={styles.heroSub}>
                Tacos, mariscos, pollos, pizzas y mas
              </Text>
              <View style={styles.heroBtnRow}>
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnText}>Ver Restaurantes</Text>
                  <Feather name="arrow-right" size={16} color="#EA580C" />
                </View>
                <Text style={styles.heroDelivery}>Envio desde $15</Text>
              </View>
            </View>

            {/* Big food emoji */}
            <View style={styles.heroBigEmoji}>
              <Text style={styles.heroBigEmojiText}>{'\uD83C\uDF2E'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color={DS.colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar restaurante o platillo..."
              placeholderTextColor={DS.colors.placeholder}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator size="small" color={DS.colors.orange} />
            )}
            {!isSearching && searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={DS.colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <View style={styles.searchDropdown}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={`${result.type}-${result.id}`}
                  style={styles.searchResultItem}
                  activeOpacity={0.7}
                  onPress={() => handleSearchResultPress(result)}
                >
                  <View style={styles.searchResultIcon}>
                    <Feather
                      name={result.type === 'business' ? 'home' : 'tag'}
                      size={16}
                      color={result.type === 'business' ? DS.colors.green : DS.colors.orange}
                    />
                  </View>
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {result.name}
                    </Text>
                    <Text style={styles.searchResultSub} numberOfLines={1}>
                      {result.subtitle}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={DS.colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Secondary Services — Compact row */}
        <View style={styles.servicesRow}>
          <TouchableOpacity
            style={styles.serviceChip}
            activeOpacity={0.8}
            onPress={() => router.push('/shopping' as any)}
          >
            <View style={[styles.serviceChipIcon, { backgroundColor: DS.colors.greenLight }]}>
              <ShoppingCart size={20} color={DS.colors.green} strokeWidth={2} />
            </View>
            <View style={styles.serviceChipText}>
              <Text style={styles.serviceChipTitle}>Super</Text>
              <Text style={styles.serviceChipSub}>Lista de compras</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceChip}
            activeOpacity={0.8}
            onPress={() => router.push('/delivery/create' as any)}
          >
            <View style={[styles.serviceChipIcon, { backgroundColor: DS.colors.blueLight }]}>
              <Package size={20} color={DS.colors.blue} strokeWidth={2} />
            </View>
            <View style={styles.serviceChipText}>
              <Text style={styles.serviceChipTitle}>Envios</Text>
              <Text style={styles.serviceChipSub}>Punto a punto</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Trust Badge — Social Proof */}
        <View style={styles.trustBadge}>
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Text style={styles.trustNumber}>18</Text>
              <Text style={styles.trustLabel}>Negocios{'\n'}locales</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Feather name="shield" size={20} color={DS.colors.green} />
              <Text style={styles.trustLabel}>Repartidores{'\n'}verificados</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Feather name="message-circle" size={20} color={DS.colors.green} />
              <Text style={styles.trustLabel}>Soporte{'\n'}WhatsApp</Text>
            </View>
          </View>
        </View>

        {/* Quick Reorder Section */}
        {user && recentOrders.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Pedir de nuevo" subtitle="Un tap y listo" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reorderScroll}
            >
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.reorderCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/food/menu/${order.businessId}` as any)}
                >
                  <View style={styles.reorderTop}>
                    <Text style={styles.reorderEmoji}>{'\uD83D\uDD01'}</Text>
                    <Text style={styles.reorderTime}>{relativeTime(order.createdAt)}</Text>
                  </View>
                  <Text style={styles.reorderBizName} numberOfLines={1}>
                    {order.businessName}
                  </Text>
                  <Text style={styles.reorderMeta}>
                    {order.itemCount} {order.itemCount === 1 ? 'articulo' : 'articulos'} · {formatPrice(order.total)}
                  </Text>
                  <View style={styles.reorderBtn}>
                    <Text style={styles.reorderBtnText}>Repetir Pedido</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Popular / Recommended Section */}
        {showPopularSection && popularItems.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Lo mas pedido" subtitle="Popular esta semana" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {popularItems.map((item) => (
                <TouchableOpacity
                  key={item.productId}
                  style={styles.popularCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/food/menu/${item.businessId}` as any)}
                >
                  <View style={styles.popularImageWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.popularImage} />
                    ) : (
                      <View style={styles.popularEmoji}>
                        <Text style={{ fontSize: 32 }}>{'\uD83C\uDF7D\uFE0F'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.popularName} numberOfLines={2}>
                    {item.productName}
                  </Text>
                  <Text style={styles.popularPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.popularBiz} numberOfLines={1}>
                    {item.businessName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fallback: Suggested Businesses */}
        {showPopularSection && popularItems.length === 0 && suggestedBiz.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Descubre" subtitle="Negocios que te van a gustar" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {suggestedBiz.map((biz) => (
                <TouchableOpacity
                  key={biz.businessId}
                  style={styles.popularCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/food/menu/${biz.businessId}` as any)}
                >
                  <View style={styles.popularImageWrap}>
                    {biz.imageUrl ? (
                      <Image source={{ uri: biz.imageUrl }} style={styles.popularImage} />
                    ) : (
                      <View style={styles.popularEmoji}>
                        <Text style={{ fontSize: 32 }}>{'\uD83C\uDF7D\uFE0F'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.popularName} numberOfLines={2}>
                    {biz.businessName}
                  </Text>
                  <Text style={styles.popularPrice}>
                    {biz.rating > 0 ? `${biz.rating.toFixed(1)} \u2605` : 'Nuevo'}
                  </Text>
                  <Text style={styles.popularBiz} numberOfLines={1}>
                    {biz.category || biz.reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Auth prompt for unauthenticated users */}
        {!user && (
          <View style={styles.authPrompt}>
            <View style={styles.authIconRow}>
              <Text style={styles.authEmoji}>{'\uD83D\uDC4B'}</Text>
            </View>
            <Text style={styles.authTitle}>Listo para ordenar?</Text>
            <Text style={styles.authSubtitle}>Crea tu cuenta en 30 segundos — sin tarjeta</Text>
            <View style={styles.authRow}>
              <View style={styles.authBtnWrap}>
                <BigButton
                  title="Crear Cuenta"
                  color={DS.colors.orange}
                  onPress={() => router.push('/register' as any)}
                />
              </View>
              <View style={styles.authBtnWrap}>
                <BigButton
                  title="Iniciar Sesion"
                  color={DS.colors.card}
                  textColor={DS.colors.orange}
                  onPress={() => router.push('/login' as any)}
                  style={{ borderWidth: 1.5, borderColor: DS.colors.hairline }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hecho en Tomatlan, Jalisco</Text>
          <Text style={styles.footerSub}>Con amor para nuestra comunidad</Text>
        </View>
      </ScrollView>

      {/* Yessi Floating Button */}
      {user && (
        <TouchableOpacity
          style={styles.yessiFab}
          activeOpacity={0.85}
          onPress={() => router.push('/yessi' as any)}
        >
          <Feather name="zap" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Bottom Tab Bar */}
      {user && (
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tab} activeOpacity={0.7}>
            <Home size={22} color={DS.colors.orange} />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.push('/food/checkout' as any)}
          >
            <View style={styles.cartTabWrap}>
              <ShoppingBag size={22} color={DS.colors.muted} />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.tabLabel}>Carrito</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.push('/orders/history' as any)}
          >
            <Clock size={22} color={DS.colors.muted} />
            <Text style={styles.tabLabel}>Pedidos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.push('/profile' as any)}
          >
            <User size={22} color={DS.colors.muted} />
            <Text style={styles.tabLabel}>Perfil</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 56,
    paddingHorizontal: DS.space.xl,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.space.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: DS.space.lg,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  greeting: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginBottom: 2,
  },
  userName: {
    ...DS.fonts.title,
    color: DS.colors.dark,
  },

  // Active order banner
  bannerWrap: {
    marginBottom: DS.space.lg,
  },

  // Hero Card
  heroCard: {
    borderRadius: DS.radius.xxl,
    overflow: 'hidden',
    marginBottom: DS.space.xl,
    ...DS.shadow.button,
  },
  heroGradient: {
    padding: DS.space.xxl,
    minHeight: 180,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroEmojiGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroContent: {
    flex: 1,
    zIndex: 2,
  },
  heroPrompt: {
    ...DS.fonts.small,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: DS.space.xs,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: DS.space.xs,
  },
  heroSub: {
    ...DS.fonts.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: DS.space.lg,
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: DS.radius.full,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.sm + 2,
  },
  heroBtnText: {
    ...DS.fonts.label,
    color: '#EA580C',
  },
  heroDelivery: {
    ...DS.fonts.small,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  heroBigEmoji: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.3,
    zIndex: 1,
  },
  heroBigEmojiText: {
    fontSize: 120,
  },

  // Search
  searchContainer: {
    marginBottom: DS.space.xl,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.lg,
    height: DS.touch.min,
    gap: DS.space.sm,
    ...DS.shadow.card,
  },
  searchInput: {
    flex: 1,
    ...DS.fonts.body,
    color: DS.colors.dark,
    paddingVertical: 0,
  },
  searchDropdown: {
    position: 'absolute',
    top: DS.touch.min + DS.space.xs,
    left: 0,
    right: 0,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.md,
    ...DS.shadow.button,
    zIndex: 200,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.lg,
    gap: DS.space.md,
    minHeight: DS.touch.min,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultText: {
    flex: 1,
    gap: 2,
  },
  searchResultName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  searchResultSub: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },

  // Secondary Services Row
  servicesRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    marginBottom: DS.space.xl,
  },
  serviceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    gap: DS.space.md,
    ...DS.shadow.card,
  },
  serviceChipIcon: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceChipText: {
    flex: 1,
  },
  serviceChipTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    fontSize: 15,
  },
  serviceChipSub: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },

  // Trust Badge
  trustBadge: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    marginBottom: DS.space.xxxl,
    ...DS.shadow.card,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  trustItem: {
    alignItems: 'center',
    gap: DS.space.xs,
  },
  trustNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: DS.colors.green,
  },
  trustLabel: {
    ...DS.fonts.tiny,
    color: DS.colors.body,
    textAlign: 'center',
  },
  trustDivider: {
    width: 1,
    height: 36,
    backgroundColor: DS.colors.hairline,
  },

  // Section wrapper
  sectionWrap: {
    marginBottom: DS.space.xxxl,
  },

  // Quick Reorder
  reorderScroll: {
    gap: DS.space.md,
  },
  reorderCard: {
    width: 200,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    ...DS.shadow.card,
  },
  reorderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.sm,
  },
  reorderEmoji: {
    fontSize: 20,
  },
  reorderTime: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },
  reorderBizName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    marginBottom: DS.space.xs,
  },
  reorderMeta: {
    ...DS.fonts.small,
    color: DS.colors.body,
    marginBottom: DS.space.md,
  },
  reorderBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.colors.orange,
    borderRadius: DS.radius.md,
    paddingVertical: DS.space.sm + 2,
  },
  reorderBtnText: {
    ...DS.fonts.label,
    color: '#FFFFFF',
  },

  // Popular / Recommended
  popularScroll: {
    gap: DS.space.md,
  },
  popularCard: {
    width: 150,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    ...DS.shadow.card,
  },
  popularImageWrap: {
    width: '100%',
    height: 100,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.bg,
    marginBottom: DS.space.sm,
    overflow: 'hidden',
  },
  popularImage: {
    width: '100%',
    height: '100%',
    borderRadius: DS.radius.md,
  },
  popularEmoji: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularName: {
    ...DS.fonts.label,
    color: DS.colors.dark,
    marginBottom: DS.space.xs,
  },
  popularPrice: {
    ...DS.fonts.bodyMed,
    color: DS.colors.orange,
    marginBottom: 2,
  },
  popularBiz: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },

  // Auth prompt
  authPrompt: {
    alignItems: 'center',
    marginBottom: DS.space.xxxl,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.xxl,
    padding: DS.space.xxl,
    ...DS.shadow.card,
  },
  authIconRow: {
    marginBottom: DS.space.md,
  },
  authEmoji: {
    fontSize: 40,
  },
  authTitle: {
    ...DS.fonts.section,
    color: DS.colors.dark,
    marginBottom: DS.space.xs,
  },
  authSubtitle: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginBottom: DS.space.xl,
    textAlign: 'center',
  },
  authRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    width: '100%',
  },
  authBtnWrap: {
    flex: 1,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: DS.space.xs,
    marginTop: DS.space.md,
  },
  footerText: {
    ...DS.fonts.label,
    color: DS.colors.muted,
  },
  footerSub: {
    ...DS.fonts.tiny,
    color: DS.colors.placeholder,
  },

  // Yessi FAB
  yessiFab: {
    position: 'absolute',
    bottom: 85,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: DS.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...colorShadow('#EA580C', 0.4),
    zIndex: 50,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: DS.colors.card,
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
    paddingBottom: 20,
    paddingTop: DS.space.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.sm,
    gap: 3,
  },
  tabLabel: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },
  tabLabelActive: {
    color: DS.colors.orange,
  },
  cartTabWrap: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: DS.colors.orange,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
