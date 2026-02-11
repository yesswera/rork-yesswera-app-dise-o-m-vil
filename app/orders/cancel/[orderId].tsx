import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: CANCELAR PEDIDO PENDIENTE
// Pantalla para cancelar pedidos que aun no han sido aceptados
// Actualizado para usar ScreenContainer
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Store } from 'lucide-react-native';
import { cancelPendingOrder, getOrderById } from '@/services/orders';
import { Toast } from '@/utils/toast';
import { getSimilarBusinesses } from '@/services/products';
import { Order, Business } from '@/constants/types';
import ScreenContainer from '@/components/ScreenContainer';
import { useTheme } from '@/contexts/theme';

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
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

const STATUS_COLORS = {
  warning: '#F59E0B',
  error: '#EF4444',
  primary: '#22C55E',
};

const CANCEL_REASONS = [
  { id: 'changed_mind', label: 'Cambie de opinion' },
  { id: 'long_wait', label: 'Tiempo de espera muy largo' },
  { id: 'order_error', label: 'Error en el pedido' },
  { id: 'other', label: 'Otro' },
];

export default function CancelPendingOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

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
        const canCancel = fetchedOrder.status === 'pending' ||
          (fetchedOrder.status === 'ready' && !fetchedOrder.driverId);

        if (!canCancel) {
          Alert.alert(
            'No se puede cancelar',
            fetchedOrder.driverId
              ? 'Ya hay un repartidor asignado. Contacta soporte para cancelar.'
              : 'Esta orden ya no puede cancelarse directamente.',
            [{ text: 'OK', onPress: () => router.back() }]
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

    if (!showAlternatives && order?.businessId) {
      loadAlternatives();
      return;
    }

    Alert.alert(
      'Confirmar cancelacion',
      'Estas seguro? Perderas tu lugar en la fila.',
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
              Toast.success('Orden cancelada');
              router.replace('/');
            } catch (error: any) {
              setCancelling(false);
              Toast.error(error.message || 'No se pudo cancelar');
            }
          },
        },
      ]
    );
  };

  const handleSelectAlternative = (business: Business) => {
    Alert.alert(
      'Cambiar de negocio',
      `Quieres ordenar en ${business.name} en su lugar?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, ir al menu',
          onPress: async () => {
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

  // Loading state
  if (loading) {
    return (
      <ScreenContainer
        headerGradient="secondary"
        headerIcon={AlertTriangle}
        headerTitle="Cancelar Pedido"
        headerSubtitle="Cargando informacion..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando orden...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (!order) {
    return (
      <ScreenContainer
        headerGradient="secondary"
        headerIcon={AlertTriangle}
        headerTitle="Cancelar Pedido"
        headerSubtitle="Orden no encontrada"
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: STATUS_COLORS.error }]}>
            Orden no encontrada
          </Text>
          <TouchableSound onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Volver</Text>
          </TouchableSound>
        </View>
      </ScreenContainer>
    );
  }

  // Footer con botones
  const renderFooter = () => (
    <View style={styles.footerButtons}>
      <TouchableSound
        style={[
          styles.cancelButton,
          { backgroundColor: STATUS_COLORS.error },
          (!selectedReason || cancelling) && styles.buttonDisabled,
        ]}
        onPress={handleCancelOrder}
        disabled={!selectedReason || cancelling}
      >
        {cancelling ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.cancelButtonText}>
            {showAlternatives ? 'Cancelar Pedido' : 'Continuar'}
          </Text>
        )}
      </TouchableSound>

      <TouchableSound
        style={styles.backToOrderButton}
        onPress={() => router.back()}
      >
        <Text style={[styles.backToOrderText, { color: theme.textSecondary }]}>
          Volver al Pedido
        </Text>
      </TouchableSound>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={AlertTriangle}
      headerTitle="Cancelar Pedido"
      headerSubtitle="Considera las alternativas antes de cancelar"
      footer={renderFooter()}
      footerPadding={140}
    >
      {/* Warning Icon */}
      <View style={styles.warningContainer}>
        <View style={[styles.warningIconBg, { backgroundColor: `${STATUS_COLORS.warning}20` }]}>
          <AlertTriangle size={48} color={STATUS_COLORS.warning} />
        </View>
        <Text style={[styles.warningTitle, { color: theme.text }]}>
          Seguro que quieres cancelar?
        </Text>
        <Text style={[styles.warningSubtitle, { color: theme.textSecondary }]}>
          Antes de cancelar, considera estas alternativas
        </Text>
      </View>

      {/* Order Summary */}
      <View style={[styles.orderCard, { backgroundColor: theme.card }]}>
        <View style={styles.orderHeader}>
          <Store size={20} color={colors.primary} />
          <Text style={[styles.businessName, { color: theme.text }]}>
            {order.type === 'delivery'
              ? 'Envio de Paquete'
              : order.businessName || 'Orden'}
          </Text>
        </View>
        {order.items && order.items.length > 0 && (
          <View style={[styles.itemsList, { borderTopColor: theme.border }]}>
            {order.items.map((item, index) => (
              <Text key={index} style={[styles.itemText, { color: theme.textSecondary }]}>
                {item.quantity}x {item.name}
              </Text>
            ))}
          </View>
        )}
        {order.type === 'delivery' && order.notes && (
          <View style={[styles.itemsList, { borderTopColor: theme.border }]}>
            <Text style={[styles.itemText, { color: theme.textSecondary }]}>
              {order.notes.substring(0, 100)}...
            </Text>
          </View>
        )}
        <Text style={[styles.totalText, { color: STATUS_COLORS.primary }]}>
          Total: ${order.total.toFixed(2)} MXN
        </Text>
      </View>

      {/* Alternatives Section */}
      {showAlternatives && alternatives.length > 0 && (
        <View style={styles.alternativesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Negocios similares disponibles
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Puedes cambiar tu pedido a uno de estos negocios:
          </Text>
          {alternatives.map((biz) => (
            <TouchableSound
              key={biz.id}
              style={[styles.alternativeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => handleSelectAlternative(biz)}
            >
              <View style={styles.alternativeInfo}>
                <Text style={[styles.alternativeName, { color: theme.text }]}>{biz.name}</Text>
                <View style={styles.alternativeDetails}>
                  <Text style={[styles.alternativeRating, { color: STATUS_COLORS.warning }]}>
                    {biz.rating.toFixed(1)} estrellas
                  </Text>
                  <Text style={[styles.alternativeTime, { color: theme.textSecondary }]}>
                    {biz.deliveryTime}
                  </Text>
                </View>
              </View>
              <View style={[styles.changeButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.changeButtonText}>Cambiar</Text>
              </View>
            </TouchableSound>
          ))}
        </View>
      )}

      {loadingAlternatives && (
        <View style={styles.loadingAlternatives}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingAltText, { color: theme.textSecondary }]}>
            Buscando alternativas...
          </Text>
        </View>
      )}

      {/* Reason Selector */}
      <View style={styles.reasonSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Por que cancelas?</Text>
        {CANCEL_REASONS.map((reason) => (
          <TouchableSound
            key={reason.id}
            style={[
              styles.reasonOption,
              { backgroundColor: theme.card, borderColor: theme.border },
              selectedReason === reason.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
            ]}
            onPress={() => setSelectedReason(reason.id)}
          >
            <View style={[
              styles.radioOuter,
              { borderColor: theme.border },
              selectedReason === reason.id && { borderColor: colors.primary },
            ]}>
              {selectedReason === reason.id && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <Text style={[
              styles.reasonText,
              { color: theme.textSecondary },
              selectedReason === reason.id && { color: theme.text, fontWeight: '500' },
            ]}>
              {reason.label}
            </Text>
          </TouchableSound>
        ))}
      </View>

      {/* Comment Input */}
      <View style={styles.commentSection}>
        <Text style={[styles.commentLabel, { color: theme.text }]}>
          Cuentanos mas (opcional)
        </Text>
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Escribe aqui..."
          placeholderTextColor={theme.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Note */}
      <Text style={[styles.noteText, { color: theme.textSecondary }]}>
        Tu pedido se cancelara inmediatamente sin cargo
      </Text>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
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
    marginLeft: 8,
  },
  itemsList: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  alternativesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  alternativeCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  alternativeDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  alternativeRating: {
    fontSize: 13,
  },
  alternativeTime: {
    fontSize: 13,
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 15,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footerButtons: {
    gap: 12,
  },
  cancelButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToOrderButton: {
    alignItems: 'center',
    padding: 12,
  },
  backToOrderText: {
    fontSize: 15,
  },
  noteText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
});
