import TouchableSound from '@/components/TouchableSound';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, User, ChevronRight, ShoppingBag, RefreshCw, Clock, XCircle, AlertTriangle, Sparkles, TrendingUp, Zap } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import AccessibilityControls from '@/components/AccessibilityControls';
import { getActiveOrders, getUserOrders } from '@/services/orders';
import { getClientTransferMessage } from '@/services/driver-monitoring';
import { useClientOrderSubscription } from '@/hooks/useRealtimeOrders';
import { Order, OrderStatus } from '@/constants/types';
import Colors from '@/constants/colors';
import { Toast } from '@/utils/toast';
import { supabase } from '@/constants/supabase';
import { getUserPreferences, DisplayPreferences, ServiceType } from '@/services/user-preferences';

// Colores para modo claro/oscuro
const COLORS = {
  light: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E'
  },
  dark: {
    background: '#1C1917',
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C'
  },
};

// Servicios disponibles (fuera del componente para evitar recreación)
const services = [
  {
    id: 'food',
    title: 'Alimentos y Bebidas',
    subtitle: 'Restaurantes y Cafés',
    icon: UtensilsCrossed,
    badge: Sparkles,
    badgeText: 'Popular',
    color1: Colors.primary,
    color2: Colors.primaryDark,
    route: '/food/restaurants',
    pattern: '🌮',
  },
  {
    id: 'shopping',
    title: 'Lista de Compras',
    subtitle: 'Escribe y te lo llevamos',
    icon: ShoppingCart,
    badge: Zap,
    badgeText: 'Rápido',
    color1: Colors.secondary,
    color2: Colors.secondaryDark,
    route: '/shopping',
    pattern: '🛒',
  },
  {
    id: 'delivery',
    title: 'Recoger y Entregar',
    subtitle: 'Mensajería Express',
    icon: Package,
    badge: TrendingUp,
    badgeText: 'Nuevo',
    color1: Colors.accent,
    color2: Colors.accentDark,
    route: '/delivery/create',
    pattern: '📦',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { isDark, colors, fonts, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPreferences | null>(null);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const [serviceAnimations] = useState(() => 
    services.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Redirigir por rol: negocio y driver no deben ver el home de cliente
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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      serviceAnimations.forEach((anim, index) => {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 40,
            friction: 7,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 600,
            delay: index * 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
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
      // Load active orders
      const orders = await getActiveOrders(user.id);
      if (orders.length > 0) {
        setActiveOrder(orders[0]);
      } else {
        setActiveOrder(null);
      }

      // Load recently cancelled orders (last 30 minutes)
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

        // Check if user already dismissed this notification
        let wasDismissed = false;
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const dismissedKey = `dismissed_cancelled_${cancelled.id}`;
          const dismissed = await AsyncStorage.getItem(dismissedKey);
          wasDismissed = dismissed === 'true';
        } catch (e) {
          // Storage not available, show the notification
        }

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
        // No recent cancelled orders, clear state
        if (!cancelledOrder) {
          setCancelledOrder(null);
        }
      }
    } catch (error) {
      console.error('Error loading order data:', error);
    }
  }, [user, token]);

  // Realtime subscription for order updates
  useClientOrderSubscription(
    useCallback(() => {
      // Refresh order data when we get realtime updates
      loadOrderData();
    }, [loadOrderData])
  );

  // Reload orders when screen gets focus (e.g., after creating an order)
  useFocusEffect(
    useCallback(() => {
      if (user && token) {
        loadOrderData();
        // Load user display preferences
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
        console.error('Error cargando órdenes recientes:', error);
      }
    };

    checkActiveOrder();
    loadRecentOrders();

    // Reduced polling since we have realtime now
    const interval = setInterval(checkActiveOrder, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, token, loadOrderData]);

  const getOrderStatusText = (order: Order) => {
    // Si es una transferencia, mostrar mensaje personalizado segun la razon
    if (order.needsDriverTransfer && order.status === 'ready') {
      if (order.transferReason) {
        return '🔄 ' + getClientTransferMessage(order.transferReason);
      }
      return '🔄 Buscando nuevo repartidor...';
    }

    switch (order.status) {
      case 'pending': return '⏳ Esperando confirmacion del negocio...';
      case 'accepted': return '✅ Negocio acepto tu orden';
      case 'preparing': return '👨‍🍳 Preparando tu orden';
      case 'ready': return '✅ Orden lista, buscando repartidor...';
      case 'assigned': return '🚴 Repartidor va al negocio';
      case 'driver_verified': return '🚴 Repartidor en el negocio';
      case 'handed_to_driver': return '📦 Repartidor tiene tu orden';
      case 'in_transit': return '🚴 Tu orden va en camino';
      case 'arrived': return '🏠 Repartidor llego, sal a recibir';
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
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return orderDate.toLocaleDateString();
  };

  // Filter and sort services based on user preferences
  const visibleServices = useMemo(() => {
    if (!displayPrefs) return services;

    // Filter out hidden services
    const filtered = services.filter(s => !displayPrefs.hiddenServices.includes(s.id as ServiceType));

    // Sort by user's preferred order
    return filtered.sort((a, b) => {
      const orderA = displayPrefs.serviceOrder.indexOf(a.id as ServiceType);
      const orderB = displayPrefs.serviceOrder.indexOf(b.id as ServiceType);
      // If not in the order list, put at the end
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
  }, [displayPrefs]);

  const handleReorder = (order: Order) => {
    Toast.success('¡Orden agregada al carrito!');
    if (order.type === 'food' && order.businessId) {
      router.push(`/food/menu/${order.businessId}` as any);
    } else if (order.type === 'shopping') {
      router.push('/shopping/stores' as any);
    } else {
      router.push('/delivery/create' as any);
    }
  };

  // Only dismiss when user explicitly closes - NOT when navigating
  const handleDismissCancelled = async () => {
    // Mark as dismissed in storage so it doesn't reappear
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

  // Reorder at the same business - keep banner visible
  const handleReorderSameBusiness = () => {
    const businessId = cancelledOrder?.businessId;
    // DON'T clear the cancelled order - user might come back
    if (businessId) {
      router.push(`/food/menu/${businessId}` as any);
    } else {
      router.push('/food/restaurants' as any);
    }
  };

  // Find alternative businesses - keep banner visible
  const handleFindAlternative = () => {
    const orderType = cancelledOrder?.type;
    // DON'T clear the cancelled order - user might come back
    if (orderType === 'food') {
      router.push('/food/restaurants' as any);
    } else if (orderType === 'shopping') {
      router.push('/shopping/stores' as any);
    } else {
      router.push('/food/restaurants' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <LinearGradient
        colors={isDark
          ? [theme.background, theme.card, theme.cardAlt]
          : ['#FFFFFF', '#F0FDF9', '#ECFDF5', '#F8FAFC']
        }
        style={styles.gradient}
      />

      <View style={styles.decorativePatterns}>
        {[...Array(8)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.patternCircle,
              {
                left: `${(i % 4) * 30}%`,
                top: `${Math.floor(i / 4) * 50}%`,
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.03, 0.06, 0.03],
                }),
                transform: [
                  {
                    scale: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row: Accesibilidad + Perfil */}
        <View style={styles.headerRow}>
          <AccessibilityControls variant="minimal" />
          {user && (
            <TouchableSound
              style={[styles.userButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}
              onPress={() => router.push('/profile' as any)}
            >
              <User size={24} color={theme.text} />
            </TouchableSound>
          )}
        </View>

        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: floatingAnim },
              ],
            },
          ]}
        >
          <Animated.View 
            style={[
              styles.logoGlow,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Image 
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1vcwmxc8pzt7x8m13osxp' }}
            style={styles.logoImage}
            contentFit="contain"
          />
          <View style={styles.taglineContainer}>
            <Text style={[styles.tagline, { fontSize: fonts.lg, color: theme.text }]}>Lo que quieras, cuando quieras</Text>
            <View style={[styles.mexicanAccent, { backgroundColor: isDark ? 'rgba(0, 200, 150, 0.15)' : 'rgba(0, 200, 150, 0.08)' }]}>
              <Text style={styles.mexicanEmoji}>🇲🇽</Text>
              <Text style={styles.localText}>Hecho en Jalisco</Text>
            </View>
          </View>
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.divider}
          />
        </Animated.View>

        {/* Banner de orden cancelada - prioridad alta */}
        {cancelledOrder && user && (
          <View style={[styles.cancelledOrderBanner, { backgroundColor: theme.card }]}>
            <View style={styles.cancelledBannerHeader}>
              <View style={styles.cancelledIconContainer}>
                <XCircle size={28} color={Colors.error} />
              </View>
              <View style={styles.cancelledTextContainer}>
                <Text style={styles.cancelledTitle}>Orden Cancelada</Text>
                <Text style={[styles.cancelledSubtitle, { color: theme.text }]}>
                  {cancelledOrder.businessName || 'Tu pedido'} no pudo completarse
                </Text>
                {cancelledOrder.cancellationReason && (
                  <Text style={[styles.cancelledReason, { color: theme.textSecondary }]}>
                    {cancelledOrder.cancellationReason}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.cancelledActions}>
              {/* If food order with businessId, offer to reorder at same place */}
              {cancelledOrder.type === 'food' && cancelledOrder.businessId ? (
                <>
                  <TouchableSound
                    style={styles.reorderSameButton}
                    onPress={handleReorderSameBusiness}
                  >
                    <RefreshCw size={16} color={Colors.white} />
                    <Text style={styles.findAlternativeText}>Reintentar</Text>
                  </TouchableSound>
                  <TouchableSound
                    style={styles.findOtherButton}
                    onPress={handleFindAlternative}
                  >
                    <Text style={styles.findOtherText}>Ver Otros</Text>
                  </TouchableSound>
                </>
              ) : (
                <TouchableSound
                  style={styles.findAlternativeButton}
                  onPress={handleFindAlternative}
                >
                  <RefreshCw size={16} color={Colors.white} />
                  <Text style={styles.findAlternativeText}>Buscar Alternativa</Text>
                </TouchableSound>
              )}
              <TouchableSound
                style={[styles.dismissButton, { backgroundColor: theme.cardAlt }]}
                onPress={handleDismissCancelled}
              >
                <Text style={[styles.dismissButtonText, { color: theme.textSecondary }]}>Cerrar</Text>
              </TouchableSound>
            </View>
          </View>
        )}

        {activeOrder && user && (
          <TouchableSound
            style={styles.activeOrderBanner}
            onPress={() => router.push(`/tracking/${activeOrder.id}` as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.bannerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.bannerContent}>
                <View style={styles.bannerIcon}>
                  {activeOrder.type === 'food' && <UtensilsCrossed size={24} color={Colors.white} />}
                  {activeOrder.type === 'shopping' && <ShoppingBag size={24} color={Colors.white} />}
                  {activeOrder.type === 'delivery' && <Package size={24} color={Colors.white} />}
                </View>
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>
                    {getOrderStatusText(activeOrder)}
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    {activeOrder.orderNumber} • Tap para ver detalles
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.white} />
              </View>
            </LinearGradient>
          </TouchableSound>
        )}

        {user && recentOrders.length > 0 && (
          <View style={styles.reorderSection}>
            <View style={styles.reorderHeader}>
              <RefreshCw size={20} color={Colors.primary} />
              <Text style={[styles.reorderTitle, { fontSize: fonts.lg, color: theme.text }]}>Volver a Pedir</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reorderScrollContent}
            >
              {recentOrders.map((order) => (
                <TouchableSound
                  key={order.id}
                  style={[styles.reorderCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}
                  onPress={() => handleReorder(order)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reorderCardHeader}>
                    {order.type === 'food' && <UtensilsCrossed size={20} color={Colors.primary} />}
                    {order.type === 'shopping' && <ShoppingBag size={20} color={Colors.secondary} />}
                    {order.type === 'delivery' && <Package size={20} color={Colors.accent} />}
                    <View style={styles.reorderCardTitleContainer}>
                      <Text style={[styles.reorderCardTitle, { color: theme.text }]} numberOfLines={1}>
                        {order.businessName || (order.type === 'shopping' ? 'Lista de compras' : 'Entrega')}
                      </Text>
                      <View style={styles.reorderCardMeta}>
                        <Clock size={12} color={theme.textMuted} />
                        <Text style={[styles.reorderCardDate, { color: theme.textMuted }]}>
                          {formatOrderDate(order.deliveredAt || order.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {order.items && order.items.length > 0 && (
                    <Text style={[styles.reorderCardItems, { color: theme.textSecondary }]} numberOfLines={2}>
                      {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                    </Text>
                  )}
                  <View style={styles.reorderCardFooter}>
                    <Text style={styles.reorderCardTotal}>${order.total.toFixed(2)}</Text>
                    <View style={styles.reorderButton}>
                      <RefreshCw size={14} color={Colors.white} />
                      <Text style={styles.reorderButtonText}>Repetir</Text>
                    </View>
                  </View>
                </TouchableSound>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.servicesContainer}>
          {visibleServices.map((service, index) => (
            <Animated.View
              key={service.id}
              style={{
                opacity: serviceAnimations[Math.min(index, serviceAnimations.length - 1)]?.opacity,
                transform: [{ scale: serviceAnimations[Math.min(index, serviceAnimations.length - 1)]?.scale }],
                marginBottom: index === visibleServices.length - 1 ? 0 : 20,
              }}
            >
              <TouchableSound
                activeOpacity={0.8}
                onPress={() => router.push(service.route as any)}
                style={styles.serviceCard}
              >
                <LinearGradient
                  colors={[service.color1, service.color2]}
                  style={styles.serviceGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.patternOverlay}>
                    <Text style={styles.patternEmoji}>{service.pattern}</Text>
                    <Text style={styles.patternEmoji}>{service.pattern}</Text>
                    <Text style={styles.patternEmoji}>{service.pattern}</Text>
                  </View>
                  
                  <View style={styles.serviceContent}>
                    <View style={styles.serviceIconContainer}>
                      <View style={styles.iconGlow} />
                      <service.icon size={40} color={Colors.white} strokeWidth={2.5} />
                    </View>
                    <View style={styles.serviceText}>
                      <View style={styles.serviceTitleRow}>
                        <Text style={[styles.serviceTitle, { fontSize: fonts['2xl'] }]}>{service.title}</Text>
                      </View>
                      <Text style={[styles.serviceSubtitle, { fontSize: fonts.base }]}>{service.subtitle}</Text>
                    </View>
                    {Platform.OS === 'web' ? (
                      <View style={styles.serviceBadge}>
                        <service.badge size={12} color={Colors.white} />
                        <Text style={styles.badgeText}>{service.badgeText}</Text>
                      </View>
                    ) : (
                      <BlurView intensity={20} style={styles.serviceBadge}>
                        <service.badge size={12} color={Colors.white} />
                        <Text style={styles.badgeText}>{service.badgeText}</Text>
                      </BlurView>
                    )}
                  </View>
                  
                  <View style={styles.sparkleContainer}>
                    <View style={[styles.sparkle, styles.sparkle1]} />
                    <View style={[styles.sparkle, styles.sparkle2]} />
                    <View style={[styles.sparkle, styles.sparkle3]} />
                  </View>
                </LinearGradient>
              </TouchableSound>
            </Animated.View>
          ))}
        </View>



        {!user && (
          <View style={styles.authPrompt}>
            <Text style={[styles.authPromptText, { fontSize: fonts.base, color: theme.text }]}>¿Listo para ordenar?</Text>
            <View style={styles.authButtonsRow}>
              <TouchableSound
                onPress={() => router.push('/register' as any)}
                style={[styles.registerButton, { padding: space.md, borderRadius: radius.md }]}
              >
                <Text style={[styles.registerButtonText, { fontSize: fonts.sm }]}>Crear Cuenta</Text>
              </TouchableSound>
              <TouchableSound
                onPress={() => router.push('/login' as any)}
                style={[styles.authPromptButton, { padding: space.md, borderRadius: radius.md, backgroundColor: theme.card, borderColor: Colors.primary }]}
              >
                <Text style={[styles.authPromptButtonText, { fontSize: fonts.sm }]}>Iniciar Sesion</Text>
              </TouchableSound>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  gradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center' as const,
    marginBottom: 40,
    paddingTop: 20,
  },
  logoGlow: {
    position: 'absolute' as const,
    width: 320,
    height: 180,
    borderRadius: 160,
    backgroundColor: Colors.primary,
    opacity: 0.2,
    top: 10,
  },
  taglineContainer: {
    alignItems: 'center' as const,
  },
  mexicanAccent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
    borderRadius: 12,
  },
  mexicanEmoji: {
    fontSize: 14,
  },
  localText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  decorativePatterns: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden' as const,
  },
  patternCircle: {
    position: 'absolute' as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  logoImage: {
    width: 320,
    height: 130,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
  divider: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginTop: 20,
  },
  headerRow: {
    position: 'absolute' as const,
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  userButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  loginText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  servicesContainer: {
    marginBottom: 32,
  },
  serviceCard: {
    borderRadius: 28,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  serviceGradient: {
    padding: 28,
    minHeight: 160,
    position: 'relative' as const,
  },
  patternOverlay: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '40%',
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    opacity: 0.1,
  },
  patternEmoji: {
    fontSize: 60,
    transform: [{ rotate: '15deg' }],
  },
  serviceContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  serviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative' as const,
  },
  iconGlow: {
    position: 'absolute' as const,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    opacity: 0.3,
  },
  serviceText: {
    flex: 1,
  },
  serviceTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  serviceSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  serviceBadge: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden' as const,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  sparkleContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute' as const,
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  sparkle1: {
    top: 40,
    left: 100,
  },
  sparkle2: {
    top: 80,
    right: 60,
  },
  sparkle3: {
    bottom: 50,
    left: 50,
  },

  authPrompt: {
    alignItems: 'center' as const,
    paddingTop: 8,
  },
  authPromptText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  authButtonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    width: '100%' as const,
  },
  registerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
    textAlign: 'center' as const,
  },
  authPromptButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  authPromptButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
    textAlign: 'center' as const,
  },
  cancelledOrderBanner: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: Colors.white,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelledBannerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
  },
  cancelledIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  cancelledTextContainer: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.error,
    marginBottom: 4,
  },
  cancelledSubtitle: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cancelledReason: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic' as const,
  },
  cancelledActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  findAlternativeButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  reorderSameButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  findOtherButton: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  findOtherText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  findAlternativeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  activeOrderBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerGradient: {
    padding: 16,
  },
  bannerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  reorderSection: {
    marginBottom: 32,
  },
  reorderHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 16,
  },
  reorderTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  reorderScrollContent: {
    paddingRight: 20,
  },
  reorderCard: {
    width: 280,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reorderCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    marginBottom: 12,
  },
  reorderCardTitleContainer: {
    flex: 1,
  },
  reorderCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  reorderCardMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  reorderCardDate: {
    fontSize: 12,
    color: Colors.text.light,
  },
  reorderCardItems: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  reorderCardFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  reorderCardTotal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  reorderButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reorderButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
