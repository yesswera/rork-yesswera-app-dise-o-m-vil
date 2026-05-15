import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS, colorShadow } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import Pill from '@/components/ui/Pill';
import { getBusinessById, getBusinessMenu, getProductVariants } from '@/services/products';
import { useCart } from '@/contexts/cart';
import type { Business, Product, ProductVariant, SelectedVariant } from '@/constants/types';

function categoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('taco')) return '\uD83C\uDF2E';
  if (n.includes('marisco') || n.includes('pescado') || n.includes('camaron')) return '\uD83E\uDD90';
  if (n.includes('pollo')) return '\uD83C\uDF57';
  if (n.includes('bebida') || n.includes('agua') || n.includes('refresco')) return '\uD83E\uDD64';
  if (n.includes('pizza')) return '\uD83C\uDF55';
  if (n.includes('hamburguesa') || n.includes('burger')) return '\uD83C\uDF54';
  if (n.includes('postre') || n.includes('pastel')) return '\uD83C\uDF70';
  if (n.includes('sopa') || n.includes('caldo')) return '\uD83C\uDF72';
  if (n.includes('ensalada')) return '\uD83E\uDD57';
  return '\uD83C\uDF7D\uFE0F';
}

export default function MenuScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const { items, addItem, itemCount, total } = useCart();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Variant modal state
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [itemNotes, setItemNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [biz, menu] = await Promise.all([
        getBusinessById(businessId),
        getBusinessMenu(businessId),
      ]);
      setBusiness(biz);
      setProducts(menu);
    } catch (err) {
      console.error('MenuScreen loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (product: Product) => {
    // Check if product has variants
    try {
      setLoadingVariants(true);
      const prodVariants = await getProductVariants(product.id);
      if (prodVariants && prodVariants.length > 0) {
        setVariantProduct(product);
        setVariants(prodVariants);
        setSelectedVariants([]);
        setLoadingVariants(false);
        return;
      }
    } catch {
      // No variants, add directly
    }
    setLoadingVariants(false);
    addItem(product);
  };

  const handleAddWithVariants = () => {
    if (!variantProduct) return;
    addItem(
      variantProduct,
      selectedVariants.length > 0 ? selectedVariants : undefined,
      itemNotes.trim() || undefined,
    );
    setVariantProduct(null);
    setVariants([]);
    setSelectedVariants([]);
    setItemNotes('');
  };

  const toggleVariant = (variant: ProductVariant) => {
    setSelectedVariants((prev) => {
      const exists = prev.find((v) => v.variantId === variant.id);
      if (exists) {
        return prev.filter((v) => v.variantId !== variant.id);
      }
      // For single-select groups, replace existing in same group
      const sameGroup = prev.filter((v) => v.group !== variant.group);
      return [
        ...sameGroup,
        {
          variantId: variant.id,
          group: variant.group,
          name: variant.name,
          priceAdjustment: variant.priceAdjustment,
        },
      ];
    });
  };

  // -- Loading state --
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DS.colors.green} />
        <Text style={styles.centerText}>Cargando menu...</Text>
      </View>
    );
  }

  // -- Not found state --
  if (!business) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color={DS.colors.muted} />
        <Text style={styles.centerText}>Negocio no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.greenBtn}>
          <Text style={styles.greenBtnText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Group variants by group name for modal
  const variantGroups: Record<string, ProductVariant[]> = {};
  variants.forEach((v) => {
    if (!variantGroups[v.group]) variantGroups[v.group] = [];
    variantGroups[v.group].push(v);
  });

  const variantExtra = selectedVariants.reduce((s, v) => s + v.priceAdjustment, 0);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* -- Header image -- */}
        <View style={styles.headerWrap}>
          {business.image ? (
            <Image source={{ uri: business.image }} style={styles.headerImg} />
          ) : (
            <View style={[styles.headerImg, styles.headerPlaceholder]}>
              <Text style={{ fontSize: 64 }}>{categoryEmoji(business.category)}</Text>
            </View>
          )}
          <View style={styles.headerOverlay} />
          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* -- Business info card -- */}
        <View style={styles.infoWrap}>
          <YCard>
            <Text style={styles.bizName}>{business.name}</Text>
            {business.description ? (
              <Text style={styles.bizDesc} numberOfLines={2}>{business.description}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="star" size={14} color="#F59E0B" />
                <Text style={styles.metaText}>{business.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.dot} />
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color={DS.colors.muted} />
                <Text style={styles.metaText}>{business.deliveryTime}</Text>
              </View>
              <View style={styles.dot} />
              <View style={styles.metaItem}>
                <Feather name="tag" size={14} color={DS.colors.muted} />
                <Text style={styles.metaText}>{business.category}</Text>
              </View>
            </View>
          </YCard>
        </View>

        {/* -- Closed banner -- */}
        {business.isOpen === false && (
          <View style={styles.closedBanner}>
            <Feather name="clock" size={18} color="#9A3412" />
            <Text style={styles.closedBannerText}>Este negocio esta cerrado ahora</Text>
          </View>
        )}

        {/* -- Products list -- */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu</Text>

          {products.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="coffee" size={40} color={DS.colors.hairline} />
              <Text style={styles.emptyText}>Este negocio aun no tiene productos</Text>
            </View>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => (
                <YCard key={product.id} style={styles.productCard} padding={DS.space.md}>
                  <View style={styles.productRow}>
                    {product.image ? (
                      <Image source={{ uri: product.image }} style={styles.productImg} />
                    ) : (
                      <View style={[styles.productImg, styles.productImgFallback]}>
                        <Text style={{ fontSize: 28 }}>{categoryEmoji(product.name)}</Text>
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      {product.description ? (
                        <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
                      ) : null}
                      <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.addBtn, business.isOpen === false && styles.addBtnDisabled]}
                      onPress={() => handleAdd(product)}
                      activeOpacity={0.8}
                      disabled={business.isOpen === false}
                    >
                      <Feather name="plus" size={22} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </YCard>
              ))}
            </View>
          )}
        </View>

        {/* Spacer for floating bar */}
        {itemCount > 0 && <View style={{ height: 100 }} />}
      </ScrollView>

      {/* -- Floating cart bar -- */}
      {itemCount > 0 && (
        <View style={[styles.cartBar, DS.shadow.float]}>
          <TouchableOpacity
            style={[styles.cartBtn, colorShadow(DS.colors.green)]}
            onPress={() => router.push('/food/checkout' as any)}
            activeOpacity={0.9}
          >
            <Feather name="shopping-bag" size={20} color="#FFF" />
            <Text style={styles.cartBtnLabel}>
              Ver Carrito ({itemCount})
            </Text>
            <Text style={styles.cartBtnPrice}>${total.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* -- Variant selection modal -- */}
      <Modal visible={!!variantProduct} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{variantProduct?.name}</Text>
            <Text style={styles.modalSubtitle}>Personaliza tu producto</Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(variantGroups).map(([group, groupVariants]) => (
                <View key={group} style={styles.variantGroup}>
                  <Text style={styles.variantGroupTitle}>{group}</Text>
                  {groupVariants.map((v) => {
                    const isSelected = selectedVariants.some((sv) => sv.variantId === v.id);
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.variantOption, isSelected && styles.variantOptionSelected]}
                        onPress={() => toggleVariant(v)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.variantRadio, isSelected && styles.variantRadioSelected]}>
                          {isSelected && <View style={styles.variantRadioDot} />}
                        </View>
                        <Text style={styles.variantName}>{v.name}</Text>
                        {v.priceAdjustment > 0 && (
                          <Text style={styles.variantPrice}>+${v.priceAdjustment.toFixed(2)}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <TextInput
              style={styles.notesInput}
              placeholder="Instrucciones especiales (ej: sin cebolla, extra salsa...)"
              placeholderTextColor={DS.colors.placeholder}
              value={itemNotes}
              onChangeText={setItemNotes}
              multiline
              maxLength={200}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setVariantProduct(null); setVariants([]); setSelectedVariants([]); setItemNotes(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, colorShadow(DS.colors.green)]}
                onPress={handleAddWithVariants}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>
                  Agregar ${((variantProduct?.price || 0) + variantExtra).toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { paddingBottom: 20 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.bg,
    gap: DS.space.md,
  },
  centerText: { ...DS.fonts.body, color: DS.colors.muted },
  greenBtn: {
    marginTop: DS.space.md,
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.xl,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  greenBtnText: { ...DS.fonts.bodyMed, color: '#FFF' },

  // Header
  headerWrap: { height: 200, position: 'relative' },
  headerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerPlaceholder: { backgroundColor: DS.colors.green, justifyContent: 'center', alignItems: 'center' },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backCircle: {
    position: 'absolute',
    top: 50,
    left: DS.space.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info card
  infoWrap: { marginTop: -24, marginHorizontal: DS.space.lg },
  bizName: { ...DS.fonts.title, color: DS.colors.dark, marginBottom: 4 },
  bizDesc: { ...DS.fonts.body, color: DS.colors.muted, marginBottom: DS.space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: DS.space.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...DS.fonts.small, color: DS.colors.body },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: DS.colors.hairline, marginHorizontal: DS.space.sm,
  },

  // Menu section
  menuSection: { padding: DS.space.lg, paddingTop: DS.space.xl },
  sectionTitle: { ...DS.fonts.section, color: DS.colors.dark, marginBottom: DS.space.lg },

  empty: { alignItems: 'center', paddingTop: 40, gap: DS.space.sm },
  emptyText: { ...DS.fonts.body, color: DS.colors.muted },

  // Product card
  productList: { gap: DS.space.md },
  productCard: { marginBottom: 0 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  productImg: { width: 80, height: 80, borderRadius: DS.radius.md },
  productImgFallback: { backgroundColor: DS.colors.divider, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, gap: 2 },
  productName: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  productDesc: { ...DS.fonts.small, color: DS.colors.muted },
  productPrice: { ...DS.fonts.bodyMed, color: DS.colors.green, marginTop: 2 },
  addBtn: {
    width: DS.touch.min,
    height: DS.touch.min,
    borderRadius: DS.touch.min / 2,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: DS.colors.hairline,
  },

  // Closed banner
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    backgroundColor: '#FED7AA',
    marginHorizontal: DS.space.lg,
    marginTop: DS.space.md,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.lg,
    borderRadius: DS.radius.lg,
  },
  closedBannerText: {
    ...DS.fonts.bodyMed,
    color: '#9A3412',
    flex: 1,
  },

  // Floating cart
  cartBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: DS.colors.card,
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.md,
    paddingBottom: 30,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.xl,
    height: DS.touch.button,
    paddingHorizontal: DS.space.lg,
    gap: DS.space.sm,
  },
  cartBtnLabel: { ...DS.fonts.button, color: '#FFF', flex: 1 },
  cartBtnPrice: { ...DS.fonts.button, color: '#FFF' },

  // Variant modal
  modalOverlay: {
    flex: 1,
    backgroundColor: DS.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: DS.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: DS.space.xl,
    paddingTop: DS.space.md,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: DS.colors.hairline,
    alignSelf: 'center',
    marginBottom: DS.space.lg,
  },
  modalTitle: { ...DS.fonts.title, color: DS.colors.dark },
  modalSubtitle: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 4, marginBottom: DS.space.lg },
  modalScroll: { marginBottom: DS.space.lg },
  variantGroup: { marginBottom: DS.space.xl },
  variantGroupTitle: { ...DS.fonts.label, color: DS.colors.muted, marginBottom: DS.space.sm },
  variantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.bg,
    marginBottom: DS.space.sm,
    gap: DS.space.md,
  },
  variantOptionSelected: { backgroundColor: DS.colors.greenLight },
  variantRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: DS.colors.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  variantRadioSelected: { borderColor: DS.colors.green },
  variantRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: DS.colors.green },
  variantName: { ...DS.fonts.body, color: DS.colors.dark, flex: 1 },
  variantPrice: { ...DS.fonts.bodyMed, color: DS.colors.green },
  notesInput: {
    ...DS.fonts.body,
    color: DS.colors.dark,
    backgroundColor: DS.colors.bg,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.space.md,
    paddingVertical: DS.space.md,
    marginBottom: DS.space.lg,
    minHeight: 48,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: { flexDirection: 'row', gap: DS.space.md },
  modalCancel: {
    flex: 1,
    height: DS.touch.min,
    borderRadius: DS.radius.xl,
    backgroundColor: DS.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: { ...DS.fonts.bodyMed, color: DS.colors.muted },
  modalConfirm: {
    flex: 2,
    height: DS.touch.min,
    borderRadius: DS.radius.xl,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: { ...DS.fonts.button, color: '#FFF' },
});
