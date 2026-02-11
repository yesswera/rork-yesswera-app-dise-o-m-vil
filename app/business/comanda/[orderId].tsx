import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: COMANDA - DETALLE DE ORDEN
// Usa ScreenContainer para diseno unificado
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, AlertTriangle, Package, Receipt } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { Order } from '@/constants/types';
import { getOrderById, updateOrderStatus } from '@/services/orders';

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

export default function ComandaScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProblemModal, setShowProblemModal] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const orderData = await getOrderById(orderId.toString());
      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!orderId) return;

    Alert.alert(
      'Marcar como Lista',
      'El pedido esta listo para recoger?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await updateOrderStatus(orderId.toString(), 'ready');
              Alert.alert('Exito', 'Pedido marcado como listo');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            }
          },
        },
      ]
    );
  };

  const handleReportProblem = (reason: string) => {
    setShowProblemModal(false);
    Alert.alert(
      'Problema Reportado',
      `Motivo: ${reason}\n\nSe notificara al cliente sobre el retraso.`,
      [
        {
          text: 'OK',
          onPress: () => {
            console.log('Problem reported:', reason);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={Receipt}
        headerTitle="Comanda"
        headerSubtitle="Cargando..."
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!order) {
    return (
      <ScreenContainer
        headerGradient="accent"
        headerIcon={Receipt}
        headerTitle="Comanda"
        headerSubtitle="Error"
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Orden no encontrada</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Footer con botones de accion
  const footer = (
    <View style={styles.footerContent}>
      <TouchableSound
        style={[styles.reportButton, { backgroundColor: theme.cardAlt, borderColor: colors.warning }]}
        onPress={() => setShowProblemModal(true)}
      >
        <AlertTriangle size={20} color={colors.warning} />
        <Text style={[styles.reportButtonText, { color: colors.warning }]}>Reportar Problema</Text>
      </TouchableSound>

      <TouchableSound style={[styles.readyButton, { backgroundColor: colors.success }]} onPress={handleMarkReady}>
        <CheckCircle size={24} color="#FFFFFF" />
        <Text style={styles.readyButtonText}>Marcar como Lista</Text>
      </TouchableSound>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={Receipt}
      headerTitle="Comanda"
      headerSubtitle={`Orden #${order.id.toString().slice(0, 8)}`}
      footer={footer}
      footerPadding={180}
    >
      {/* Numero de orden */}
      <View style={[styles.orderNumberCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.orderNumberLabel, { color: theme.textSecondary }]}>ORDEN</Text>
        <Text style={[styles.orderNumber, { color: colors.accent }]}>#{order.id.toString().slice(0, 8)}</Text>
        {order.comandaCode ? (
          <View style={[styles.comandaCodeBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.comandaCodeText}>{order.comandaCode}</Text>
          </View>
        ) : null}
        <Text style={[styles.orderTime, { color: theme.textSecondary }]}>
          {new Date(order.createdAt).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Items */}
      <View style={[styles.itemsCard, { backgroundColor: theme.card }]}>
        <View style={[styles.itemsHeader, { borderBottomColor: theme.border }]}>
          <Package size={20} color={colors.accent} />
          <Text style={[styles.itemsTitle, { color: theme.text }]}>Productos</Text>
        </View>

        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <View key={index} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.quantityBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.quantityText}>{item.quantity}x</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: theme.textSecondary }]}>${item.price.toFixed(2)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.noItemsText, { color: theme.textSecondary }]}>Sin productos especificados</Text>
        )}
      </View>

      {/* Notas */}
      {order.notes && (
        <View style={[styles.notesCard, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <Text style={[styles.notesLabel, { color: theme.text }]}>NOTAS DEL CLIENTE</Text>
          <Text style={[styles.notesText, { color: theme.text }]}>{order.notes}</Text>
        </View>
      )}

      {/* Total */}
      <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: colors.accent }]}>
        <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>TOTAL</Text>
        <Text style={[styles.totalAmount, { color: colors.accent }]}>${order.total.toFixed(2)} MXN</Text>
      </View>

      {/* Modal de problemas */}
      <Modal
        visible={showProblemModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProblemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reportar Problema</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Selecciona el motivo:</Text>

            <TouchableSound
              style={[styles.reasonButton, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}
              onPress={() => handleReportProblem('Demasiadas ordenes')}
            >
              <Text style={[styles.reasonButtonText, { color: theme.text }]}>Demasiadas ordenes</Text>
            </TouchableSound>

            <TouchableSound
              style={[styles.reasonButton, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}
              onPress={() => handleReportProblem('Producto no disponible')}
            >
              <Text style={[styles.reasonButtonText, { color: theme.text }]}>Producto no disponible</Text>
            </TouchableSound>

            <TouchableSound
              style={[styles.reasonButton, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}
              onPress={() => handleReportProblem('Clientes presenciales')}
            >
              <Text style={[styles.reasonButtonText, { color: theme.text }]}>Clientes presenciales</Text>
            </TouchableSound>

            <TouchableSound
              style={[styles.reasonButton, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}
              onPress={() => handleReportProblem('Otro motivo')}
            >
              <Text style={[styles.reasonButtonText, { color: theme.text }]}>Otro motivo</Text>
            </TouchableSound>

            <TouchableSound
              style={[styles.cancelModalButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowProblemModal(false)}
            >
              <Text style={[styles.cancelModalButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableSound>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  orderNumberCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  orderNumberLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  comandaCodeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  comandaCodeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  orderTime: {
    fontSize: 16,
  },
  itemsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  quantityBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  noItemsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  notesCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  totalCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  footerContent: {
    gap: 12,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 18,
  },
  readyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  reasonButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  reasonButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelModalButton: {
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1.5,
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
