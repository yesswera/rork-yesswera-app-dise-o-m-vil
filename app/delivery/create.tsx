import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Package,
  MapPin,
  Truck,
  Box,
  ShoppingBag,
  FileText,
  Gift,
  AlertTriangle,
  Scale,
  Ruler,
  Shield,
  Users,
  X,
  ChevronRight,
  Info,
  Check,
  Search,
  Crosshair,
  Loader
} from 'lucide-react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { SavedAddress, PaymentMethod } from '@/constants/types';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import ScreenContainer from '@/components/ScreenContainer';
import { createOrder } from '@/services/orders';
import { calculateDeliveryFee } from '@/utils/distance';
import { getUserAddresses } from '@/services/addresses';
import { trackServiceUsage } from '@/services/user-preferences';

const { width } = Dimensions.get('window');

// Explicit colors for dark mode
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textLight: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textLight: '#78716C' },
};

// Tomatlan, Jalisco coordinates
const TOMATLAN_REGION = {
  latitude: 19.9339,
  longitude: -105.2474,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Package types
const PACKAGE_TYPES = [
  { id: 'sobre', label: 'Sobre', icon: FileText, description: 'Documentos, cartas' },
  { id: 'bolsa', label: 'Bolsa', icon: ShoppingBag, description: 'Ropa, artículos suaves' },
  { id: 'caja', label: 'Caja', icon: Box, description: 'Artículos empacados' },
  { id: 'paquete', label: 'Paquete', icon: Package, description: 'Varios artículos' },
  { id: 'regalo', label: 'Regalo', icon: Gift, description: 'Envuelto para regalo' },
];

// Size options
const SIZE_OPTIONS = [
  { id: 'small', label: 'Pequeno', description: 'Cabe en una mano', multiplier: 1 },
  { id: 'medium', label: 'Mediano', description: 'Cabe en una mochila', multiplier: 1.3 },
  { id: 'large', label: 'Grande', description: 'Requiere ambas manos', multiplier: 1.6 },
];

// Weight ranges
const WEIGHT_OPTIONS = [
  { id: 'light', label: 'Ligero', description: 'Menos de 2 kg', maxKg: 2, multiplier: 1 },
  { id: 'medium', label: 'Medio', description: '2-5 kg', maxKg: 5, multiplier: 1.25 },
  { id: 'heavy', label: 'Pesado', description: '5-10 kg', maxKg: 10, multiplier: 1.5 },
  { id: 'very_heavy', label: 'Muy pesado', description: '10-20 kg', maxKg: 20, multiplier: 2 },
];

// Recipient relationships (for minor protection)
const RELATIONSHIPS = [
  { id: 'hijo', label: 'Hijo/a' },
  { id: 'familiar', label: 'Familiar directo' },
  { id: 'conocido', label: 'Conocido de confianza' },
  { id: 'otro', label: 'Otro' },
];

interface LocationPoint {
  address: string;
  latitude: number;
  longitude: number;
  instructions?: string;
}

export default function DeliveryCreateScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const mapRef = useRef<MapView>(null);

  // Location states
  const [pickupLocation, setPickupLocation] = useState<LocationPoint | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationPoint | null>(null);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const [tempMapRegion, setTempMapRegion] = useState<Region>(TOMATLAN_REGION);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  // Package details
  const [packageType, setPackageType] = useState<string>('paquete');
  const [packageSize, setPackageSize] = useState<string>('medium');
  const [packageWeight, setPackageWeight] = useState<string>('light');
  const [isFragile, setIsFragile] = useState(false);
  const [packageDescription, setPackageDescription] = useState('');

  // Urgency and payment
  const [urgency, setUrgency] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Minor protection
  const [sendingToOther, setSendingToOther] = useState(false);
  const [recipientIsMinor, setRecipientIsMinor] = useState(false);
  const [minorName, setMinorName] = useState('');
  const [minorAge, setMinorAge] = useState('');
  const [minorRelationship, setMinorRelationship] = useState('');
  const [acceptMinorResponsibility, setAcceptMinorResponsibility] = useState(false);

  // Recipient details
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // UI states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFragileWarning, setShowFragileWarning] = useState(false);

  // Address search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
        Alert.alert('No encontrado', 'No se encontro la direccion. Intenta con otra busqueda.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'No se pudo buscar la direccion. Intenta de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  // Load saved addresses
  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const addresses = await getUserAddresses(user.id);
      setSavedAddresses(Array.isArray(addresses) ? addresses : []);
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  // Calculate dynamic price
  const calculatePrice = () => {
    // Base calculation
    const baseDistance = pickupLocation && deliveryLocation
      ? calculateDistance(pickupLocation, deliveryLocation)
      : 3; // Default 3km for Tomatlan

    const baseFee = calculateDeliveryFee(baseDistance);

    // Size multiplier
    const sizeMultiplier = SIZE_OPTIONS.find(s => s.id === packageSize)?.multiplier || 1;

    // Weight multiplier
    const weightMultiplier = WEIGHT_OPTIONS.find(w => w.id === packageWeight)?.multiplier || 1;

    // Fragile surcharge (+20%)
    const fragileMultiplier = isFragile ? 1.2 : 1;

    // Urgency multiplier
    const urgencyMultiplier = urgency === 'express' ? 1.5 : 1;

    const total = baseFee * sizeMultiplier * weightMultiplier * fragileMultiplier * urgencyMultiplier;

    return Math.ceil(total); // Round up to nearest peso
  };

  // Calculate distance between two points
  const calculateDistance = (point1: LocationPoint, point2: LocationPoint): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get current location for map
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicacion para esta funcion.');
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
    } catch (error) {
      console.error('Error getting location:', error);
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
      console.error('Geocoding error:', error);
    }
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  // Confirm map location
  const confirmMapLocation = async (type: 'pickup' | 'delivery') => {
    const address = await getAddressFromCoords(tempMapRegion.latitude, tempMapRegion.longitude);
    const location: LocationPoint = {
      address,
      latitude: tempMapRegion.latitude,
      longitude: tempMapRegion.longitude,
    };

    if (type === 'pickup') {
      setPickupLocation(location);
      setShowPickupMap(false);
    } else {
      setDeliveryLocation(location);
      setShowDeliveryMap(false);
    }
  };

  // Select saved address
  const selectSavedAddress = (address: SavedAddress, type: 'pickup' | 'delivery') => {
    const location: LocationPoint = {
      address: address.address,
      latitude: address.latitude,
      longitude: address.longitude,
      instructions: address.instructions,
    };

    if (type === 'pickup') {
      setPickupLocation(location);
    } else {
      setDeliveryLocation(location);
      // If not my own address, assume sending to someone else
      if (user && address.userId !== user.id) {
        setSendingToOther(true);
      }
    }
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!pickupLocation) return 'Selecciona el punto de recogida';
    if (!deliveryLocation) return 'Selecciona el punto de entrega';
    if (!packageDescription.trim()) return 'Describe el contenido del paquete';

    if (sendingToOther) {
      if (!recipientName.trim()) return 'Ingresa el nombre del destinatario';
      if (!recipientPhone.trim()) return 'Ingresa el telefono del destinatario';

      if (recipientIsMinor) {
        if (!minorName.trim()) return 'Ingresa el nombre del menor';
        if (!minorAge.trim()) return 'Ingresa la edad aproximada del menor';
        if (!minorRelationship) return 'Selecciona la relacion con el menor';
        if (!acceptMinorResponsibility) {
          return 'Debes aceptar la responsabilidad de la entrega al menor';
        }
      }
    }

    return null;
  };

  // Submit order
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Informacion incompleta', validationError);
      return;
    }

    if (!user || !token) {
      Alert.alert(
        'Iniciar Sesion',
        'Necesitas iniciar sesion para crear una orden',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesion', onPress: () => router.push('/login' as any) },
        ]
      );
      return;
    }

    // Show fragile warning if applicable
    if (isFragile && !showFragileWarning) {
      setShowFragileWarning(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Build complete delivery instructions
      const packageInfo = PACKAGE_TYPES.find(p => p.id === packageType);
      const sizeInfo = SIZE_OPTIONS.find(s => s.id === packageSize);
      const weightInfo = WEIGHT_OPTIONS.find(w => w.id === packageWeight);

      let instructions = `PAQUETE DE MENSAJERIA\n`;
      instructions += `━━━━━━━━━━━━━━━━━━━━\n`;
      instructions += `Tipo: ${packageInfo?.label}\n`;
      instructions += `Tamano: ${sizeInfo?.label} (${sizeInfo?.description})\n`;
      instructions += `Peso: ${weightInfo?.label} (${weightInfo?.description})\n`;
      instructions += `Contenido: ${packageDescription}\n`;

      if (isFragile) {
        instructions += `\nFRAGIL - Manejar con cuidado\n`;
      }

      instructions += `\nUrgencia: ${urgency === 'express' ? 'EXPRESS' : 'Estandar'}\n`;

      if (pickupLocation?.instructions) {
        instructions += `\nInstrucciones recogida: ${pickupLocation.instructions}\n`;
      }

      // Minor protection info
      if (sendingToOther) {
        instructions += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        instructions += `DESTINATARIO:\n`;
        instructions += `Nombre: ${recipientName}\n`;
        instructions += `Telefono: ${recipientPhone}\n`;

        if (recipientIsMinor) {
          const relationship = RELATIONSHIPS.find(r => r.id === minorRelationship);
          instructions += `\nENTREGA A MENOR AUTORIZADA\n`;
          instructions += `Menor: ${minorName} (~${minorAge} anos)\n`;
          instructions += `Relacion: ${relationship?.label}\n`;
          instructions += `Autorizado por: ${user.name}\n`;
        }
      }

      if (deliveryLocation?.instructions) {
        instructions += `\nInstrucciones entrega: ${deliveryLocation.instructions}\n`;
      }

      const deliveryCost = calculatePrice();

      const createdOrder = await createOrder({
        clientId: user.id,
        businessId: null,
        serviceType: 'delivery',
        pickupAddress: pickupLocation!.address,
        pickupLocation: {
          latitude: pickupLocation!.latitude,
          longitude: pickupLocation!.longitude,
        },
        deliveryAddress: deliveryLocation!.address,
        deliveryLocation: {
          latitude: deliveryLocation!.latitude,
          longitude: deliveryLocation!.longitude,
        },
        deliveryInstructions: instructions,
        items: [{
          productId: `package-${packageType}`,
          productName: `Mensajeria: ${packageInfo?.label}`,
          quantity: 1,
          unitPrice: 0,
        }],
        subtotal: 0,
        deliveryFee: deliveryCost,
        tip: 0,
        paymentMethod: paymentMethod === 'transfer' ? 'cash' : paymentMethod,
        // Additional package metadata
        packageDetails: {
          type: packageType,
          size: packageSize,
          weight: packageWeight,
          isFragile,
          description: packageDescription,
          recipientName: sendingToOther ? recipientName : undefined,
          recipientPhone: sendingToOther ? recipientPhone : undefined,
          isMinorRecipient: recipientIsMinor,
          minorDetails: recipientIsMinor ? {
            name: minorName,
            age: minorAge,
            relationship: minorRelationship,
            authorizedBy: user.name,
          } : undefined,
        },
      });

      // Track service usage for analytics/personalization
      trackServiceUsage(user.id, 'delivery', deliveryCost).catch(console.error);

      // Redirigir al Home donde vera el banner de orden activa
      Alert.alert(
        'Orden Creada!',
        'Un repartidor revisara tu solicitud. Veras el estado en la pantalla principal.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creando orden:', error);
      Alert.alert('Error', 'No se pudo crear la orden. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deliveryCost = calculatePrice();

  // Footer component
  const FooterComponent = (
    <TouchableOpacity
      style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
      onPress={handleSubmit}
      disabled={isProcessing}
    >
      <Text style={styles.submitButtonText}>
        {isProcessing ? 'Creando Orden...' : `Crear Orden - $${deliveryCost}`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <ScreenContainer
        headerGradient="accent"
        headerIcon={Package}
        headerTitle="Servicio de Mensajeria"
        headerSubtitle="Envia paquetes de punto a punto en Tomatlan"
        scrollEnabled={true}
        footer={FooterComponent}
        footerPadding={100}
      >
        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Punto de Recogida</Text>
          <TouchableOpacity
            style={[
              styles.locationCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              pickupLocation && styles.locationCardSelected
            ]}
            onPress={() => {
              getCurrentLocation();
              setShowPickupMap(true);
            }}
          >
            <MapPin size={24} color={pickupLocation ? Colors.accent : theme.textSecondary} />
            <View style={styles.locationInfo}>
              {pickupLocation ? (
                <>
                  <Text style={[styles.locationAddress, { color: theme.text }]}>{pickupLocation.address}</Text>
                  <Text style={[styles.locationHint, { color: theme.textLight }]}>Toca para cambiar</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.locationPlaceholder, { color: theme.textSecondary }]}>Seleccionar en mapa</Text>
                  <Text style={[styles.locationHint, { color: theme.textLight }]}>Ajusta el PIN donde recoger</Text>
                </>
              )}
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>

          {savedAddresses.length > 0 && !pickupLocation && (
            <View style={styles.savedAddressesRow}>
              <Text style={[styles.savedLabel, { color: theme.textSecondary }]}>O usar guardada:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {savedAddresses.slice(0, 3).map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.savedAddressChip, { backgroundColor: theme.cardAlt }]}
                    onPress={() => selectSavedAddress(addr, 'pickup')}
                  >
                    <Text style={[styles.savedAddressText, { color: theme.text }]}>{addr.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {pickupLocation && (
            <TextInput
              style={[styles.instructionsInput, { backgroundColor: theme.cardAlt, color: theme.text }]}
              placeholder="Instrucciones para recoger (opcional)"
              placeholderTextColor={theme.textLight}
              value={pickupLocation.instructions || ''}
              onChangeText={(text) => setPickupLocation({ ...pickupLocation, instructions: text })}
            />
          )}
        </View>

        {/* Delivery Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Punto de Entrega</Text>
          <TouchableOpacity
            style={[
              styles.locationCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              deliveryLocation && styles.locationCardSelectedPrimary
            ]}
            onPress={() => {
              getCurrentLocation();
              setShowDeliveryMap(true);
            }}
          >
            <MapPin size={24} color={deliveryLocation ? Colors.primary : theme.textSecondary} />
            <View style={styles.locationInfo}>
              {deliveryLocation ? (
                <>
                  <Text style={[styles.locationAddress, { color: theme.text }]}>{deliveryLocation.address}</Text>
                  <Text style={[styles.locationHint, { color: theme.textLight }]}>Toca para cambiar</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.locationPlaceholder, { color: theme.textSecondary }]}>Seleccionar en mapa</Text>
                  <Text style={[styles.locationHint, { color: theme.textLight }]}>Ajusta el PIN donde entregar</Text>
                </>
              )}
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>

          {savedAddresses.length > 0 && !deliveryLocation && (
            <View style={styles.savedAddressesRow}>
              <Text style={[styles.savedLabel, { color: theme.textSecondary }]}>O usar guardada:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {savedAddresses.slice(0, 3).map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.savedAddressChip, { backgroundColor: theme.cardAlt }]}
                    onPress={() => selectSavedAddress(addr, 'delivery')}
                  >
                    <Text style={[styles.savedAddressText, { color: theme.text }]}>{addr.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {deliveryLocation && (
            <TextInput
              style={[styles.instructionsInput, { backgroundColor: theme.cardAlt, color: theme.text }]}
              placeholder="Instrucciones para entregar (opcional)"
              placeholderTextColor={theme.textLight}
              value={deliveryLocation.instructions || ''}
              onChangeText={(text) => setDeliveryLocation({ ...deliveryLocation, instructions: text })}
            />
          )}
        </View>

        {/* Package Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipo de Paquete</Text>
          <View style={styles.optionsGrid}>
            {PACKAGE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = packageType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.optionCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isSelected && styles.optionCardSelected
                  ]}
                  onPress={() => setPackageType(type.id)}
                >
                  <Icon size={24} color={isSelected ? Colors.accent : theme.textSecondary} />
                  <Text style={[styles.optionLabel, { color: theme.text }, isSelected && styles.optionLabelSelected]}>
                    {type.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.textLight }]}>{type.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Size Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={20} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Tamano</Text>
          </View>
          <View style={styles.sizeRow}>
            {SIZE_OPTIONS.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.sizeCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  packageSize === size.id && styles.sizeCardSelected
                ]}
                onPress={() => setPackageSize(size.id)}
              >
                <Text style={[styles.sizeLabel, { color: theme.text }, packageSize === size.id && styles.sizeLabelSelected]}>
                  {size.label}
                </Text>
                <Text style={[styles.sizeDescription, { color: theme.textLight }]}>{size.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scale size={20} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Peso Aproximado</Text>
          </View>
          <View style={styles.weightGrid}>
            {WEIGHT_OPTIONS.map((weight) => (
              <TouchableOpacity
                key={weight.id}
                style={[
                  styles.weightCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  packageWeight === weight.id && styles.weightCardSelected
                ]}
                onPress={() => setPackageWeight(weight.id)}
              >
                <Text style={[styles.weightLabel, { color: theme.text }, packageWeight === weight.id && styles.weightLabelSelected]}>
                  {weight.label}
                </Text>
                <Text style={[styles.weightDescription, { color: theme.textLight }]}>{weight.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fragile Toggle */}
        <View style={styles.section}>
          <View style={[styles.fragileRow, { backgroundColor: theme.card }]}>
            <View style={styles.fragileInfo}>
              <AlertTriangle size={24} color={isFragile ? Colors.warning : theme.textSecondary} />
              <View>
                <Text style={[styles.fragileLabel, { color: theme.text }]}>Es fragil?</Text>
                <Text style={[styles.fragileHint, { color: theme.textLight }]}>Vidrio, ceramica, electronicos, etc.</Text>
              </View>
            </View>
            <Switch
              value={isFragile}
              onValueChange={setIsFragile}
              trackColor={{ false: theme.border, true: Colors.warning }}
              thumbColor={isFragile ? Colors.white : theme.textLight}
            />
          </View>
          {isFragile && (
            <View style={[styles.fragileWarning, { backgroundColor: `${Colors.warning}15` }]}>
              <Info size={16} color={Colors.warning} />
              <Text style={[styles.fragileWarningText, { color: theme.textSecondary }]}>
                Los articulos fragiles deben ir correctamente empacados y protegidos.
                El repartidor puede rechazar el envio si considera que no esta bien protegido.
              </Text>
            </View>
          )}
        </View>

        {/* Package Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Descripcion del Contenido</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Que estas enviando? (ej: Documentos importantes, ropa, comida para mi mama...)"
            placeholderTextColor={theme.textLight}
            value={packageDescription}
            onChangeText={setPackageDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Sending to Someone Else */}
        <View style={styles.section}>
          <View style={[styles.toggleSection, { backgroundColor: theme.card }]}>
            <View style={styles.toggleInfo}>
              <Users size={24} color={sendingToOther ? Colors.primary : theme.textSecondary} />
              <View>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Enviar a otra persona?</Text>
                <Text style={[styles.toggleHint, { color: theme.textLight }]}>Alguien mas recibira el paquete</Text>
              </View>
            </View>
            <Switch
              value={sendingToOther}
              onValueChange={setSendingToOther}
              trackColor={{ false: theme.border, true: Colors.primary }}
              thumbColor={sendingToOther ? Colors.white : theme.textLight}
            />
          </View>

          {sendingToOther && (
            <View style={styles.recipientSection}>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Nombre del destinatario"
                placeholderTextColor={theme.textLight}
                value={recipientName}
                onChangeText={setRecipientName}
              />
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Telefono del destinatario"
                placeholderTextColor={theme.textLight}
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />

              {/* Minor Protection */}
              <View style={[styles.minorToggle, { backgroundColor: theme.cardAlt }]}>
                <View style={styles.minorToggleInfo}>
                  <Shield size={20} color={recipientIsMinor ? Colors.warning : theme.textSecondary} />
                  <Text style={[styles.minorToggleLabel, { color: theme.text }]}>El destinatario es menor de edad?</Text>
                </View>
                <Switch
                  value={recipientIsMinor}
                  onValueChange={setRecipientIsMinor}
                  trackColor={{ false: theme.border, true: Colors.warning }}
                  thumbColor={recipientIsMinor ? Colors.white : theme.textLight}
                />
              </View>

              {recipientIsMinor && (
                <View style={[styles.minorSection, { backgroundColor: `${Colors.warning}08`, borderColor: Colors.warning }]}>
                  <View style={[styles.minorWarningBox, { backgroundColor: `${Colors.warning}15` }]}>
                    <Shield size={20} color={Colors.warning} />
                    <Text style={[styles.minorWarningText, { color: theme.textSecondary }]}>
                      Por seguridad y para prevenir situaciones de acoso, necesitamos informacion
                      adicional cuando la entrega es a un menor de edad.
                    </Text>
                  </View>

                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Nombre del menor"
                    placeholderTextColor={theme.textLight}
                    value={minorName}
                    onChangeText={setMinorName}
                  />
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Edad aproximada"
                    placeholderTextColor={theme.textLight}
                    value={minorAge}
                    onChangeText={setMinorAge}
                    keyboardType="number-pad"
                  />

                  <Text style={[styles.relationshipLabel, { color: theme.text }]}>Tu relacion con el menor:</Text>
                  <View style={styles.relationshipOptions}>
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableOpacity
                        key={rel.id}
                        style={[
                          styles.relationshipChip,
                          { backgroundColor: theme.card, borderColor: theme.border },
                          minorRelationship === rel.id && styles.relationshipChipSelected
                        ]}
                        onPress={() => setMinorRelationship(rel.id)}
                      >
                        <Text style={[
                          styles.relationshipChipText,
                          { color: theme.text },
                          minorRelationship === rel.id && styles.relationshipChipTextSelected
                        ]}>
                          {rel.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.responsibilityCheck}
                    onPress={() => setAcceptMinorResponsibility(!acceptMinorResponsibility)}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: theme.border },
                      acceptMinorResponsibility && styles.checkboxChecked
                    ]}>
                      {acceptMinorResponsibility && <Check size={14} color={Colors.white} />}
                    </View>
                    <Text style={[styles.responsibilityText, { color: theme.textSecondary }]}>
                      Soy responsable de este pedido y autorizo la entrega al menor indicado.
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Urgency */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Nivel de Urgencia</Text>
          <View style={styles.urgencyContainer}>
            <TouchableOpacity
              style={[
                styles.urgencyCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                urgency === 'standard' && styles.urgencyCardActive
              ]}
              onPress={() => setUrgency('standard')}
            >
              <Truck size={24} color={urgency === 'standard' ? Colors.accent : theme.textSecondary} />
              <Text style={[styles.urgencyLabel, { color: theme.text }, urgency === 'standard' && styles.urgencyLabelActive]}>
                Estandar
              </Text>
              <Text style={[styles.urgencyTime, { color: theme.textSecondary }]}>45-60 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.urgencyCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                urgency === 'express' && styles.urgencyCardActive
              ]}
              onPress={() => setUrgency('express')}
            >
              <Truck size={24} color={urgency === 'express' ? Colors.accent : theme.textSecondary} />
              <Text style={[styles.urgencyLabel, { color: theme.text }, urgency === 'express' && styles.urgencyLabelActive]}>
                Express
              </Text>
              <Text style={[styles.urgencyTime, { color: theme.textSecondary }]}>20-30 min</Text>
              <Text style={styles.urgencyPrice}>+50%</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PaymentMethodSelector
          selectedMethod={paymentMethod}
          onSelectMethod={setPaymentMethod}
        />

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumen de Costos</Text>
          <View style={[styles.costCard, { backgroundColor: theme.card }]}>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Tarifa base</Text>
              <Text style={[styles.costValue, { color: theme.text }]}>${calculateDeliveryFee(3).toFixed(0)}</Text>
            </View>
            {packageSize !== 'small' && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Tamano ({SIZE_OPTIONS.find(s => s.id === packageSize)?.label})</Text>
                <Text style={[styles.costValue, { color: theme.text }]}>+{((SIZE_OPTIONS.find(s => s.id === packageSize)?.multiplier || 1) - 1) * 100}%</Text>
              </View>
            )}
            {packageWeight !== 'light' && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Peso ({WEIGHT_OPTIONS.find(w => w.id === packageWeight)?.label})</Text>
                <Text style={[styles.costValue, { color: theme.text }]}>+{((WEIGHT_OPTIONS.find(w => w.id === packageWeight)?.multiplier || 1) - 1) * 100}%</Text>
              </View>
            )}
            {isFragile && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Manejo fragil</Text>
                <Text style={[styles.costValue, { color: theme.text }]}>+20%</Text>
              </View>
            )}
            {urgency === 'express' && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Express</Text>
                <Text style={[styles.costValue, { color: theme.text }]}>+50%</Text>
              </View>
            )}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.costRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
              <Text style={styles.totalValue}>${deliveryCost}</Text>
            </View>
          </View>
        </View>

        {/* Driver Info Note */}
        <View style={[styles.infoNote, { backgroundColor: theme.cardAlt }]}>
          <Info size={18} color={theme.textSecondary} />
          <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
            El repartidor vera toda esta informacion antes de aceptar. Si el paquete no coincide
            con la descripcion o no esta bien empacado, puede rechazar el envio explicando la razon.
          </Text>
        </View>
      </ScreenContainer>

      {/* Map Modal - Pickup */}
      <Modal
        visible={showPickupMap}
        animationType="slide"
        onRequestClose={() => setShowPickupMap(false)}
      >
        <View style={styles.mapContainer}>
          <View style={[styles.mapHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowPickupMap(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.mapTitle, { color: theme.text }]}>Punto de Recogida</Text>
            <TouchableOpacity onPress={() => confirmMapLocation('pickup')}>
              <Text style={styles.mapConfirm}>Confirmar</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.cardAlt }]}>
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
                <TouchableOpacity onPress={searchAddress}>
                  <ChevronRight size={20} color={Colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.myLocationButton} onPress={getCurrentLocation}>
              <Crosshair size={20} color={Colors.white} />
            </TouchableOpacity>
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
            <MapPin size={40} color={Colors.accent} />
          </View>
          <Text style={styles.mapHint}>Busca una direccion o arrastra el mapa</Text>
        </View>
      </Modal>

      {/* Map Modal - Delivery */}
      <Modal
        visible={showDeliveryMap}
        animationType="slide"
        onRequestClose={() => setShowDeliveryMap(false)}
      >
        <View style={styles.mapContainer}>
          <View style={[styles.mapHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowDeliveryMap(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.mapTitle, { color: theme.text }]}>Punto de Entrega</Text>
            <TouchableOpacity onPress={() => confirmMapLocation('delivery')}>
              <Text style={styles.mapConfirm}>Confirmar</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.cardAlt }]}>
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
                <TouchableOpacity onPress={searchAddress}>
                  <ChevronRight size={20} color={Colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.myLocationButton} onPress={getCurrentLocation}>
              <Crosshair size={20} color={Colors.white} />
            </TouchableOpacity>
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
          <Text style={styles.mapHint}>Busca una direccion o arrastra el mapa</Text>
        </View>
      </Modal>

      {/* Fragile Warning Modal */}
      <Modal
        visible={showFragileWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFragileWarning(false)}
      >
        <View style={styles.warningModalOverlay}>
          <View style={[styles.warningModalContent, { backgroundColor: theme.card }]}>
            <AlertTriangle size={48} color={Colors.warning} />
            <Text style={[styles.warningModalTitle, { color: theme.text }]}>Articulo Fragil</Text>
            <Text style={[styles.warningModalText, { color: theme.textSecondary }]}>
              Has indicado que el paquete contiene articulos fragiles.{'\n\n'}
              <Text style={[styles.warningModalBold, { color: theme.text }]}>IMPORTANTE:</Text>{'\n'}
              - Asegurate de empacar correctamente el contenido{'\n'}
              - Usa material de proteccion (burbujas, papel, foam){'\n'}
              - El repartidor puede rechazar si no esta bien protegido{'\n'}
              - Yesswera no se responsabiliza por danos a articulos mal empacados
            </Text>
            <View style={styles.warningModalButtons}>
              <TouchableOpacity
                style={[styles.warningModalCancel, { borderColor: theme.border }]}
                onPress={() => setShowFragileWarning(false)}
              >
                <Text style={[styles.warningModalCancelText, { color: theme.textSecondary }]}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.warningModalAccept}
                onPress={() => {
                  setShowFragileWarning(false);
                  handleSubmit();
                }}
              >
                <Text style={styles.warningModalAcceptText}>Entendido, Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  locationCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    borderWidth: 2,
  },
  locationCardSelected: {
    borderColor: Colors.accent,
  },
  locationCardSelectedPrimary: {
    borderColor: Colors.primary,
  },
  locationInfo: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  locationPlaceholder: {
    fontSize: 15,
    marginBottom: 2,
  },
  locationHint: {
    fontSize: 12,
  },
  savedAddressesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 12,
    gap: 8,
  },
  savedLabel: {
    fontSize: 13,
  },
  savedAddressChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  savedAddressText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  instructionsInput: {
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  optionsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  optionCard: {
    width: (width - 52) / 3,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 2,
  },
  optionCardSelected: {
    borderColor: Colors.accent,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  optionLabelSelected: {
    color: Colors.accent,
  },
  optionDescription: {
    fontSize: 10,
    textAlign: 'center' as const,
    marginTop: 2,
  },
  sizeRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  sizeCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 2,
  },
  sizeCardSelected: {
    borderColor: Colors.accent,
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  sizeLabelSelected: {
    color: Colors.accent,
  },
  sizeDescription: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  weightGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  weightCard: {
    width: (width - 42) / 2,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 2,
  },
  weightCardSelected: {
    borderColor: Colors.accent,
  },
  weightLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  weightLabelSelected: {
    color: Colors.accent,
  },
  weightDescription: {
    fontSize: 11,
  },
  fragileRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    padding: 16,
  },
  fragileInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  fragileLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  fragileHint: {
    fontSize: 12,
  },
  fragileWarning: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  fragileWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1.5,
  },
  textInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  toggleSection: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    padding: 16,
  },
  toggleInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  toggleHint: {
    fontSize: 12,
  },
  recipientSection: {
    marginTop: 16,
  },
  minorToggle: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  minorToggleInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  minorToggleLabel: {
    fontSize: 14,
  },
  minorSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  minorWarningBox: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  minorWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  relationshipLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  relationshipOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  relationshipChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  relationshipChipSelected: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  relationshipChipText: {
    fontSize: 13,
  },
  relationshipChipTextSelected: {
    color: Colors.white,
    fontWeight: '600' as const,
  },
  responsibilityCheck: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  responsibilityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  urgencyContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  urgencyCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 2,
  },
  urgencyCardActive: {
    borderColor: Colors.accent,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
    marginBottom: 4,
  },
  urgencyLabelActive: {
    color: Colors.accent,
  },
  urgencyTime: {
    fontSize: 13,
  },
  urgencyPrice: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  costSection: {
    marginBottom: 20,
  },
  costCard: {
    borderRadius: 12,
    padding: 16,
  },
  costRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  costLabel: {
    fontSize: 14,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  infoNote: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    height: 56,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#A8A29E',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  // Map Modal Styles
  mapContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  mapConfirm: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
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
  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  myLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  // Warning Modal
  warningModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  warningModalContent: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center' as const,
    maxWidth: 350,
  },
  warningModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 12,
  },
  warningModalText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  warningModalBold: {
    fontWeight: '700' as const,
  },
  warningModalButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    width: '100%',
  },
  warningModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  warningModalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  warningModalAccept: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.warning,
    alignItems: 'center' as const,
  },
  warningModalAcceptText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
