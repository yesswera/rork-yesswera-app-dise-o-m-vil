import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, MapPin, User, Star } from 'lucide-react-native';
import Colors from '@/constants/colors';
import RatingStars from '@/components/RatingStars';
import LoadingButton from '@/components/LoadingButton';
import { mockOrders } from '@/mocks/orders';

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();

  const order = mockOrders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Orden no encontrada</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (order.status) {
      case 'delivered':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.warning;
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'delivered':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'in_transit':
        return 'En Tránsito';
      case 'accepted':
        return 'Aceptada';
      default:
        return 'Pendiente';
    }
  };

  const getOrderTypeName = () => {
    switch (order.orderType) {
      case 'food':
        return 'Alimentos';
      case 'shopping':
        return 'Compras';
      case 'delivery':
        return 'Envío';
    }
  };

  const canRate = order.status === 'delivered' && !order.rating;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.orderId}>Orden #{order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>
          <Text style={styles.orderType}>{getOrderTypeName()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Servicio</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Calendar size={18} color={Colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha de Creación</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            {order.deliveredAt && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Calendar size={18} color={Colors.text.secondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Fecha de Entrega</Text>
                    <Text style={styles.infoValue}>
                      {new Date(order.deliveredAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Productos</Text>
            <View style={styles.infoCard}>
              {order.items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.productRow}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productQuantity}>Cantidad: {item.quantity}</Text>
                    </View>
                    <Text style={styles.productPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {order.shoppingList && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lista de Compras</Text>
            <View style={styles.infoCard}>
              <Text style={styles.shoppingListText}>{order.shoppingList}</Text>
            </View>
          </View>
        )}

        {order.packageDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles del Paquete</Text>
            <View style={styles.infoCard}>
              <Text style={styles.packageLabel}>Descripción:</Text>
              <Text style={styles.packageValue}>{order.packageDetails.description}</Text>
              <View style={styles.packageRow}>
                <View style={styles.packageItem}>
                  <Text style={styles.packageLabel}>Peso</Text>
                  <Text style={styles.packageValue}>{order.packageDetails.weight}</Text>
                </View>
                <View style={styles.packageItem}>
                  <Text style={styles.packageLabel}>Tamaño</Text>
                  <Text style={styles.packageValue}>{order.packageDetails.size}</Text>
                </View>
                <View style={styles.packageItem}>
                  <Text style={styles.packageLabel}>Urgencia</Text>
                  <Text style={styles.packageValue}>
                    {order.packageDetails.urgency === 'express' ? 'Express' : 'Estándar'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicaciones</Text>
          <View style={styles.infoCard}>
            {order.origin && (
              <>
                <View style={styles.infoRow}>
                  <MapPin size={18} color={Colors.secondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Origen</Text>
                    <Text style={styles.infoValue}>{order.origin.address}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.infoRow}>
              <MapPin size={18} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Destino</Text>
                <Text style={styles.infoValue}>{order.destination.address}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costos</Text>
          <View style={styles.infoCard}>
            {order.items && order.items.length > 0 && (
              <>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Subtotal Productos</Text>
                  <Text style={styles.costValue}>
                    ${(order.total - order.deliveryCost).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Costo de Entrega</Text>
              <Text style={styles.costValue}>${order.deliveryCost.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.costRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {order.driverId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Repartidor</Text>
            <View style={styles.infoCard}>
              {order.rating ? (
                <>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <User size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>
                        {order.rating.driverName || 'Repartidor'}
                      </Text>
                      <View style={styles.ratingContainer}>
                        <RatingStars rating={order.rating.stars} size="small" readonly />
                      </View>
                      {order.rating.comment && (
                        <Text style={styles.ratingComment}>&ldquo;{order.rating.comment}&rdquo;</Text>
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <User size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>Repartidor Asignado</Text>
                    {canRate && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => router.push(`/ratings/create/${order.id}` as any)}
                      >
                        <Star size={16} color={Colors.warning} />
                        <Text style={styles.rateButtonText}>Calificar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {order.status !== 'cancelled' && (
          <View style={styles.actionSection}>
            <LoadingButton
              title="Ver en Mapa"
              onPress={() => router.push(`/tracking/${order.id}` as any)}
              variant="primary"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 40,
  },
  headerCard: {
    backgroundColor: Colors.white,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  orderId: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  orderType: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  productRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  shoppingListText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  packageLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  packageValue: {
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  packageRow: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  packageItem: {
    flex: 1,
  },
  costRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  costLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  driverInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  ratingContainer: {
    marginTop: 4,
  },
  ratingComment: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic' as const,
    marginTop: 8,
  },
  rateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.warning}15`,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
    gap: 6,
    marginTop: 4,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
});
