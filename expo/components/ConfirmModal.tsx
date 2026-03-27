import TouchableSound from '@/components/TouchableSound';
import {
  Modal,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { HapticFeedback } from '@/utils/haptics';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    HapticFeedback.success();
    onConfirm();
  };

  const handleCancel = () => {
    HapticFeedback.light();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <AlertTriangle 
              size={32} 
              color={confirmVariant === 'danger' ? Colors.error : Colors.warning} 
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            <TouchableSound
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableSound>

            <TouchableSound
              style={[
                styles.button, 
                styles.confirmButton,
                confirmVariant === 'danger' && styles.confirmButtonDanger,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%' as const,
    maxWidth: 400,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  cancelButton: {
    backgroundColor: Colors.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonDanger: {
    backgroundColor: Colors.error,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
