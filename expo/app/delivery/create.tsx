import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import YCard from '@/components/ui/YCard';
import { useAuth } from '@/contexts/auth';
import { createOrder } from '@/services/orders';
import { getUserAddresses } from '@/services/addresses';
import type { SavedAddress } from '@/constants/types';

const STEP_TITLES = [
  'Donde recogemos?',
  'A donde lo llevamos?',
  'Revisa tu envio',
] as const;

// Simple delivery fee calculation
function calculateFee(distKm: number): number {
  const BASE = 25;
  const PER_KM = 5;
  return Math.round(BASE + distKm * PER_KM);
}

// Estimate distance from two text addresses (placeholder — real impl would geocode)
function estimateDistance(): { km: number; minutes: number } {
  // In production, use geocoding + Haversine or OSRM
  // For now, default to a reasonable local distance for Tomatlan
  const km = 2.5;
  const minutes = Math.round(km * 4 + 5); // ~4 min/km + 5 min pickup
  return { km, minutes };
}

export default function DeliveryCreateScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getUserAddresses(user.id)
        .then(setSavedAddresses)
        .catch(() => {});
    }
  }, [user]);

  const currentAddress = step === 0 ? origin : destination;
  const setCurrentAddress = step === 0 ? setOrigin : setDestination;

  const canContinue = step === 0 ? origin.trim().length > 0 : destination.trim().length > 0;

  const { km: distKm, minutes: estMinutes } = estimateDistance();
  const deliveryFee = calculateFee(distKm);

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesion.');
      return;
    }
    if (!origin.trim() || !destination.trim()) return;

    setLoading(true);
    try {
      const order = await createOrder({
        clientId: user.id,
        businessId: null,
        serviceType: 'delivery',
        pickupAddress: origin.trim(),
        deliveryAddress: destination.trim(),
        deliveryInstructions: `Envio de paquete`,
        items: [],
        subtotal: 0,
        deliveryFee,
        paymentMethod: 'cash',
        packageDetails: {
          type: 'general',
          size: 'medium',
          weight: 'unknown',
          isFragile: false,
          description: `Recoger en: ${origin.trim()} → Entregar en: ${destination.trim()}`,
        },
      });

      router.replace(`/tracking/${order.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el envio.');
    } finally {
      setLoading(false);
    }
  };

  const selectSavedAddress = (addr: SavedAddress) => {
    setCurrentAddress(addr.address);
  };

  // --- RENDER ---

  const renderProgressBar = () => (
    <View style={styles.progressRow}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[
            styles.progressCapsule,
            i <= step ? styles.progressFilled : styles.progressEmpty,
          ]}
        />
      ))}
    </View>
  );

  const renderAddressStep = () => (
    <>
      <TextInput
        style={styles.searchInput}
        placeholder="Calle, numero, colonia..."
        placeholderTextColor={DS.colors.placeholder}
        value={currentAddress}
        onChangeText={setCurrentAddress}
        autoFocus
        returnKeyType="done"
      />

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Feather
          name="map-pin"
          size={32}
          color={step === 0 ? DS.colors.orange : DS.colors.green}
        />
        <Text style={styles.mapText}>
          {currentAddress.trim() || 'Escribe una direccion arriba'}
        </Text>
      </View>

      {/* Saved addresses */}
      {savedAddresses.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.savedLabel}>Direcciones guardadas</Text>
          {savedAddresses.map(addr => (
            <TouchableOpacity
              key={addr.id}
              style={styles.savedRow}
              onPress={() => selectSavedAddress(addr)}
              activeOpacity={0.7}
            >
              <View style={styles.savedIcon}>
                <Feather
                  name={addr.label === 'Casa' ? 'home' : addr.label === 'Trabajo' ? 'briefcase' : 'map-pin'}
                  size={18}
                  color={DS.colors.blue}
                />
              </View>
              <View style={styles.savedText}>
                <Text style={styles.savedName}>{addr.label}</Text>
                <Text style={styles.savedAddr} numberOfLines={1}>
                  {addr.address}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={DS.colors.placeholder} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  const renderSummaryStep = () => (
    <>
      {/* Route summary */}
      <YCard style={styles.summaryCard}>
        <View style={styles.routeRow}>
          <View style={styles.routeDots}>
            <View style={[styles.dot, { backgroundColor: DS.colors.orange }]} />
            <View style={styles.dottedLine} />
            <View style={[styles.dot, { backgroundColor: DS.colors.green }]} />
          </View>
          <View style={styles.routeAddresses}>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>Origen</Text>
              <Text style={styles.routeAddr} numberOfLines={2}>{origin}</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={styles.routeAddr} numberOfLines={2}>{destination}</Text>
            </View>
          </View>
        </View>
      </YCard>

      {/* Details */}
      <YCard style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <Feather name="navigation" size={18} color={DS.colors.muted} />
            <Text style={styles.detailLabel}>Distancia</Text>
          </View>
          <Text style={styles.detailValue}>{distKm.toFixed(1)} km</Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <Feather name="clock" size={18} color={DS.colors.muted} />
            <Text style={styles.detailLabel}>Tiempo estimado</Text>
          </View>
          <Text style={styles.detailValue}>~{estMinutes} min</Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <Feather name="dollar-sign" size={18} color={DS.colors.blue} />
            <Text style={[styles.detailLabel, { color: DS.colors.dark, fontWeight: '700' }]}>
              Total
            </Text>
          </View>
          <Text style={styles.totalValue}>${deliveryFee}</Text>
        </View>
      </YCard>

      <Text style={styles.disclaimer}>
        El precio puede ajustarse segun la distancia real. Pago en efectivo al repartidor.
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={DS.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Enviar Paquete</Text>
          <View style={{ width: 40 }} />
        </View>

        {renderProgressBar()}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step title */}
          <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>

          {step < 2 ? renderAddressStep() : renderSummaryStep()}

          {/* Spacer */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Fixed bottom */}
        <View style={styles.bottomBar}>
          {step < 2 ? (
            <BigButton
              title="Continuar"
              icon={<Feather name="arrow-right" size={20} color="#FFF" />}
              color={DS.colors.blue}
              onPress={handleContinue}
              disabled={!canContinue}
            />
          ) : (
            <BigButton
              title={`Confirmar Envio - $${deliveryFee}`}
              icon={<Feather name="package" size={20} color="#FFF" />}
              color={DS.colors.orange}
              onPress={handleConfirm}
              loading={loading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.card,
  },
  topTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  progressRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
    paddingHorizontal: DS.space.lg,
    marginBottom: DS.space.lg,
  },
  progressCapsule: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressFilled: {
    backgroundColor: DS.colors.blue,
  },
  progressEmpty: {
    backgroundColor: DS.colors.hairline,
  },
  scroll: {
    paddingHorizontal: DS.space.lg,
  },
  stepTitle: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
    marginBottom: DS.space.xl,
  },
  searchInput: {
    height: 56,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.lg,
    ...DS.fonts.body,
    color: DS.colors.dark,
    ...DS.shadow.card,
    marginBottom: DS.space.lg,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: DS.space.sm,
    ...DS.shadow.card,
    marginBottom: DS.space.xl,
  },
  mapText: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    textAlign: 'center',
    paddingHorizontal: DS.space.xxl,
  },
  savedSection: {
    gap: DS.space.sm,
  },
  savedLabel: {
    ...DS.fonts.label,
    color: DS.colors.muted,
    marginBottom: DS.space.xs,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    gap: DS.space.md,
    ...DS.shadow.card,
  },
  savedIcon: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedText: {
    flex: 1,
  },
  savedName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  savedAddr: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },

  // Summary step
  summaryCard: {
    marginBottom: DS.space.lg,
  },
  routeRow: {
    flexDirection: 'row',
    gap: DS.space.lg,
  },
  routeDots: {
    alignItems: 'center',
    paddingTop: DS.space.xs,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dottedLine: {
    width: 2,
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: DS.colors.hairline,
    marginVertical: DS.space.xs,
  },
  routeAddresses: {
    flex: 1,
  },
  routeItem: {
    paddingVertical: DS.space.sm,
  },
  routeLabel: {
    ...DS.fonts.tiny,
    color: DS.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  routeAddr: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  routeDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginVertical: DS.space.xs,
  },
  detailsCard: {
    marginBottom: DS.space.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  detailLabel: {
    ...DS.fonts.body,
    color: DS.colors.muted,
  },
  detailValue: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  detailDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginVertical: DS.space.xs,
  },
  totalValue: {
    ...DS.fonts.title,
    color: DS.colors.blue,
  },
  disclaimer: {
    ...DS.fonts.small,
    color: DS.colors.placeholder,
    textAlign: 'center',
    paddingHorizontal: DS.space.lg,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.xxl,
    paddingTop: DS.space.md,
    backgroundColor: DS.colors.bg,
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
  },
});
