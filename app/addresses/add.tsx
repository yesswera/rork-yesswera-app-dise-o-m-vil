import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Briefcase, MapPinned, Navigation } from 'lucide-react-native';

import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { SavedAddress } from '@/constants/types';
import { createAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';
import { Toast } from '@/utils/toast';
import * as Haptics from 'expo-haptics';
import LoadingButton from '@/components/LoadingButton';

export default function AddAddressScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [selectedLabel, setSelectedLabel] = useState<'Casa' | 'Trabajo' | 'Otro'>('Casa');
  const [address, setAddress] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 18.4861,
    longitude: -69.9312,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const labels: { id: 'Casa' | 'Trabajo' | 'Otro'; icon: any; color: string }[] = [
    { id: 'Casa', icon: Home, color: Colors.primary },
    { id: 'Trabajo', icon: Briefcase, color: Colors.secondary },
    { id: 'Otro', icon: MapPinned, color: Colors.accent },
  ];

  const handleUseCurrentLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'La ubicación GPS no está disponible en web');
      return;
    }

    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación');
        setIsLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;

      setLocation({ latitude, longitude });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const geo = reverseGeocode[0];
        const fullAddress = [
          geo.streetNumber,
          geo.street,
          geo.city,
          geo.region,
        ].filter(Boolean).join(', ');
        setAddress(fullAddress);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.success('Ubicación obtenida');
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Por favor ingresa una dirección');
      return;
    }

    if (!user || !token) {
      Alert.alert('Error', 'Debes iniciar sesión');
      router.replace('/login' as any);
      return;
    }

    setIsSubmitting(true);
    try {
      await createAddress({
        userId: user.id,
        label: selectedLabel,
        streetAddress: address.trim(),
        reference: instructions.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        isDefault,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.success('Dirección guardada exitosamente');
      router.back();
    } catch (error) {
      console.error('Error guardando dirección:', error);
      Alert.alert('Error', 'No se pudo guardar la dirección. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Dirección</Text>
          <View style={styles.labelsContainer}>
            {labels.map((label) => {
              const Icon = label.icon;
              const isSelected = selectedLabel === label.id;

              return (
                <TouchableOpacity
                  key={label.id}
                  style={[
                    styles.labelChip,
                    isSelected && { 
                      borderColor: label.color,
                      backgroundColor: `${label.color}10`
                    },
                  ]}
                  onPress={() => setSelectedLabel(label.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.labelIcon,
                    { backgroundColor: isSelected ? label.color : `${label.color}20` }
                  ]}>
                    <Icon 
                      size={20} 
                      color={isSelected ? Colors.white : label.color} 
                    />
                  </View>
                  <Text style={[
                    styles.labelText,
                    isSelected && { color: label.color, fontWeight: '700' as const }
                  ]}>
                    {label.id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dirección</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ej: Calle Principal 123, Apto 302, Santo Domingo"
            placeholderTextColor={Colors.text.light}
            value={address}
            onChangeText={setAddress}
            multiline
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            activeOpacity={0.7}
          >
            <Navigation size={20} color={Colors.primary} />
            <Text style={styles.locationButtonText}>
              {isLoadingLocation ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación en el Mapa</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onRegionChangeComplete={(region) => {
                setLocation({
                  latitude: region.latitude,
                  longitude: region.longitude,
                });
              }}
            >
              <Marker
                coordinate={location}
                pinColor={Colors.primary}
                draggable
                onDragEnd={(e) => {
                  setLocation(e.nativeEvent.coordinate);
                }}
              />
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>
                Arrastra el marcador para ajustar la ubicación
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instrucciones Adicionales (Opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ej: Edificio azul, tercer piso, apartamento al fondo"
            placeholderTextColor={Colors.text.light}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Establecer como predeterminada</Text>
              <Text style={styles.switchDescription}>
                Esta dirección se usará por defecto en tus pedidos
              </Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: Colors.border.medium, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <View style={styles.submitButtonContainer}>
          <LoadingButton
            title="Guardar Dirección"
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  labelsContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  labelChip: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  labelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  textArea: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  locationButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    height: 250,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  map: {
    width: '100%' as const,
    height: '100%' as const,
  },
  mapOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  mapOverlayText: {
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center' as const,
  },
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    gap: 12,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  submitButtonContainer: {
    flex: 2,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
  },
});
