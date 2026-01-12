import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Package } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { getBusinessProducts, toggleProductAvailability, deleteProduct } from '@/services/products';
import { ProductFull } from '@/constants/types';
import Colors from '@/constants/colors';
import { Toast } from '@/utils/toast';
import EmptyState from '@/components/EmptyState';

export default function BusinessProductsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [products, setProducts] = useState<ProductFull[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadProducts = useCallback(async () => {
    if (!user || !token) return;

    try {
      const data = await getBusinessProducts(user.id, token);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      Toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleToggleAvailability = async (productId: string, currentAvailability: boolean) => {
    if (!user || !token) return;

    try {
      await toggleProductAvailability(user.id, productId, !currentAvailability, token);
      
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
      `¿Estás seguro de eliminar "${productName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!user || !token) return;

            try {
              await deleteProduct(user.id, productId, token);
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
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.productPrice}>${item.price.toFixed(2)} MXN</Text>
        </View>

        <Switch
          value={item.available}
          onValueChange={() => handleToggleAvailability(item.id, item.available)}
          trackColor={{ false: Colors.border.medium, true: Colors.success }}
          thumbColor={Colors.white}
        />
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/business/products/edit/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <Edit size={16} color={Colors.primary} />
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProduct(item.id, item.name)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {!item.available && (
        <View style={styles.unavailableBadge}>
          <Text style={styles.unavailableBadgeText}>Agotado</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Productos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/business/products/add' as any)}
          activeOpacity={0.7}
        >
          <Plus size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  list: {
    padding: 16,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    position: 'relative' as const,
  },
  productHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  productActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: `${Colors.primary}15`,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  deleteButton: {
    backgroundColor: `${Colors.error}15`,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  unavailableBadge: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unavailableBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
