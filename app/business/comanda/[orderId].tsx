import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle, AlertTriangle, Package } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Order } from '@/constants/types';
import { getOrderById, updateOrderStatus } from '@/services/orders';

export default function ComandaScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
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
      '¿El pedido está listo para recoger?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await updateOrderStatus(orderId.toString(), 'ready');
              Alert.alert('Éxito', 'Pedido marcado como listo');
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
      `Motivo: ${reason}\n\nSe notificará al cliente sobre el retraso.`,
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Orden no encontrada</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.secondary, Colors.secondaryDark]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comanda</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.orderNumberCard}>
          <Text style={styles.orderNumberLabel}>ORDEN</Text>
          <Text style={styles.orderNumber}>#{order.id.toString().slice(0, 8)}</Text>
          {order.comandaCode ? (
            <View style={styles.comandaCodeBadge}>
              <Text style={styles.comandaCodeText}>{order.comandaCode}</Text>
            </View>
          ) : null}
          <Text style={styles.orderTime}>
            {new Date(order.createdAt).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.itemsCard}>
          <View style={styles.itemsHeader}>
            <Package size={20} color={Colors.secondary} />
            <Text style={styles.itemsTitle}>Productos</Text>
          </View>

          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityText}>{item.quantity}x</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noItemsText}>Sin productos especificados</Text>
          )}
        </View>

        {order.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>📝 NOTAS DEL CLIENTE</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>${order.total.toFixed(2)} MXN</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setShowProblemModal(true)}
        >
          <AlertTriangle size={20} color={Colors.warning} />
          <Text style={styles.reportButtonText}>Reportar Problema</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.readyButton} onPress={handleMarkReady}>
          <CheckCircle size={24} color={Colors.white} />
          <Text style={styles.readyButtonText}>Marcar como Lista</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showProblemModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProblemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reportar Problema</Text>
            <Text style={styles.modalSubtitle}>Selecciona el motivo:</Text>

            <TouchableOpacity
              style={styles.reasonButton}
              onPress={() => handleReportProblem('Demasiadas órdenes')}
            >
              <Text style={styles.reasonButtonText}>📦 Demasiadas órdenes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reasonButton}
              onPress={() => handleReportProblem('Producto no disponible')}
            >
              <Text style={styles.reasonButtonText}>❌ Producto no disponible</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reasonButton}
              onPress={() => handleReportProblem('Clientes presenciales')}
            >
              <Text style={styles.reasonButtonText}>👥 Clientes presenciales</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reasonButton}
              onPress={() => handleReportProblem('Otro motivo')}
            >
              <Text style={styles.reasonButtonText}>💬 Otro motivo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowProblemModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  orderNumberCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  orderNumberLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginBottom: 4,
  },
  comandaCodeBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  comandaCodeText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 4,
  },
  orderTime: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  itemsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  itemsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border.light,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  quantityBadge: {
    backgroundColor: Colors.secondary,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.secondary,
    marginLeft: 12,
  },
  noItemsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    paddingVertical: 12,
  },
  notesCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  totalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  footer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  reportButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.warning,
    marginLeft: 8,
  },
  readyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 18,
  },
  readyButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 100,
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
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  reasonButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  reasonButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  cancelModalButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
});
