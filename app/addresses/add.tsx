import TouchableSound from '@/components/TouchableSound';
import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Briefcase, MapPinned, Navigation, Search, ChevronRight, Loader, MapPin } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { createAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { Toast } from '@/utils/toast';
import * as Haptics from 'expo-haptics';
import LoadingButton from '@/components/LoadingButton';
import ScreenContainer from '@/components/ScreenContainer';

// Explicit colors for dark mode
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textLight: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textLight: '#78716C' },
};

export default function AddAddressScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const mapRef = useRef<MapView>(null);
  const [selectedLabel, setSelectedLabel] = useState<'Casa' | 'Trabajo' | 'Otro'>('Casa');
  const [address, setAddress] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 19.9333,
    longitude: -105.2500,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const labels: { id: 'Casa' | 'Trabajo' | 'Otro'; icon: any; color: string }[] = [
    { id: 'Casa', icon: Home, color: Colors.primary },
    { id: 'Trabajo', icon: Briefcase, color: Colors.secondary },
    { id: 'Otro', icon: MapPinned, color: Colors.accent },
  ];

  // Search address and move map to result
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Add "Mexico" to improve results for Mexican addresses
      const query = searchQuery.includes('Mexico') ? searchQuery : `${searchQuery}, Jalisco, Mexico`;
      const results = await Location.geocodeAsync(query);

      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        const newLocation = { latitude, longitude };
        setLocation(newLocation);

        // Animate map to the new location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);

        // Try to get the full address
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
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

        setSearchQuery('');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('No encontrado', 'No se encontro la direccion. Intenta con otra busqueda.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'No se pudo buscar la direccion. Intenta de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicacion');
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
      Toast.success('Ubicacion obtenida');
    } catch (error) {
      console.error('Error obteniendo ubicacion:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicacion');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Por favor ingresa una direccion');
      return;
    }

    if (!user || !token) {
      Alert.alert('Error', 'Debes iniciar sesion');
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
      Toast.success('Direccion guardada exitosamente');
      router.back();
    } catch (error) {
      console.error('Error guardando direccion:', error);
      Alert.alert('Error', 'No se pudo guardar la direccion. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Footer component
  const FooterComponent = (
    <View style={styles.footerContent}>
      <TouchableSound
        style={[styles.cancelButton, { borderColor: theme.border }]}
        onPress={() => router.back()}
        disabled={isSubmitting}
      >
        <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
      </TouchableSound>

      <View style={styles.submitButtonContainer}>
        <LoadingButton
          title="Guardar Direccion"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={MapPin}
      headerTitle="Nueva Direccion"
      headerSubtitle="Agrega una nueva direccion de entrega"
      scrollEnabled={true}
      footer={FooterComponent}
      footerPadding={100}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipo de Direccion</Text>
        <View style={styles.labelsContainer}>
          {labels.map((label) => {
            const Icon = label.icon;
            const isSelected = selectedLabel === label.id;

            return (
              <TouchableSound
                key={label.id}
                style={[
                  styles.labelChip,
                  { backgroundColor: theme.card, borderColor: theme.border },
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
                  { color: theme.text },
                  isSelected && { color: label.color, fontWeight: '700' as const }
                ]}>
                  {label.id}
                </Text>
              </TouchableSound>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Direccion</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          placeholder="Ej: Calle Morelos 456, Col. Centro, Tomatlan"
          placeholderTextColor={theme.textLight}
          value={address}
          onChangeText={setAddress}
          multiline
          textAlignVertical="top"
        />

        <TouchableSound
          style={[styles.locationButton, { borderColor: Colors.primary, backgroundColor: `${Colors.primary}08` }]}
          onPress={handleUseCurrentLocation}
          disabled={isLoadingLocation}
          activeOpacity={0.7}
        >
          <Navigation size={20} color={Colors.primary} />
          <Text style={styles.locationButtonText}>
            {isLoadingLocation ? 'Obteniendo ubicacion...' : 'Usar mi ubicacion actual'}
          </Text>
        </TouchableSound>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ubicacion en el Mapa</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Search size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar direccion..."
              placeholderTextColor={theme.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchAddress}
              returnKeyType="search"
            />
            {isSearching ? (
              <Loader size={20} color={Colors.primary} />
            ) : searchQuery.length > 0 ? (
              <TouchableSound onPress={searchAddress}>
                <ChevronRight size={20} color={Colors.primary} />
              </TouchableSound>
            ) : null}
          </View>
        </View>

        <View style={[styles.mapContainer, { borderColor: theme.border, backgroundColor: theme.cardAlt }]}>
          <MapView
            ref={mapRef}
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
              Busca una direccion o arrastra el marcador
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Instrucciones Adicionales (Opcional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          placeholder="Ej: Edificio azul, tercer piso, apartamento al fondo"
          placeholderTextColor={theme.textLight}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Establecer como predeterminada</Text>
            <Text style={[styles.switchDescription, { color: theme.textSecondary }]}>
              Esta direccion se usara por defecto en tus pedidos
            </Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: theme.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
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
    borderWidth: 2,
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
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    borderWidth: 1.5,
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
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%' as const,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    height: 250,
    borderWidth: 1.5,
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
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerContent: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  submitButtonContainer: {
    flex: 2,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
  },
});
