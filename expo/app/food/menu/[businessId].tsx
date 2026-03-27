import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: MENU DE NEGOCIO
// Usa ScreenContainer para diseño unificado con gradiente verde
// Soporta variantes de producto (tamaños, extras, etc.)
// ============================================================================

import {
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingCart, Plus, Minus, Store, X, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { Business, Product, ProductVariant, SelectedVariant } from '@/constants/types';
import { formatPriceWithUnit } from '@/constants/units';
import { getBusinessById, getBusinessMenuWithVariants } from '@/services/products';
import { useCart } from '@/contexts/cart';
import EmptyState from '@/components/EmptyState';
import ScreenContainer from '@/components/ScreenContainer';
import { useAnalytics } from '@/contexts/analytics';

type MenuProduct = Product & { variants: ProductVariant[]; unit?: string };

export default function MenuScreen() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const { isDark, colors, space, radius } = useTheme();

  const { items, addItem, updateQuantity, itemCount } = useCart();
  const { trackEvent } = useAnalytics();
  const menuOpenTime = useRef(Date.now());
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Variant modal state
  const [variantProduct, setVariantProduct] = useState<MenuProduct | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);

  const loadData = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!businessId) return;
    try {
      const [biz, menu] = await Promise.all([
        getBusinessById(businessId),
        getBusinessMenuWithVariants(businessId),
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
    menuOpenTime.current = Date.now();
    loadData(signal);
    return () => {
      signal.cancelled = true;
      const seconds = Math.round((Date.now() - menuOpenTime.current) / 1000);
      if (businessId && seconds > 2) {
        trackEvent('menu_view_duration', { business_id: businessId, seconds, products_seen: products.length });
      }
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getItemQuantity = (productId: string) => {
    return items
      .filter((item) => item.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleAddToCart = (product: MenuProduct) => {
    if (product.variants.length > 0) {
      // Open variant picker modal
      setVariantProduct(product);
      setSelectedVariants([]);
      return;
    }
    // No variants — add directly
    addItem(product);
    trackEvent('add_to_cart', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      business_id: businessId,
      business_name: business?.name,
    });
  };

  const handleConfirmVariants = () => {
    if (!variantProduct) return;
    addItem(variantProduct, selectedVariants);
    const extra = selectedVariants.reduce((s, v) => s + v.priceAdjustment, 0);
    trackEvent('add_to_cart', {
      product_id: variantProduct.id,
      product_name: variantProduct.name,
      price: variantProduct.price + extra,
      variants: selectedVariants.map(v => v.name),
      business_id: businessId,
      business_name: business?.name,
    });
    setVariantProduct(null);
    setSelectedVariants([]);
  };

  const toggleVariant = (variant: ProductVariant) => {
    setSelectedVariants(prev => {
      const exists = prev.find(v => v.variantId === variant.id);
      if (exists) {
        return prev.filter(v => v.variantId !== variant.id);
      }
      return [...prev, {
        variantId: variant.id,
        group: variant.group,
        name: variant.name,
        priceAdjustment: variant.priceAdjustment,
      }];
    });
  };

  const handleGoToCart = () => {
    if (itemCount === 0) {
      Alert.alert('Carrito vacio', 'Agrega productos al carrito primero');
      return;
    }
    router.push('/food/cart' as any);
  };

  if (loading) {
    return (
      <ScreenContainer headerGradient="primary" headerIcon={Store} headerTitle="Cargando..." headerSubtitle="Obteniendo menu">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!business) {
    return (
      <ScreenContainer headerGradient="primary" headerIcon={Store} headerTitle="Error" headerSubtitle="Negocio no encontrado">
        <View style={styles.errorContainer}>
          <ThemedText variant="body" color="secondary">No se pudo cargar la informacion del negocio</ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  const cartButton = itemCount > 0 ? (
    <TouchableSound style={[styles.cartButton, { backgroundColor: colors.primary }]} onPress={handleGoToCart}>
      <View style={styles.cartBadge}>
        <ThemedText variant="caption" style={styles.cartBadgeText}>{itemCount}</ThemedText>
      </View>
      <ThemedText variant="body" style={styles.cartButtonText}>Ver Carrito</ThemedText>
      <ShoppingCart size={20} color="#FFFFFF" />
    </TouchableSound>
  ) : null;

  // Group variants by group name for the modal
  const variantGroups: Record<string, ProductVariant[]> = {};
  if (variantProduct) {
    for (const v of variantProduct.variants) {
      if (!variantGroups[v.group]) variantGroups[v.group] = [];
      variantGroups[v.group].push(v);
    }
  }

  const variantExtra = selectedVariants.reduce((s, v) => s + v.priceAdjustment, 0);

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
          backgroundColor: isDark ? '#44403C' : '#F5F5F4',
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
          <EmptyState icon={Store} title="Sin productos" message="Este negocio aun no tiene productos disponibles" />
        ) : (
          <View style={[styles.productsGrid, { gap: space.md }]}>
            {products.map((product) => {
              const quantity = getItemQuantity(product.id);
              const hasVariants = product.variants.length > 0;
              return (
                <View
                  key={product.id}
                  style={[styles.productCard, {
                    backgroundColor: colors.card,
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
                      backgroundColor: isDark ? '#44403C' : '#F5F5F4',
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
                    {hasVariants && (
                      <ThemedText variant="caption" style={{ color: colors.accent, fontSize: 11 }}>
                        Opciones disponibles
                      </ThemedText>
                    )}

                    <View style={styles.productFooter}>
                      <ThemedText variant="subtitle" bold style={{ color: colors.primary }}>
                        {hasVariants ? `Desde ` : ''}{formatPriceWithUnit(product.price, product.unit || 'pieza')}
                      </ThemedText>

                      {quantity > 0 && !hasVariants ? (
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {quantity > 0 && hasVariants && (
                            <View style={[styles.variantBadge, { backgroundColor: colors.primary + '20' }]}>
                              <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                                {quantity}
                              </ThemedText>
                            </View>
                          )}
                          <TouchableSound
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleAddToCart(product)}
                          >
                            <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                          </TouchableSound>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Variant Picker Modal */}
      <Modal
        visible={!!variantProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setVariantProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl || 24,
            borderTopRightRadius: radius.xl || 24,
          }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#44403C' : '#E7E5E4' }]}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="h3" bold>{variantProduct?.name}</ThemedText>
                <ThemedText variant="caption" color="secondary">Personaliza tu pedido</ThemedText>
              </View>
              <TouchableSound onPress={() => setVariantProduct(null)} style={styles.modalClose}>
                <X size={24} color={colors.text.primary} />
              </TouchableSound>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {Object.entries(variantGroups).map(([group, variants]) => (
                <View key={group} style={{ marginBottom: space.lg }}>
                  <ThemedText variant="subtitle" bold style={{ marginBottom: space.sm }}>{group}</ThemedText>
                  {variants.map((variant) => {
                    const isSelected = selectedVariants.some(v => v.variantId === variant.id);
                    return (
                      <TouchableSound
                        key={variant.id}
                        style={[styles.variantOption, {
                          backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                          borderColor: isSelected ? colors.primary : (isDark ? '#44403C' : '#E7E5E4'),
                          borderRadius: radius.md,
                        }]}
                        onPress={() => toggleVariant(variant)}
                      >
                        <View style={[styles.variantCheckbox, {
                          borderColor: isSelected ? colors.primary : (isDark ? '#78716C' : '#A8A29E'),
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        }]}>
                          {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <ThemedText variant="body" style={{ flex: 1 }}>{variant.name}</ThemedText>
                        {variant.priceAdjustment !== 0 && (
                          <ThemedText variant="body" style={{ color: variant.priceAdjustment > 0 ? colors.primary : colors.success }}>
                            {variant.priceAdjustment > 0 ? '+' : ''}${variant.priceAdjustment.toFixed(2)}
                          </ThemedText>
                        )}
                      </TouchableSound>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Footer with price + add button */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? '#44403C' : '#E7E5E4' }]}>
              <View>
                <ThemedText variant="caption" color="secondary">Total</ThemedText>
                <ThemedText variant="h3" bold style={{ color: colors.primary }}>
                  ${((variantProduct?.price || 0) + variantExtra).toFixed(2)}
                </ThemedText>
              </View>
              <TouchableSound
                style={[styles.modalAddButton, { backgroundColor: colors.primary }]}
                onPress={handleConfirmVariants}
              >
                <ThemedText variant="subtitle" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  Agregar al carrito
                </ThemedText>
              </TouchableSound>
            </View>
          </View>
        </View>
      </Modal>
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
  variantBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  // Variant Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  variantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    gap: 12,
  },
  variantCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  modalAddButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
