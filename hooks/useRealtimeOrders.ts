import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/auth';
import { showToast } from '@/utils/toast';
import * as Haptics from 'expo-haptics';
import { getClientTransferMessage } from '@/services/driver-monitoring';

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'handed_to_driver'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

interface OrderChange {
  id: string;
  status: OrderStatus;
  business_id?: string;
  driver_id?: string;
  client_id?: string;
  cancellation_reason?: string;
  needs_driver_transfer?: boolean;
  transfer_reason?: string;
}

// Status messages for each role
const CLIENT_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Orden enviada, esperando confirmacion del negocio...',
  accepted: 'El negocio acepto tu orden',
  preparing: 'Tu orden esta siendo preparada',
  ready: 'Tu orden esta lista, buscando repartidor...',
  assigned: 'Repartidor asignado, va al negocio',
  driver_verified: 'El repartidor esta en el negocio',
  handed_to_driver: 'El repartidor tiene tu orden',
  in_transit: 'Tu orden va en camino',
  arrived: 'El repartidor llego - sal a recibir',
  delivered: 'Orden entregada. Gracias!',
  cancelled: 'Tu orden fue cancelada',
};

const BUSINESS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Nueva orden recibida',
  accepted: 'Orden aceptada',
  preparing: 'Orden en preparacion',
  ready: 'Orden lista para recoger',
  assigned: 'Repartidor asignado',
  handed_to_driver: 'Orden entregada al repartidor',
  in_transit: 'Orden en camino al cliente',
  arrived: 'Repartidor en domicilio del cliente',
  delivered: 'Orden completada',
  cancelled: 'Orden cancelada',
};

const DRIVER_MESSAGES: Record<OrderStatus, string> = {
  pending: '',
  accepted: 'Orden aceptada por negocio',
  preparing: 'Negocio preparando orden',
  ready: 'Orden lista - ve a recoger',
  assigned: 'Te asignaron una orden',
  handed_to_driver: 'Orden recibida - ve al cliente',
  in_transit: 'En camino al cliente',
  arrived: 'Llegaste al cliente',
  delivered: 'Entrega completada',
  cancelled: 'Orden cancelada',
};

// Determine toast type based on status
function getToastType(status: OrderStatus): 'success' | 'error' | 'warning' | 'info' {
  if (status === 'cancelled') return 'error';
  if (status === 'delivered') return 'success';
  if (status === 'arrived' || status === 'ready') return 'warning';
  return 'info';
}

// Hook for client to subscribe to their orders
export function useClientOrderSubscription(onOrderUpdate?: (order: OrderChange) => void) {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const previousStatuses = useRef<Map<string, OrderStatus>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to orders where user is the client
    const channel = supabase
      .channel(`client-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${user.id}`,
        },
        async (payload) => {
          const order = payload.new as OrderChange;
          const previousStatus = previousStatuses.current.get(order.id);

          // Only notify if status actually changed
          if (previousStatus !== order.status) {
            previousStatuses.current.set(order.id, order.status);

            // Show toast notification
            let message: string;
            let toastType = getToastType(order.status);

            // Si el status es 'ready', verificar si es una transferencia
            // Supabase Realtime puede no enviar todos los campos, asi que consultamos la BD
            if (order.status === 'ready') {
              try {
                const { data: fullOrder } = await supabase
                  .from('orders')
                  .select('needs_driver_transfer, transfer_reason')
                  .eq('id', order.id)
                  .single();

                if (fullOrder?.needs_driver_transfer) {
                  // Es una transferencia - mostrar mensaje personalizado
                  message = fullOrder.transfer_reason
                    ? getClientTransferMessage(fullOrder.transfer_reason)
                    : 'Tu repartidor tuvo un inconveniente. Otro repartidor ya esta siendo asignado. Agradecemos tu comprension.';
                  toastType = 'warning';
                } else {
                  message = CLIENT_MESSAGES[order.status];
                }
              } catch {
                message = CLIENT_MESSAGES[order.status];
              }
            } else if (order.status === 'cancelled' && order.cancellation_reason?.includes('Rechazado')) {
              message = 'El negocio no puede atender tu pedido';
            } else {
              message = CLIENT_MESSAGES[order.status];
            }

            if (message) {
              Haptics.notificationAsync(
                order.status === 'cancelled'
                  ? Haptics.NotificationFeedbackType.Error
                  : order.status === 'delivered'
                    ? Haptics.NotificationFeedbackType.Success
                    : Haptics.NotificationFeedbackType.Warning
              );
              showToast(message, toastType);
            }

            // Callback for additional handling
            onOrderUpdate?.(order);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          const order = payload.new as OrderChange;
          previousStatuses.current.set(order.id, order.status);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, onOrderUpdate]);
}

