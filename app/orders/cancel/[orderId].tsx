import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, Store, MapPin, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { cancelPendingOrder, getOrderById } from '@/services/orders';
import { getSimilarBusinesses } from '@/services/products';
import { Order, Business } from '@/constants/types';

const CANCEL_REASONS = [
  { id: 'changed_mind', label: 'Cambie de opinion' },
  { id: 'long_wait', label: 'Tiempo de espera muy largo' },
  { id: 'order_error', label: 'Error en el pedido' },
  { id: 'other', label: 'Otro' },
];

export default function CancelPendingOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<Business[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const fetchedOrder = await getOrderById(orderId);
      if (fetchedOrder) {
        // Redirect if not pending
        if (fetchedOrder.status !== 'pending') {
          Alert.alert(
            'Orden ya aceptada',
            'Esta orden ya fue aceptada por el negocio. Debes contactarlos para solicitar cancelacion.',
            [{ text: 'OK', onPress: () => router.replace(`/orders/cancel-request/${orderId}` as any) }]
          );
          return;
        }
        setOrder(fetchedOrder);
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  const loadAlternatives = async () => {
    if (!order?.businessId) return;
    setLoadingAlternatives(true);
    try {
      const similar = await getSimilarBusinesses(order.businessId);
      setAlternatives(similar);
      setShowAlternatives(true);
    } catch (error) {
      console.error('Error loading alternatives:', error);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId || !selectedReason) {
      Alert.alert('Error', 'Selecciona un motivo para cancelar');
      return;
    }

    // First, show alternatives
    if (!showAlternatives) {
      loadAlternatives();
      return;
    }

    // User already saw alternatives, confirm cancellation
    Alert.alert(
      'Confirmar cancelacion',
      '¿Estas seguro? Perderas tu lugar en la fila.',
      [
        { text: 'Ver alternativas', onPress: () => setShowAlternatives(true) },
        {
          text: 'Si, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const reason = CANCEL_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
              const fullReason = comment ? `${reason}: ${comment}` : reason;
              await cancelPendingOrder(orderId, fullReason);
              Alert.alert(
                'Pedido cancelado',
                'Tu pedido ha sido cancelado sin cargo.',
                [{ text: 'OK', onPress: () => router.replace('/orders/history') }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar la orden');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectAlternative = (business: Business) => {
    // Navigate to the alternative business menu
    // The user can create a new order there
    Alert.alert(
      'Cambiar de negocio',
      `¿Quieres ordenar en ${business.name} en su lugar?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, ir al menu',
          onPress: async () => {
            // Cancel the current order first
            if (orderId) {
              try {
                await cancelPendingOrder(orderId, 'Cliente eligio otro negocio');
              } catch (e) {
                // Ignore if already cancelled
              }
            }
            router.replace(`/food/menu/${business.id}` as any);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando orden...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Orden no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cancelar Pedido</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Icon */}
        <View style={styles.warningContainer}>
          <View style={styles.warningIconBg}>
            <AlertTriangle size={48} color={Colors.warning} />
          </View>
          <Text style={styles.warningTitle}>¿Seguro que quieres cancelar?</Text>
          <Text style={styles.warningSubtitle}>
            Antes de cancelar, considera estas alternativas
          </Text>
        </View>

        {/* Order Summary */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Store size={20} color={Colors.primary} />
            <Text style={styles.businessName}>{order.businessName}</Text>
          </View>
          {order.items && order.items.length > 0 && (
            <View style={styles.itemsList}>
              {order.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  {item.quantity}x {item.name}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.totalText}>Total: ${order.total.toFixed(2)} MXN</Text>
        </View>

        {/* Alternatives Section */}
        {showAlternatives && alternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            <Text style={styles.sectionTitle}>Negocios similares disponibles</Text>
            <Text style={styles.sectionSubtitle}>
              Puedes cambiar tu pedido a uno de estos negocios:
            </Text>
            {alternatives.map((biz) => (
              <TouchableOpacity
                key={biz.id}
                style={styles.alternativeCard}
                onPress={() => handleSelectAlternative(biz)}
              >
                <View style={styles.alternativeInfo}>
                  <Text style={styles.alternativeName}>{biz.name}</Text>
                  <View style={styles.alternativeDetails}>
                    <Text style={styles.alternativeRating}>
                      {biz.rating.toFixed(1)} estrellas
                    </Text>
                    <Text style={styles.alternativeTime}>{biz.deliveryTime}</Text>
                  </View>
                </View>
                <View style={styles.changeButton}>
                  <Text style={styles.changeButtonText}>Cambiar</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loadingAlternatives && (
          <View style={styles.loadingAlternatives}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingAltText}>Buscando alternativas...</Text>
          </View>
        )}

        {/* Reason Selector */}
        <View style={styles.reasonSection}>
          <Text style={styles.sectionTitle}>¿Por que cancelas?</Text>
          {CANCEL_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonOption,
                selectedReason === reason.id && styles.reasonOptionSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <View style={[
                styles.radioOuter,
                selectedReason === reason.id && styles.radioOuterSelected,
              ]}>
                {selectedReason === reason.id && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.reasonText,
                selectedReason === reason.id && styles.reasonTextSelected,
              ]}>
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment Input */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Cuentanos mas (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Escribe aqui..."
            placeholderTextColor={Colors.text.secondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[
            styles.cancelButton,
            (!selectedReason || cancelling) && styles.cancelButtonDisabled,
          ]}
          onPress={handleCancelOrder}
          disabled={!selectedReason || cancelling}
        >
          {cancelling ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.cancelButtonText}>
              {showAlternatives ? 'Cancelar Pedido' : 'Continuar'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Back to Order Button */}
        <TouchableOpacity
          style={styles.backToOrderButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToOrderText}>Volver al Pedido</Text>
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.noteText}>
          Tu pedido se cancelara inmediatamente sin cargo
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.text.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  warningContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  warningIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  itemsList: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  itemText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  alternativesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  alternativeCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  alternativeDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  alternativeRating: {
    fontSize: 13,
    color: Colors.warning,
  },
  alternativeTime: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  loadingAlternatives: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingAltText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  reasonOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  reasonText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  reasonTextSelected: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  backToOrderButton: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  backToOrderText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  noteText: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
  },
});
