import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: EDITAR PRODUCTO
// Pantalla para editar un producto existente del negocio
// Usa ScreenContainer para diseno unificado
// ============================================================================

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Edit2, DollarSign, Clock, Tag, FileText, Type } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { getBusinessCategories, updateProduct } from '@/services/products';
import { ProductCategory } from '@/constants/types';
import { PRODUCT_UNITS, formatPriceWithUnit } from '@/constants/units';
import { Toast } from '@/utils/toast';
import { SoundFeedback } from '@/services/sounds';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import LoadingButton from '@/components/LoadingButton';
import ProductImagePicker from '@/components/ProductImagePicker';
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

export default function EditProductScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  // Business lookup
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [preparationTime, setPreparationTime] = useState('');
  const [available, setAvailable] = useState(true);

  // Unit state
  const [unit, setUnit] = useState<string>('pieza');
  const [customUnit, setCustomUnit] = useState<string>('');

  // Image state
  const [imageUrl, setImageUrl] = useState('');
  const [imageLocalUri, setImageLocalUri] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');

  // UI state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // LOOK UP BUSINESS ID
  // ============================================================================

  useEffect(() => {
    if (!user) return;
    supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setBusinessId(data[0].id);
      });
  }, [user]);

  // ============================================================================
  // LOAD PRODUCT DATA + CATEGORIES
  // ============================================================================

  const loadProductData = useCallback(async () => {
    if (!businessId || !productId) return;

    setIsLoading(true);
    try {
      // Load product and categories in parallel
      const [productResult, categoriesData] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single(),
        getBusinessCategories(businessId),
      ]);

      if (productResult.error) {
        throw productResult.error;
      }

      const product = productResult.data;
      if (!product) {
        Toast.error('Producto no encontrado');
        router.back();
        return;
      }

      // Pre-populate form fields
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price != null ? String(product.price) : '');
      setCategoryId(product.category_id || null);
      setPreparationTime(
        product.preparation_time_minutes != null
          ? String(product.preparation_time_minutes)
          : ''
      );
      setAvailable(product.is_available ?? true);

      // Set unit
      const productUnit = product.unit || 'pieza';
      const knownUnit = PRODUCT_UNITS.find(u => u.value === productUnit);
      if (knownUnit) {
        setUnit(productUnit);
      } else {
        setUnit('otro');
        setCustomUnit(productUnit);
      }

      // Set image
      if (product.image_url) {
        setExistingImageUrl(product.image_url);
        setImageUrl(product.image_url);
      }

      // Set categories
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading product:', error);
      Toast.error('Error al cargar el producto');
    } finally {
      setIsLoading(false);
    }
  }, [businessId, productId]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Toast.error('El nombre del producto es obligatorio');
      return false;
    }

    if (!price.trim()) {
      Toast.error('El precio es obligatorio');
      return false;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Toast.error('El precio debe ser un numero mayor a 0');
      return false;
    }

    if (preparationTime.trim()) {
      const prepTime = parseInt(preparationTime, 10);
      if (isNaN(prepTime) || prepTime < 0) {
        Toast.error('El tiempo de preparacion debe ser un numero valido');
        return false;
      }
    }

    return true;
  };

  // ============================================================================
  // SAVE PRODUCT
  // ============================================================================

  const handleSave = async () => {
    if (!businessId || !productId) return;
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const finalUnit = unit === 'otro' ? (customUnit.trim() || 'pieza') : unit;
      await updateProduct(businessId, productId, {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        categoryId: categoryId || undefined,
        preparationTime: preparationTime.trim()
          ? parseInt(preparationTime, 10)
          : undefined,
        available,
        image: imageUrl || undefined,
        unit: finalUnit,
      });

      await SoundFeedback.success();
      Toast.success('Producto actualizado exitosamente');
      router.back();
    } catch (error) {
      console.error('Error updating product:', error);
      Toast.error('Error al actualizar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Edit2}
        headerTitle="Editar Producto"
        headerSubtitle="Cargando informacion del producto..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" color="secondary" style={styles.loadingText}>
            Cargando producto...
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  // ============================================================================
  // FOOTER
  // ============================================================================

  const FooterComponent = (
    <View style={styles.footerContent}>
      <TouchableSound
        style={[styles.cancelButton, { borderColor: theme.border }]}
        onPress={() => router.back()}
        disabled={isSaving}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
      </TouchableSound>

      <View style={styles.submitButtonContainer}>
        <LoadingButton
          title="Guardar Cambios"
          onPress={handleSave}
          loading={isSaving}
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Edit2}
      headerTitle="Editar Producto"
      headerSubtitle="Modifica la informacion del producto"
      scrollEnabled={true}
      footer={FooterComponent}
      footerPadding={100}
    >
      {/* Imagen del producto */}
      <ProductImagePicker
        imageUri={imageLocalUri || null}
        productName={name}
        businessId={businessId}
        onImageUploaded={(publicUrl, localUri) => {
          setImageUrl(publicUrl);
          setImageLocalUri(localUri);
        }}
        onImageRemoved={() => {
          setImageUrl('');
          setImageLocalUri('');
          setExistingImageUrl('');
        }}
        existingImageUrl={existingImageUrl}
      />

      {/* Nombre */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Type size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Nombre del Producto
          </Text>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Ej: Hamburguesa Clasica"
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={100}
        />
      </View>

      {/* Descripcion */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <FileText size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Descripcion
          </Text>
        </View>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Describe tu producto (ingredientes, tamano, etc.)"
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={[styles.charCount, { color: theme.textMuted }]}>
          {description.length}/500
        </Text>
      </View>

      {/* Precio */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <DollarSign size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Precio (MXN)
          </Text>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="0.00"
          placeholderTextColor={theme.textMuted}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Unidad de venta */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Tag size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Unidad de Venta
          </Text>
        </View>
        {price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) > 0 && (
          <Text style={[styles.charCount, { color: colors.primary, marginBottom: 8, fontWeight: '600', textAlign: 'left' }]}>
            Se mostrara como: {formatPriceWithUnit(parseFloat(price), unit === 'otro' ? (customUnit.trim() || 'pieza') : unit)}
          </Text>
        )}
        <View style={styles.categoriesContainer}>
          {PRODUCT_UNITS.map((u) => (
            <TouchableSound
              key={u.value}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: unit === u.value ? `${colors.primary}10` : theme.card,
                  borderColor: unit === u.value ? colors.primary : theme.border,
                },
              ]}
              onPress={() => setUnit(u.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: unit === u.value ? colors.primary : theme.textSecondary,
                    fontWeight: unit === u.value ? '700' : '600',
                  },
                ]}
              >
                {u.label}
              </Text>
            </TouchableSound>
          ))}
        </View>
        {unit === 'otro' && (
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                marginTop: 8,
              },
            ]}
            placeholder="Escribe la unidad (ej: rebanada, porcion)"
            placeholderTextColor={theme.textMuted}
            value={customUnit}
            onChangeText={setCustomUnit}
          />
        )}
      </View>

      {/* Categoria */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Tag size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Categoria
            </Text>
          </View>
          <View style={styles.categoriesContainer}>
            {/* Opcion "Sin categoria" */}
            <TouchableSound
              style={[
                styles.categoryChip,
                {
                  backgroundColor: theme.card,
                  borderColor: !categoryId ? colors.primary : theme.border,
                },
                !categoryId && {
                  backgroundColor: `${colors.primary}10`,
                },
              ]}
              onPress={() => setCategoryId(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: !categoryId ? colors.primary : theme.textSecondary },
                  !categoryId && { fontWeight: '700' as const },
                ]}
              >
                Sin categoria
              </Text>
            </TouchableSound>

            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <TouchableSound
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: theme.card,
                      borderColor: isSelected ? colors.primary : theme.border,
                    },
                    isSelected && {
                      backgroundColor: `${colors.primary}10`,
                    },
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isSelected ? colors.primary : theme.textSecondary },
                      isSelected && { fontWeight: '700' as const },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableSound>
              );
            })}
          </View>
        </View>
      )}

      {/* Tiempo de preparacion */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Clock size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Tiempo de Preparacion (minutos)
          </Text>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Ej: 15"
          placeholderTextColor={theme.textMuted}
          value={preparationTime}
          onChangeText={setPreparationTime}
          keyboardType="number-pad"
        />
      </View>

      {/* Disponibilidad */}
      <View style={styles.section}>
        <View
          style={[
            styles.switchRow,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>
              Producto Disponible
            </Text>
            <Text style={[styles.switchDescription, { color: theme.textSecondary }]}>
              {available
                ? 'El producto aparecera en el menu para los clientes'
                : 'El producto no sera visible para los clientes'}
            </Text>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ false: theme.border, true: colors.success }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1.5,
    height: 52,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1.5,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerContent: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonContainer: {
    flex: 2,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
  },
});
