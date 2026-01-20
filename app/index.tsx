import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, User, ChevronRight, ShoppingBag, RefreshCw, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { getActiveOrders, getUserOrders } from '@/services/orders';
import { Order, OrderStatus } from '@/constants/types';
import Colors from '@/constants/colors';
import { Toast } from '@/utils/toast';

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

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
    ]).start();
  }, []);

  useEffect(() => {
    if (!user || !token) {
      setActiveOrder(null);
      return;
    }

    const checkActiveOrder = async () => {
      try {
        const orders = await getActiveOrders(user.id, token);
        if (orders.length > 0) {
          setActiveOrder(orders[0]);
        } else {
          setActiveOrder(null);
        }
      } catch (error) {
        console.error('Error obteniendo orden activa:', error);
        setActiveOrder(null);
      }
    };

    const loadRecentOrders = async () => {
      try {
        const allOrders = await getUserOrders(user.id, token);
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

    const interval = setInterval(checkActiveOrder, 10000);
    return () => clearInterval(interval);
  }, [user, token]);

  const getOrderStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return '⏳ Buscando repartidor...';
      case 'confirmed': return '✅ Orden confirmada';
      case 'preparing': return '👨‍🍳 Preparando tu orden';
      case 'ready': return '📦 Orden lista para recoger';
      case 'accepted': return '🚴 Repartidor asignado';
      case 'in_transit': return '🚴 Tu orden está en camino';
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

  const services = [
    {
      id: 'food',
      title: 'Alimentos y Bebidas',
      subtitle: 'Restaurantes y Cafés',
      icon: UtensilsCrossed,
      color1: Colors.primary,
      color2: Colors.primaryDark,
      route: '/food/restaurants',
    },
    {
      id: 'shopping',
      title: 'Lista de Compras',
      subtitle: 'Supermercados y Tiendas',
      icon: ShoppingCart,
      color1: Colors.secondary,
      color2: Colors.secondaryDark,
      route: '/shopping/stores',
    },
    {
      id: 'delivery',
      title: 'Recoger y Entregar',
      subtitle: 'Mensajería Express',
      icon: Package,
      color1: Colors.accent,
      color2: Colors.accentDark,
      route: '/delivery/create',
    },
  ];



  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary, Colors.background.tertiary]}
        style={styles.gradient}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {user && (
          <TouchableOpacity 
            style={styles.userButton}
            onPress={() => router.push('/profile' as any)}
          >
            <User size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        )}

        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoGlow} />
          <Image 
            source={require('../assets/images/icon.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.tagline}>Lo que quieras, cuando quieras</Text>
          <View style={styles.divider} />
        </Animated.View>

        {activeOrder && user && (
          <TouchableOpacity
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
                    {getOrderStatusText(activeOrder.status)}
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    {activeOrder.orderNumber} • Tap para ver detalles
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {user && recentOrders.length > 0 && (
          <View style={styles.reorderSection}>
            <View style={styles.reorderHeader}>
              <RefreshCw size={20} color={Colors.primary} />
              <Text style={styles.reorderTitle}>Volver a Pedir</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reorderScrollContent}
            >
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.reorderCard}
                  onPress={() => handleReorder(order)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reorderCardHeader}>
                    {order.type === 'food' && <UtensilsCrossed size={20} color={Colors.primary} />}
                    {order.type === 'shopping' && <ShoppingBag size={20} color={Colors.secondary} />}
                    {order.type === 'delivery' && <Package size={20} color={Colors.accent} />}
                    <View style={styles.reorderCardTitleContainer}>
                      <Text style={styles.reorderCardTitle} numberOfLines={1}>
                        {order.businessName || (order.type === 'shopping' ? 'Lista de compras' : 'Entrega')}
                      </Text>
                      <View style={styles.reorderCardMeta}>
                        <Clock size={12} color={Colors.text.light} />
                        <Text style={styles.reorderCardDate}>
                          {formatOrderDate(order.deliveredAt || order.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {order.items && order.items.length > 0 && (
                    <Text style={styles.reorderCardItems} numberOfLines={2}>
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
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.servicesContainer}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.8}
              onPress={() => router.push(service.route as any)}
              style={[
                styles.serviceCard,
                { marginBottom: index === services.length - 1 ? 0 : 16 }
              ]}
            >
              <LinearGradient
                colors={[service.color1, service.color2]}
                style={styles.serviceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.serviceContent}>
                  <View style={styles.serviceIconContainer}>
                    <service.icon size={40} color={Colors.white} strokeWidth={2} />
                  </View>
                  <View style={styles.serviceText}>
                    <Text style={styles.serviceTitle}>{service.title}</Text>
                    <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>



        {!user && (
          <View style={styles.authPrompt}>
            <Text style={styles.authPromptText}>¿Listo para ordenar?</Text>
            <View style={styles.authButtonsRow}>
              <TouchableOpacity
                onPress={() => router.push('/auth/register-client' as any)}
                style={styles.registerButton}
              >
                <Text style={styles.registerButtonText}>Crear Cuenta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/login' as any)}
                style={styles.authPromptButton}
              >
                <Text style={styles.authPromptButtonText}>Iniciar Sesión</Text>
              </TouchableOpacity>
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
    opacity: 0.15,
    top: 10,
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
    width: 60,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 16,
  },
  userButton: {
    position: 'absolute' as const,
    top: 60,
    right: 20,
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
    zIndex: 10,
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
    borderRadius: 24,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  serviceGradient: {
    padding: 28,
    minHeight: 140,
  },
  serviceContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  serviceIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  serviceText: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  serviceSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500' as const,
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
