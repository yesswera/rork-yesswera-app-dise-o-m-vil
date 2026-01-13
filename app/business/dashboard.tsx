import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Edit, Trash2, DollarSign, Package, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

export default function BusinessDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showAddProduct, setShowAddProduct] = useState(false);

  const stats = {
    todayOrders: 15,
    todayRevenue: 245.0,
    rating: 4.6,
    activeProducts: 28,
  };

  const products = [
    {
      id: 'p1',
      name: 'Pizza Margarita',
      price: 12.0,
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200',
      available: true,
    },
    {
      id: 'p2',
      name: 'Hamburguesa Clásica',
      price: 8.5,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200',
      available: true,
    },
    {
      id: 'p3',
      name: 'Ensalada César',
      price: 7.0,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
      available: false,
    },
  ];

  const recentOrders = [
    {
      id: 'ord-042',
      customerName: 'Carlos M.',
      items: '2 Pizzas, 1 Bebida',
      total: 27.5,
      status: 'pending',
    },
    {
      id: 'ord-041',
      customerName: 'María G.',
      items: '1 Hamburguesa, 1 Papas',
      total: 12.0,
      status: 'preparing',
    },
  ];

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Estás seguro de eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            console.log('Product deleted:', productId);
          },
        },
      ]
    );
  };

  const handleViewOrders = () => {
    router.push('/business/orders');
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

  if (showAddProduct) {
    return <AddProductScreen onClose={() => setShowAddProduct(false)} />;
  }

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
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Package size={24} color={Colors.secondary} />
              <Text style={styles.statValue}>{stats.todayOrders}</Text>
              <Text style={styles.statLabel}>Órdenes Hoy</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={24} color={Colors.success} />
              <Text style={styles.statValue}>${stats.todayRevenue}</Text>
              <Text style={styles.statLabel}>Ingresos Hoy</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{stats.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Package size={24} color={Colors.accent} />
              <Text style={styles.statValue}>{stats.activeProducts}</Text>
              <Text style={styles.statLabel}>Productos</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mis Productos</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddProduct(true)}
              >
                <Plus size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                  contentFit="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                  <View style={styles.availabilityTag}>
                    <Text style={[
                      styles.availabilityText,
                      !product.available && styles.unavailableText,
                    ]}>
                      {product.available ? 'Disponible' : 'No Disponible'}
                    </Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Edit size={18} color={Colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Órdenes Recientes</Text>
            {recentOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <View style={[
                    styles.statusBadge,
                    order.status === 'pending' && styles.statusPending,
                    order.status === 'preparing' && styles.statusPreparing,
                  ]}>
                    <Text style={styles.statusText}>
                      {order.status === 'pending' ? 'Pendiente' : 'Preparando'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.customerName}>Cliente: {order.customerName}</Text>
                <Text style={styles.orderItems}>{order.items}</Text>
                <Text style={styles.orderTotal}>Total: ${order.total.toFixed(2)}</Text>
                <TouchableOpacity style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Confirmar Preparación</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.viewOrdersButton} onPress={handleViewOrders}>
            <Package size={20} color={Colors.white} />
            <Text style={styles.viewOrdersButtonText}>Ver Órdenes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function AddProductScreen({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name || !price) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }
    Alert.alert('Éxito', 'Producto creado correctamente');
    onClose();
  };

  return (
    <View style={styles.addProductContainer}>
      <ScrollView style={styles.addProductScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.addProductContent}>
          <Text style={styles.addProductTitle}>Agregar Producto</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Producto *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Pizza Margarita"
              placeholderTextColor={Colors.text.light}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Precio *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor={Colors.text.light}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe tu producto..."
              placeholderTextColor={Colors.text.light}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.background.tertiary,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginBottom: 6,
  },
  availabilityTag: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: `${Colors.success}15`,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  unavailableText: {
    color: Colors.error,
  },
  productActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: `${Colors.warning}15`,
  },
  statusPreparing: {
    backgroundColor: `${Colors.accent}15`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginBottom: 12,
  },
  confirmButton: {
    height: 40,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  logoutButton: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginBottom: 40,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  viewOrdersButton: {
    height: 52,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    gap: 8,
  },
  viewOrdersButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  addProductContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  addProductScroll: {
    flex: 1,
  },
  addProductContent: {
    padding: 24,
  },
  addProductTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  saveButton: {
    height: 52,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  cancelButton: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
});
