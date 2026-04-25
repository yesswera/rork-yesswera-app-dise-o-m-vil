// ============================================================================
// YESSWERA: ADD PRODUCT — Simplified. Name, Price, Category, Photo (optional)
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { createProduct } from '@/services/products';
import { processImage, uploadProductImage } from '@/services/image-upload';
import { DS, colorShadow } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';

const CATEGORIES = ['Tacos', 'Mariscos', 'Pollos', 'Bebidas', 'Otros'];

export default function AddProductScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Tacos');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBusinessId(data.id);
      });
  }, [user]);

  const canSave = name.trim().length > 0 && price.trim().length > 0 && Number(price) > 0;

  async function pickImage(source: 'camera' | 'gallery') {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };

    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso', 'Se necesita acceso a la camara');
        return;
      }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function showImagePicker() {
    Alert.alert('Foto del producto', 'Elige una opcion', [
      { text: 'Camara', onPress: () => pickImage('camera') },
      { text: 'Galeria', onPress: () => pickImage('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    if (!canSave || !businessId) return;
    setSaving(true);

    try {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (imageUri) {
        try {
          const processed = await processImage(imageUri);
          imageUrl = await uploadProductImage(processed.base64, businessId);
        } catch (imgErr) {
          console.warn('Image upload failed, saving without image:', imgErr);
        }
      }

      await createProduct(businessId, {
        name: name.trim(),
        price: Number(price),
        category,
        image: imageUrl,
        available: true,
      });

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Nuevo Producto</Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Tacos al Pastor"
            placeholderTextColor={DS.colors.placeholder}
            maxLength={80}
          />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Precio (MXN)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="Ej: 25"
            placeholderTextColor={DS.colors.placeholder}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo (optional) */}
        <View style={styles.field}>
          <Text style={styles.label}>Foto (opcional)</Text>
          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setImageUri(null)}
                style={styles.imageRemove}
              >
                <X size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={showImagePicker}
              activeOpacity={0.7}
              style={styles.imagePlaceholder}
            >
              <Camera size={32} color={DS.colors.muted} />
              <Text style={styles.imagePlaceholderText}>
                Tomar o elegir foto
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save */}
        <View style={styles.saveWrap}>
          <BigButton
            title="Guardar Producto"
            color={DS.colors.orange}
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
          />
        </View>
      </ScrollView>
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
    gap: DS.space.xxl,
    paddingBottom: 40,
  },
  screenTitle: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
  },

  // Field
  field: {
    gap: DS.space.sm,
  },
  label: {
    ...DS.fonts.label,
    color: DS.colors.dark,
  },
  input: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    ...DS.fonts.body,
    color: DS.colors.dark,
    minHeight: DS.touch.min,
  },

  // Category chips
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.sm,
  },
  categoryChip: {
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
  },
  categoryChipActive: {
    backgroundColor: DS.colors.orange,
    borderColor: DS.colors.orange,
  },
  categoryChipText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.body,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // Image
  imagePlaceholder: {
    height: 140,
    borderRadius: DS.radius.xl,
    borderWidth: 2,
    borderColor: DS.colors.hairline,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: DS.space.sm,
    backgroundColor: DS.colors.card,
  },
  imagePlaceholderText: {
    ...DS.fonts.body,
    color: DS.colors.muted,
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: DS.radius.xl,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: DS.radius.xl,
  },
  imageRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Save
  saveWrap: {
    marginTop: DS.space.md,
  },
});
