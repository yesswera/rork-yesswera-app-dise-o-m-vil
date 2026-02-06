// PanicModal Component - Fase 2B
// Emergency options for drivers

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import {
  PanicReason,
  PANIC_REASONS,
  registerPanicEvent,
  requestOrderTransfer,
} from '@/services/driver-monitoring';
import { getCurrentLocation } from '@/services/gps';
import { Toast } from '@/utils/toast';

interface PanicModalProps {
  visible: boolean;
  onClose: () => void;
  driverId: string;
  orderId: string | null;
  onTransferRequested?: () => void;
}

const PANIC_OPTIONS: { reason: PanicReason; icon: string; color: string }[] = [
  { reason: 'accident', icon: 'car', color: '#DC2626' },
  { reason: 'robbery_attempt', icon: 'warning', color: '#DC2626' },
  { reason: 'client_harassment', icon: 'person-remove', color: '#EA580C' },
  { reason: 'medical_emergency', icon: 'medical', color: '#DC2626' },
  { reason: 'vehicle_breakdown', icon: 'construct', color: '#D97706' },
  { reason: 'feeling_unsafe', icon: 'shield', color: '#EA580C' },
];

export default function PanicModal({
  visible,
  onClose,
  driverId,
  orderId,
  onTransferRequested,
}: PanicModalProps) {
  const [selectedReason, setSelectedReason] = useState<PanicReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'obtained' | 'last_known' | 'unavailable' | null>(null);

  const handleSelectReason = async (reason: PanicReason) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedReason(reason);
    setGettingLocation(true);

    let finalLocation: { latitude: number; longitude: number } | undefined;

    // 1. Intentar obtener ubicación actual (pide permiso si no lo tiene)
    try {
      const location = await getCurrentLocation();
      if (location) {
        finalLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setLocationStatus('obtained');
      }
    } catch (error) {
      console.log('[Panic] No se pudo obtener ubicación actual');
    }

    // 2. Si no hay ubicación actual, buscar última conocida en Firebase
    if (!finalLocation && driverId) {
      try {
        const { ref, get } = require('firebase/database');
        const { realtimeDb } = require('@/constants/firebase');
        const driverRef = ref(realtimeDb, `drivers_location/${driverId}`);
        const snapshot = await get(driverRef);
        const data = snapshot.val();
        if (data?.latitude && data?.longitude) {
          finalLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
          };
          setLocationStatus('last_known');
          Toast.warning('Usando última ubicación conocida');
        }
      } catch (error) {
        console.log('[Panic] No hay ubicación previa en Firebase');
      }
    }

    // 3. Si no hay ninguna ubicación
    if (!finalLocation) {
      setLocationStatus('unavailable');
      Toast.warning('No se pudo obtener tu ubicación');
    }

    setGettingLocation(false);
    setShowActions(true);

    // Registrar evento de pánico
    const result = await registerPanicEvent(
      driverId,
      orderId,
      reason,
      undefined,
      finalLocation
    );

    if (!result.success) {
      Toast.error(result.message);
    }
  };

  const handleCall911 = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const phoneNumber = Platform.OS === 'android' ? 'tel:911' : 'telprompt:911';
    Linking.openURL(phoneNumber);
  };

  const handleTransferOrder = async () => {
    if (!orderId || !selectedReason) return;

    setIsSubmitting(true);
    try {
      const result = await requestOrderTransfer(
        orderId,
        driverId,
        PANIC_REASONS[selectedReason]
      );

      if (result.success) {
        Toast.success(result.message);
        onTransferRequested?.();
        onClose();
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      Toast.error('Error al transferir orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setShowActions(false);
    setLocationStatus(null);
    setGettingLocation(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="warning" size={32} color="#DC2626" />
            </View>
            <Text style={styles.headerTitle}>
              {showActions ? 'Ayuda en Camino' : 'Necesito Ayuda'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {gettingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
            </View>
          ) : !showActions ? (
            <>
              {/* Panic Options */}
              <Text style={styles.subtitle}>Selecciona que esta pasando:</Text>
              <View style={styles.optionsGrid}>
                {PANIC_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.reason}
                    style={[
                      styles.optionButton,
                      selectedReason === option.reason && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelectReason(option.reason)}
                  >
                    <View
                      style={[
                        styles.optionIconContainer,
                        { backgroundColor: `${option.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={24}
                        color={option.color}
                      />
                    </View>
                    <Text style={styles.optionText}>
                      {PANIC_REASONS[option.reason]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Actions after selecting reason */}
              <View style={styles.selectedReasonBadge}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.selectedReasonText}>
                  {selectedReason ? PANIC_REASONS[selectedReason] : ''}
                </Text>
              </View>

              <Text style={styles.actionsSubtitle}>
                {locationStatus === 'obtained'
                  ? 'Tu ubicación actual ha sido registrada. Selecciona una acción:'
                  : locationStatus === 'last_known'
                  ? 'Se registró tu última ubicación conocida. Selecciona una acción:'
                  : 'No pudimos obtener tu ubicación. Selecciona una acción:'}
              </Text>

              <View style={styles.actionsContainer}>
                {/* Call 911 */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButton911]}
                  onPress={handleCall911}
                >
                  <Ionicons name="call" size={24} color="#fff" />
                  <Text style={styles.actionButtonText911}>Llamar al 911</Text>
                </TouchableOpacity>

                {/* Transfer Order */}
                {orderId && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonTransfer]}
                    onPress={handleTransferOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <>
                        <Ionicons
                          name="swap-horizontal"
                          size={24}
                          color={Colors.primary}
                        />
                        <Text style={styles.actionButtonTextTransfer}>
                          Transferir Orden
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* I'm OK - Close */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonOk]}
                  onPress={handleClose}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                  <Text style={styles.actionButtonTextOk}>Estoy Bien</Text>
                </TouchableOpacity>
              </View>

              {/* Help coming message */}
              <View style={styles.helpMessage}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                <Text style={styles.helpMessageText}>
                  El equipo de Yesswera ha sido notificado y esta monitoreando la situacion.
                </Text>
              </View>
            </>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  selectedReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  selectedReasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  actionsSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionButton911: {
    backgroundColor: '#DC2626',
  },
  actionButtonText911: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTransfer: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonTextTransfer: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  actionButtonOk: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  actionButtonTextOk: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
  },
  helpMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${Colors.primary}10`,
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 10,
  },
  helpMessageText: {
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },
});
