// Shopping Index - Dos opciones: Lista General o Buscar por Categoría
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ClipboardList,
  Search,
  ShoppingCart,
  Store,
  Pill,
  Wrench,
  Smartphone,
  Coffee,
  ShoppingBag,
  ChevronRight
} from 'lucide-react-native';
import Colors from '@/constants/colors';

// Categorías de negocios para búsqueda
const SHOPPING_CATEGORIES = [
  { id: 'abarrotes', name: 'Abarrotes', icon: ShoppingBag, color: '#FF6B6B' },
  { id: 'carniceria', name: 'Carnicería', icon: Store, color: '#E74C3C' },
  { id: 'farmacia', name: 'Farmacia', icon: Pill, color: '#3498DB' },
  { id: 'ferreteria', name: 'Ferretería', icon: Wrench, color: '#F39C12' },
  { id: 'electronica', name: 'Electrónica', icon: Smartphone, color: '#9B59B6' },
  { id: 'tienda', name: 'Tienda/Oxxo', icon: Coffee, color: '#1ABC9C' },
  { id: 'supermercado', name: 'Supermercado', icon: ShoppingCart, color: '#2ECC71' },
  { id: 'otros', name: 'Otros', icon: Store, color: '#95A5A6' },
];

export default function ShoppingIndexScreen() {
  const router = useRouter();

  const handleGeneralList = () => {
    router.push('/shopping/general-list' as any);
  };

  const handleCategorySearch = (categoryId: string) => {
    router.push(`/shopping/stores?category=${categoryId}` as any);
  };

  const handleViewAllStores = () => {
    router.push('/shopping/stores' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.secondary, Colors.secondaryDark]}
          style={styles.header}
        >
          <ShoppingCart size={40} color={Colors.white} />
          <Text style={styles.headerTitle}>Lista de Compras</Text>
          <Text style={styles.headerSubtitle}>
            Escribe tu lista y un repartidor irá a comprar por ti
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Opción 1: Lista General */}
          <TouchableOpacity
            style={styles.mainOptionCard}
            activeOpacity={0.8}
            onPress={handleGeneralList}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.mainOptionGradient}
            >
              <View style={styles.mainOptionIcon}>
                <ClipboardList size={32} color={Colors.white} />
              </View>
              <View style={styles.mainOptionContent}>
                <Text style={styles.mainOptionTitle}>Crear Lista General</Text>
                <Text style={styles.mainOptionDescription}>
                  Escribe tu lista y el repartidor comprará donde encuentre los productos
                </Text>
              </View>
              <ChevronRight size={24} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Opción 2: Buscar por Categoría */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Search size={20} color={Colors.text.primary} />
              <Text style={styles.sectionTitle}>Buscar por Categoría</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Selecciona un tipo de negocio para ver opciones cercanas
            </Text>

            <View style={styles.categoriesGrid}>
              {SHOPPING_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    activeOpacity={0.8}
                    onPress={() => handleCategorySearch(category.id)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <IconComponent size={24} color={category.color} />
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Ver todas las tiendas */}
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.8}
            onPress={handleViewAllStores}
          >
            <Store size={20} color={Colors.secondary} />
            <Text style={styles.viewAllText}>Ver Todas las Tiendas</Text>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Escribe tu lista de compras</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Selecciona tu dirección de entrega</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Un repartidor irá a comprar por ti</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepText}>Recibe tus productos en casa</Text>
            </View>
            <Text style={styles.infoNote}>
              *Pagas el costo de los productos + envío al recibir
            </Text>
          </View>
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
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    marginTop: -16,
  },
  mainOptionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  mainOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainOptionContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  mainOptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  mainOptionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  stepText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  infoNote: {
    fontSize: 12,
    color: Colors.text.light,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
