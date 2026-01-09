import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import { useState } from 'react';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { createAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';

type AddressLabel = 'Casa' | 'Trabajo' | 'Otro';

export default function AddAddressScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>('Casa');
  const [address, setAddress] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number>(18.4861);
  const [longitude, setLongitude] = useState<number>(-69.9312);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const labels: AddressLabel[] = ['Casa', 'Trabajo', 'Otro'];

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se necesita acceso a la ubicación para usar esta función');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const addr = geocode[0];
        const addressStr = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setAddress(addressStr);
      }

      Alert.alert('Ubicación Obtenida', 'Se ha obtenido tu ubicación actual');
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Por favor ingresa una dirección');
      return;
    }

    if (!user || !token) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    setIsSaving(true);
    try {
      await createAddress(
        {
          userId: user.id,
          label: selectedLabel,
          address: address.trim(),
          latitude,
          longitude,
          instructions: instructions.trim() || undefined,
          isDefault,
        },
        token
      );

      Alert.alert('Éxito', 'Dirección guardada correctamente', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error guardando dirección:', error);
      Alert.alert('Error', 'No se pudo guardar la dirección');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Dirección</Text>
          <View style={styles.labelsContainer}>
            {labels.map((label) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.labelChip,
                  selectedLabel === label && styles.labelChipSelected,
                ]}
                onPress={() => setSelectedLabel(label)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.labelChipText,
                    selectedLabel === label && styles.labelChipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dirección Completa</Text>
          <View style={styles.inputContainer}>
            <MapPin size={20} color={Colors.primary} />
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Calle Principal 123, Apto 302"
              placeholderTextColor={Colors.text.disabled}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
            activeOpacity={0.7}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Navigation size={20} color={Colors.primary} />
            )}
            <Text style={styles.locationButtonText}>
              {isLoadingLocation ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instrucciones Adicionales (Opcional)</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Ej: Edificio azul, tercer piso, apartamento 301"
            placeholderTextColor={Colors.text.disabled}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.defaultRow}>
            <View style={styles.defaultInfo}>
              <Text style={styles.defaultTitle}>Dirección Predeterminada</Text>
              <Text style={styles.defaultSubtitle}>
                Se usará automáticamente en tus pedidos
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

        <View style={styles.mapPlaceholder}>
          <MapPin size={32} color={Colors.text.disabled} />
          <Text style={styles.mapPlaceholderText}>
            Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelButton]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Dirección</Text>
          )}
        </TouchableOpacity>
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
  content: {
    padding: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center' as const,
  },
  labelChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  labelChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  labelChipTextSelected: {
    color: Colors.primary,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  locationButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  instructionsInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  defaultRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  defaultInfo: {
    flex: 1,
    marginRight: 16,
  },
  defaultTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  defaultSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  mapPlaceholder: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 150,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    flexDirection: 'row' as const,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  saveButton: {
    flex: 2,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.text.disabled,
    shadowOpacity: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
