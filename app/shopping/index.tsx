// Shopping Index - Dos opciones: Lista General o Buscar por Categoría
import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
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
  ChevronRight,
  MapPin,
  X
} from 'lucide-react-native';
import Colors from '@/constants/colors';

// Categorías de negocios para búsqueda con palabras clave
const SHOPPING_CATEGORIES = [
  { id: 'abarrotes', name: 'Abarrotes', icon: ShoppingBag, color: '#FF6B6B', keywords: ['abarrotes', 'tiendita', 'miscelanea', 'botanas', 'refrescos', 'dulces'] },
  { id: 'carniceria', name: 'Carnicería', icon: Store, color: '#E74C3C', keywords: ['carniceria', 'carne', 'res', 'pollo', 'cerdo', 'bistec', 'chorizo'] },
  { id: 'farmacia', name: 'Farmacia', icon: Pill, color: '#3498DB', keywords: ['farmacia', 'medicina', 'medicamentos', 'pastillas', 'vitaminas', 'salud', 'doctor'] },
  { id: 'ferreteria', name: 'Ferretería', icon: Wrench, color: '#F39C12', keywords: ['ferreteria', 'herramientas', 'tornillos', 'pintura', 'martillo', 'cables', 'electrico'] },
  { id: 'electronica', name: 'Electrónica', icon: Smartphone, color: '#9B59B6', keywords: ['electronica', 'celular', 'telefono', 'audifonos', 'cargador', 'cable', 'usb'] },
  { id: 'tienda', name: 'Tienda/Oxxo', icon: Coffee, color: '#1ABC9C', keywords: ['tienda', 'oxxo', 'seven', 'conveniencia', '24 horas', 'recargas'] },
  { id: 'supermercado', name: 'Supermercado', icon: ShoppingCart, color: '#2ECC71', keywords: ['supermercado', 'super', 'soriana', 'walmart', 'despensa', 'mandado'] },
  { id: 'otros', name: 'Otros', icon: Store, color: '#95A5A6', keywords: ['otros', 'negocio', 'tienda'] },
];

export default function ShoppingIndexScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filtrar sugerencias basadas en el texto de búsqueda
  const suggestions = useMemo(() => {
    if (!searchText || searchText.length < 2) return [];

    const search = searchText.toLowerCase();
    return SHOPPING_CATEGORIES.filter(cat =>
      cat.name.toLowerCase().includes(search) ||
      cat.keywords.some(kw => kw.includes(search))
    );
  }, [searchText]);

  const handleGeneralList = () => {
    router.push('/shopping/general-list' as any);
  };

  const handleCategorySearch = (categoryId: string) => {
    setSearchText('');
    setShowSuggestions(false);
    router.push(`/shopping/stores?category=${categoryId}` as any);
  };

  const handleNearbyStores = () => {
    router.push('/shopping/nearby' as any);
  };

  const handleSearchSubmit = () => {
    if (suggestions.length > 0) {
      handleCategorySearch(suggestions[0].id);
    } else if (searchText.length > 0) {
      // Búsqueda general - ir a todas las tiendas
      router.push('/shopping/stores' as any);
    }
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

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color={Colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar... ej: farmacia, carne"
                placeholderTextColor={Colors.text.light}
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setShowSuggestions(text.length >= 2);
                }}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchText(''); setShowSuggestions(false); }}>
                  <X size={18} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sugerencias de búsqueda */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((suggestion) => {
                  const IconComponent = suggestion.icon;
                  return (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.suggestionItem}
                      onPress={() => handleCategorySearch(suggestion.id)}
                    >
                      <View style={[styles.suggestionIcon, { backgroundColor: suggestion.color + '20' }]}>
                        <IconComponent size={18} color={suggestion.color} />
                      </View>
                      <Text style={styles.suggestionText}>{suggestion.name}</Text>
                      <ChevronRight size={16} color={Colors.text.light} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
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

          {/* Comercios Cercanos - Con Mapa */}
          <TouchableOpacity
            style={styles.nearbyButton}
            activeOpacity={0.8}
            onPress={handleNearbyStores}
          >
            <MapPin size={22} color={Colors.white} />
            <View style={styles.nearbyContent}>
              <Text style={styles.nearbyText}>Comercios Cercanos</Text>
              <Text style={styles.nearbySubtext}>Ver en mapa (5 km)</Text>
            </View>
            <ChevronRight size={20} color={Colors.white} />
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
    marginBottom: 20,
  },
  searchContainer: {
    width: '100%',
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
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
  nearbyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    padding: 18,
    borderRadius: 14,
    marginBottom: 24,
    gap: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nearbyContent: {
    flex: 1,
  },
  nearbyText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
  nearbySubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
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
