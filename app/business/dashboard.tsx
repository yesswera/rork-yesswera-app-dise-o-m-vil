import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: DASHBOARD DEL NEGOCIO
// Usa ScreenContainer para diseño unificado
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Alert,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { DollarSign, Package, TrendingUp, LogOut, ShoppingBag, Monitor, Store } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import AccessibilityControls from '@/components/AccessibilityControls';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';

// ============================================================================
// COLORES EXPLICITOS PARA MODO OSCURO
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

export default function BusinessDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, colors, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    rating: 0,
    activeProducts: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  // Prevenir boton atras
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Cerrar Sesion', 'Quieres cerrar sesion?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesion', style: 'destructive', onPress: handleLogout },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesion', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  // Header content con AccessibilityControls
  const headerContent = (
    <View style={styles.accessibilityRow}>
      <AccessibilityControls variant="minimal" />
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={Store}
      headerTitle="Portal de Negocio"
      headerSubtitle={user?.name || 'Mi Negocio'}
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color="secondary">Cargando estadisticas...</ThemedText>
        </View>
      ) : (
        <>
          {/* Stats Grid */}
          <View style={[styles.statsGrid, { gap: space.sm, marginBottom: space.lg }]}>
            {[
              { icon: Package, value: stats.todayOrders, label: 'Ordenes Hoy', color: colors.secondary },
              { icon: DollarSign, value: `$${stats.todayRevenue.toFixed(2)}`, label: 'Ingresos Hoy', color: colors.success },
              { icon: TrendingUp, value: stats.rating.toFixed(1), label: 'Rating', color: colors.warning },
              { icon: Package, value: stats.activeProducts, label: 'Productos', color: colors.accent },
            ].map((stat, index) => (
              <View
                key={index}
                style={[styles.statCard, {
                  backgroundColor: theme.card,
                  borderRadius: radius.md,
                  padding: space.md,
                }]}
              >
                <stat.icon size={24} color={stat.color} />
                <ThemedText variant="h3" style={{ marginTop: space.xs, color: theme.text }}>{stat.value}</ThemedText>
                <ThemedText variant="caption" style={{ color: theme.textSecondary, textAlign: 'center' }}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={[styles.actionsSection, { gap: space.sm }]}>
            <TouchableSound
              style={[styles.primaryButton, {
                backgroundColor: colors.secondary,
                borderRadius: radius.md,
                padding: space.md,
              }]}
              onPress={() => router.push('/business/orders')}
            >
              <Package size={22} color="#fff" />
              <ThemedText variant="subtitle" color="white" bold>Ver Ordenes</ThemedText>
            </TouchableSound>

            <TouchableSound
              style={[styles.secondaryButton, {
                backgroundColor: theme.card,
                borderColor: colors.secondary,
                borderRadius: radius.md,
                padding: space.md,
              }]}
              onPress={() => router.push('/business/products' as any)}
            >
              <ShoppingBag size={22} color={colors.secondary} />
              <ThemedText variant="subtitle" style={{ color: colors.secondary, fontWeight: '700' }}>Gestionar Productos</ThemedText>
            </TouchableSound>

            <TouchableSound
              style={[styles.secondaryButton, {
                backgroundColor: theme.card,
                borderColor: colors.accent,
                borderRadius: radius.md,
                padding: space.md,
              }]}
              onPress={() => router.push('/business/comanda-mode' as any)}
            >
              <Monitor size={22} color={colors.accent} />
              <ThemedText variant="subtitle" style={{ color: colors.accent, fontWeight: '700' }}>Modo Comanda (Tablet)</ThemedText>
            </TouchableSound>

            <TouchableSound
              style={[styles.logoutButton, {
                borderColor: colors.error,
                borderRadius: radius.md,
                padding: space.md,
                marginTop: space.lg,
              }]}
              onPress={handleLogout}
            >
              <LogOut size={20} color={colors.error} />
              <ThemedText variant="body" color="error" bold>Cerrar Sesion</ThemedText>
            </TouchableSound>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  accessibilityRow: {
    alignItems: 'flex-end',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionsSection: {},
  primaryButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
  },
  logoutButton: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    marginBottom: 40,
  },
});
