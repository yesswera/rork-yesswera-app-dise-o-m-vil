import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UtensilsCrossed, ShoppingCart, Package, User, Briefcase, Truck } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

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
            <Text style={styles.logo}>Rork</Text>
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
    width: 140,
    height: 50,
    marginBottom: 4,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: -1,
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
});
