import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: MENU DE NEGOCIO
// Usa ScreenContainer para diseño unificado con gradiente verde
// ============================================================================

import {
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingCart, Plus, Minus, Store } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { Business, Product } from '@/constants/types';
import { formatPriceWithUnit } from '@/constants/units';
import { getBusinessById, getBusinessMenu } from '@/services/products';
import { useCart } from '@/contexts/cart';
import EmptyState from '@/components/EmptyState';
import ScreenContainer from '@/components/ScreenContainer';

// ============================================================================
// COLORES EXPLÍCITOS PARA MODO OSCURO
// ============================================================================
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1' },
};

export default function MenuScreen() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const { isDark, colors, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const { items, addItem, updateQuantity, itemCount } = useCart();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!businessId) return;
    try {
      const [biz, menu] = await Promise.all([
        getBusinessById(businessId),
        getBusinessMenu(businessId),
      ]);
      if (signal?.cancelled) return;
      setBusiness(biz);
      setProducts(menu);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [businessId]);

  useEffect(() => {
    const signal = { cancelled: false };
    setLoading(true);
    loadData(signal);
    return () => { signal.cancelled = true; };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getItemQuantity = (productId: string) => {
    return items.find((item) => item.id === productId)?.quantity || 0;
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
  };

  const handleGoToCart = () => {
    if (itemCount === 0) {
      Alert.alert('Carrito vacio', 'Agrega productos al carrito primero');
      return;
    }
    router.push('/food/cart' as any);
  };

  // Loading state
  if (loading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Store}
        headerTitle="Cargando..."
        headerSubtitle="Obteniendo menu"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (!business) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Store}
        headerTitle="Error"
        headerSubtitle="Negocio no encontrado"
      >
        <View style={styles.errorContainer}>
          <ThemedText variant="body" color="secondary">
            No se pudo cargar la informacion del negocio
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  // Floating cart button
  const cartButton = itemCount > 0 ? (
    <TouchableSound
      style={[styles.cartButton, { backgroundColor: colors.primary }]}
      onPress={handleGoToCart}
    >
      <View style={styles.cartBadge}>
        <ThemedText variant="caption" style={styles.cartBadgeText}>{itemCount}</ThemedText>
      </View>
      <ThemedText variant="body" style={styles.cartButtonText}>Ver Carrito</ThemedText>
      <ShoppingCart size={20} color="#FFFFFF" />
    </TouchableSound>
  ) : null;

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Store}
      headerTitle={business.name}
      headerSubtitle={business.description}
      refreshing={refreshing}
      onRefresh={onRefresh}
      footer={cartButton}
      footerPadding={itemCount > 0 ? 100 : 0}
    >
      {/* Business image banner */}
      {business.image ? (
        <Image
          source={{ uri: business.image }}
          style={[styles.headerImage, { borderRadius: radius.lg, marginBottom: space.md }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.headerImage, styles.imagePlaceholder, {
          backgroundColor: theme.cardAlt,
          borderRadius: radius.lg,
          marginBottom: space.md,
        }]}>
          <ThemedText variant="h1" color="secondary">{business.name.charAt(0)}</ThemedText>
        </View>
      )}

      {/* Menu section */}
      <View style={styles.productsSection}>
        <ThemedText variant="h2" style={{ marginBottom: space.md }}>Menu</ThemedText>

        {products.length === 0 ? (
          <EmptyState title="Sin productos" message="Este negocio aun no tiene productos disponibles" />
        ) : (
          <View style={[styles.productsGrid, { gap: space.md }]}>
            {products.map((product) => {
              const quantity = getItemQuantity(product.id);
              return (
                <View
                  key={product.id}
                  style={[styles.productCard, {
                    backgroundColor: theme.card,
                    borderRadius: radius.lg,
                  }]}
                >
                  {product.image ? (
                    <Image
                      source={{ uri: product.image }}
                      style={[styles.productImage, { borderRadius: radius.md }]}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder, {
                      backgroundColor: theme.cardAlt,
                      borderRadius: radius.md,
                    }]}>
                      <ThemedText variant="h2" color="secondary">{product.name.charAt(0)}</ThemedText>
                    </View>
                  )}

                  <View style={[styles.productInfo, { padding: space.sm }]}>
                    <ThemedText variant="subtitle" bold>{product.name}</ThemedText>
                    <ThemedText variant="caption" color="secondary" numberOfLines={2}>
                      {product.description}
                    </ThemedText>

                    <View style={styles.productFooter}>
                      <ThemedText variant="subtitle" bold style={{ color: colors.primary }}>
                        {formatPriceWithUnit(product.price, (product as any).unit || 'pieza')}
                      </ThemedText>

                      {quantity > 0 ? (
                        <View style={[styles.quantityControls, { gap: space.xs }]}>
                          <TouchableSound
                            style={[styles.quantityButton, { backgroundColor: colors.primary + '15' }]}
                            onPress={() => updateQuantity(product.id, quantity - 1)}
                          >
                            <Minus size={16} color={colors.primary} strokeWidth={3} />
                          </TouchableSound>
                          <ThemedText variant="body" bold style={styles.quantityText}>{quantity}</ThemedText>
                          <TouchableSound
                            style={[styles.quantityButton, { backgroundColor: colors.primary + '15' }]}
                            onPress={() => updateQuantity(product.id, quantity + 1)}
                          >
                            <Plus size={16} color={colors.primary} strokeWidth={3} />
                          </TouchableSound>
                        </View>
                      ) : (
                        <TouchableSound
                          style={[styles.addButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleAddToCart(product)}
                        >
                          <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                        </TouchableSound>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerImage: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsSection: {
    marginBottom: 20,
  },
  productsGrid: {},
  productCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: 120,
    height: 120,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
  },
  cartButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
  cartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
