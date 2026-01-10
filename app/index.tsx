import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, User, Briefcase, Truck, ChevronRight, ShoppingBag, RefreshCw, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
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
      title: 'Coger y Entregar',
      subtitle: 'Mensajería Express',
      icon: Package,
      color1: Colors.accent,
      color2: Colors.accentDark,
      route: '/delivery/create',
    },
  ];

  const portals = [
    {
      id: 'driver',
      title: 'Portal Repartidor',
      icon: Truck,
      color: Colors.primary,
      route: '/driver/dashboard',
    },
    {
      id: 'business',
      title: 'Portal Negocio',
      icon: Briefcase,
      color: Colors.secondary,
      route: '/business/dashboard',
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
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kiumpzuloka2q3aib1mc0' }}
              style={styles.logoImage}
              contentFit="contain"
            />
            <Text style={styles.tagline}>Lo que quieras, cuando quieras</Text>
          </View>
          
          {user ? (
            <TouchableOpacity 
              style={styles.userButton}
              onPress={() => router.push('/profile' as any)}
            >
              <User size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/login' as any)}
            >
              <Text style={styles.loginText}>Entrar</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <View style={styles.divider} />

        <View style={styles.portalsSection}>
          <Text style={styles.portalsSectionTitle}>¿Quieres trabajar con nosotros?</Text>
          <View style={styles.portalsContainer}>
            {portals.map((portal) => (
              <TouchableOpacity
                key={portal.id}
                activeOpacity={0.8}
                onPress={() => router.push(portal.route as any)}
                style={styles.portalCard}
              >
                <View style={[styles.portalIcon, { backgroundColor: `${portal.color}15` }]}>
                  <portal.icon size={28} color={portal.color} strokeWidth={2} />
                </View>
                <Text style={styles.portalTitle}>{portal.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!user && (
          <View style={styles.authPrompt}>
            <Text style={styles.authPromptText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity
              onPress={() => router.push('/login' as any)}
              style={styles.authPromptButton}
            >
              <Text style={styles.authPromptButtonText}>Iniciar Sesión</Text>
            </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 40,
  },
  logoContainer: {
    flex: 1,
  },
  logoImage: {
    width: 200,
    height: 80,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  userButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    borderRadius: 20,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  serviceGradient: {
    padding: 24,
    minHeight: 120,
  },
  serviceContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  serviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  serviceText: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 24,
  },
  portalsSection: {
    marginBottom: 32,
  },
  portalsSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  portalsContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  portalCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  portalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  portalTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
  },
  authPrompt: {
    alignItems: 'center' as const,
    paddingTop: 8,
  },
  authPromptText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  authPromptButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  authPromptButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
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
