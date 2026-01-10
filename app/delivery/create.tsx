import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Package, MapPin, Truck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { SavedAddress, PaymentMethod } from '@/constants/types';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { createOrder } from '@/services/orders';

export default function DeliveryCreateScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [originAddress, setOriginAddress] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<SavedAddress | null>(null);
  const [packageDescription, setPackageDescription] = useState<string>('');
  const [packageWeight, setPackageWeight] = useState<string>('');
  const [urgency, setUrgency] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const distance = 7.5;
  const baseRate = distance * 1.5;
  const urgencyMultiplier = urgency === 'express' ? 1.5 : 1;
  const deliveryCost = baseRate * urgencyMultiplier;

  const handleSubmit = async () => {
    if (!originAddress.trim()) {
      Alert.alert('Error', 'Por favor ingresa la dirección de recogida');
      return;
    }

    if (!selectedDestination) {
      Alert.alert('Error', 'Por favor selecciona la dirección de entrega');
      return;
    }

    if (!packageDescription.trim()) {
      Alert.alert('Error', 'Por favor describe el paquete');
      return;
    }

    if (!user || !token) {
      Alert.alert(
        'Iniciar Sesión',
        'Necesitas iniciar sesión para crear una orden',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar Sesión',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      const orderData = {
        type: 'delivery',
        pickupLocation: {
          address: originAddress,
          latitude: 0,
          longitude: 0,
        },
        deliveryLocation: {
          address: selectedDestination.address,
          latitude: selectedDestination.latitude,
          longitude: selectedDestination.longitude,
        },
        items: [{
          name: packageDescription,
          quantity: 1,
          price: 0,
        }],
        instructions: packageWeight ? `Peso: ${packageWeight}` : undefined,
        paymentMethod: paymentMethod,
        subtotal: 0,
        deliveryFee: deliveryCost,
        tip: 0,
        total: deliveryCost,
      };

      const createdOrder = await createOrder(orderData, token);

      Alert.alert(
        '¡Orden Creada!',
        'Un repartidor aceptará tu orden pronto.',
        [
          {
            text: 'Ver Tracking',
            onPress: () => {
              router.push(`/tracking/${createdOrder.id}` as any);
            },
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headerCard}>
            <Package size={28} color={Colors.accent} />
            <Text style={styles.headerTitle}>Servicio de Mensajería</Text>
            <Text style={styles.headerSubtitle}>
              Envía paquetes de punto a punto
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Punto de Recogida</Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color={Colors.accent} />
              <TextInput
                style={styles.input}
                placeholder="¿Dónde recoger el paquete?"
                placeholderTextColor={Colors.text.light}
                value={originAddress}
                onChangeText={setOriginAddress}
                multiline
              />
            </View>
          </View>

          <AddressSelector
            selectedAddress={selectedDestination}
            onAddressSelect={setSelectedDestination}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles del Paquete</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe el contenido..."
              placeholderTextColor={Colors.text.light}
              value={packageDescription}
              onChangeText={setPackageDescription}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Peso aproximado (ej: 2 kg)"
              placeholderTextColor={Colors.text.light}
              value={packageWeight}
              onChangeText={setPackageWeight}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nivel de Urgencia</Text>
            <View style={styles.urgencyContainer}>
              <TouchableOpacity
                style={[
                  styles.urgencyCard,
                  urgency === 'standard' && styles.urgencyCardActive,
                ]}
                onPress={() => setUrgency('standard')}
              >
                <Truck size={24} color={urgency === 'standard' ? Colors.accent : Colors.text.secondary} />
                <Text style={[
                  styles.urgencyLabel,
                  urgency === 'standard' && styles.urgencyLabelActive,
                ]}>
                  Estándar
                </Text>
                <Text style={styles.urgencyTime}>45-60 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgencyCard,
                  urgency === 'express' && styles.urgencyCardActive,
                ]}
                onPress={() => setUrgency('express')}
              >
                <Truck size={24} color={urgency === 'express' ? Colors.accent : Colors.text.secondary} />
                <Text style={[
                  styles.urgencyLabel,
                  urgency === 'express' && styles.urgencyLabelActive,
                ]}>
                  Express
                </Text>
                <Text style={styles.urgencyTime}>20-30 min</Text>
              </TouchableOpacity>
            </View>
          </View>

          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />

          <View style={styles.costSection}>
            <Text style={styles.sectionTitle}>Costo de Envío</Text>
            <View style={styles.costCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Distancia estimada</Text>
                <Text style={styles.costValue}>{distance} km</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Tarifa base</Text>
                <Text style={styles.costValue}>${baseRate.toFixed(2)}</Text>
              </View>
              {urgency === 'express' && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Express (+50%)</Text>
                  <Text style={styles.costValue}>+${(baseRate * 0.5).toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.costRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${deliveryCost.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Creando Orden...' : 'Crear Orden de Envío'}
          </Text>
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
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
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
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 50,
    textAlignVertical: 'top' as const,
  },
  textArea: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  urgencyContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  urgencyCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  urgencyCardActive: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}08`,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  urgencyLabelActive: {
    color: Colors.accent,
  },
  urgencyTime: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  costSection: {
    marginBottom: 20,
  },
  costCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  costRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  costValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.accent,
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
    backgroundColor: Colors.text.light,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
