import TouchableSound from '@/components/TouchableSound';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { MapPin, Plus, X, Home, Briefcase, MapPinned, Star, Navigation, Search, ChevronRight, Loader, Crosshair } from 'lucide-react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { SavedAddress } from '@/constants/types';
import { getUserAddresses, setDefaultAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');

// Tomatlan, Jalisco coordinates
const TOMATLAN_REGION = {
  latitude: 19.9339,
  longitude: -105.2474,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

interface AddressSelectorProps {
  selectedAddress: SavedAddress | null;
  onAddressSelect: (address: SavedAddress) => void;
  onAddNewAddress?: () => void;
}

export default function AddressSelector({ selectedAddress, onAddressSelect, onAddNewAddress }: AddressSelectorProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Map modal states
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [tempMapRegion, setTempMapRegion] = useState<Region>(TOMATLAN_REGION);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user || !token) return;

    setIsLoading(true);
    try {
      const userAddresses = await getUserAddresses(user.id);
      // Ensure we always have an array
      const addressArray = Array.isArray(userAddresses) ? userAddresses : [];
      setAddresses(addressArray);

      if (!selectedAddress && addressArray.length > 0) {
        const defaultAddr = addressArray.find(a => a.isDefault) || addressArray[0];
        onAddressSelect(defaultAddr);
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      setAddresses([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [user, token, selectedAddress, onAddressSelect]);

  useEffect(() => {
    if (modalVisible) {
      loadAddresses();
    }
  }, [modalVisible, loadAddresses]);

  const handleSelectAddress = async (address: SavedAddress) => {
    onAddressSelect(address);
    setModalVisible(false);
  };

  const handleSetDefault = async (addressId: string) => {
    if (!token) return;
    
    try {
      await setDefaultAddress(addressId, user?.id || '');
      await loadAddresses();
      Alert.alert('Éxito', 'Dirección predeterminada actualizada');
    } catch (error) {
      console.error('Error estableciendo dirección predeterminada:', error);
      Alert.alert('Error', 'No se pudo actualizar la dirección predeterminada');
    }
  };

  const handleAddNewAddress = () => {
    setModalVisible(false);
    if (onAddNewAddress) {
      onAddNewAddress();
    } else {
      router.push('/addresses/add' as any);
    }
  };

  // Get current location for map
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setTempMapRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
    }
  };

  // Search address and move map to result
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const query = searchQuery.includes('Mexico') ? searchQuery : `${searchQuery}, Jalisco, Mexico`;
      const results = await Location.geocodeAsync(query);

      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setTempMapRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
        setSearchQuery('');
      } else {
        Alert.alert('No encontrado', 'No se encontró la dirección. Intenta con otra búsqueda.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'No se pudo buscar la dirección.');
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocode to get address
  const getAddressFromCoords = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result) {
        const parts = [result.street, result.name, result.city].filter(Boolean);
        return parts.join(', ') || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  // Confirm map location selection
  const confirmMapLocation = async () => {
    const address = await getAddressFromCoords(tempMapRegion.latitude, tempMapRegion.longitude);

    // Create a temporary SavedAddress object (not saved to database)
    const tempAddress: SavedAddress = {
      id: `temp-${Date.now()}`,
      userId: user?.id || '',
      label: 'Otro',
      address: address,
      latitude: tempMapRegion.latitude,
      longitude: tempMapRegion.longitude,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    onAddressSelect(tempAddress);
    setShowMapModal(false);
    setModalVisible(false);
  };

  // Open map modal
  const handleSelectOnMap = () => {
    getCurrentLocation();
    setShowMapModal(true);
  };

  const getIconForLabel = (label: 'Casa' | 'Trabajo' | 'Otro') => {
    switch (label) {
      case 'Casa':
        return Home;
      case 'Trabajo':
        return Briefcase;
      default:
        return MapPinned;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dirección de Entrega</Text>
      
      <TouchableSound
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <MapPin size={20} color={Colors.primary} />
        <View style={styles.addressInfo}>
          {selectedAddress ? (
            <>
              <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress.address}
              </Text>
            </>
          ) : (
            <Text style={styles.placeholderText}>Seleccionar dirección de entrega</Text>
          )}
        </View>
        <Text style={styles.changeText}>Cambiar</Text>
      </TouchableSound>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mis Direcciones</Text>
              <TouchableSound onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.text.primary} />
              </TouchableSound>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.addressesList} showsVerticalScrollIndicator={false}>
                {addresses && addresses.length > 0 ? addresses.map((address) => {
                  const Icon = getIconForLabel(address.label);
                  const isSelected = selectedAddress?.id === address.id;

                  return (
                    <TouchableSound
                      key={address.id}
                      style={[
                        styles.addressCard,
                        isSelected && styles.addressCardSelected,
                      ]}
                      onPress={() => handleSelectAddress(address)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addressCardHeader}>
                        <View style={styles.addressIconContainer}>
                          <Icon size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.addressCardInfo}>
                          <View style={styles.labelRow}>
                            <Text style={styles.addressCardLabel}>{address.label}</Text>
                            {address.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Star size={12} color={Colors.gold} fill={Colors.gold} />
                                <Text style={styles.defaultText}>Predeterminada</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressCardText} numberOfLines={2}>
                            {address.address}
                          </Text>
                          {address.instructions && (
                            <Text style={styles.instructionsText} numberOfLines={1}>
                              {address.instructions}
                            </Text>
                          )}
                        </View>
                      </View>

                      {!address.isDefault && (
                        <TouchableSound
                          style={styles.setDefaultButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSetDefault(address.id);
                          }}
                        >
                          <Text style={styles.setDefaultText}>Predeterminada</Text>
                        </TouchableSound>
                      )}
                    </TouchableSound>
                  );
                }) : (
                  <View style={styles.emptyContainer}>
                    <MapPin size={48} color={Colors.text.disabled} />
                    <Text style={styles.emptyText}>No tienes direcciones guardadas</Text>
                    <Text style={styles.emptySubtext}>Agrega tu primera dirección para comenzar</Text>
                  </View>
                )}

                {/* Select on map option */}
                <TouchableSound
                  style={styles.selectOnMapButton}
                  onPress={handleSelectOnMap}
                  activeOpacity={0.7}
                >
                  <Navigation size={22} color={Colors.accent} />
                  <View style={styles.selectOnMapInfo}>
                    <Text style={styles.selectOnMapTitle}>Seleccionar en mapa</Text>
                    <Text style={styles.selectOnMapSubtitle}>Elige una ubicación sin guardarla</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.text.light} />
                </TouchableSound>

                <TouchableSound
                  style={styles.addNewButton}
                  onPress={handleAddNewAddress}
                  activeOpacity={0.7}
                >
                  <Plus size={24} color={Colors.primary} />
                  <Text style={styles.addNewText}>Agregar Nueva Dirección</Text>
                </TouchableSound>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Map Selection Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <TouchableSound onPress={() => setShowMapModal(false)}>
              <X size={24} color={Colors.text.primary} />
            </TouchableSound>
            <Text style={styles.mapTitle}>Seleccionar Ubicación</Text>
            <TouchableSound onPress={confirmMapLocation}>
              <Text style={styles.mapConfirm}>Confirmar</Text>
            </TouchableSound>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={20} color={Colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar dirección..."
                placeholderTextColor={Colors.text.light}
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
            <TouchableSound style={styles.myLocationButton} onPress={getCurrentLocation}>
              <Crosshair size={20} color={Colors.white} />
            </TouchableSound>
          </View>

          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={tempMapRegion}
            onRegionChangeComplete={setTempMapRegion}
          >
            <Marker
              coordinate={{
                latitude: tempMapRegion.latitude,
                longitude: tempMapRegion.longitude,
              }}
              draggable
              onDragEnd={(e) => {
                setTempMapRegion({
                  ...tempMapRegion,
                  latitude: e.nativeEvent.coordinate.latitude,
                  longitude: e.nativeEvent.coordinate.longitude,
                });
              }}
            />
          </MapView>

          <View style={styles.mapPinOverlay}>
            <MapPin size={40} color={Colors.primary} />
          </View>

          <Text style={styles.mapHint}>Busca una dirección o arrastra el mapa</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  selectorButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.text.disabled,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  addressesList: {
    marginBottom: 20,
  },
  addressCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  addressCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  addressCardInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  addressCardLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  defaultBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  addressCardText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic' as const,
  },
  setDefaultButton: {
    marginTop: 12,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  selectOnMapButton: {
    backgroundColor: `${Colors.accent}10`,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  selectOnMapInfo: {
    flex: 1,
  },
  selectOnMapTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  selectOnMapSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  addNewButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed' as const,
    marginBottom: 20,
  },
  addNewText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  mapConfirm: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    height: '100%' as const,
  },
  myLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  map: {
    flex: 1,
  },
  mapPinOverlay: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    pointerEvents: 'none' as const,
  },
  mapHint: {
    position: 'absolute' as const,
    bottom: 30,
    left: 20,
    right: 20,
    textAlign: 'center' as const,
    fontSize: 14,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
});
