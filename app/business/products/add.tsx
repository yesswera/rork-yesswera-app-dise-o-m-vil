import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: AGREGAR PRODUCTO
// Pantalla para que el negocio agregue un nuevo producto a su catalogo
// Usa ScreenContainer para diseno unificado
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Tag, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import {
  getBusinessCategories,
  createProduct,
  createCategory,
} from '@/services/products';
import { ProductCategory } from '@/constants/types';
import { PRODUCT_UNITS, formatPriceWithUnit } from '@/constants/units';
import { Toast } from '@/utils/toast';
import { SoundFeedback } from '@/services/sounds';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import ProductImagePicker from '@/components/ProductImagePicker';

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

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AddProductScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  // Business lookup
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [preparationTime, setPreparationTime] = useState<string>('');
  const [available, setAvailable] = useState<boolean>(true);

  // Categories
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);

  // New category inline
  const [showNewCategory, setShowNewCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);

  // Unit
  const [unit, setUnit] = useState<string>('pieza');
  const [customUnit, setCustomUnit] = useState<string>('');

  // Image
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageLocalUri, setImageLocalUri] = useState<string>('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  // ============================================================================
  // LOOKUP BUSINESS ID
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
  // LOAD CATEGORIES
  // ============================================================================

  useEffect(() => {
    if (!businessId) return;

    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const data = await getBusinessCategories(businessId);
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        Toast.error('Error al cargar categorias');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [businessId]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validate = (): boolean => {
    const newErrors: { name?: string; price?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    const numericPrice = parseFloat(price);
    if (!price.trim() || isNaN(numericPrice) || numericPrice <= 0) {
      newErrors.price = 'El precio debe ser mayor a $0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // CREATE NEW CATEGORY
  // ============================================================================

  const handleCreateCategory = async () => {
    if (!businessId || !newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategory(businessId, {
        name: newCategoryName.trim(),
      });

      setCategories(prev => [...prev, newCategory]);
      setSelectedCategoryId(newCategory.id);
      setNewCategoryName('');
      setShowNewCategory(false);
      Toast.success(`Categoria "${newCategory.name}" creada`);
    } catch (error) {
      console.error('Error creating category:', error);
      Toast.error('Error al crear categoria');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // ============================================================================
  // SUBMIT PRODUCT
  // ============================================================================

  const handleSubmit = async () => {
    console.log('[AddProduct] businessId:', businessId, 'name:', name, 'price:', price, 'imageUrl:', imageUrl ? 'SET' : 'EMPTY');

    if (!businessId) {
      Toast.error('No se encontro el negocio');
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const finalUnit = unit === 'otro' ? (customUnit.trim() || 'pieza') : unit;
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        categoryId: selectedCategoryId || undefined,
        preparationTime: preparationTime ? parseInt(preparationTime, 10) : undefined,
        available,
        image: imageUrl || undefined,
        unit: finalUnit,
      };
      console.log('[AddProduct] Creating with data:', JSON.stringify(productData));
      await createProduct(businessId, productData);

      await SoundFeedback.success();
      Toast.success('Producto creado exitosamente');
      router.back();
    } catch (error: any) {
      console.error('Error creating product:', error?.message || error);
      Toast.error('Error al crear producto: ' + (error?.message || 'desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // GET SELECTED CATEGORY NAME
  // ============================================================================

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Seleccionar...';

  // ============================================================================
  // FOOTER
  // ============================================================================

  const FooterComponent = (
    <View style={styles.footerContent}>
      <TouchableSound
        style={[styles.cancelButton, { borderColor: theme.border }]}
        onPress={() => router.back()}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
      </TouchableSound>

      <TouchableSound
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary },
          isSubmitting && { opacity: 0.6 },
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Crear Producto</Text>
          </>
        )}
      </TouchableSound>
    </View>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Plus}
      headerTitle="Nuevo Producto"
      headerSubtitle="Agrega un producto a tu catalogo"
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
        }}
      />

      {/* Nombre del producto */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>
          Nombre del producto <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderWidth: 1,
              borderColor: errors.name ? colors.error : theme.border,
              borderRadius: radius.md,
              padding: space.md,
              backgroundColor: theme.card,
              color: theme.text,
            },
          ]}
          placeholder="Ej: Hamburguesa clasica"
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
          }}
        />
        {errors.name && (
          <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>
        )}
      </View>

      {/* Descripcion */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Descripcion</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              padding: space.md,
              backgroundColor: theme.card,
              color: theme.text,
            },
          ]}
          placeholder="Describe tu producto..."
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          numberOfLines={3}
        />
      </View>

      {/* Precio */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>
          Precio (MXN) <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderWidth: 1,
              borderColor: errors.price ? colors.error : theme.border,
              borderRadius: radius.md,
              padding: space.md,
              backgroundColor: theme.card,
              color: theme.text,
            },
          ]}
          placeholder="0.00"
          placeholderTextColor={theme.textMuted}
          value={price}
          onChangeText={(text) => {
            // Allow only numbers and one decimal point
            const filtered = text.replace(/[^0-9.]/g, '');
            const parts = filtered.split('.');
            if (parts.length > 2) return;
            if (parts[1] && parts[1].length > 2) return;
            setPrice(filtered);
            if (errors.price) setErrors(prev => ({ ...prev, price: undefined }));
          }}
          keyboardType="decimal-pad"
        />
        {errors.price && (
          <Text style={[styles.errorText, { color: colors.error }]}>{errors.price}</Text>
        )}
      </View>

      {/* Unidad de venta */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Unidad de venta</Text>
        {price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) > 0 && (
          <Text style={[styles.helperText, { color: colors.primary, marginBottom: 8, fontWeight: '600' }]}>
            Se mostrara como: {formatPriceWithUnit(parseFloat(price), unit === 'otro' ? (customUnit.trim() || 'pieza') : unit)}
          </Text>
        )}
        <View style={styles.unitChipsContainer}>
          {PRODUCT_UNITS.map((u) => (
            <TouchableSound
              key={u.value}
              style={[
                styles.unitChip,
                {
                  backgroundColor: unit === u.value ? `${colors.primary}15` : theme.card,
                  borderColor: unit === u.value ? colors.primary : theme.border,
                  borderRadius: radius.md,
                },
              ]}
              onPress={() => setUnit(u.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.unitChipText,
                  {
                    color: unit === u.value ? colors.primary : theme.textSecondary,
                    fontWeight: unit === u.value ? '700' : '500',
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
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: radius.md,
                padding: space.md,
                backgroundColor: theme.card,
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
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Categoria</Text>

        {isLoadingCategories ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
        ) : (
          <>
            {/* Category Picker Toggle */}
            <TouchableSound
              style={[
                styles.pickerButton,
                {
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: radius.md,
                  padding: space.md,
                  backgroundColor: theme.card,
                },
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              activeOpacity={0.7}
            >
              <Tag size={18} color={theme.textSecondary} />
              <Text style={[styles.pickerButtonText, { color: theme.text, flex: 1 }]}>
                {selectedCategoryName}
              </Text>
              <ChevronDown
                size={18}
                color={theme.textSecondary}
                style={{ transform: [{ rotate: showCategoryPicker ? '180deg' : '0deg' }] }}
              />
            </TouchableSound>

            {/* Category List (expanded) */}
            {showCategoryPicker && (
              <View style={[styles.categoryList, { borderColor: theme.border, backgroundColor: theme.card }]}>
                {categories.map((cat) => (
                  <TouchableSound
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      { borderBottomColor: theme.border },
                      cat.id === selectedCategoryId && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      setShowCategoryPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        { color: theme.text },
                        cat.id === selectedCategoryId && {
                          color: colors.primary,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableSound>
                ))}

                {categories.length === 0 && (
                  <View style={styles.categoryItem}>
                    <Text style={[styles.categoryItemText, { color: theme.textMuted }]}>
                      No hay categorias. Crea una nueva.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* New Category Inline */}
            {!showNewCategory ? (
              <TouchableSound
                style={styles.newCategoryToggle}
                onPress={() => setShowNewCategory(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={[styles.newCategoryToggleText, { color: colors.primary }]}>
                  Crear nueva categoria
                </Text>
              </TouchableSound>
            ) : (
              <View style={styles.newCategoryRow}>
                <TextInput
                  style={[
                    styles.newCategoryInput,
                    {
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: radius.md,
                      padding: space.md,
                      backgroundColor: theme.card,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Nombre de la categoria"
                  placeholderTextColor={theme.textMuted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                />
                <TouchableSound
                  style={[
                    styles.newCategoryButton,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                      opacity: (!newCategoryName.trim() || isCreatingCategory) ? 0.5 : 1,
                    },
                  ]}
                  onPress={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                  activeOpacity={0.7}
                >
                  {isCreatingCategory ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Plus size={20} color="#FFFFFF" />
                  )}
                </TouchableSound>
                <TouchableSound
                  style={[styles.newCategoryCancelButton, { borderColor: theme.border, borderRadius: radius.md }]}
                  onPress={() => {
                    setShowNewCategory(false);
                    setNewCategoryName('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.newCategoryCancelText, { color: theme.textSecondary }]}>X</Text>
                </TouchableSound>
              </View>
            )}
          </>
        )}
      </View>

      {/* Tiempo de preparacion */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>Tiempo de preparacion (minutos)</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              padding: space.md,
              backgroundColor: theme.card,
              color: theme.text,
            },
          ]}
          placeholder="Ej: 15"
          placeholderTextColor={theme.textMuted}
          value={preparationTime}
          onChangeText={(text) => {
            const filtered = text.replace(/[^0-9]/g, '');
            setPreparationTime(filtered);
          }}
          keyboardType="number-pad"
        />
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Opcional. Tiempo estimado para preparar el producto.
        </Text>
      </View>

      {/* Disponibilidad */}
      <View style={styles.section}>
        <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.md }]}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Disponible</Text>
            <Text style={[styles.switchDescription, { color: theme.textSecondary }]}>
              {available
                ? 'El producto se mostrara en tu menu'
                : 'El producto estara oculto para los clientes'}
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    height: 50,
  },
  textArea: {
    fontSize: 15,
    minHeight: 90,
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  // Unit chips
  unitChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  unitChipText: {
    fontSize: 14,
  },

  // Category picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerButtonText: {
    fontSize: 15,
  },
  categoryList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // New category inline
  newCategoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  newCategoryToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  newCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  newCategoryInput: {
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  newCategoryButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCategoryCancelButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  newCategoryCancelText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Switch row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Footer
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
  submitButton: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
