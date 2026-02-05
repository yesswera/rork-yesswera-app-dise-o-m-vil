import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, Package, TrendingUp, LogOut, ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

export default function BusinessDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    rating: 0,
    activeProducts: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('id, rating_average')
        .eq('user_id', user.id)
        .single();

      if (!business) {
        setLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from('orders')
        .select('total')
        .eq('business_id', business.id)
        .gte('created_at', today.toISOString());

      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', business.id)
        .eq('available', true);

      setStats({
        todayOrders: orders?.length || 0,
        todayRevenue: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
        rating: business?.rating_average || 0,
        activeProducts: products?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrders = () => {
    router.push('/business/orders');
  };

  const handleManageProducts = () => {
    Alert.alert('Próximamente', 'La gestión de productos estará disponible pronto');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.push('/' as any);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.secondary, Colors.secondaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Portal de Negocio</Text>
            <Text style={styles.subtitle}>{user?.name || 'Mi Negocio'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando estadísticas...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Package size={24} color={Colors.secondary} />
                  <Text style={styles.statValue}>{stats.todayOrders}</Text>
                  <Text style={styles.statLabel}>Órdenes Hoy</Text>
                </View>
                <View style={styles.statCard}>
                  <DollarSign size={24} color={Colors.success} />
                  <Text style={styles.statValue}>${stats.todayRevenue.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Ingresos Hoy</Text>
                </View>
                <View style={styles.statCard}>
                  <TrendingUp size={24} color={Colors.warning} />
                  <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statCard}>
                  <Package size={24} color={Colors.accent} />
                  <Text style={styles.statValue}>{stats.activeProducts}</Text>
                  <Text style={styles.statLabel}>Productos</Text>
                </View>
              </View>

              <View style={styles.actionsSection}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleViewOrders}>
                  <Package size={22} color={Colors.white} />
                  <Text style={styles.primaryButtonText}>Ver Órdenes</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleManageProducts}>
                  <ShoppingBag size={22} color={Colors.secondary} />
                  <Text style={styles.secondaryButtonText}>Gestionar Productos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <LogOut size={20} color={Colors.error} />
                  <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  headerContent: {
    marginTop: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 16,
    marginTop: -16,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
  primaryButton: {
    height: 56,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 10,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  secondaryButton: {
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: 12,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  logoutButton: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 12,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginBottom: 40,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
});
