import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import ViewShot from 'react-native-view-shot';
import {
  Camera,
  X,
  Check,
  RotateCcw,
  MapPin,
  Clock,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface DeliveryPhotoProps {
  visible: boolean;
  orderId: string;
  deliveryAddress: string;
  onPhotoTaken: (orderId: string, photoUri: string, metadata: PhotoMetadata) => void;
  onCancel: () => void;
}

interface PhotoMetadata {
  timestamp: string;
  latitude: number;
  longitude: number;
  address: string;
  accuracy?: number;
}

export default function DeliveryPhoto({
  visible,
  orderId,
  deliveryAddress,
  onPhotoTaken,
  onCancel,
}: DeliveryPhotoProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [currentTime, setCurrentTime] = useState(new Date());

  const cameraRef = useRef<CameraView>(null);
  const viewShotRef = useRef<ViewShot>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation(loc);
        } catch (error) {
          console.log('Error getting location:', error);
        }
      }
    })();
  }, [visible]);

  // Update location periodically when visible
  useEffect(() => {
    if (!visible || !locationPermission) return;

    const locationInterval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);
      } catch (error) {
        console.log('Error updating location:', error);
      }
    }, 5000);

    return () => clearInterval(locationInterval);
  }, [visible, locationPermission]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}${latDir}, ${Math.abs(lng).toFixed(6)}${lngDir}`;
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photoData = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photoData?.uri) {
        setPhoto(photoData.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  const handleConfirm = async () => {
    if (!photo || !viewShotRef.current) return;

    setIsProcessing(true);
    try {
      // Capture the view with watermark
      const watermarkedUri = await viewShotRef.current.capture?.();
      if (!watermarkedUri) {
        throw new Error('Failed to capture photo');
      }

      const metadata: PhotoMetadata = {
        timestamp: currentTime.toISOString(),
        latitude: location?.coords.latitude || 0,
        longitude: location?.coords.longitude || 0,
        address: deliveryAddress,
        accuracy: location?.coords.accuracy !== null && location?.coords.accuracy !== undefined ? location.coords.accuracy : undefined,
      };

      onPhotoTaken(orderId, watermarkedUri, metadata);
    } catch (error) {
      console.error('Error processing photo:', error);
      Alert.alert('Error', 'No se pudo procesar la foto. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPhoto(null);
    onCancel();
  };

  const toggleFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Permission denied states
  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.permissionText}>Cargando...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <AlertCircle size={64} color={Colors.warning} />
            <Text style={styles.permissionTitle}>Permiso de Camara</Text>
            <Text style={styles.permissionText}>
              Necesitamos acceso a la camara para tomar la foto de entrega.
            </Text>
            <View style={styles.permissionButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>Dar Permiso</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Foto de Entrega</Text>
          <View style={styles.headerSpacer} />
        </View>

        {!photo ? (
          // Camera View
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
            >
              {/* Live Watermark Preview */}
              <View style={styles.watermarkPreview}>
                <View style={styles.watermarkRow}>
                  <Clock size={14} color={Colors.white} />
                  <Text style={styles.watermarkText}>
                    {formatDate(currentTime)} {formatTime(currentTime)}
                  </Text>
                </View>
                <View style={styles.watermarkRow}>
                  <MapPin size={14} color={Colors.white} />
                  <Text style={styles.watermarkText}>
                    {location
                      ? formatCoordinates(location.coords.latitude, location.coords.longitude)
                      : 'Obteniendo ubicacion...'}
                  </Text>
                </View>
                <Text style={styles.watermarkAddress} numberOfLines={2}>
                  {deliveryAddress}
                </Text>
              </View>

              {/* Camera Controls */}
              <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.flipButton} onPress={toggleFacing}>
                  <RotateCcw size={24} color={Colors.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                  onPress={handleTakePhoto}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Camera size={32} color={Colors.primary} />
                  )}
                </TouchableOpacity>

                <View style={styles.flipButton} />
              </View>
            </CameraView>
          </View>
        ) : (
          // Photo Preview with Watermark
          <View style={styles.previewContainer}>
            <ViewShot
              ref={viewShotRef}
              options={{
                format: 'jpg',
                quality: 0.9,
              }}
              style={styles.viewShot}
            >
              <Image source={{ uri: photo }} style={styles.previewImage} />

              {/* Watermark Overlay */}
              <View style={styles.watermarkOverlay}>
                <View style={styles.watermarkBox}>
                  <View style={styles.watermarkHeader}>
                    <ImageIcon size={16} color={Colors.white} />
                    <Text style={styles.watermarkTitle}>YESSWERA - Prueba de Entrega</Text>
                  </View>

                  <View style={styles.watermarkDivider} />

                  <View style={styles.watermarkRow}>
                    <Clock size={14} color={Colors.white} />
                    <Text style={styles.watermarkText}>
                      {formatDate(currentTime)} {formatTime(currentTime)}
                    </Text>
                  </View>

                  <View style={styles.watermarkRow}>
                    <MapPin size={14} color={Colors.white} />
                    <Text style={styles.watermarkText}>
                      {location
                        ? formatCoordinates(location.coords.latitude, location.coords.longitude)
                        : 'Sin ubicacion'}
                    </Text>
                  </View>

                  {location?.coords.accuracy && (
                    <Text style={styles.accuracyText}>
                      Precision: {location.coords.accuracy.toFixed(0)}m
                    </Text>
                  )}

                  <View style={styles.watermarkDivider} />

                  <Text style={styles.watermarkAddress} numberOfLines={2}>
                    {deliveryAddress}
                  </Text>

                  <Text style={styles.orderIdText}>Orden: #{orderId}</Text>
                </View>
              </View>
            </ViewShot>

            {/* Preview Actions */}
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <RotateCcw size={20} color={Colors.text.primary} />
                <Text style={styles.retakeButtonText}>Retomar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Check size={20} color={Colors.white} />
                    <Text style={styles.confirmButtonText}>Confirmar Entrega</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            {!photo
              ? 'Toma una foto clara del paquete entregado en la puerta o con el cliente'
              : 'Verifica que la foto sea clara y que se vea la entrega correctamente'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.black,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.white,
    margin: 20,
    borderRadius: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  grantBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  grantBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  watermarkPreview: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 12,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  watermarkText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  watermarkAddress: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  previewContainer: {
    flex: 1,
  },
  viewShot: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  watermarkBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  watermarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  watermarkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  watermarkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 8,
  },
  accuracyText: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.7,
    marginLeft: 22,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    opacity: 0.8,
    marginTop: 6,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.black,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  instructions: {
    padding: 16,
    backgroundColor: Colors.black,
  },
  instructionsText: {
    fontSize: 13,
    color: Colors.text.light,
    textAlign: 'center',
    lineHeight: 18,
  },
});
