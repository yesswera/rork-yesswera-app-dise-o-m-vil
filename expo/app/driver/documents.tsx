import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: DOCUMENTOS DEL REPARTIDOR
// Pantalla para subir y gestionar documentos de verificacion
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  Camera,
  ImageIcon,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  Shield,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import {
  type DocType,
  type DriverDocument,
  type DocumentRequirement,
  getDocumentRequirements,
  getDriverDocuments,
  uploadDriverDocument,
  deleteDriverDocument,
  submitForVerification,
  getVerificationStatus,
} from '@/services/driver-documents';
import { validateDocument, type DocValidationResult } from '@/services/yessi-vision';
import { processImage } from '@/services/image-upload';

const STATUS_COLORS = {
  pending: '#F59E0B',
  approved: '#22C55E',
  rejected: '#EF4444',
};

export default function DriverDocumentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string | undefined>();
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [verificationNotes, setVerificationNotes] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [analyzing, setAnalyzing] = useState<DocType | null>(null);
  const [docValidations, setDocValidations] = useState<Record<string, DocValidationResult>>({});
  const [sourceModalDoc, setSourceModalDoc] = useState<DocType | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const requirements = getDocumentRequirements(vehicleType);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, vehicle_type, verification_status, verification_notes')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!driver) return;

      setDriverId(driver.id);
      setVehicleType(driver.vehicle_type || undefined);
      setVerificationStatus(driver.verification_status || 'pending');
      setVerificationNotes(driver.verification_notes || undefined);

      const docs = await getDriverDocuments(driver.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }

  const getDocForType = (docType: DocType): DriverDocument | undefined => {
    return documents.find(d => d.docType === docType);
  };

  const handlePickImage = async (docType: DocType, source: 'camera' | 'gallery') => {
    setSourceModalDoc(null);

    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara para tomar fotos de tus documentos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria para seleccionar fotos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;
      if (!driverId) return;

      const imageUri = result.assets[0].uri;

      // Step 1: Pre-screening con Yessi IA
      setAnalyzing(docType);
      try {
        const processed = await processImage(imageUri);
        const validation = await validateDocument(processed.base64, docType);
        setDocValidations(prev => ({ ...prev, [docType]: validation }));

        if (validation.status === 'rejected') {
          setAnalyzing(null);
          Alert.alert(
            'Documento no valido',
            `${validation.explanation}\n\nPor favor toma otra foto.`,
            [{ text: 'Entendido' }],
          );
          return;
        }

        if (validation.status === 'warning') {
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Revisar imagen',
              `${validation.explanation}\n\n¿Deseas subir esta imagen de todas formas?`,
              [
                { text: 'Tomar otra', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Subir asi', onPress: () => resolve(true) },
              ],
            );
          });
          if (!proceed) {
            setAnalyzing(null);
            return;
          }
        }
      } catch (err) {
        // Si falla la validacion IA, continuar con upload normal
        console.warn('Document validation failed, proceeding with upload:', err);
      }

      // Step 2: Upload
      setAnalyzing(null);
      setUploading(docType);

      const doc = await uploadDriverDocument(driverId, docType, imageUri);
      setDocuments(prev => {
        const existing = prev.findIndex(d => d.docType === docType);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = doc;
          return updated;
        }
        return [...prev, doc];
      });
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'No se pudo subir el documento. Intenta de nuevo.');
    } finally {
      setUploading(null);
      setAnalyzing(null);
    }
  };

  const handleDelete = (docType: DocType) => {
    if (!driverId) return;
    Alert.alert('Eliminar documento', 'Estas seguro? Tendras que subir uno nuevo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDriverDocument(driverId, docType);
            setDocuments(prev => prev.filter(d => d.docType !== docType));
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar el documento.');
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!driverId) return;

    // Check all required docs are uploaded
    const missing = requirements.filter(r => r.required && !getDocForType(r.docType));
    if (missing.length > 0) {
      Alert.alert(
        'Documentos faltantes',
        `Necesitas subir: ${missing.map(m => m.label).join(', ')}`
      );
      return;
    }

    try {
      await submitForVerification(driverId);
      setVerificationStatus('documents_submitted');
      Alert.alert(
        'Documentos enviados',
        'Tus documentos fueron enviados para revision. Te notificaremos cuando sean aprobados.',
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudieron enviar los documentos.');
    }
  };

  const allRequiredUploaded = requirements
    .filter(r => r.required)
    .every(r => getDocForType(r.docType));

  const hasRejected = documents.some(d => d.status === 'rejected');
  const allApproved = requirements
    .filter(r => r.required)
    .every(r => {
      const doc = getDocForType(r.docType);
      return doc && doc.status === 'approved';
    });

  const canSubmit = allRequiredUploaded && verificationStatus !== 'documents_submitted' && !allApproved;

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={18} color={STATUS_COLORS.approved} />;
      case 'rejected': return <XCircle size={18} color={STATUS_COLORS.rejected} />;
      case 'pending': return <Clock size={18} color={STATUS_COLORS.pending} />;
      default: return <Upload size={18} color={colors.text.secondary} />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      case 'pending': return 'En revision';
      default: return 'Sin subir';
    }
  };

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={FileText}
        headerTitle="Mis Documentos"
        headerSubtitle="Cargando..."
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={FileText}
      headerTitle="Mis Documentos"
      headerSubtitle="Verificacion de identidad"
    >
      {/* Status Banner */}
      {verificationStatus === 'approved' && (
        <View style={[styles.statusBanner, { backgroundColor: `${STATUS_COLORS.approved}15`, borderColor: STATUS_COLORS.approved }]}>
          <CheckCircle size={20} color={STATUS_COLORS.approved} />
          <ThemedText variant="body" bold style={{ color: STATUS_COLORS.approved, flex: 1 }}>
            Verificacion aprobada — puedes recibir ordenes
          </ThemedText>
        </View>
      )}

      {verificationStatus === 'documents_submitted' && (
        <View style={[styles.statusBanner, { backgroundColor: `${STATUS_COLORS.pending}15`, borderColor: STATUS_COLORS.pending }]}>
          <Clock size={20} color={STATUS_COLORS.pending} />
          <ThemedText variant="body" bold style={{ color: STATUS_COLORS.pending, flex: 1 }}>
            Documentos en revision — te notificaremos pronto
          </ThemedText>
        </View>
      )}

      {verificationStatus === 'rejected' && (
        <View style={[styles.statusBanner, { backgroundColor: `${STATUS_COLORS.rejected}15`, borderColor: STATUS_COLORS.rejected }]}>
          <AlertTriangle size={20} color={STATUS_COLORS.rejected} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" bold style={{ color: STATUS_COLORS.rejected }}>
              Verificacion rechazada
            </ThemedText>
            {verificationNotes && (
              <ThemedText variant="caption" style={{ color: STATUS_COLORS.rejected, marginTop: 4 }}>
                Razon: {verificationNotes}
              </ThemedText>
            )}
            <ThemedText variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
              Corrige los documentos marcados y vuelve a enviar.
            </ThemedText>
          </View>
        </View>
      )}

      {verificationStatus === 'pending' && (
        <View style={[styles.statusBanner, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
          <Shield size={20} color={colors.primary} />
          <ThemedText variant="body" style={{ color: colors.text.primary, flex: 1 }}>
            Para recibir ordenes necesitas verificar tu identidad. Sube los documentos que se indican abajo.
          </ThemedText>
        </View>
      )}

      {/* Document Cards */}
      {requirements.map((req) => {
        const doc = getDocForType(req.docType);
        const isUploading = uploading === req.docType;
        const isAnalyzing = analyzing === req.docType;
        const validation = docValidations[req.docType];

        return (
          <ScreenCard key={req.docType}>
            <View style={styles.docHeader}>
              <View style={styles.docTitleRow}>
                {getStatusIcon(doc?.status)}
                <ThemedText variant="subtitle" bold style={{ color: colors.text.primary, flex: 1 }}>
                  {req.label}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: doc ? (STATUS_COLORS as any)[doc.status] || colors.text.secondary : colors.text.secondary }}>
                  {getStatusLabel(doc?.status)}
                </ThemedText>
              </View>
              <ThemedText variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
                {req.description}
              </ThemedText>
            </View>

            {/* Rejected reason */}
            {doc?.status === 'rejected' && doc.rejectedReason && (
              <View style={[styles.rejectedBanner, { backgroundColor: `${STATUS_COLORS.rejected}10` }]}>
                <ThemedText variant="caption" style={{ color: STATUS_COLORS.rejected }}>
                  Motivo: {doc.rejectedReason}
                </ThemedText>
              </View>
            )}

            {/* Image preview */}
            {doc?.imageUrl && (
              <TouchableSound onPress={() => setPreviewImage(doc.imageUrl)}>
                <Image source={{ uri: doc.imageUrl }} style={styles.docImage} resizeMode="cover" />
              </TouchableSound>
            )}

            {/* Yessi IA validation badge */}
            {doc && validation && validation.status !== 'skipped' && validation.status !== 'error' && (
              <View style={[styles.validationBadge, {
                backgroundColor: validation.status === 'valid'
                  ? `${STATUS_COLORS.approved}15`
                  : `${STATUS_COLORS.pending}15`,
              }]}>
                {validation.status === 'valid' ? (
                  <CheckCircle size={14} color={STATUS_COLORS.approved} />
                ) : (
                  <AlertTriangle size={14} color={STATUS_COLORS.pending} />
                )}
                <ThemedText variant="caption" style={{
                  color: validation.status === 'valid' ? STATUS_COLORS.approved : STATUS_COLORS.pending,
                  marginLeft: 6,
                  flex: 1,
                }}>
                  Yessi IA: {validation.explanation}
                </ThemedText>
              </View>
            )}

            {/* Analyzing / Uploading / Buttons */}
            {isAnalyzing ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <ThemedText variant="caption" style={{ color: colors.text.secondary, marginLeft: 8 }}>
                  Yessi IA analizando documento...
                </ThemedText>
              </View>
            ) : isUploading ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <ThemedText variant="caption" style={{ color: colors.text.secondary, marginLeft: 8 }}>
                  Subiendo documento...
                </ThemedText>
              </View>
            ) : doc?.status === 'approved' ? null : (
              <View style={styles.actionRow}>
                <TouchableSound
                  style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                  onPress={() => setSourceModalDoc(req.docType)}
                >
                  <Camera size={16} color="#FFFFFF" />
                  <ThemedText variant="label" style={{ color: '#FFFFFF', marginLeft: 6 }}>
                    {doc ? 'Reemplazar' : 'Subir'}
                  </ThemedText>
                </TouchableSound>
                {doc && (doc.status as string) !== 'approved' && (
                  <TouchableSound
                    style={[styles.deleteButton, { borderColor: STATUS_COLORS.rejected }]}
                    onPress={() => handleDelete(req.docType)}
                  >
                    <X size={16} color={STATUS_COLORS.rejected} />
                  </TouchableSound>
                )}
              </View>
            )}
          </ScreenCard>
        );
      })}

      {/* Submit Button */}
      {canSubmit && (
        <TouchableSound
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
        >
          <Shield size={20} color="#FFFFFF" />
          <ThemedText variant="subtitle" bold style={{ color: '#FFFFFF', marginLeft: 8 }}>
            Enviar para Verificacion
          </ThemedText>
        </TouchableSound>
      )}

      {/* Re-submit after rejection */}
      {hasRejected && verificationStatus === 'rejected' && allRequiredUploaded && (
        <TouchableSound
          style={[styles.submitButton, { backgroundColor: STATUS_COLORS.pending }]}
          onPress={handleSubmit}
        >
          <Shield size={20} color="#FFFFFF" />
          <ThemedText variant="subtitle" bold style={{ color: '#FFFFFF', marginLeft: 8 }}>
            Re-enviar Documentos Corregidos
          </ThemedText>
        </TouchableSound>
      )}

      {/* Source Selection Modal */}
      <Modal visible={sourceModalDoc !== null} transparent animationType="fade" onRequestClose={() => setSourceModalDoc(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ThemedText variant="h3" bold style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 20 }}>
              Seleccionar fuente
            </ThemedText>
            <TouchableSound
              style={[styles.sourceOption, { backgroundColor: colors.primary }]}
              onPress={() => sourceModalDoc && handlePickImage(sourceModalDoc, 'camera')}
            >
              <Camera size={20} color="#FFFFFF" />
              <ThemedText variant="subtitle" style={{ color: '#FFFFFF', marginLeft: 10 }}>Tomar Foto</ThemedText>
            </TouchableSound>
            <TouchableSound
              style={[styles.sourceOption, { backgroundColor: colors.background.secondary, marginTop: 10 }]}
              onPress={() => sourceModalDoc && handlePickImage(sourceModalDoc, 'gallery')}
            >
              <ImageIcon size={20} color={colors.text.primary} />
              <ThemedText variant="subtitle" style={{ color: colors.text.primary, marginLeft: 10 }}>Elegir de Galeria</ThemedText>
            </TouchableSound>
            <TouchableSound
              style={[styles.cancelOption, { marginTop: 16 }]}
              onPress={() => setSourceModalDoc(null)}
            >
              <ThemedText variant="body" style={{ color: colors.text.secondary }}>Cancelar</ThemedText>
            </TouchableSound>
          </View>
        </View>
      </Modal>

      {/* Full-size Image Preview */}
      <Modal visible={previewImage !== null} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <TouchableSound style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <X size={28} color="#FFFFFF" />
          </TouchableSound>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  docHeader: {
    marginBottom: 12,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectedBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  docImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelOption: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '90%',
    height: '70%',
  },
});
