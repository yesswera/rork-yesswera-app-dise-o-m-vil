import TouchableSound from '@/components/TouchableSound';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, User, ChevronRight, ShoppingBag, RefreshCw, Clock, XCircle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Swipeable } from 'react-native-gesture-handler';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import AccessibilityControls from '@/components/AccessibilityControls';
import { getActiveOrders, getUserOrders } from '@/services/orders';
import { getClientTransferMessage } from '@/services/driver-monitoring';
import { useClientOrderSubscription } from '@/hooks/useRealtimeOrders';
import { Order, OrderStatus } from '@/constants/types';
import { Toast } from '@/utils/toast';
import { supabase } from '@/constants/supabase';
import { getUserPreferences, DisplayPreferences, ServiceType } from '@/services/user-preferences';

// Servicios disponibles
const services = [
  {
    id: 'food',
    title: 'Alimentos y Bebidas',
    subtitle: 'Restaurantes, bebidas y mas',
    icon: UtensilsCrossed,
    iconBg: '#D1FAE5',
    iconColor: '#16A34A',
    route: '/food/restaurants',
  },
  {
    id: 'shopping',
    title: 'Lista de Compras',
    subtitle: 'Escribe tu lista y te lo llevamos',
    icon: ShoppingCart,
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    route: '/shopping',
  },
  {
    id: 'delivery',
    title: 'Recoger y Entregar',
    subtitle: 'Mensajeria y paqueteria express',
    icon: Package,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    route: '/delivery/create',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { isDark, colors, fonts, space, radius } = useTheme();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPreferences | null>(null);
  const [reorderDismissed, setReorderDismissed] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  // Fade-in staggered animations (no loops)
  const fadeAnims = useRef(services.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(services.map(() => new Animated.Value(20))).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Logo branding animations
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const brandFade = useRef(new Animated.Value(0)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(8)).current;

  // Theme colors
  const bg = isDark ? '#1C1917' : '#FAFAF9';
  const cardBg = isDark ? '#292524' : '#FFFFFF';
  const borderColor = isDark ? '#44403C' : '#F5F5F4';
  const textPrimary = isDark ? '#FAFAFA' : '#1C1917';
  const textSecondary = isDark ? '#D6D3D1' : '#57534E';
  const textMuted = isDark ? '#78716C' : '#A8A29E';

  // Redirigir por rol
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

  // Entry animations
  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Logo branding entry animations
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Animated.timing(brandFade, {
      toValue: 1,
      duration: 400,
      delay: 150,
      useNativeDriver: true,
    }).start();
    Animated.parallel([
      Animated.timing(badgeFade, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(badgeSlide, {
        toValue: 0,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    services.forEach((_, index) => {
      Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 400,
          delay: 200 + index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnims[index], {
          toValue: 0,
          duration: 400,
          delay: 200 + index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Subtle pulse for active order dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Function to load all order data
  const loadOrderData = useCallback(async () => {
    if (!user || !token) {
      setActiveOrder(null);
      setCancelledOrder(null);
      return;
    }

    try {
      const orders = await getActiveOrders(user.id);
      if (orders.length > 0) {
        setActiveOrder(orders[0]);
      } else {
        setActiveOrder(null);
      }

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: cancelledData } = await supabase
        .from('orders')
        .select('*, businesses (id, business_name)')
        .eq('client_id', user.id)
        .eq('status', 'cancelled')
        .gte('updated_at', thirtyMinutesAgo)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cancelledData && cancelledData.length > 0) {
        const cancelled = cancelledData[0];
        let wasDismissed = false;
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const dismissedKey = `dismissed_cancelled_${cancelled.id}`;
          const dismissed = await AsyncStorage.getItem(dismissedKey);
          wasDismissed = dismissed === 'true';
        } catch (e) {}

        if (!wasDismissed) {
          setCancelledOrder({
            id: cancelled.id,
            status: 'cancelled' as OrderStatus,
            businessId: cancelled.business_id,
            businessName: cancelled.businesses?.business_name || 'Negocio',
            type: cancelled.type,
            total: cancelled.total,
            cancellationReason: cancelled.cancellation_reason,
            createdAt: new Date(cancelled.created_at),
          } as Order);
        }
      } else {
        if (!cancelledOrder) {
          setCancelledOrder(null);
        }
      }
    } catch (error) {
      console.error('Error loading order data:', error);
    }
  }, [user, token]);

  useClientOrderSubscription(
    useCallback(() => {
      loadOrderData();
    }, [loadOrderData])
  );

  useFocusEffect(
    useCallback(() => {
      if (user && token) {
        loadOrderData();
        getUserPreferences(user.id).then(prefs => {
          setDisplayPrefs(prefs.display);
        }).catch(console.error);
      }
    }, [user, token, loadOrderData])
  );

  useEffect(() => {
    if (!user || !token) {
      setActiveOrder(null);
      setCancelledOrder(null);
      return;
    }

    let isMounted = true;

    const checkActiveOrder = async () => {
      if (!isMounted) return;
      await loadOrderData();
    };

    const loadRecentOrders = async () => {
      try {
        const allOrders = await getUserOrders(user.id);
        if (!isMounted) return;
        const completed = allOrders
          .filter((o: Order) => o.status === 'delivered')
          .sort((a: Order, b: Order) => new Date(b.deliveredAt || b.createdAt).getTime() - new Date(a.deliveredAt || a.createdAt).getTime())
          .slice(0, 3);
        setRecentOrders(completed);
      } catch (error) {
        console.error('Error cargando ordenes recientes:', error);
      }
    };

    checkActiveOrder();
    loadRecentOrders();

    const interval = setInterval(checkActiveOrder, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, token, loadOrderData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getOrderStatusText = (order: Order) => {
    if (order.needsDriverTransfer && order.status === 'ready') {
      if (order.transferReason) {
        return getClientTransferMessage(order.transferReason);
      }
      return 'Buscando nuevo repartidor...';
    }

    switch (order.status) {
      case 'pending': return 'Esperando confirmacion del negocio';
      case 'accepted': return 'Negocio acepto tu orden';
      case 'preparing': return 'Preparando tu orden';
      case 'ready': return 'Orden lista, buscando repartidor';
      case 'assigned': return 'Repartidor va al negocio';
      case 'driver_verified': return 'Repartidor en el negocio';
      case 'handed_to_driver': return 'Repartidor tiene tu orden';
      case 'in_transit': return 'Tu orden va en camino';
      case 'arrived': return 'Repartidor llego, sal a recibir';
      default: return 'Orden activa';
    }
  };

  const formatOrderDate = (date: Date) => {
    const orderDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - orderDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    return orderDate.toLocaleDateString();
  };

  const visibleServices = useMemo(() => {
    if (!displayPrefs) return services;
    const filtered = services.filter(s => !displayPrefs.hiddenServices.includes(s.id as ServiceType));
    return filtered.sort((a, b) => {
      const orderA = displayPrefs.serviceOrder.indexOf(a.id as ServiceType);
      const orderB = displayPrefs.serviceOrder.indexOf(b.id as ServiceType);
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
  }, [displayPrefs]);

  const handleReorder = (order: Order) => {
    Toast.success('Orden agregada al carrito');
    if (order.type === 'food' && order.businessId) {
      router.push(`/food/menu/${order.businessId}` as any);
    } else if (order.type === 'shopping') {
      router.push('/shopping/stores' as any);
    } else {
      router.push('/delivery/create' as any);
    }
  };

  const handleDismissCancelled = async () => {
    if (cancelledOrder?.id) {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const dismissedKey = `dismissed_cancelled_${cancelledOrder.id}`;
        await AsyncStorage.setItem(dismissedKey, 'true');
      } catch (e) {
        console.log('Could not save dismissed state');
      }
    }
    setCancelledOrder(null);
  };

  const handleReorderSameBusiness = () => {
    const businessId = cancelledOrder?.businessId;
    if (businessId) {
      router.push(`/food/menu/${businessId}` as any);
    } else {
      router.push('/food/restaurants' as any);
    }
  };

  const handleFindAlternative = () => {
    const orderType = cancelledOrder?.type;
    if (orderType === 'food') {
      router.push('/food/restaurants' as any);
    } else if (orderType === 'shopping') {
      router.push('/shopping/stores' as any);
    } else {
      router.push('/food/restaurants' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Saludo + Accesibilidad + Avatar */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerLeft}>
            <AccessibilityControls variant="minimal" />
            <View style={styles.greetingContainer}>
              <Text style={[styles.greeting, { color: textMuted, fontSize: fonts.sm }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.userName, { color: textPrimary, fontSize: fonts.xl }]} numberOfLines={1}>
                {user?.name || 'Bienvenido'}
              </Text>
            </View>
          </View>
          {user && (
            <TouchableSound
              style={[styles.avatarButton, { backgroundColor: cardBg, borderColor: borderColor }]}
              onPress={() => router.push('/profile' as any)}
            >
              <User size={22} color={textSecondary} />
            </TouchableSound>
          )}
        </Animated.View>

        {/* Logo Branding */}
        <View style={styles.brandingSection}>
          <Animated.View style={[styles.brandingRow, { transform: [{ scale: logoScale }] }]}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.brandingLogo}
              contentFit="contain"
            />
            <Animated.View style={{ opacity: brandFade }}>
              <Text style={[styles.brandingName, { color: textPrimary, fontSize: fonts['2xl'] }]}>
                Yesswera
              </Text>
              <Text style={[styles.brandingTagline, { color: textMuted, fontSize: fonts.sm }]}>
                Lo que quieras, cuando quieras
              </Text>
            </Animated.View>
          </Animated.View>
          <Animated.View style={[
            styles.brandingBadge,
            {
              backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : 'rgba(22, 163, 74, 0.08)',
              borderColor: isDark ? 'rgba(22, 163, 74, 0.3)' : 'rgba(22, 163, 74, 0.2)',
              opacity: badgeFade,
              transform: [{ translateY: badgeSlide }],
            },
          ]}>
            <Text style={[styles.brandingBadgeText, { color: '#16A34A', fontSize: fonts.xs }]}>
              Hecho en Tomatlan, Jalisco
            </Text>
          </Animated.View>
        </View>

        {/* Banner de orden cancelada */}
        {cancelledOrder && user && (
          <View style={[styles.cancelledBanner, { backgroundColor: cardBg, borderColor: '#FEE2E2' }]}>
            <View style={styles.cancelledHeader}>
              <View style={styles.cancelledIconWrap}>
                <XCircle size={22} color="#EF4444" />
              </View>
              <View style={styles.cancelledInfo}>
                <Text style={[styles.cancelledTitle, { color: '#EF4444' }]}>Orden Cancelada</Text>
                <Text style={[styles.cancelledSub, { color: textPrimary }]}>
                  {cancelledOrder.businessName || 'Tu pedido'} no pudo completarse
                </Text>
                {cancelledOrder.cancellationReason && (
                  <Text style={[styles.cancelledReason, { color: textMuted }]}>
                    {cancelledOrder.cancellationReason}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.cancelledActions}>
              {cancelledOrder.type === 'food' && cancelledOrder.businessId ? (
                <>
                  <TouchableSound style={styles.retryBtn} onPress={handleReorderSameBusiness}>
                    <RefreshCw size={14} color="#FFFFFF" />
                    <Text style={styles.retryText}>Reintentar</Text>
                  </TouchableSound>
                  <TouchableSound style={[styles.altBtn, { backgroundColor: '#EA580C' }]} onPress={handleFindAlternative}>
                    <Text style={styles.retryText}>Ver Otros</Text>
                  </TouchableSound>
                </>
              ) : (
                <TouchableSound style={styles.retryBtn} onPress={handleFindAlternative}>
                  <RefreshCw size={14} color="#FFFFFF" />
                  <Text style={styles.retryText}>Buscar Alternativa</Text>
                </TouchableSound>
              )}
              <TouchableSound
                style={[styles.dismissBtn, { backgroundColor: isDark ? '#44403C' : '#F5F5F4' }]}
                onPress={handleDismissCancelled}
              >
                <Text style={[styles.dismissText, { color: textSecondary }]}>Cerrar</Text>
              </TouchableSound>
            </View>
          </View>
        )}

        {/* Banner de orden activa */}
        {activeOrder && user && (
          <TouchableSound
            style={[styles.activeBanner, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4' }]}
            onPress={() => router.push(`/tracking/${activeOrder.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.activeBannerContent}>
              <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.activeBannerIcon}>
                {activeOrder.type === 'food' && <UtensilsCrossed size={20} color="#16A34A" />}
                {activeOrder.type === 'shopping' && <ShoppingBag size={20} color="#16A34A" />}
                {activeOrder.type === 'delivery' && <Package size={20} color="#16A34A" />}
              </View>
              <View style={styles.activeBannerText}>
                <Text style={[styles.activeBannerTitle, { color: isDark ? '#D1FAE5' : '#15803D' }]}>
                  {getOrderStatusText(activeOrder)}
                </Text>
                <Text style={[styles.activeBannerSub, { color: isDark ? '#A7F3D0' : '#16A34A' }]}>
                  {activeOrder.orderNumber} · Ver detalles
                </Text>
              </View>
              <ChevronRight size={18} color={isDark ? '#A7F3D0' : '#16A34A'} />
            </View>
          </TouchableSound>
        )}

        {/* Service Cards */}
        <View style={styles.servicesSection}>
          {visibleServices.map((service, index) => (
            <Animated.View
              key={service.id}
              style={{
                opacity: fadeAnims[Math.min(index, fadeAnims.length - 1)],
                transform: [{ translateY: slideAnims[Math.min(index, slideAnims.length - 1)] }],
              }}
            >
              <TouchableSound
                activeOpacity={0.7}
                onPress={() => router.push(service.route as any)}
                style={[styles.serviceCard, {
                  backgroundColor: cardBg,
                  borderColor: borderColor,
                }]}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: isDark ? `${service.iconColor}20` : service.iconBg }]}>
                  <service.icon size={24} color={service.iconColor} strokeWidth={1.8} />
                </View>
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceTitle, { color: textPrimary, fontSize: fonts.lg }]}>
                    {service.title}
                  </Text>
                  <Text style={[styles.serviceSubtitle, { color: textMuted, fontSize: fonts.sm }]}>
                    {service.subtitle}
                  </Text>
                </View>
                <ChevronRight size={20} color={textMuted} />
              </TouchableSound>
            </Animated.View>
          ))}
        </View>

        {/* Pedidos recientes */}
        {user && recentOrders.length > 0 && !reorderDismissed && (
          <Swipeable
            ref={swipeableRef}
            renderLeftActions={() => <View style={{ width: 80 }} />}
            renderRightActions={() => <View style={{ width: 80 }} />}
            onSwipeableOpen={() => setReorderDismissed(true)}
            overshootLeft={false}
            overshootRight={false}
          >
            <View style={styles.reorderSection}>
              <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: fonts.lg }]}>
                Pedidos recientes
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reorderScroll}
              >
                {recentOrders.map((order) => (
                  <TouchableSound
                    key={order.id}
                    style={[styles.reorderCard, {
                      backgroundColor: cardBg,
                      borderColor: borderColor,
                    }]}
                    onPress={() => handleReorder(order)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reorderCardHeader}>
                      {order.type === 'food' && <UtensilsCrossed size={18} color="#16A34A" />}
                      {order.type === 'shopping' && <ShoppingBag size={18} color="#EA580C" />}
                      {order.type === 'delivery' && <Package size={18} color="#2563EB" />}
                      <View style={styles.reorderCardInfo}>
                        <Text style={[styles.reorderCardTitle, { color: textPrimary }]} numberOfLines={1}>
                          {order.businessName || (order.type === 'shopping' ? 'Lista de compras' : 'Entrega')}
                        </Text>
                        <View style={styles.reorderCardMeta}>
                          <Clock size={11} color={textMuted} />
                          <Text style={[styles.reorderCardDate, { color: textMuted }]}>
                            {formatOrderDate(order.deliveredAt || order.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {order.items && order.items.length > 0 && (
                      <Text style={[styles.reorderCardItems, { color: textSecondary }]} numberOfLines={2}>
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </Text>
                    )}
                    <View style={styles.reorderCardFooter}>
                      <Text style={[styles.reorderCardTotal, { color: '#16A34A' }]}>
                        ${order.total.toFixed(2)}
                      </Text>
                      <View style={styles.repeatBtn}>
                        <RefreshCw size={13} color="#FFFFFF" />
                        <Text style={styles.repeatText}>Repetir</Text>
                      </View>
                    </View>
                  </TouchableSound>
                ))}
              </ScrollView>
            </View>
          </Swipeable>
        )}

        {/* Auth prompt */}
        {!user && (
          <View style={styles.authPrompt}>
            <Text style={[styles.authText, { color: textPrimary, fontSize: fonts.base }]}>
              Listo para ordenar?
            </Text>
            <View style={styles.authRow}>
              <TouchableSound
                onPress={() => router.push('/register' as any)}
                style={[styles.primaryBtn, { borderRadius: radius.md }]}
              >
                <Text style={styles.primaryBtnText}>Crear Cuenta</Text>
              </TouchableSound>
              <TouchableSound
                onPress={() => router.push('/login' as any)}
                style={[styles.outlineBtn, { borderRadius: radius.md, backgroundColor: cardBg, borderColor: '#16A34A' }]}
              >
                <Text style={[styles.outlineBtnText, { color: '#16A34A' }]}>Iniciar Sesion</Text>
              </TouchableSound>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontWeight: '400',
    marginBottom: 2,
  },
  userName: {
    fontWeight: '700',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // Branding
  brandingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  brandingLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  brandingName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  brandingTagline: {
    fontWeight: '400',
  },
  brandingBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  brandingBadgeText: {
    fontWeight: '500',
  },

  // Active order banner
  activeBanner: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  activeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeBannerSub: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Cancelled banner
  cancelledBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cancelledIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelledInfo: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cancelledSub: {
    fontSize: 14,
    marginBottom: 4,
  },
  cancelledReason: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  cancelledActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 10,
  },
  altBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Service cards
  servicesSection: {
    gap: 12,
    marginBottom: 28,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  serviceText: {
    flex: 1,
  },
  serviceTitle: {
    fontWeight: '600',
    marginBottom: 3,
  },
  serviceSubtitle: {
    fontWeight: '400',
  },

  // Reorder section
  reorderSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 14,
  },
  reorderScroll: {
    paddingRight: 20,
  },
  reorderCard: {
    width: 260,
    borderRadius: 14,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
  },
  reorderCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  reorderCardInfo: {
    flex: 1,
  },
  reorderCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  reorderCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderCardDate: {
    fontSize: 12,
  },
  reorderCardItems: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  reorderCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reorderCardTotal: {
    fontSize: 17,
    fontWeight: '700',
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  repeatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Auth prompt
  authPrompt: {
    alignItems: 'center',
    paddingTop: 8,
  },
  authText: {
    fontWeight: '600',
    marginBottom: 16,
  },
  authRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
