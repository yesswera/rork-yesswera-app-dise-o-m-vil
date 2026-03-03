import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ORDEN ACTIVA DEL REPARTIDOR
// Usa ScreenContainer para diseño unificado con soporte de tema
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  Keyboard,
  Linking,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Package, CheckCircle, Navigation, Phone, Store, AlertTriangle, Box, Scale, Shield, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { OrderSounds, SoundFeedback, EmergencySounds, ArrivalSounds } from '@/services/sounds';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import SupportButton from '@/components/SupportButton';
import OrderChatButton from '@/components/OrderChatButton';
import DriverHealthCheckModal from '@/components/DriverHealthCheckModal';
import { useDriverHealthCheck } from '@/hooks/useDriverMonitoring';
import {
  getDriverOrders,
  confirmArrivalAtBusiness,
  confirmOrderReceived,
  confirmArrivalAtClient,
  validateDeliveryCode
} from '@/services/orders';
import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';

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
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    accent: '#3B82F6',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    accent: '#3B82F6',
  },
};

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark, colors, radius, space } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const deliveryInputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Hook para detectar si el driver esta detenido y mostrar pregunta
  const { showHealthCheck, dismissHealthCheck } = useDriverHealthCheck(
    user?.id || '',
    !!order, // hasActiveOrder
    true // enabled
  );

  // Pulse animation for pickup code
  useEffect(() => {
    if (order?.status === 'ready' && order?.driverAtBusiness) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [order?.status, order?.driverAtBusiness, pulseAnim]);

  const loadActiveOrder = useCallback(async () => {
    if (!user || !token) return;

    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driver) {
        Alert.alert('Error', 'No se encontro tu registro de repartidor');
        return;
      }

      const activeOrders = await getDriverOrders(driver.id);
      if (activeOrders.length > 0) {
        setOrder(activeOrders[0]);
      } else {
        Alert.alert('Sin ordenes', 'No tienes ordenes activas', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error loading active order:', error);
      Alert.alert('Error', 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  }, [user, token, router]);

  useEffect(() => {
    loadActiveOrder();
    const interval = setInterval(loadActiveOrder, 5000); // Poll every 5s for status changes
    return () => clearInterval(interval);
  }, [loadActiveOrder]);

  // Handler: Driver arrived at business
  const handleArrivedAtBusiness = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmArrivalAtBusiness(order.id.toString());
      if (result.success) {
        ArrivalSounds.atBusiness(); // Sound feedback for arriving at business
        Alert.alert('Llegada Confirmada', 'Cuando el pedido este listo, te aparecera el codigo de recoleccion.');
        await loadActiveOrder();
      } else {
        SoundFeedback.error();
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      SoundFeedback.error();
      Alert.alert('Error', error.message || 'No se pudo confirmar la llegada');
    } finally {
      setValidating(false);
    }
  };

  // Handler: Driver confirms received order from business
  const handleOrderReceived = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmOrderReceived(order.id.toString());
      if (result.success) {
        OrderSounds.pickedUp(); // Sound feedback for pickup code verified
        Alert.alert('Orden Recibida', 'Ahora ve al cliente para entregar.');
        await loadActiveOrder();
      } else {
        SoundFeedback.error();
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      SoundFeedback.error();
      Alert.alert('Error', error.message || 'No se pudo confirmar la recepcion');
    } finally {
      setValidating(false);
    }
  };

  // Handler: Driver arrived at client
  const handleArrivedAtClient = async () => {
    if (!order || !token) return;

    setValidating(true);
    try {
      const result = await confirmArrivalAtClient(order.id.toString());
      if (result.success) {
        ArrivalSounds.atClient(); // Sound feedback for arriving at client
        Alert.alert('Llegada Confirmada', 'El cliente fue notificado. Pide el codigo de entrega.');
        await loadActiveOrder();
      } else {
        SoundFeedback.error();
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      SoundFeedback.error();
      Alert.alert('Error', error.message || 'No se pudo confirmar la llegada');
    } finally {
      setValidating(false);
    }
  };

  // Handler: Validate delivery code
  const handleValidateDelivery = async () => {
    if (!order || !token || !deliveryCodeInput) {
      SoundFeedback.error();
      Alert.alert('Error', 'Ingresa el codigo de entrega');
      return;
    }

    setValidating(true);
    try {
      const result = await validateDeliveryCode(order.id.toString(), deliveryCodeInput);
      if (result.success) {
        OrderSounds.delivered(); // Sound feedback for delivery code verified
        Alert.alert(
          'Orden Completada!',
          'Entrega registrada exitosamente',
          [{ text: 'OK', onPress: () => router.push('/driver/dashboard') }]
        );
        setDeliveryCodeInput('');
      } else {
        SoundFeedback.error();
        Alert.alert('Codigo Incorrecto', result.message);
      }
    } catch (error: any) {
      SoundFeedback.error();
      Alert.alert('Error', error.message || 'No se pudo validar el codigo');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Package}
        headerTitle="Orden Activa"
        headerSubtitle="Cargando..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando orden...
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  if (!order) {
    return null;
  }

  // === STATUS LOGIC ===
  const status = order.status;
  const driverAtBusiness = order.driverAtBusiness;
  const isOrderReady = status === 'ready';

  // Phases
  const isGoingToBusiness = status === 'assigned' || status === 'preparing' || (status === 'ready' && !driverAtBusiness);
  const isWaitingAtBusiness = driverAtBusiness && (status === 'assigned' || status === 'preparing');
  const canShowPickupCode = driverAtBusiness && isOrderReady; // BOTH conditions must be true
  const isHandedToDriver = status === 'handed_to_driver';
  const isInTransit = status === 'in_transit';
  const isAtClient = status === 'arrived';
  const isDelivered = status === 'delivered';

  const openNavigation = (address: string, location?: { latitude: number; longitude: number }) => {
    let url: string;

    if (location?.latitude && location?.longitude) {
      url = Platform.select({
        ios: `maps:?daddr=${location.latitude},${location.longitude}&dirflg=d`,
        android: `google.navigation:q=${location.latitude},${location.longitude}`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

      Linking.canOpenURL('waze://').then((supported) => {
        if (supported) {
          Linking.openURL(`waze://?ll=${location.latitude},${location.longitude}&navigate=yes`);
        } else {
          Linking.openURL(url);
        }
      });
    } else {
      const encodedAddress = encodeURIComponent(address);
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  const callClient = () => {
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    } else {
      Alert.alert('Sin telefono', 'No hay numero de contacto disponible');
    }
  };

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Package}
      headerTitle="Orden Activa"
      headerSubtitle={getStatusLabel(status, driverAtBusiness)}
    >
      {/* Status Badge */}
      <View style={styles.statusCard}>
        <View style={[styles.statusBadge, { backgroundColor: theme.accent }]}>
          <ThemedText variant="label" bold style={styles.statusText}>
            {getStatusLabel(status, driverAtBusiness)}
          </ThemedText>
        </View>
      </View>

      {/* Order Details Card */}
      <ScreenCard>
        <ThemedText variant="h3" style={[styles.cardTitle, { color: theme.text }]}>Detalles de la Orden</ThemedText>

        {/* Pickup Address */}
        <View style={[styles.addressCard, { backgroundColor: theme.cardAlt, borderRadius: radius.md }]}>
          <View style={styles.addressHeader}>
            <Store size={18} color={colors.primary} />
            <ThemedText variant="label" bold style={{ color: theme.text }}>Negocio</ThemedText>
          </View>
          <ThemedText variant="body" style={{ color: theme.textSecondary }}>{order.pickupAddress || 'N/A'}</ThemedText>
          {isGoingToBusiness && (
            <TouchableSound
              style={[styles.navButtonSmall, { backgroundColor: theme.accent }]}
              onPress={() => openNavigation(order.pickupAddress || '', order.pickupLocation)}
            >
              <Navigation size={16} color="#fff" />
              <ThemedText variant="label" color="white">Ir al negocio</ThemedText>
            </TouchableSound>
          )}
        </View>

        {/* Delivery Address */}
        <View style={[styles.addressCard, { backgroundColor: theme.cardAlt, borderRadius: radius.md }]}>
          <View style={styles.addressHeader}>
            <MapPin size={18} color={theme.success} />
            <ThemedText variant="label" bold style={{ color: theme.text }}>Cliente</ThemedText>
          </View>
          <ThemedText variant="body" style={{ color: theme.textSecondary }}>{order.deliveryAddress}</ThemedText>
          {(isInTransit || isAtClient) && (
            <TouchableSound
              style={[styles.navButtonSmall, { backgroundColor: theme.success }]}
              onPress={() => openNavigation(order.deliveryAddress, order.deliveryLocation)}
            >
              <Navigation size={16} color="#fff" />
              <ThemedText variant="label" color="white">Ir al cliente</ThemedText>
            </TouchableSound>
          )}
        </View>

        {/* Contact Actions */}
        <View style={styles.contactActions}>
          <TouchableSound style={[styles.contactButton, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={callClient}>
            <Phone size={18} color={colors.primary} />
            <ThemedText variant="label" style={{ color: theme.text }}>Llamar</ThemedText>
          </TouchableSound>
          <OrderChatButton
            orderId={order.id.toString()}
            targetType="client"
            targetName={order.customerName}
            variant="icon"
          />
        </View>

        {/* Time and Total */}
        <View style={styles.detailRow}>
          <Clock size={18} color={theme.warning} />
          <View style={styles.detailTextContainer}>
            <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Hora:</ThemedText>
            <ThemedText variant="body" style={{ color: theme.text }}>
              {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
          <ThemedText variant="label" bold style={{ color: theme.text }}>Total:</ThemedText>
          <ThemedText variant="h3" style={{ color: colors.primary }}>${order.total.toFixed(2)} MXN</ThemedText>
        </View>
      </ScreenCard>

      {/* Package Details Card (for delivery orders) */}
      {order.type === 'delivery' && order.packageDetails && (
        <ScreenCard>
          <View style={styles.packageHeader}>
            <Package size={20} color={theme.accent} />
            <ThemedText variant="h3" style={[styles.cardTitle, { color: theme.text }]}>Detalles del Paquete</ThemedText>
          </View>

          <View style={styles.packageGrid}>
            <View style={[styles.packageItem, { backgroundColor: theme.cardAlt }]}>
              <Box size={18} color={theme.textSecondary} />
              <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Tipo</ThemedText>
              <ThemedText variant="label" bold style={{ color: theme.text }}>{getPackageTypeLabel(order.packageDetails.type)}</ThemedText>
            </View>
            <View style={[styles.packageItem, { backgroundColor: theme.cardAlt }]}>
              <Scale size={18} color={theme.textSecondary} />
              <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Peso</ThemedText>
              <ThemedText variant="label" bold style={{ color: theme.text }}>{getWeightLabel(order.packageDetails.weight)}</ThemedText>
            </View>
          </View>

          <View style={[styles.packageDescriptionBox, { backgroundColor: theme.cardAlt }]}>
            <ThemedText variant="caption" bold style={{ color: theme.textSecondary }}>Contenido:</ThemedText>
            <ThemedText variant="body" style={{ color: theme.text }}>{order.packageDetails.description}</ThemedText>
          </View>

          {order.packageDetails.isFragile && (
            <View style={[styles.fragileWarning, { borderColor: theme.warning }]}>
              <AlertTriangle size={18} color={theme.warning} />
              <ThemedText variant="label" bold style={{ color: theme.warning }}>
                FRAGIL - Manejar con cuidado
              </ThemedText>
            </View>
          )}

          {/* Recipient Info */}
          {order.packageDetails.recipientName && (
            <View style={[styles.recipientBox, { backgroundColor: colors.primary + '10' }]}>
              <View style={styles.recipientHeader}>
                <User size={18} color={colors.primary} />
                <ThemedText variant="label" bold style={{ color: colors.primary }}>Destinatario</ThemedText>
              </View>
              <ThemedText variant="subtitle" bold style={{ color: theme.text }}>{order.packageDetails.recipientName}</ThemedText>
              {order.packageDetails.recipientPhone && (
                <TouchableSound
                  style={styles.recipientPhone}
                  onPress={() => Linking.openURL(`tel:${order.packageDetails!.recipientPhone}`)}
                >
                  <Phone size={14} color={colors.primary} />
                  <ThemedText variant="body" style={{ color: colors.primary }}>{order.packageDetails.recipientPhone}</ThemedText>
                </TouchableSound>
              )}
            </View>
          )}

          {/* Minor Protection Alert */}
          {order.packageDetails.isMinorRecipient && order.packageDetails.minorDetails && (
            <View style={[styles.minorAlert, { borderColor: theme.warning }]}>
              <View style={styles.minorAlertHeader}>
                <Shield size={20} color={theme.warning} />
                <ThemedText variant="label" bold style={{ color: theme.warning }}>Entrega a Menor Autorizada</ThemedText>
              </View>
              <ThemedText variant="body" style={{ color: theme.text }}>
                Menor: {order.packageDetails.minorDetails.name} (~{order.packageDetails.minorDetails.age} anos)
              </ThemedText>
              <ThemedText variant="body" style={{ color: theme.text }}>
                Relacion: {order.packageDetails.minorDetails.relationship}
              </ThemedText>
              <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                Autorizado por: {order.packageDetails.minorDetails.authorizedBy}
              </ThemedText>
              <View style={[styles.minorAlertWarningBox, { backgroundColor: theme.error + '15' }]}>
                <ThemedText variant="caption" bold style={{ color: theme.error }}>
                  Si detectas algo sospechoso, NO entregues y reporta inmediatamente.
                </ThemedText>
              </View>
            </View>
          )}
        </ScreenCard>
      )}

      {/* === PHASE 1: Going to business === */}
      {isGoingToBusiness && !driverAtBusiness && (
        <ScreenCard>
          <View style={styles.stepHeader}>
            <Store size={24} color={colors.primary} />
            <ThemedText variant="h3" style={{ color: theme.text }}>Paso 1: Ir al Negocio</ThemedText>
          </View>
          <ThemedText variant="body" style={[styles.stepInstruction, { color: theme.textSecondary }]}>
            Dirigete al negocio. Cuando llegues, presiona el boton para confirmar tu llegada.
          </ThemedText>
          <TouchableSound
            style={[styles.validateButton, { backgroundColor: colors.primary }, validating && styles.validateButtonDisabled]}
            onPress={handleArrivedAtBusiness}
            disabled={validating}
          >
            {validating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Store size={20} color="#fff" />
                <ThemedText variant="label" bold color="white">Ya Llegue al Negocio</ThemedText>
              </>
            )}
          </TouchableSound>
        </ScreenCard>
      )}

      {/* === PHASE 2: Waiting at business (order not ready yet) === */}
      {isWaitingAtBusiness && (
        <ScreenCard>
          <View style={[styles.waitingCard, { backgroundColor: theme.warning + '15' }]}>
            <Clock size={32} color={theme.warning} />
            <ThemedText variant="subtitle" bold style={{ color: theme.warning }}>
              Esperando que el pedido este listo...
            </ThemedText>
            <ThemedText variant="body" style={[styles.waitingSubtext, { color: theme.textSecondary }]}>
              Cuando el negocio termine de preparar, te aparecera el codigo de recoleccion automaticamente.
            </ThemedText>
          </View>
        </ScreenCard>
      )}

      {/* === PHASE 3: Order ready + Driver at business = Show pickup code === */}
      {canShowPickupCode && (
        <Animated.View style={[styles.pickupCodeCard, { transform: [{ scale: pulseAnim }], backgroundColor: theme.success }]}>
          <View style={styles.pickupCodeHeader}>
            <View style={styles.pickupCodeIconContainer}>
              <Package size={28} color="#fff" />
            </View>
            <ThemedText variant="h2" style={styles.pickupCodeTitle}>Pedido Listo!</ThemedText>
          </View>
          <ThemedText variant="body" style={styles.pickupCodeSubtitle}>
            Muestra este codigo al negocio:
          </ThemedText>
          <View style={styles.pickupCodeBox}>
            <ThemedText variant="h1" style={[styles.pickupCodeValue, { color: theme.success }]}>{order.comandaCode}</ThemedText>
          </View>
          <View style={styles.pickupCodeFooter}>
            <ThemedText variant="caption" style={styles.pickupCodeHint}>
              El negocio validara tu codigo y te entregara el pedido
            </ThemedText>
          </View>
        </Animated.View>
      )}

      {/* === PHASE 4: Business handed order, driver confirms === */}
      {isHandedToDriver && (
        <ScreenCard>
          <View style={styles.stepHeader}>
            <CheckCircle size={24} color={theme.success} />
            <ThemedText variant="h3" style={{ color: theme.text }}>Paso 3: Confirmar Recepcion</ThemedText>
          </View>
          <ThemedText variant="body" style={[styles.stepInstruction, { color: theme.textSecondary }]}>
            El negocio te entrego el pedido? Confirma para iniciar el viaje al cliente.
          </ThemedText>
          <TouchableSound
            style={[styles.validateButton, { backgroundColor: theme.success }, validating && styles.validateButtonDisabled]}
            onPress={handleOrderReceived}
            disabled={validating}
          >
            {validating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <ThemedText variant="label" bold color="white">Recibi la Orden</ThemedText>
              </>
            )}
          </TouchableSound>
        </ScreenCard>
      )}

      {/* === PHASE 5: In transit to client === */}
      {isInTransit && (
        <>
          <View style={[styles.successCard, { backgroundColor: theme.success + '15', borderColor: theme.success }]}>
            <CheckCircle size={32} color={theme.success} />
            <ThemedText variant="subtitle" bold style={{ color: theme.text }}>En camino al cliente</ThemedText>
          </View>
          <ScreenCard>
            <View style={styles.stepHeader}>
              <MapPin size={24} color={theme.accent} />
              <ThemedText variant="h3" style={{ color: theme.text }}>Paso 4: Llegar al Cliente</ThemedText>
            </View>
            <ThemedText variant="body" style={[styles.stepInstruction, { color: theme.textSecondary }]}>
              Cuando estes en el domicilio del cliente, confirma tu llegada.
            </ThemedText>
            <TouchableSound
              style={[styles.validateButton, { backgroundColor: theme.accent }, validating && styles.validateButtonDisabled]}
              onPress={handleArrivedAtClient}
              disabled={validating}
            >
              {validating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MapPin size={20} color="#fff" />
                  <ThemedText variant="label" bold color="white">Ya Llegue</ThemedText>
                </>
              )}
            </TouchableSound>
          </ScreenCard>
        </>
      )}

      {/* === PHASE 6: At client, enter delivery code === */}
      {isAtClient && (
        <>
          <View style={[styles.successCard, { backgroundColor: theme.success + '15', borderColor: theme.success }]}>
            <CheckCircle size={32} color={theme.success} />
            <ThemedText variant="subtitle" bold style={{ color: theme.text }}>Cliente notificado - Esperando</ThemedText>
          </View>
          <ScreenCard>
            <View style={styles.stepHeader}>
              <Package size={24} color={theme.success} />
              <ThemedText variant="h3" style={{ color: theme.text }}>Paso 5: Entregar Orden</ThemedText>
            </View>
            <ThemedText variant="body" style={[styles.stepInstruction, { color: theme.textSecondary }]}>
              Pide el codigo de entrega al cliente (5 caracteres)
            </ThemedText>
            <TextInput
              ref={deliveryInputRef}
              style={[styles.codeInput, {
                borderColor: colors.primary,
                color: theme.text,
                backgroundColor: theme.cardAlt,
              }]}
              placeholder="Codigo de entrega"
              placeholderTextColor={theme.textMuted}
              value={deliveryCodeInput}
              onChangeText={(text) => setDeliveryCodeInput(text.toUpperCase())}
              maxLength={5}
              autoCapitalize="characters"
              editable={!validating}
              keyboardType="default"
              returnKeyType="done"
              autoCorrect={false}
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
              selectTextOnFocus={true}
            />
            <TouchableSound
              style={[
                styles.validateButton,
                { backgroundColor: theme.success },
                (deliveryCodeInput.length !== 5 || validating) && styles.validateButtonDisabled,
              ]}
              onPress={handleValidateDelivery}
              disabled={deliveryCodeInput.length !== 5 || validating}
            >
              {validating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle size={20} color="#fff" />
                  <ThemedText variant="label" bold color="white">Completar Entrega</ThemedText>
                </>
              )}
            </TouchableSound>
          </ScreenCard>
        </>
      )}

      {/* Support Button for drivers */}
      <SupportButton orderId={order.id.toString()} variant="banner" label="Problema con la entrega?" />

      {/* Modal de verificacion cuando driver esta detenido */}
      <DriverHealthCheckModal
        visible={showHealthCheck}
        driverId={user?.id || ''}
        orderId={order.id.toString()}
        stallMinutes={5}
        onDismiss={dismissHealthCheck}
        onNeedHelp={() => {
          dismissHealthCheck();
          EmergencySounds.panic(); // Emergency sound for panic button
          // Abrir el boton de panico/soporte
          Alert.alert(
            'Necesitas Ayuda',
            'Que tipo de ayuda necesitas?',
            [
              { text: 'Llamar al 911', onPress: () => Linking.openURL('tel:911') },
              { text: 'Contactar Soporte', onPress: () => {} },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        }}
      />
    </ScreenContainer>
  );
}

function getPackageTypeLabel(type: string): string {
  const types: Record<string, string> = {
    sobre: 'Sobre',
    bolsa: 'Bolsa',
    caja: 'Caja',
    paquete: 'Paquete',
    regalo: 'Regalo',
  };
  return types[type] || type;
}

function getWeightLabel(weight: string): string {
  const weights: Record<string, string> = {
    light: 'Ligero (<2kg)',
    medium: 'Medio (2-5kg)',
    heavy: 'Pesado (5-10kg)',
    very_heavy: 'Muy pesado (10-20kg)',
  };
  return weights[weight] || weight;
}

function getStatusLabel(status: string, driverAtBusiness?: boolean): string {
  if (driverAtBusiness && (status === 'assigned' || status === 'preparing')) {
    return 'Esperando pedido en negocio';
  }
  if (driverAtBusiness && status === 'ready') {
    return 'Pedido listo - Recoge ahora';
  }

  const labels: Record<string, string> = {
    assigned: 'Ve al negocio',
    preparing: 'En preparacion - Ve al negocio',
    ready: 'Listo - Ve al negocio',
    handed_to_driver: 'Confirma recepcion',
    in_transit: 'En camino al cliente',
    arrived: 'En domicilio del cliente',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
  },
  statusCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
  },
  cardTitle: {
    marginBottom: 16,
  },
  addressCard: {
    padding: 12,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  navButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginTop: 10,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  stepInstruction: {
    marginBottom: 16,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  validateButtonDisabled: {
    opacity: 0.5,
  },
  successCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  waitingCard: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
  },
  waitingSubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  // Pickup code special styles
  pickupCodeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  pickupCodeHeader: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pickupCodeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupCodeTitle: {
    color: '#FFFFFF',
  },
  pickupCodeSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  pickupCodeBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  pickupCodeValue: {
    letterSpacing: 12,
  },
  pickupCodeFooter: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  pickupCodeHint: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  // Package Details Styles
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  packageGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  packageItem: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  packageDescriptionBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  fragileWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  recipientBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recipientPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  minorAlert: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  minorAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  minorAlertWarningBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
  },
});
