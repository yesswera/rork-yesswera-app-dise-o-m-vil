// Business Management Service - Sistema de Pausa y Flujo de Presión
// Filosofía Yesswera: Facilitar, no resolver. Sugerir, no forzar.

import { supabase } from '@/constants/supabase';

// Estados de pausa del negocio
export type PauseReason =
  | 'too_many_orders'
  | 'staff_shortage'
  | 'inventory_issue'
  | 'technical_problem'
  | 'break_time'
  | 'manual';

export const PAUSE_REASONS: Record<PauseReason, string> = {
  too_many_orders: 'Muchos pedidos en este momento',
  staff_shortage: 'Personal limitado',
  inventory_issue: 'Problema de inventario',
  technical_problem: 'Problema técnico',
  break_time: 'Hora de descanso',
  manual: 'Pausa manual',
};

export interface BusinessPauseStatus {
  isPaused: boolean;
  pausedAt?: string;
  pauseReason?: PauseReason;
  pauseDurationMinutes?: number;
  resumeAt?: string;
  strikeCount: number;
  lastStrikeAt?: string;
}

// Obtener estado de pausa del negocio
export async function getBusinessPauseStatus(businessId: string): Promise<BusinessPauseStatus> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('is_paused, paused_at, pause_reason, pause_duration_minutes, resume_at, strike_count, last_strike_at')
      .eq('id', businessId)
      .single();

    if (error) throw error;

    return {
      isPaused: data?.is_paused || false,
      pausedAt: data?.paused_at,
      pauseReason: data?.pause_reason,
      pauseDurationMinutes: data?.pause_duration_minutes,
      resumeAt: data?.resume_at,
      strikeCount: data?.strike_count || 0,
      lastStrikeAt: data?.last_strike_at,
    };
  } catch (error) {
    console.error('getBusinessPauseStatus error:', error);
    return { isPaused: false, strikeCount: 0 };
  }
}

// Pausar negocio temporalmente
export async function pauseBusiness(
  businessId: string,
  reason: PauseReason,
  durationMinutes: number = 15
): Promise<{ success: boolean; message: string }> {
  try {
    const resumeAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('businesses')
      .update({
        is_paused: true,
        paused_at: new Date().toISOString(),
        pause_reason: reason,
        pause_duration_minutes: durationMinutes,
        resume_at: resumeAt,
      })
      .eq('id', businessId);

    if (error) throw error;

    return {
      success: true,
      message: `Negocio pausado por ${durationMinutes} minutos. No recibirás nuevas órdenes.`,
    };
  } catch (error) {
    console.error('pauseBusiness error:', error);
    return { success: false, message: 'Error al pausar negocio' };
  }
}

// Reanudar negocio
export async function resumeBusiness(businessId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('businesses')
      .update({
        is_paused: false,
        paused_at: null,
        pause_reason: null,
        pause_duration_minutes: null,
        resume_at: null,
      })
      .eq('id', businessId);

    if (error) throw error;

    return {
      success: true,
      message: 'Negocio activo. Ya puedes recibir órdenes.',
    };
  } catch (error) {
    console.error('resumeBusiness error:', error);
    return { success: false, message: 'Error al reanudar negocio' };
  }
}

