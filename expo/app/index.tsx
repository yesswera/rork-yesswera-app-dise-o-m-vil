import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, Home, Clock, User } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/auth';
import { getActiveOrders } from '@/services/orders';
import { getRecommendations, RecommendationSet, ProductRecommendation, BusinessRecommendation } from '@/services/recommendations';
import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';
import { DS } from '@/constants/design';
import ServiceCard from '@/components/ui/ServiceCard';
import ActiveOrderBanner from '@/components/ui/ActiveOrderBanner';
import YAvatar from '@/components/ui/YAvatar';
import BigButton from '@/components/ui/BigButton';
import SectionHeader from '@/components/ui/SectionHeader';

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
// SEARCH RESULT TYPES
// ============================================================================

interface SearchResult {
  id: string;
  type: 'business' | 'product';
  name: string;
  subtitle: string;
  businessId: string;
}

// ============================================================================
// RECENT ORDER TYPE
// ============================================================================

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
  if (diffDays === 1) return 'Hace 1 dia';
  if (diffDays < 30) return `Hace ${diffDays} dias`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Hace 1 mes';
  return `Hace ${diffMonths} meses`;
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

// ============================================================================
// HOME SCREEN
// ============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
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

      // Active order
      getActiveOrders(user.id)
        .then((orders) => setActiveOrder(orders.length > 0 ? orders[0] : null))
        .catch(() => setActiveOrder(null));

      // Recent delivered orders (quick reorder)
      fetchRecentOrders(user.id);

      // Recommendations
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

      // Search businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name, category')
        .ilike('business_name', lowerQuery)
        .limit(4);

      // Search products (with business join)
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

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  // Determine what to show in popular/recommended section
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
              Hola, {user?.name || 'Bienvenido'}
            </Text>
          </View>
          {user && (
            <TouchableOpacity
              onPress={() => router.push('/profile' as any)}
              activeOpacity={0.8}
            >
              <YAvatar initials={userInitials} size={48} />
            </TouchableOpacity>
          )}
        </View>

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
              <ActivityIndicator size="small" color={DS.colors.green} />
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

        {/* Active Order Banner */}
        {activeOrder && user && (
          <View style={styles.bannerWrap}>
            <ActiveOrderBanner
              status={ORDER_STATUS_TEXT[activeOrder.status] || 'Orden activa'}
              onPress={() => router.push(`/tracking/${activeOrder.id}` as any)}
            />
          </View>
        )}

        {/* Service Cards */}
        <View style={styles.services}>
          <ServiceCard
            title="Pedir Comida"
            subtitle="Restaurantes y antojitos"
            icon={<UtensilsCrossed size={30} color="#FFFFFF" strokeWidth={1.8} />}
            color={DS.colors.green}
            onPress={() => router.push('/food/restaurants' as any)}
          />
          <ServiceCard
            title="Lista de Compras"
            subtitle="Te lo traemos del super"
            icon={<ShoppingCart size={30} color="#FFFFFF" strokeWidth={1.8} />}
            color={DS.colors.orange}
            onPress={() => router.push('/shopping' as any)}
          />
          <ServiceCard
            title="Enviar Paquete"
            subtitle="De un punto a otro"
            icon={<Package size={30} color="#FFFFFF" strokeWidth={1.8} />}
            color={DS.colors.blue}
            onPress={() => router.push('/delivery/create' as any)}
          />
        </View>

        {/* Quick Reorder Section */}
        {user && recentOrders.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Pedir de nuevo" subtitle="Tus pedidos recientes" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reorderScroll}
            >
              {recentOrders.map((order) => (
                <View key={order.id} style={styles.reorderCard}>
                  <Text style={styles.reorderBizName} numberOfLines={1}>
                    {order.businessName}
                  </Text>
                  <Text style={styles.reorderMeta} numberOfLines={1}>
                    {order.itemCount} {order.itemCount === 1 ? 'articulo' : 'articulos'} · {formatPrice(order.total)}
                  </Text>
                  <Text style={styles.reorderTime}>
                    {relativeTime(order.createdAt)}
                  </Text>
                  <TouchableOpacity
                    style={styles.reorderBtn}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/food/menu/${order.businessId}` as any)}
                  >
                    <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                    <Text style={styles.reorderBtnText}>Repetir</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Popular / Recommended Section */}
        {showPopularSection && popularItems.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Popular cerca de ti" subtitle="Lo mas pedido esta semana" />
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
                        <Feather name="coffee" size={24} color={DS.colors.orange} />
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

        {/* Fallback: Suggested Businesses if no popular products */}
        {showPopularSection && popularItems.length === 0 && suggestedBiz.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Popular cerca de ti" subtitle="Negocios que te pueden gustar" />
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
                        <Feather name="home" size={24} color={DS.colors.green} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.popularName} numberOfLines={2}>
                    {biz.businessName}
                  </Text>
                  <Text style={styles.popularPrice}>
                    {biz.rating > 0 ? `${biz.rating.toFixed(1)} ★` : 'Nuevo'}
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
            <Text style={styles.authTitle}>Listo para ordenar?</Text>
            <View style={styles.authRow}>
              <View style={styles.authBtnWrap}>
                <BigButton
                  title="Crear Cuenta"
                  color={DS.colors.green}
                  onPress={() => router.push('/register' as any)}
                />
              </View>
              <View style={styles.authBtnWrap}>
                <BigButton
                  title="Iniciar Sesion"
                  color={DS.colors.card}
                  textColor={DS.colors.green}
                  onPress={() => router.push('/login' as any)}
                />
              </View>
            </View>
          </View>
        )}

        {/* Tagline */}
        <Text style={styles.tagline}>Lo que quieras, cuando quieras</Text>
      </ScrollView>

      {/* Bottom Tab Bar */}
      {user && (
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tab} activeOpacity={0.7}>
            <Home size={22} color={DS.colors.green} />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.push('/orders/history' as any)}
          >
            <Clock size={22} color={DS.colors.muted} />
            <Text style={styles.tabLabel}>Historial</Text>
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
    paddingTop: 60,
    paddingHorizontal: DS.space.xl,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.space.xl,
  },
  headerLeft: {
    flex: 1,
    marginRight: DS.space.lg,
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

  // Search
  searchContainer: {
    marginBottom: DS.space.xxl,
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

  // Active order banner
  bannerWrap: {
    marginBottom: DS.space.xxl,
  },

  // Services
  services: {
    gap: DS.space.lg,
    marginBottom: DS.space.xxxl,
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
    width: 180,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    ...DS.shadow.card,
  },
  reorderBizName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    marginBottom: DS.space.xs,
  },
  reorderMeta: {
    ...DS.fonts.small,
    color: DS.colors.body,
    marginBottom: DS.space.xs,
  },
  reorderTime: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
    marginBottom: DS.space.md,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.sm,
    paddingVertical: DS.space.sm,
    paddingHorizontal: DS.space.md,
    gap: DS.space.xs,
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
    width: 140,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    ...DS.shadow.card,
  },
  popularImageWrap: {
    width: '100%',
    height: 90,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.bg,
    marginBottom: DS.space.sm,
    overflow: 'hidden',
  },
  popularImage: {
    width: '100%',
    height: '100%',
    borderRadius: DS.radius.sm,
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
    color: DS.colors.green,
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
  },
  authTitle: {
    ...DS.fonts.section,
    color: DS.colors.dark,
    marginBottom: DS.space.lg,
  },
  authRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    width: '100%',
  },
  authBtnWrap: {
    flex: 1,
  },

  // Tagline
  tagline: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: DS.space.xl,
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
    gap: 4,
  },
  tabLabel: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
  },
  tabLabelActive: {
    color: DS.colors.green,
  },
});
