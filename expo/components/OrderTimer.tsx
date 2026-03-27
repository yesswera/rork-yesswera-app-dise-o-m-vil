import TouchableSound from '@/components/TouchableSound';
import { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { MapPin, Clock, DollarSign, X, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface OrderTimerProps {
  visible: boolean;
  orderData: {
    id: string;
    businessName: string;
    distance: number;
    estimatedTime: number;
    earnings: number;
    pickupAddress: string;
    deliveryAddress: string;
    type: 'food' | 'shopping' | 'delivery';
  } | null;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onTimeout?: (orderId: string) => void;
  countdownSeconds?: number;
}

export default function OrderTimer({
  visible,
  orderData,
  onAccept,
  onReject,
  onTimeout,
  countdownSeconds = 45,
}: OrderTimerProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && orderData) {
      setTimeLeft(countdownSeconds);
      progressAnim.setValue(1);
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Vibration.vibrate([0, 200, 100, 200]);
        } catch (error) {
          console.log('Haptics not available');
        }
      }

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      scaleAnim.setValue(0.8);
      pulseAnim.setValue(1);
    }
  }, [visible, orderData]);

  useEffect(() => {
    if (!visible || !orderData) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeout && orderData) {
            onTimeout(orderData.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, orderData, onTimeout]);

  useEffect(() => {
    if (visible && timeLeft > 0) {
      Animated.timing(progressAnim, {
        toValue: timeLeft / countdownSeconds,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [timeLeft, visible]);

  if (!orderData) return null;

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'food': return '🍔';
      case 'shopping': return '🛒';
      case 'delivery': return '📦';
      default: return '📦';
    }
  };

  const handleAccept = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
    onAccept(orderData.id);
  };

  const handleReject = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
    onReject(orderData.id);
  };

  const progressPercentage = (timeLeft / countdownSeconds) * 100;
  const strokeColor = progressPercentage > 50 ? Colors.success : progressPercentage > 20 ? Colors.warning : Colors.error;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleReject}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>🔔 ¡Nueva Orden!</Text>
          </View>

          <View style={styles.timerContainer}>
            <Animated.View
              style={[
                styles.timerCircle,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={[styles.progressCircle, { borderColor: strokeColor }]}>
                <Text style={styles.timerText}>{timeLeft}</Text>
                <Text style={styles.timerLabel}>seg</Text>
              </View>
            </Animated.View>
          </View>

          <View style={styles.orderInfo}>
            <View style={styles.typeTag}>
              <Text style={styles.typeEmoji}>{getTypeEmoji(orderData.type)}</Text>
              <Text style={styles.businessName}>{orderData.businessName}</Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MapPin size={20} color={Colors.primary} />
                <Text style={styles.detailValue}>{orderData.distance} km</Text>
                <Text style={styles.detailLabel}>Distancia</Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={20} color={Colors.accent} />
                <Text style={styles.detailValue}>{orderData.estimatedTime} min</Text>
                <Text style={styles.detailLabel}>Tiempo</Text>
              </View>
              <View style={styles.detailItem}>
                <DollarSign size={20} color={Colors.success} />
                <Text style={styles.detailValue}>${orderData.earnings}</Text>
                <Text style={styles.detailLabel}>Ganancia</Text>
              </View>
            </View>

            <View style={styles.addressesContainer}>
              <View style={styles.addressRow}>
                <View style={styles.addressDot} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>Recoger en:</Text>
                  <Text style={styles.addressText}>{orderData.pickupAddress}</Text>
                </View>
              </View>
              <View style={styles.addressLine} />
              <View style={styles.addressRow}>
                <View style={[styles.addressDot, styles.addressDotEnd]} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>Entregar en:</Text>
                  <Text style={styles.addressText}>{orderData.deliveryAddress}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableSound
              style={styles.rejectButton}
              onPress={handleReject}
              activeOpacity={0.7}
            >
              <X size={24} color={Colors.white} />
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </TouchableSound>
            <TouchableSound
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.7}
            >
              <Navigation size={24} color={Colors.white} />
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            </TouchableSound>
          </View>

          <Text style={styles.warningText}>
            ⚠️ Si no respondes, se asignará a otro repartidor
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    width: '100%' as const,
    maxWidth: 400,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
  },
  timerContainer: {
    alignItems: 'center' as const,
    paddingVertical: 24,
  },
  timerCircle: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background.secondary,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    lineHeight: 52,
  },
  timerLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: -4,
  },
  orderInfo: {
    paddingHorizontal: 24,
  },
  typeTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  typeEmoji: {
    fontSize: 20,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  detailsGrid: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: 20,
  },
  detailItem: {
    alignItems: 'center' as const,
    flex: 1,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 6,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  addressesContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  addressRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  addressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  addressDotEnd: {
    backgroundColor: Colors.success,
  },
  addressLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border.medium,
    marginLeft: 5,
    marginVertical: 4,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row' as const,
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  rejectButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.error,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  acceptButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  warningText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