// Registrar strike (cuando negocio rechaza por "muchas órdenes" sin pausarse)
export async function registerBusinessStrike(
  businessId: string,
  reason: string
): Promise<{
  success: boolean;
  strikeCount: number;
  action: 'warning' | 'force_pause' | 'extended_pause' | 'notify_admin';
  message: string;
}> {
  try {
    // Obtener strikes actuales
    const { data: business } = await supabase
      .from('businesses')
      .select('strike_count, last_strike_at')
      .eq('id', businessId)
      .single();

    const currentStrikes = business?.strike_count || 0;
    const lastStrike = business?.last_strike_at ? new Date(business.last_strike_at) : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Si el último strike fue hace más de 1 hora, resetear contador
    let newStrikeCount = currentStrikes;
    if (!lastStrike || lastStrike < oneHourAgo) {
      newStrikeCount = 1;
    } else {
      newStrikeCount = currentStrikes + 1;
    }

    // Actualizar strikes
    await supabase
      .from('businesses')
      .update({
        strike_count: newStrikeCount,
        last_strike_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    // Registrar en historial
    await supabase.from('business_strikes').insert({
      business_id: businessId,
      reason,
      strike_number: newStrikeCount,
    });

    // Determinar acción según número de strikes
    let action: 'warning' | 'force_pause' | 'extended_pause' | 'notify_admin';
    let message: string;

    if (newStrikeCount === 1) {
      action = 'warning';
      message = 'Te sugerimos pausar nuevas órdenes para ponerte al día.';
    } else if (newStrikeCount === 2) {
      action = 'force_pause';
      message = 'Para proteger la experiencia de tus clientes, pausaremos nuevas órdenes por 30 minutos.';
      await pauseBusiness(businessId, 'too_many_orders', 30);
    } else if (newStrikeCount === 3) {
      action = 'extended_pause';
      message = 'Pausa extendida de 2 horas. El equipo de Yesswera revisará la situación.';
      await pauseBusiness(businessId, 'too_many_orders', 120);
    } else {
      action = 'notify_admin';
      message = 'Situación escalada. Un administrador de Yesswera te contactará.';
      await pauseBusiness(businessId, 'too_many_orders', 240);
      // Aquí se notificaría al admin
    }

    return { success: true, strikeCount: newStrikeCount, action, message };
  } catch (error) {
    console.error('registerBusinessStrike error:', error);
    return {
      success: false,
      strikeCount: 0,
      action: 'warning',
      message: 'Error al procesar'
    };
  }
}

// Informar demora al cliente (alternativa a cancelar)
export async function notifyOrderDelay(
  orderId: string,
  additionalMinutes: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Actualizar orden con tiempo extra
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        has_delay: true,
        delay_minutes: additionalMinutes,
        delay_reason: reason,
        delay_notified_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('client_id')
      .single();

    if (error) throw error;

    // Crear notificación para el cliente
    await supabase.from('notifications').insert({
      user_id: order.client_id,
      type: 'order_delayed',
      title: 'Tu pedido tardará un poco más',
      body: `El negocio informa que tu pedido tardará aproximadamente ${additionalMinutes} minutos adicionales.${reason ? ` Motivo: ${reason}` : ''}`,
      data: { orderId, additionalMinutes },
    });

    return {
      success: true,
      message: `Cliente notificado. Tiempo extra: ${additionalMinutes} min.`,
    };
  } catch (error) {
    console.error('notifyOrderDelay error:', error);
    return { success: false, message: 'Error al notificar demora' };
  }
}

// Verificar si negocio puede recibir órdenes
export async function canBusinessReceiveOrders(businessId: string): Promise<{
  canReceive: boolean;
  reason?: string;
  resumeAt?: string;
}> {
  try {
    const status = await getBusinessPauseStatus(businessId);

    if (status.isPaused) {
      // Verificar si ya pasó el tiempo de pausa
      if (status.resumeAt && new Date(status.resumeAt) <= new Date()) {
        // Auto-reanudar
        await resumeBusiness(businessId);
        return { canReceive: true };
      }

      return {
        canReceive: false,
        reason: status.pauseReason ? PAUSE_REASONS[status.pauseReason] : 'Negocio pausado',
        resumeAt: status.resumeAt,
      };
    }

    return { canReceive: true };
  } catch (error) {
    console.error('canBusinessReceiveOrders error:', error);
    return { canReceive: true }; // Por defecto permitir
  }
}

// Obtener opciones para negocio cuando tiene muchas órdenes
export function getOverloadOptions(hasAcceptedOrder: boolean): {
  id: string;
  label: string;
  description: string;
  recommended: boolean;
}[] {
  const options = [];

  if (hasAcceptedOrder) {
    options.push({
      id: 'notify_delay',
      label: 'Informar demora al cliente',
      description: 'El cliente decide si espera. Mantienes la venta.',
      recommended: true,
    });
    options.push({
      id: 'open_chat',
      label: 'Abrir chat con el cliente',
      description: 'Explica la situación directamente.',
      recommended: false,
    });
  }

  options.push({
    id: 'pause_15',
    label: 'Pausar nuevas órdenes 15 min',
    description: 'No recibirás nuevas órdenes. Las actuales continúan.',
    recommended: !hasAcceptedOrder,
  });

  options.push({
    id: 'pause_30',
    label: 'Pausar nuevas órdenes 30 min',
    description: 'Más tiempo para ponerte al día.',
    recommended: false,
  });

  return options;
}

// Compensación de driver cuando orden se cancela
export interface DriverCompensationResult {
  amount: number;
  reason: string;
  paidBy: 'business' | 'platform' | 'none';
}

export function calculateDriverCompensationForCancellation(
  driverHasProduct: boolean,
  minutesElapsedSinceAssignment: number,
  deliveryFee: number
): DriverCompensationResult {
  // Si el driver ya tiene el producto - compensación completa
  if (driverHasProduct) {
    return {
      amount: deliveryFee,
      reason: 'Driver ya recogió el producto',
      paidBy: 'business',
    };
  }

  // Si el driver estaba en camino al negocio
  if (minutesElapsedSinceAssignment > 5) {
    // Compensación base por tiempo perdido
    const baseCompensation = 15; // $15 MXN mínimo
    const timeCompensation = Math.min(minutesElapsedSinceAssignment * 1, 20); // $1/min, max $20
    return {
      amount: baseCompensation + timeCompensation,
      reason: `Compensación por ${minutesElapsedSinceAssignment} minutos de traslado`,
      paidBy: 'business',
    };
  }

  // Menos de 5 minutos - sin compensación
  return {
    amount: 0,
    reason: 'Cancelación temprana, sin compensación',
    paidBy: 'none',
  };
}
