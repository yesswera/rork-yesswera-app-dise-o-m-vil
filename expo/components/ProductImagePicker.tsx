// ============================================================================
// YESSWERA: SELECTOR DE IMAGEN DE PRODUCTO
// Componente reutilizable con camara/galeria + validacion Yessi IA
// La imagen y validacion son OPCIONALES, nunca bloquean guardar
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, X, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react-native';
import TouchableSound from '@/components/TouchableSound';
import { useTheme } from '@/contexts/theme';
import { processImage, uploadProductImage, deleteProductImage } from '@/services/image-upload';
import { validateProductImage, YessiResult } from '@/services/yessi-vision';
import { Toast } from '@/utils/toast';
import { SoundFeedback } from '@/services/sounds';

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
// PROPS
// ============================================================================

interface ProductImagePickerProps {
  imageUri: string | null;
  productName: string;
  businessId: string | null;
  onImageUploaded: (publicUrl: string, localUri: string) => void;
  onImageRemoved: () => void;
  existingImageUrl?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ProductImagePicker({
  imageUri,
  productName,
  businessId,
  onImageUploaded,
  onImageRemoved,
  existingImageUrl,
}: ProductImagePickerProps) {
  const { isDark, colors, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [yessiResult, setYessiResult] = useState<YessiResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Debounce ref para re-validar al cambiar nombre
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidatedNameRef = useRef<string>('');
  const currentBase64Ref = useRef<string>('');

  // La imagen a mostrar: local > existente
  const displayImage = imageUri || existingImageUrl || null;

  // ============================================================================
  // RE-VALIDAR CON DEBOUNCE CUANDO CAMBIA EL NOMBRE
  // ============================================================================

  useEffect(() => {
    // Solo re-validar si hay imagen y el nombre cambio
    if (!currentBase64Ref.current || !productName.trim()) return;
    if (productName.trim() === lastValidatedNameRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsValidating(true);
      const result = await validateProductImage(currentBase64Ref.current, productName.trim());
      setYessiResult(result);
      lastValidatedNameRef.current = productName.trim();
      setIsValidating(false);
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [productName]);

  // ============================================================================
  // SELECCIONAR IMAGEN (Galeria o Camara)
  // ============================================================================

  const pickFromGallery = useCallback(async () => {
    setShowSourceModal(false);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria para seleccionar una foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  }, [businessId]);

  const takePhoto = useCallback(async () => {
    setShowSourceModal(false);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  }, [businessId]);

  // ============================================================================
  // PROCESAR + SUBIR + VALIDAR
  // ============================================================================

  const handleImageSelected = async (uri: string) => {
    if (!businessId) {
      Toast.error('Espera a que se cargue el negocio');
      return;
    }

    setIsUploading(true);
    setYessiResult(null);

    try {
      // 1. Procesar imagen (resize a 512x512)
      const processed = await processImage(uri);

      // 2. Subir a Supabase Storage (usando base64 directamente)
      const publicUrl = await uploadProductImage(processed.base64, businessId);

      // 3. Guardar base64 para validacion
      currentBase64Ref.current = processed.base64;

      // 4. Notificar al padre
      onImageUploaded(publicUrl, processed.uri);
      await SoundFeedback.success();

      // 5. Validar con Yessi IA (en background, no bloquea)
      if (productName.trim()) {
        setIsValidating(true);
        const validationResult = await validateProductImage(processed.base64, productName.trim());
        setYessiResult(validationResult);
        lastValidatedNameRef.current = productName.trim();
        setIsValidating(false);
      }
    } catch (error) {
      console.error('Error uploading product image:', error);
      Toast.error('Error al subir la imagen. Puedes guardar sin imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  // ============================================================================
  // REMOVER IMAGEN
  // ============================================================================

  const handleRemoveImage = useCallback(async () => {
    // Si habia imagen en storage, eliminarla
    if (imageUri && existingImageUrl) {
      try {
        await deleteProductImage(existingImageUrl);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    currentBase64Ref.current = '';
    lastValidatedNameRef.current = '';
    setYessiResult(null);
    onImageRemoved();
  }, [imageUri, existingImageUrl, onImageRemoved]);

  // ============================================================================
  // BADGE DE YESSI
  // ============================================================================

  const renderYessiBadge = () => {
    if (isValidating) {
      return (
        <View style={[styles.yessiBadge, styles.yessiBadgeLoading, { backgroundColor: isDark ? '#44403C' : '#F5F5F4' }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.yessiBadgeText, { color: theme.textSecondary }]}>Analizando...</Text>
        </View>
      );
    }

    if (!yessiResult || yessiResult.status === 'skipped' || yessiResult.status === 'error') {
      return null;
    }

    if (yessiResult.status === 'approved') {
      return (
        <View style={[styles.yessiBadge, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
          <CheckCircle size={14} color={isDark ? '#4ADE80' : '#16A34A'} />
          <Text style={[styles.yessiBadgeText, { color: isDark ? '#4ADE80' : '#16A34A' }]}>
            Yessi aprueba
          </Text>
        </View>
      );
    }

    if (yessiResult.status === 'warning') {
      return (
        <View style={styles.warningContainer}>
          <View style={[styles.yessiBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
            <AlertTriangle size={14} color={isDark ? '#FBBF24' : '#D97706'} />
            <Text style={[styles.yessiBadgeText, { color: isDark ? '#FBBF24' : '#D97706' }]}>
              Yessi sugiere revisar
            </Text>
          </View>
          {yessiResult.explanation ? (
            <Text style={[styles.warningExplanation, { color: isDark ? '#FCD34D' : '#92400E' }]}>
              {yessiResult.explanation}
            </Text>
          ) : null}
        </View>
      );
    }

    return null;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Preview area */}
      <TouchableSound
        onPress={() => !isUploading && setShowSourceModal(true)}
        disabled={isUploading}
        activeOpacity={0.7}
      >
        {displayImage ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: displayImage }}
              style={[
                styles.imagePreview,
                { borderRadius: radius.md, borderColor: theme.border },
              ]}
            />

            {/* Uploading overlay */}
            {isUploading && (
              <View style={[styles.uploadOverlay, { borderRadius: radius.md }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.uploadOverlayText}>Subiendo...</Text>
              </View>
            )}

            {/* Remove button */}
            {!isUploading && (
              <TouchableSound
                style={styles.removeButton}
                onPress={handleRemoveImage}
                activeOpacity={0.7}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableSound>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                borderRadius: radius.md,
                borderColor: theme.border,
                backgroundColor: theme.cardAlt,
              },
            ]}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.placeholderText, { color: theme.textMuted, marginTop: 12 }]}>
                  Subiendo imagen...
                </Text>
              </>
            ) : (
              <>
                <Camera size={40} color={theme.textMuted} />
                <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
                  Agrega una foto
                </Text>
                <Text style={[styles.placeholderHint, { color: theme.textMuted }]}>
                  Opcional - Toca para agregar
                </Text>
              </>
            )}
          </View>
        )}
      </TouchableSound>

      {/* Yessi Badge */}
      {displayImage && renderYessiBadge()}

      {/* Source Modal */}
      <Modal
        visible={showSourceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSourceModal(false)}
      >
        <TouchableSound
          style={styles.modalOverlay}
          onPress={() => setShowSourceModal(false)}
          activeOpacity={1}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderRadius: radius.lg || 16 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Imagen del producto</Text>

            <TouchableSound
              style={[styles.modalOption, { borderBottomColor: theme.border }]}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <Camera size={22} color={colors.primary} />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>Tomar foto</Text>
            </TouchableSound>

            <TouchableSound
              style={[styles.modalOption, { borderBottomColor: theme.border }]}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <ImageIcon size={22} color={colors.primary} />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>Elegir de galeria</Text>
            </TouchableSound>

            <TouchableSound
              style={styles.modalCancel}
              onPress={() => setShowSourceModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancelar</Text>
            </TouchableSound>
          </View>
        </TouchableSound>
      </Modal>
    </View>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  // Image preview
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Placeholder (sin imagen)
  placeholder: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderHint: {
    fontSize: 12,
  },

  // Yessi badge
  yessiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  yessiBadgeLoading: {
    paddingVertical: 8,
  },
  yessiBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  warningExplanation: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 17,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalContent: {
    paddingTop: 20,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCancel: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
