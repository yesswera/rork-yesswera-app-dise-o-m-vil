// ============================================================================
// YESSWERA: PRODUCTOS DEL NEGOCIO
// Usa ScreenContainer para diseno unificado
// ============================================================================

import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Package } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { getBusinessProducts, toggleProductAvailability, deleteProduct } from '@/services/products';
import { ProductFull } from '@/constants/types';
import { Toast } from '@/utils/toast';
import EmptyState from '@/components/EmptyState';
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

export default function BusinessProductsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [products, setProducts] = useState<ProductFull[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Look up business record for this user
  useEffect(() => {
    if (!user) return;
    supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setBusinessId(data.id);
      });
  }, [user]);

  const loadProducts = useCallback(async () => {
    if (!businessId) return;

    try {
      const data = await getBusinessProducts(businessId);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      Toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleToggleAvailability = async (productId: string, currentAvailability: boolean) => {
    if (!businessId) return;

    try {
      await toggleProductAvailability(businessId, productId, !currentAvailability);

      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, available: !currentAvailability } : p)
      );

      Toast.success(
        !currentAvailability ? 'Producto disponible' : 'Producto marcado como agotado'
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      Toast.error('Error al cambiar disponibilidad');
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert(
      'Eliminar Producto',
      `Estas seguro de eliminar "${productName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!businessId) return;

            try {
              await deleteProduct(businessId, productId);
              setProducts(prev => prev.filter(p => p.id !== productId));
              Toast.success('Producto eliminado');
            } catch (error) {
              console.error('Error deleting product:', error);
              Toast.error('Error al eliminar producto');
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: ProductFull }) => (
    <View style={[styles.productCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.productDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>${item.price.toFixed(2)} MXN</Text>
        </View>

        <Switch
          value={item.available}
          onValueChange={() => handleToggleAvailability(item.id, item.available)}
          trackColor={{ false: theme.border, true: colors.success }}
          thumbColor={'#FFFFFF'}
        />
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton, { backgroundColor: `${colors.primary}15` }]}
          onPress={() => router.push(`/business/products/edit/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <Edit size={16} color={colors.primary} />
          <Text style={[styles.editButtonText, { color: colors.primary }]}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, { backgroundColor: `${colors.error}15` }]}
          onPress={() => handleDeleteProduct(item.id, item.name)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={colors.error} />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {!item.available && (
        <View style={[styles.unavailableBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.unavailableBadgeText}>Agotado</Text>
        </View>
      )}
    </View>
  );

  // Header content con boton de agregar
  const headerContent = (
    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: '#FFFFFF' }]}
      onPress={() => router.push('/business/products/add' as any)}
      activeOpacity={0.7}
    >
      <Plus size={20} color={colors.primary} />
      <Text style={[styles.addButtonText, { color: colors.primary }]}>Agregar Producto</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Package}
      headerTitle="Productos"
      headerSubtitle="Gestiona tu catalogo de productos"
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      scrollEnabled={false}
    >
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={Package}
              title="No hay productos"
              message="Agrega tu primer producto para comenzar"
              actionLabel="Agregar Producto"
              onActionPress={() => router.push('/business/products/add' as any)}
            />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 20,
  },
  productCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {},
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {},
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unavailableBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
