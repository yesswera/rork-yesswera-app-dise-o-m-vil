// ============================================================================
// YESSWERA: SELECTOR DE IMAGEN DE NEGOCIO (Logo / Cover)
// Componente reutilizable para subir logo circular o cover rectangular
// Sin Yessi IA (no aplica validar un logo/portada)
// ============================================================================

import { useState, useCallback } from 'react';
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
import { Camera, ImageIcon, X, Store } from 'lucide-react-native';
import TouchableSound from '@/components/TouchableSound';
import { useTheme } from '@/contexts/theme';
import { processImageCustom, uploadBusinessImage, deleteProductImage } from '@/services/image-upload';
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
// CONFIGURACION POR TIPO
// ============================================================================

const IMAGE_CONFIG = {
  logo: {
    width: 256,
    height: 256,
    aspect: [1, 1] as [number, number],
    previewSize: 140,
    label: 'Logo del negocio',
    hint: 'Toca para agregar logo',
    modalTitle: 'Logo del negocio',
  },
  cover: {
    width: 800,
    height: 450,
    aspect: [16, 9] as [number, number],
    previewSize: 180,
    label: 'Foto de portada',
    hint: 'Toca para agregar portada',
    modalTitle: 'Foto de portada',
  },
};

// ============================================================================
// PROPS
// ============================================================================

interface BusinessImagePickerProps {
  imageUri: string | null;
  type: 'logo' | 'cover';
  businessId: string | null;
  onImageUploaded: (publicUrl: string, localUri: string) => void;
  onImageRemoved: () => void;
  existingImageUrl?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function BusinessImagePicker({
  imageUri,
  type,
  businessId,
  onImageUploaded,
  onImageRemoved,
  existingImageUrl,
}: BusinessImagePickerProps) {
  const { isDark, colors, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const config = IMAGE_CONFIG[type];

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // La imagen a mostrar: local > existente
  const displayImage = imageUri || existingImageUrl || null;

  const isLogo = type === 'logo';

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
      aspect: config.aspect,
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
      aspect: config.aspect,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  }, [businessId]);

  // ============================================================================
  // PROCESAR + SUBIR
  // ============================================================================

  const handleImageSelected = async (uri: string) => {
    if (!businessId) {
      Toast.error('Espera a que se cargue el negocio');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Procesar imagen con dimensiones segun tipo
      const processed = await processImageCustom(uri, config.width, config.height);

      // 2. Subir a Supabase Storage
      const publicUrl = await uploadBusinessImage(processed.base64, businessId, type);

      // 3. Notificar al padre
      onImageUploaded(publicUrl, processed.uri);
      await SoundFeedback.success();
    } catch (error) {
      console.error(`Error uploading business ${type}:`, error);
      Toast.error('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  // ============================================================================
  // REMOVER IMAGEN
  // ============================================================================

  const handleRemoveImage = useCallback(async () => {
    // Si habia imagen en storage, eliminarla
    const urlToDelete = imageUri || existingImageUrl;
    if (urlToDelete && urlToDelete.includes('supabase')) {
      try {
        await deleteProductImage(urlToDelete);
      } catch (error) {
        console.error('Error deleting old business image:', error);
      }
    }

    onImageRemoved();
  }, [imageUri, existingImageUrl, onImageRemoved]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {config.label}
      </Text>

      {/* Preview area */}
      <TouchableSound
        onPress={() => !isUploading && setShowSourceModal(true)}
        disabled={isUploading}
        activeOpacity={0.7}
      >
        {displayImage ? (
          <View style={[styles.imageContainer, isLogo && styles.imageContainerLogo]}>
            <Image
              source={{ uri: displayImage }}
              style={[
                isLogo ? styles.logoPreview : styles.coverPreview,
                {
                  borderColor: theme.border,
                  borderRadius: isLogo ? 70 : radius.md,
                },
              ]}
            />

            {/* Uploading overlay */}
            {isUploading && (
              <View
                style={[
                  styles.uploadOverlay,
                  { borderRadius: isLogo ? 70 : radius.md },
                ]}
              >
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.uploadOverlayText}>Subiendo...</Text>
              </View>
            )}

            {/* Remove button */}
            {!isUploading && (
              <TouchableSound
                style={[
                  styles.removeButton,
                  isLogo && styles.removeButtonLogo,
                ]}
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
              isLogo ? styles.logoPlaceholder : styles.coverPlaceholder,
              {
                borderRadius: isLogo ? 70 : radius.md,
                borderColor: theme.border,
                backgroundColor: theme.cardAlt,
              },
            ]}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.placeholderText, { color: theme.textMuted, marginTop: 8 }]}>
                  Subiendo...
                </Text>
              </>
            ) : (
              <>
                {isLogo ? (
                  <Store size={36} color={theme.textMuted} />
                ) : (
                  <ImageIcon size={36} color={theme.textMuted} />
                )}
                <Text style={[styles.placeholderHint, { color: theme.textMuted }]}>
                  {config.hint}
                </Text>
              </>
            )}
          </View>
        )}
      </TouchableSound>

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
            <Text style={[styles.modalTitle, { color: theme.text }]}>{config.modalTitle}</Text>

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
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Image containers
  imageContainer: {
    position: 'relative',
  },
  imageContainerLogo: {
    alignSelf: 'center',
  },

  // Logo preview (circular 140px)
  logoPreview: {
    width: 140,
    height: 140,
    borderWidth: 2,
    alignSelf: 'center',
  },

  // Cover preview (full width, 180px height)
  coverPreview: {
    width: '100%',
    height: 180,
    borderWidth: 1.5,
  },

  // Upload overlay
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

  // Remove button
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
  removeButtonLogo: {
    top: 4,
    right: undefined,
    left: '50%',
    marginLeft: 40,
  },

  // Placeholders
  logoPlaceholder: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  coverPlaceholder: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderHint: {
    fontSize: 12,
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
