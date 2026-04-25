// ============================================================================
// YESSWERA: PRODUCTS GRID — 2 columns, toggle availability, FAB to add
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Package } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { getBusinessProducts, toggleProductAvailability } from '@/services/products';
import { DS, colorShadow } from '@/constants/design';
import type { ProductFull } from '@/constants/types';

function formatMoney(n: number): string {
  return `$${n.toFixed(0)}`;
}

export default function ProductsGridScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductFull[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBusinessId();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (businessId) loadProducts();
    }, [businessId])
  );

  async function loadBusinessId() {
    if (!user) return;
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setBusinessId(data.id);
      loadProducts(data.id);
    }
  }

  async function loadProducts(bId?: string) {
    const id = bId || businessId;
    if (!id) return;
    try {
      const data = await getBusinessProducts(id, true);
      setProducts(data);
    } catch (e) {
      console.error('loadProducts error:', e);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }

  async function handleToggle(productId: string, current: boolean) {
    if (!businessId) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, available: !current, inStock: !current } : p
      )
    );
    try {
      await toggleProductAvailability(businessId, productId, !current);
    } catch {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, available: current, inStock: current } : p
        )
      );
    }
  }

  // Split into rows of 2
  const rows: ProductFull[][] = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Productos</Text>

        {products.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Package size={48} color={DS.colors.muted} />
            <Text style={styles.emptyTitle}>Sin productos</Text>
            <Text style={styles.emptyBody}>
              Agrega tu primer producto con el boton +
            </Text>
          </View>
        ) : (
          rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((product) => (
                <View key={product.id} style={styles.tile}>
                  <View style={styles.tileImage}>
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.tileImageFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <Package size={36} color={DS.colors.placeholder} />
                    )}
                  </View>

                  <Text style={styles.tileName} numberOfLines={2}>
                    {product.name}
                  </Text>

                  <Text style={styles.tilePrice}>
                    {formatMoney(product.price)}
                  </Text>

                  <View style={styles.tileToggle}>
                    <Text
                      style={[
                        styles.tileToggleLabel,
                        {
                          color: product.available
                            ? DS.colors.green
                            : DS.colors.muted,
                        },
                      ]}
                    >
                      {product.available ? 'Disponible' : 'Agotado'}
                    </Text>
                    <Switch
                      value={product.available}
                      onValueChange={() =>
                        handleToggle(product.id, product.available)
                      }
                      trackColor={{
                        false: DS.colors.hairline,
                        true: DS.colors.greenLight,
                      }}
                      thumbColor={
                        product.available ? DS.colors.green : DS.colors.muted
                      }
                    />
                  </View>
                </View>
              ))}
              {row.length === 1 && <View style={styles.tile} />}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/business/products/add')}
        activeOpacity={0.85}
        style={styles.fab}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  content: {
    padding: DS.space.lg,
    gap: DS.space.lg,
  },
  screenTitle: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: DS.space.md,
  },
  emptyTitle: {
    ...DS.fonts.section,
    color: DS.colors.dark,
  },
  emptyBody: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    textAlign: 'center',
  },

  gridRow: {
    flexDirection: 'row',
    gap: DS.space.md,
  },
  tile: {
    flex: 1,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.xl,
    padding: DS.space.md,
    gap: DS.space.sm,
    ...DS.shadow.card,
  },
  tileImage: {
    height: 100,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tileImageFill: {
    width: '100%',
    height: '100%',
  },
  tileName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  tilePrice: {
    ...DS.fonts.title,
    color: DS.colors.green,
  },
  tileToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileToggleLabel: {
    ...DS.fonts.small,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DS.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    ...colorShadow(DS.colors.orange),
  },
});
