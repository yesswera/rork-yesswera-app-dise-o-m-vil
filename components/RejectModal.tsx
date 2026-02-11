import TouchableSound from '@/components/TouchableSound';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { X, AlertTriangle, MapPin, Clock, Car, Coffee, User, HelpCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface RejectModalProps {
  visible: boolean;
  orderId: string;
  onConfirm: (orderId: string, reason: string, customReason?: string) => void;
  onCancel: () => void;
  showWarning?: boolean; // Show warning about acceptance rate (after first rejection)
}

const REJECT_REASONS = [
  {
    id: 'too_far',
    icon: MapPin,
    label: 'Muy lejos de mi ubicación',
    color: Colors.accent,
  },
  {
    id: 'traffic',
    icon: Car,
    label: 'Tráfico / Zona complicada',
    color: Colors.warning,
  },
  {
    id: 'vehicle',
    icon: Car,
    label: 'Mi vehículo no está disponible',
    color: Colors.text.secondary,
  },
  {
    id: 'end_shift',
    icon: Clock,
    label: 'Fin de mi turno',
    color: Colors.primary,
  },
  {
    id: 'break',
    icon: Coffee,
    label: 'Estoy en descanso',
    color: Colors.success,
  },
  {
    id: 'personal',
    icon: User,
    label: 'Asunto personal',
    color: Colors.accent,
  },
  {
    id: 'other',
    icon: HelpCircle,
    label: 'Otro motivo',
    color: Colors.text.light,
  },
];

export default function RejectModal({
  visible,
  orderId,
  onConfirm,
  onCancel,
  showWarning = false,
}: RejectModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;

    onConfirm(
      orderId,
      selectedReason,
      selectedReason === 'other' ? customReason : undefined
    );

    // Reset state
    setSelectedReason(null);
    setCustomReason('');
  };

  const handleCancel = () => {
    setSelectedReason(null);
    setCustomReason('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>¿Por qué rechazas esta orden?</Text>
            <TouchableSound style={styles.closeButton} onPress={handleCancel}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableSound>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Reason Options */}
            <View style={styles.reasonsContainer}>
              {REJECT_REASONS.map((reason) => {
                const IconComponent = reason.icon;
                const isSelected = selectedReason === reason.id;

                return (
                  <TouchableSound
                    key={reason.id}
                    style={[
                      styles.reasonCard,
                      isSelected && styles.reasonCardSelected,
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.reasonIcon,
                        { backgroundColor: reason.color + '20' },
                      ]}
                    >
                      <IconComponent size={20} color={reason.color} />
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableSound>
                );
              })}
            </View>

            {/* Custom Reason Input */}
            {selectedReason === 'other' && (
              <View style={styles.customReasonContainer}>
                <Text style={styles.customReasonLabel}>Describe el motivo:</Text>
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Escribe aquí..."
                  placeholderTextColor={Colors.text.light}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>{customReason.length}/200</Text>
              </View>
            )}

            {/* Warning Message (shown after first rejection) */}
            {showWarning && (
              <View style={styles.warningContainer}>
                <AlertTriangle size={20} color={Colors.warning} />
                <Text style={styles.warningText}>
                  Rechazar muchas órdenes afecta tu tasa de aceptación y puede
                  reducir las órdenes que recibes.
                </Text>
              </View>
            )}

            {/* Suggestion */}
            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>💡 Sugerencia</Text>
              <Text style={styles.suggestionText}>
                Si no puedes aceptar órdenes temporalmente, mejor desactiva tu
                estado "En Línea" para no afectar tu tasa.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableSound
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableSound>

            <TouchableSound
              style={[
                styles.confirmButton,
                !selectedReason && styles.confirmButtonDisabled,
                selectedReason === 'other' && !customReason.trim() && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason || (selectedReason === 'other' && !customReason.trim())}
            >
              <Text style={styles.confirmButtonText}>Confirmar Rechazo</Text>
            </TouchableSound>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  reasonsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  reasonTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  customReasonContainer: {
    marginBottom: 20,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  customReasonInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.text.light,
    textAlign: 'right',
    marginTop: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warning + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  suggestionContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.text.light,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
