/**
 * Hook para manejar timeout de ordenes - Yesswera
 * Detecta cuando un negocio no responde en 30 segundos
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/constants/supabase';
import { showToast } from '@/utils/toast';
import * as Haptics from 'expo-haptics';

interface UseOrderTimeoutOptions {
  orderId: string | null;
  timeoutMs?: number; // default 30000 (30 segundos)
  onTimeout?: (orderId: string) => void;
  enabled?: boolean;
}

interface TimeoutState {
  isWaiting: boolean;
  secondsRemaining: number;
  timedOut: boolean;
}

/**
 * Hook que monitorea si el negocio responde a tiempo
 */
export function useOrderTimeout({
  orderId,
  timeoutMs = 30000,
  onTimeout,
  enabled = true,
}: UseOrderTimeoutOptions) {
  const [state, setState] = useState<TimeoutState>({
    isWaiting: false,
    secondsRemaining: timeoutMs / 1000,
    timedOut: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Limpiar timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Iniciar countdown
  const startCountdown = useCallback(() => {
    startTimeRef.current = Date.now();
    setState({
      isWaiting: true,
      secondsRemaining: timeoutMs / 1000,
      timedOut: false,
    });

    // Countdown visual
    countdownRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setState((prev) => ({ ...prev, secondsRemaining: remaining }));
      }
    }, 1000);

    // Timer de timeout
    timerRef.current = setTimeout(async () => {
      // Verificar una vez mas el status antes de marcar timeout
      if (orderId) {
        const { data } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();

        // Si sigue pendiente, es timeout
        if (data?.status === 'pending') {
          setState({
            isWaiting: false,
            secondsRemaining: 0,
            timedOut: true,
          });

          // Marcar timeout en BD
          await supabase
            .from('orders')
            .update({
              timeout_at: new Date().toISOString(),
              timeout_notified: true,
            })
            .eq('id', orderId);

          // Feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast('El negocio no respondio. Te mostramos alternativas.', 'warning', 5000);

          // Callback
          onTimeout?.(orderId);
        } else {
          // El negocio respondio a tiempo
          clearTimers();
          setState({
            isWaiting: false,
            secondsRemaining: 0,
            timedOut: false,
          });
        }
      }
    }, timeoutMs);
  }, [orderId, timeoutMs, onTimeout, clearTimers]);

  // Cancelar timeout (negocio respondio)
  const cancelTimeout = useCallback(() => {
    clearTimers();
    setState({
      isWaiting: false,
      secondsRemaining: 0,
      timedOut: false,
    });
  }, [clearTimers]);

  // Monitorear cambios de status
  useEffect(() => {
    if (!orderId || !enabled) {
      clearTimers();
      return;
    }

    // Verificar status inicial
    const checkInitialStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, created_at')
        .eq('id', orderId)
        .single();

      if (data?.status === 'pending') {
        // Calcular tiempo restante si ya paso algo de tiempo
        const createdAt = new Date(data.created_at).getTime();
        const elapsed = Date.now() - createdAt;
        const remaining = timeoutMs - elapsed;

        if (remaining > 0) {
          startCountdown();
        } else {
          // Ya deberia haber timeout
          setState({
            isWaiting: false,
            secondsRemaining: 0,
            timedOut: true,
          });
          onTimeout?.(orderId);
        }
      } else {
        // Ya no esta pendiente
        cancelTimeout();
      }
    };

    checkInitialStatus();

    // Suscribirse a cambios
    const subscription = supabase
      .channel(`order-timeout-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus && newStatus !== 'pending') {
            // Negocio respondio
            cancelTimeout();
          }
        }
      )
      .subscribe();

    return () => {
      clearTimers();
      supabase.removeChannel(subscription);
    };
  }, [orderId, enabled, timeoutMs, startCountdown, cancelTimeout, onTimeout, clearTimers]);

  return {
    ...state,
    cancelTimeout,
  };
}

/**
 * Hook para el negocio: saber cuanto tiempo le queda para responder
 */
export function useBusinessResponseTimer(orderId: string | null) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderTime = async () => {
      const { data } = await supabase
        .from('orders')
        .select('created_at, status')
        .eq('id', orderId)
        .single();

      if (data?.status === 'pending') {
        const createdAt = new Date(data.created_at).getTime();
        const elapsed = (Date.now() - createdAt) / 1000;
        const remaining = Math.max(0, 30 - elapsed);
        setSecondsRemaining(Math.ceil(remaining));
        setIsUrgent(remaining < 10);
      }
    };

    fetchOrderTime();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        const newVal = prev - 1;
        setIsUrgent(newVal < 10);
        return newVal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orderId]);

  return { secondsRemaining, isUrgent };
}
