import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, Home, Clock, User } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/auth';
import { getActiveOrders } from '@/services/orders';
import { Order } from '@/constants/types';
import { DS } from '@/constants/design';
import ServiceCard from '@/components/ui/ServiceCard';
import ActiveOrderBanner from '@/components/ui/ActiveOrderBanner';
import YAvatar from '@/components/ui/YAvatar';
import BigButton from '@/components/ui/BigButton';

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

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

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

  // Load active order on focus
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setActiveOrder(null);
        return;
      }
      getActiveOrders(user.id)
        .then((orders) => setActiveOrder(orders.length > 0 ? orders[0] : null))
        .catch(() => setActiveOrder(null));
    }, [user])
  );

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
    marginBottom: DS.space.xxxl,
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

  // Active order banner
  bannerWrap: {
    marginBottom: DS.space.xxl,
  },

  // Services
  services: {
    gap: DS.space.lg,
    marginBottom: DS.space.xxxl,
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
