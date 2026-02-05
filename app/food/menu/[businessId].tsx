import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingCart, Plus, Minus } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { Business, Product } from '@/constants/types';
import { getBusinessById, getBusinessMenu } from '@/services/products';
import { useCart } from '@/contexts/cart';
import EmptyState from '@/components/EmptyState';

export default function MenuScreen() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Negocio no encontrado</Text>
      </View>
    );
  }

  const getItemQuantity = (productId: string) => {
    return items.find((item) => item.id === productId)?.quantity || 0;
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
  };

  const handleGoToCart = () => {
    if (itemCount === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos al carrito primero');
      return;
    }
    router.push('/food/cart' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {business.image ? (
          <Image
            source={{ uri: business.image }}
            style={styles.headerImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.headerImage, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{business.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.businessDescription}>{business.description}</Text>

          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>Menú</Text>
            {products.length === 0 ? (
              <EmptyState title="Sin productos" message="Este negocio aún no tiene productos disponibles" />
            ) : (
              <View style={styles.productsGrid}>
                {products.map((product) => {
                  const quantity = getItemQuantity(product.id);
                  return (
                    <View key={product.id} style={styles.productCard}>
                      {product.image ? (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <Text style={styles.productImagePlaceholderText}>{product.name.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productDescription} numberOfLines={2}>
                          {product.description}
                        </Text>
                        <View style={styles.productFooter}>
                          <Text style={styles.productPrice}>
                            ${product.price.toFixed(2)}
                          </Text>
                          {quantity > 0 ? (
                            <View style={styles.quantityControls}>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => updateQuantity(product.id, quantity - 1)}
                              >
                                <Minus size={16} color={Colors.primary} strokeWidth={3} />
                              </TouchableOpacity>
                              <Text style={styles.quantityText}>{quantity}</Text>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => updateQuantity(product.id, quantity + 1)}
                              >
                                <Plus size={16} color={Colors.primary} strokeWidth={3} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.addButton}
                              onPress={() => handleAddToCart(product)}
                            >
                              <Plus size={18} color={Colors.white} strokeWidth={3} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartButton} onPress={handleGoToCart}>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{itemCount}</Text>
          </View>
          <Text style={styles.cartButtonText}>Ver Carrito</Text>
          <ShoppingCart size={20} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  headerImage: {
    width: '100%' as const,
    height: 200,
    backgroundColor: Colors.background.tertiary,
  },
  imagePlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  imagePlaceholderText: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: Colors.text.light,
  },
  content: {
    padding: 16,
  },
  businessName: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  businessDescription: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  productsSection: {
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  productsGrid: {
    gap: 16,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden' as const,
    flexDirection: 'row' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.background.tertiary,
  },
  productImagePlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  productImagePlaceholderText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.light,
  },
  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between' as const,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  quantityControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    minWidth: 24,
    textAlign: 'center' as const,
  },
  cartButton: {
    position: 'absolute' as const,
    bottom: 20,
    left: 20,
    right: 20,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  cartButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