// Hook for business to subscribe to their orders
export function useBusinessOrderSubscription(
  businessId: string | null,
  onOrderUpdate?: (order: OrderChange) => void
) {
  const subscriptionRef = useRef<any>(null);
  const previousStatuses = useRef<Map<string, OrderStatus>>(new Map());

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`business-orders-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const order = (payload.new || payload.old) as OrderChange;
          const eventType = payload.eventType;

          if (eventType === 'INSERT') {
            // New order!
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Nueva orden recibida!', 'success', 5000);
            previousStatuses.current.set(order.id, order.status);
            onOrderUpdate?.(order);
          } else if (eventType === 'UPDATE') {
            const previousStatus = previousStatuses.current.get(order.id);

            if (previousStatus !== order.status) {
              previousStatuses.current.set(order.id, order.status);

              // Notify about driver-related changes
              if (order.status === 'assigned') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                showToast('Repartidor asignado a orden', 'info');
              } else if (order.status === 'cancelled') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showToast('Orden cancelada', 'error');
              }

              onOrderUpdate?.(order);
            }
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [businessId, onOrderUpdate]);
}

// Hook for driver to subscribe to their assigned orders + available orders
export function useDriverOrderSubscription(
  driverId: string | null,
  onOrderUpdate?: (order: OrderChange) => void,
  onNewAvailableOrder?: (order: OrderChange) => void
) {
  const subscriptionRef = useRef<any>(null);
  const availableSubscriptionRef = useRef<any>(null);
  const previousStatuses = useRef<Map<string, OrderStatus>>(new Map());

  useEffect(() => {
    if (!driverId) return;

    // Subscribe to assigned orders
    const assignedChannel = supabase
      .channel(`driver-orders-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const order = payload.new as OrderChange;
          const previousStatus = previousStatuses.current.get(order.id);

          if (previousStatus !== order.status) {
            previousStatuses.current.set(order.id, order.status);

            const message = DRIVER_MESSAGES[order.status];
            if (message) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              showToast(message, getToastType(order.status));
            }

            onOrderUpdate?.(order);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = assignedChannel;

    // Subscribe to available orders (ready status, no driver)
    const availableChannel = supabase
      .channel('available-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as OrderChange;
          const oldOrder = payload.old as OrderChange;

          // Order just became available (status changed to ready/preparing AND no driver)
          if (
            !order.driver_id &&
            (order.status === 'ready' || order.status === 'preparing') &&
            oldOrder.status !== order.status
          ) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Nueva orden disponible!', 'success');
            onNewAvailableOrder?.(order);
          }
        }
      )
      .subscribe();

    availableSubscriptionRef.current = availableChannel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (availableSubscriptionRef.current) {
        supabase.removeChannel(availableSubscriptionRef.current);
      }
    };
  }, [driverId, onOrderUpdate, onNewAvailableOrder]);
}

// Hook to subscribe to a specific order (for tracking screen)
export function useOrderTracking(
  orderId: string | null,
  onStatusChange?: (status: OrderStatus, order: OrderChange) => void
) {
  const subscriptionRef = useRef<any>(null);
  const previousStatusRef = useRef<OrderStatus | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const order = payload.new as OrderChange;

          if (previousStatusRef.current !== order.status) {
            previousStatusRef.current = order.status;
            onStatusChange?.(order.status, order);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [orderId, onStatusChange]);
}
