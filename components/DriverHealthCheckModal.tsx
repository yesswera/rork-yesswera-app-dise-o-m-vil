// ============================================================================
// YESSWERA: MODAL DE VERIFICACIÓN DE ESTADO DEL DRIVER
// Pregunta fija que aparece cuando el sistema detecta anomalías
// (GPS detenido, sin movimiento, posible problema)
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Package,
  Phone,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { confirmDriverOk } from '@/services/driver-monitoring';
import { Toast } from '@/utils/toast';

// ============================================================================
// TIPOS
// ============================================================================

export type HealthCheckReason =
  | 'traffic'
  | 'waiting_business'
  | 'waiting_client'
  | 'order_issue'
  | 'client_not_responding'
  | 'need_help'
  | 'all_good';

interface HealthCheckOption {
  id: HealthCheckReason;
  label: string;
  icon: React.ReactNode;
  color: string;
  requiresFollowUp: boolean;
  escalate: boolean;
}

interface DriverHealthCheckModalProps {
  visible: boolean;
  driverId: string;
  orderId?: string;
  stallMinutes?: number;
  onDismiss: () => void;
  onNeedHelp?: () => void;
}

// ============================================================================
// OPCIONES FIJAS DE RESPUESTA
// ============================================================================

const HEALTH_CHECK_OPTIONS: HealthCheckOption[] = [
  {
    id: 'traffic',
    label: 'Hay tráfico',
    icon: <Clock size={24} color="#F59E0B" />,
    color: '#FEF3C7',
    requiresFollowUp: false,
    escalate: false,
  },
  {
    id: 'waiting_business',
    label: 'Esperando en el negocio',
    icon: <MapPin size={24} color="#3B82F6" />,
    color: '#DBEAFE',
    requiresFollowUp: false,
    escalate: false,
  },
  {
    id: 'waiting_client',
    label: 'Esperando al cliente',
    icon: <Phone size={24} color="#8B5CF6" />,
    color: '#EDE9FE',
    requiresFollowUp: false,
    escalate: false,
  },
  {
    id: 'order_issue',
    label: 'Problema con el pedido',
    icon: <Package size={24} color="#EF4444" />,
    color: '#FEE2E2',
    requiresFollowUp: true,
    escalate: true,
  },
  {
    id: 'client_not_responding',
    label: 'Cliente no responde',
    icon: <HelpCircle size={24} color="#F97316" />,
    color: '#FFEDD5',
    requiresFollowUp: true,
    escalate: true,
  },
  {
    id: 'need_help',
    label: 'Necesito ayuda',
    icon: <AlertCircle size={24} color="#DC2626" />,
    color: '#FEE2E2',
    requiresFollowUp: true,
    escalate: true,
  },
  {
    id: 'all_good',
    label: 'Todo bien, ya continúo',
    icon: <CheckCircle size={24} color="#10B981" />,
    color: '#D1FAE5',
    requiresFollowUp: false,
    escalate: false,
  },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DriverHealthCheckModal({
  visible,
  driverId,
  orderId,
  stallMinutes = 5,
  onDismiss,
  onNeedHelp,
}: DriverHealthCheckModalProps) {
  const [selectedOption, setSelectedOption] = useState<HealthCheckReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectOption = async (option: HealthCheckOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option.id);
    setIsSubmitting(true);

    try {
      // Registrar la respuesta en Supabase
      await supabase.from('driver_health_checks').insert({
        driver_id: driverId,
        order_id: orderId,
        reason: option.id,
        stall_minutes: stallMinutes,
        requires_followup: option.requiresFollowUp,
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        // Si la tabla no existe, ignorar (se creará en migración)
        if (error && !error.message.includes('does not exist')) {
          console.warn('Health check log error:', error.message);
        }
      });

      // Confirmar que el driver está bien (reset del timer de monitoreo)
      await confirmDriverOk(driverId);

      // Si necesita escalamiento, mostrar notificación y llamar callback
      if (option.escalate) {
        if (option.id === 'need_help') {
          Toast.warning('Contactando soporte...');
          onNeedHelp?.();
        } else if (option.id === 'order_issue') {
          Toast.info('Notificando al negocio sobre el problema');
          // Notificar al negocio
          if (orderId) {
            await notifyBusinessAboutIssue(orderId, 'Problema reportado por el repartidor');
          }
        } else if (option.id === 'client_not_responding') {
          Toast.info('Iniciando protocolo de cliente no localizado');
          // Iniciar timer de espera (5 min antes de poder marcar como no entregado)
          if (orderId) {
            await startClientWaitTimer(orderId);
          }
        }
      } else {
        Toast.success('Gracias por confirmar');
      }

      // Cerrar modal
      onDismiss();
    } catch (error) {
      console.error('Health check error:', error);
      Toast.error('Error al registrar respuesta');
    } finally {
      setIsSubmitting(false);
      setSelectedOption(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header con alerta */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={32} color="#F59E0B" />
            </View>
            <Text style={styles.title}>¿Todo bien?</Text>
            <Text style={styles.subtitle}>
              Detectamos que llevas {stallMinutes} minutos detenido
            </Text>
          </View>

          {/* Opciones */}
          <View style={styles.optionsContainer}>
            {HEALTH_CHECK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  { backgroundColor: option.color },
                  selectedOption === option.id && styles.optionSelected,
                ]}
                onPress={() => handleSelectOption(option)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>{option.icon}</View>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {isSubmitting && selectedOption === option.id && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Nota */}
          <Text style={styles.note}>
            Esta información nos ayuda a mejorar el servicio
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

async function notifyBusinessAboutIssue(orderId: string, message: string) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('business_id')
      .eq('id', orderId)
      .single();

    if (order?.business_id) {
      // Obtener user_id del negocio
      const { data: business } = await supabase
        .from('businesses')
        .select('user_id')
        .eq('id', order.business_id)
        .single();

      if (business?.user_id) {
        await supabase.from('notifications').insert({
          user_id: business.user_id,
          type: 'order_issue',
          title: 'Problema con pedido',
          body: message,
          data: { order_id: orderId },
        });
      }
    }
  } catch (error) {
    console.error('notifyBusinessAboutIssue error:', error);
  }
}

async function startClientWaitTimer(orderId: string) {
  try {
    // Marcar en la orden que el cliente no responde
    await supabase
      .from('orders')
      .update({
        client_not_responding_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  } catch (error) {
    console.error('startClientWaitTimer error:', error);
  }
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  optionIcon: {
    width: 32,
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  note: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 16,
  },
});
