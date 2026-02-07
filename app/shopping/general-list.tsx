// Lista General - Cliente escribe lista, driver compra donde encuentre
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, MapPin, Info, Users, Shield, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/theme';
import { useAuth } from '@/contexts/auth';
import { SavedAddress, PaymentMethod } from '@/constants/types';
import { createOrder } from '@/services/orders';
import AddressSelector from '@/components/AddressSelector';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

const COLORS = {
  light: { background: '#FFFFFF', card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { background: '#1C1917', card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

const RELATIONSHIPS = [
  { id: 'hijo', label: 'Hijo/a' },
  { id: 'familiar', label: 'Familiar' },
  { id: 'conocido', label: 'Conocido' },
  { id: 'otro', label: 'Otro' },
];

export default function GeneralListScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const { user } = useAuth();
  const [shoppingList, setShoppingList] = useState<string>('');
  const [locationHint, setLocationHint] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Recipient and minor protection
  const [someoneElseReceives, setSomeoneElseReceives] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientIsMinor, setRecipientIsMinor] = useState(false);
  const [minorName, setMinorName] = useState('');
  const [minorAge, setMinorAge] = useState('');
  const [minorRelationship, setMinorRelationship] = useState('');
  const [acceptMinorResponsibility, setAcceptMinorResponsibility] = useState(false);

  // Costo de servicio base (solo envío, el cliente paga productos al recibir)
  const serviceFee = 25; // Tarifa base por el servicio de compra
  const deliveryFee = 15; // Tarifa de entrega base
  const totalServiceCost = serviceFee + deliveryFee;

  const handleSubmit = async () => {
    if (!shoppingList.trim()) {
      Alert.alert('Error', 'Por favor escribe tu lista de compras');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Por favor selecciona una dirección de entrega');
      return;
    }

    if (!user) {
      Alert.alert(
        'Iniciar Sesión',
        'Necesitas iniciar sesión para crear una orden',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => router.push('/login' as any) },
        ]
      );
      return;
    }

    // Validate recipient info if someone else receives
    if (someoneElseReceives) {
      if (!recipientName.trim()) {
        Alert.alert('Error', 'Ingresa el nombre de quien recibirá');
        return;
      }
      if (!recipientPhone.trim()) {
        Alert.alert('Error', 'Ingresa el teléfono de quien recibirá');
        return;
      }
      if (recipientIsMinor) {
        if (!minorName.trim()) {
          Alert.alert('Error', 'Ingresa el nombre del menor');
          return;
        }
        if (!minorAge.trim()) {
          Alert.alert('Error', 'Ingresa la edad del menor');
          return;
        }
        if (!minorRelationship) {
          Alert.alert('Error', 'Selecciona tu relación con el menor');
          return;
        }
        if (!acceptMinorResponsibility) {
          Alert.alert('Error', 'Debes aceptar la responsabilidad');
          return;
        }
      }
    }

    setIsProcessing(true);

    try {
      // Construir las instrucciones completas
      let instructions = `LISTA DE COMPRAS:\n${shoppingList}`;
      if (locationHint.trim()) {
        instructions += `\n\nDÓNDE COMPRAR: ${locationHint}`;
      }
      if (estimatedBudget.trim()) {
        instructions += `\n\nPRESUPUESTO APROXIMADO: $${estimatedBudget}`;
      }

      // Add recipient info
      if (someoneElseReceives) {
        instructions += `\n\n👤 DESTINATARIO: ${recipientName} (Tel: ${recipientPhone})`;
        if (recipientIsMinor) {
          const rel = RELATIONSHIPS.find(r => r.id === minorRelationship);
          instructions += `\n🔒 ENTREGA A MENOR: ${minorName} (~${minorAge} años)`;
          instructions += `\nRelación: ${rel?.label}`;
          instructions += `\nAutorizado por: ${user.name}`;
        }
      }

      // Build package details for minor protection
      const packageDetails = someoneElseReceives ? {
        type: 'shopping',
        size: 'medium',
        weight: 'medium',
        isFragile: false,
        description: shoppingList.substring(0, 200),
        recipientName,
        recipientPhone,
        isMinorRecipient: recipientIsMinor,
        minorDetails: recipientIsMinor ? {
          name: minorName,
          age: minorAge,
          relationship: minorRelationship,
          authorizedBy: user.name,
        } : undefined,
      } : undefined;

      const order = await createOrder({
        clientId: user.id,
        businessId: null, // Sin negocio específico - lista general
        serviceType: 'shopping',
        deliveryAddress: selectedAddress.address,
        deliveryLocation: selectedAddress.latitude && selectedAddress.longitude ? {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        } : undefined,
        deliveryInstructions: instructions,
        items: [{
          productId: 'general-shopping-list',
          productName: 'Lista de compras general',
          quantity: 1,
          unitPrice: serviceFee,
        }],
        subtotal: serviceFee,
        deliveryFee: deliveryFee,
        paymentMethod: 'cash', // Solo efectivo para listas generales
        packageDetails,
      });

      Alert.alert(
        '¡Orden Creada!',
        'Un repartidor tomará tu lista y comprará los productos. Te contactará si tiene dudas.',
        [
          {
            text: 'Ver Tracking',
            onPress: () => router.push(`/tracking/${order.id}` as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'No se pudo crear la orden. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerCard}>
            <ClipboardList size={24} color={Colors.primary} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Lista General</Text>
              <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
                El repartidor comprara donde encuentre los productos
              </Text>
            </View>
          </View>

          {/* Lista de compras */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tu Lista de Compras *</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Escribe los productos que necesitas, se especifico con cantidades
            </Text>
            <TextInput
              style={[styles.listInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              placeholder={'Ejemplo:\n- 1 kg de carne molida\n- 2 litros de leche entera\n- 1 paquete de tortillas\n- Jabon de bano Dove\n- 6 huevos'}
              placeholderTextColor={theme.textMuted}
              value={shoppingList}
              onChangeText={setShoppingList}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Dónde comprar (opcional) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={18} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Donde comprar? (opcional)</Text>
            </View>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Si tienes preferencia de lugar, indicalo aqui
            </Text>
            <TextInput
              style={[styles.smallInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              placeholder="Ej: Oxxo de la esquina, Carniceria Don Jose, cualquier farmacia..."
              placeholderTextColor={theme.textMuted}
              value={locationHint}
              onChangeText={setLocationHint}
              multiline
            />
          </View>

          {/* Presupuesto estimado (opcional) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Presupuesto Aproximado (opcional)</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Cuanto crees que costaran los productos?
            </Text>
            <View style={[styles.budgetInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.budgetInput, { color: theme.text }]}
                placeholder="Ej: 200"
                placeholderTextColor={theme.textMuted}
                value={estimatedBudget}
                onChangeText={setEstimatedBudget}
                keyboardType="numeric"
              />
              <Text style={[styles.currencyLabel, { color: theme.textMuted }]}>MXN</Text>
            </View>
          </View>

          {/* Dirección de entrega */}
          <AddressSelector
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
          />

          {/* Recipient and Minor Protection */}
          <View style={styles.recipientSection}>
            <View style={[styles.toggleRow, { backgroundColor: theme.card }]}>
              <View style={styles.toggleInfo}>
                <Users size={22} color={someoneElseReceives ? Colors.primary : theme.textSecondary} />
                <View>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Alguien mas recibira?</Text>
                  <Text style={[styles.toggleHint, { color: theme.textMuted }]}>Si no estaras en casa</Text>
                </View>
              </View>
              <Switch
                value={someoneElseReceives}
                onValueChange={setSomeoneElseReceives}
                trackColor={{ false: theme.border, true: Colors.primary }}
              />
            </View>

            {someoneElseReceives && (
              <View style={styles.recipientForm}>
                <TextInput
                  style={[styles.recipientInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                  placeholder="Nombre de quien recibe"
                  placeholderTextColor={theme.textMuted}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
                <TextInput
                  style={[styles.recipientInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                  placeholder="Telefono de quien recibe"
                  placeholderTextColor={theme.textMuted}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                />

                <View style={[styles.minorToggle, { backgroundColor: theme.cardAlt }]}>
                  <View style={styles.minorToggleInfo}>
                    <Shield size={18} color={recipientIsMinor ? Colors.warning : theme.textSecondary} />
                    <Text style={[styles.minorToggleLabel, { color: theme.text }]}>Es menor de edad?</Text>
                  </View>
                  <Switch
                    value={recipientIsMinor}
                    onValueChange={setRecipientIsMinor}
                    trackColor={{ false: theme.border, true: Colors.warning }}
                  />
                </View>

                {recipientIsMinor && (
                  <View style={styles.minorForm}>
                    <View style={styles.minorWarning}>
                      <Shield size={18} color={Colors.warning} />
                      <Text style={[styles.minorWarningText, { color: theme.textSecondary }]}>
                        Por seguridad, necesitamos informacion del menor.
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.recipientInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Nombre del menor"
                      placeholderTextColor={theme.textMuted}
                      value={minorName}
                      onChangeText={setMinorName}
                    />
                    <TextInput
                      style={[styles.recipientInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Edad aproximada"
                      placeholderTextColor={theme.textMuted}
                      value={minorAge}
                      onChangeText={setMinorAge}
                      keyboardType="number-pad"
                    />
                    <Text style={[styles.relationshipLabel, { color: theme.text }]}>Tu relacion:</Text>
                    <View style={styles.relationshipRow}>
                      {RELATIONSHIPS.map((rel) => (
                        <TouchableOpacity
                          key={rel.id}
                          style={[
                            styles.relationshipChip,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            minorRelationship === rel.id && styles.relationshipChipActive
                          ]}
                          onPress={() => setMinorRelationship(rel.id)}
                        >
                          <Text style={[
                            styles.relationshipChipText,
                            { color: theme.text },
                            minorRelationship === rel.id && styles.relationshipChipTextActive
                          ]}>
                            {rel.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.responsibilityRow}
                      onPress={() => setAcceptMinorResponsibility(!acceptMinorResponsibility)}
                    >
                      <View style={[styles.checkbox, { borderColor: theme.border }, acceptMinorResponsibility && styles.checkboxChecked]}>
                        {acceptMinorResponsibility && <Check size={14} color={Colors.white} />}
                      </View>
                      <Text style={[styles.responsibilityText, { color: theme.textSecondary }]}>
                        Soy responsable y autorizo la entrega al menor.
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Método de pago */}
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />

          {/* Resumen de costos */}
          <View style={[styles.costCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.costTitle, { color: theme.text }]}>Costo del Servicio</Text>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Servicio de compra</Text>
              <Text style={[styles.costValue, { color: theme.text }]}>${serviceFee.toFixed(2)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Entrega</Text>
              <Text style={[styles.costValue, { color: theme.text }]}>${deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.costDivider, { backgroundColor: theme.border }]} />
            <View style={styles.costRow}>
              <Text style={[styles.costTotalLabel, { color: theme.text }]}>Total Servicio</Text>
              <Text style={styles.costTotalValue}>${totalServiceCost.toFixed(2)}</Text>
            </View>
            <View style={styles.infoBox}>
              <Info size={16} color={Colors.accent} />
              <Text style={styles.infoText}>
                Ademas pagaras el costo real de los productos al recibir tu pedido
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer con botón */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Creando Orden...' : 'Enviar Lista'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  listInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 180,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    lineHeight: 22,
  },
  smallInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 60,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  budgetInput: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  currencyLabel: {
    fontSize: 14,
    color: Colors.text.light,
  },
  costCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  costLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  costDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 10,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accent + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.accent,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
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
    fontWeight: '700',
    color: Colors.white,
  },
  // Recipient and minor protection styles
  recipientSection: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  toggleHint: {
    fontSize: 12,
    color: Colors.text.light,
  },
  recipientForm: {
    marginTop: 12,
  },
  recipientInput: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  minorToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  minorToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  minorToggleLabel: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  minorForm: {
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  minorWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
    padding: 10,
    backgroundColor: `${Colors.warning}20`,
    borderRadius: 8,
  },
  minorWarningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  relationshipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  relationshipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  relationshipChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  relationshipChipActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  relationshipChipText: {
    fontSize: 13,
    color: Colors.text.primary,
  },
  relationshipChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  responsibilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  responsibilityText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
  },
});
