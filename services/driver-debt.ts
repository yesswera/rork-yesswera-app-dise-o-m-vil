// DRIVER DEBT SERVICE
// Maneja deudas de repartidores con negocios, liquidaciones y trust levels
// Modelo: repartidor recoge comida sin pagar, acumula deuda, liquida despues

import { supabase } from '@/constants/supabase';
import {
  DriverDebt,
  DebtSettlement,
  DriverTrustLevel,
  DriverDebtSummary,
  TrustTier,
} from '@/constants/types';

// =============================================
// TRUST TIER CONFIGURATION
// =============================================

const TRUST_LIMITS: Record<TrustTier, number> = {
  new: 200,
  trusted: 500,
  verified: 1000,
  blocked: 0,
};

// =============================================
// DEBT QUERIES
// =============================================

/**
 * Obtiene el resumen de deuda de un driver con un negocio especifico
 */
export async function getDriverDebtForBusiness(
  driverId: string,
  businessId: string
): Promise<{
  totalPending: number;
  debtsCount: number;
  oldestDebt: string | null;
  isBlocked: boolean;
  trustTier: TrustTier;
  maxDebtAmount: number;
}> {
  // Get pending debts
  const { data: debts, error } = await supabase
    .from('driver_debts')
    .select('food_amount, created_at')
    .eq('driver_id', driverId)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const totalPending = debts?.reduce((sum, d) => sum + Number(d.food_amount), 0) || 0;
  const oldestDebt = debts && debts.length > 0 ? debts[0].created_at : null;

  // Get trust level
  const trust = await getDriverTrustLevel(driverId, businessId);
  const isBlocked = trust.trustTier === 'blocked' || totalPending >= trust.maxDebtAmount;

  // Check time limit
  if (oldestDebt) {
    const hoursElapsed = (Date.now() - new Date(oldestDebt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > trust.maxDebtHours) {
      // Deuda vencida — considerar bloqueado
      return {
        totalPending,
        debtsCount: debts?.length || 0,
        oldestDebt,
        isBlocked: true,
        trustTier: trust.trustTier,
        maxDebtAmount: trust.maxDebtAmount,
      };
    }
  }

  return {
    totalPending,
    debtsCount: debts?.length || 0,
    oldestDebt,
    isBlocked,
    trustTier: trust.trustTier,
    maxDebtAmount: trust.maxDebtAmount,
  };
}

/**
 * Verifica si un driver puede tomar una orden de un negocio
 * Retorna allowed=false si esta bloqueado por deuda
 */
export async function canDriverTakeOrder(
  driverId: string,
  businessId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  currentDebt: number;
  limit: number;
}> {
  try {
    const debtInfo = await getDriverDebtForBusiness(driverId, businessId);

    if (debtInfo.isBlocked) {
      let reason = `Deuda excede limite ($${debtInfo.totalPending.toFixed(0)}/$${debtInfo.maxDebtAmount.toFixed(0)})`;
      if (debtInfo.trustTier === 'blocked') {
        reason = 'Bloqueado por el negocio';
      }
      return {
        allowed: false,
        reason,
        currentDebt: debtInfo.totalPending,
        limit: debtInfo.maxDebtAmount,
      };
    }

    return {
      allowed: true,
      currentDebt: debtInfo.totalPending,
      limit: debtInfo.maxDebtAmount,
    };
  } catch (error) {
    console.error('canDriverTakeOrder error:', error);
    // En caso de error, permitir (fail open para no bloquear servicio)
    return { allowed: true, currentDebt: 0, limit: TRUST_LIMITS.new };
  }
}

/**
 * Obtiene todas las deudas pendientes de un driver agrupadas por negocio
 */
export async function getDriverAllDebts(
  driverId: string
): Promise<DriverDebtSummary[]> {
  const { data: debts, error } = await supabase
    .from('driver_debts')
    .select(`
      food_amount,
      created_at,
      business_id,
      businesses (business_name)
    `)
    .eq('driver_id', driverId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!debts || debts.length === 0) return [];

  // Agrupar por negocio
  const grouped = new Map<string, {
    businessName: string;
    total: number;
    count: number;
    oldest: string;
  }>();

  for (const debt of debts) {
    const bizName = (debt as any).businesses?.business_name || 'Negocio';
    const existing = grouped.get(debt.business_id);
    if (existing) {
      existing.total += Number(debt.food_amount);
      existing.count++;
      if (debt.created_at < existing.oldest) {
        existing.oldest = debt.created_at;
      }
    } else {
      grouped.set(debt.business_id, {
        businessName: bizName,
        total: Number(debt.food_amount),
        count: 1,
        oldest: debt.created_at,
      });
    }
  }

  // Get trust levels for each business
  const summaries: DriverDebtSummary[] = [];
  for (const [businessId, data] of grouped) {
    const trust = await getDriverTrustLevel(driverId, businessId);
    summaries.push({
      businessId,
      businessName: data.businessName,
      totalPending: data.total,
      debtsCount: data.count,
      oldestDebtAt: data.oldest,
      trustTier: trust.trustTier,
      maxDebtAmount: trust.maxDebtAmount,
      percentUsed: trust.maxDebtAmount > 0 ? (data.total / trust.maxDebtAmount) * 100 : 100,
      isBlocked: trust.trustTier === 'blocked' || data.total >= trust.maxDebtAmount,
    });
  }

  return summaries;
}

/**
 * Obtiene las deudas individuales de un driver con un negocio
 */
export async function getDriverDebtsForBusiness(
  driverId: string,
  businessId: string
): Promise<DriverDebt[]> {
  const { data, error } = await supabase
    .from('driver_debts')
    .select('*')
    .eq('driver_id', driverId)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(mapDebt);
}

// =============================================
// SETTLEMENTS
// =============================================

/**
 * Crea una liquidacion agrupando deudas pending con un negocio
 */
export async function createSettlement(
  driverId: string,
  businessId: string,
  paymentMethod: 'cash' | 'transfer',
  notes?: string
): Promise<DebtSettlement> {
  // Get all pending debts for this business
  const { data: pendingDebts, error: debtsError } = await supabase
    .from('driver_debts')
    .select('id, food_amount')
    .eq('driver_id', driverId)
    .eq('business_id', businessId)
    .eq('status', 'pending');

  if (debtsError) throw debtsError;
  if (!pendingDebts || pendingDebts.length === 0) {
    throw new Error('No hay deudas pendientes con este negocio');
  }

  const totalAmount = pendingDebts.reduce((sum, d) => sum + Number(d.food_amount), 0);

  // Create settlement
  const { data: settlement, error: settlementError } = await supabase
    .from('debt_settlements')
    .insert({
      driver_id: driverId,
      business_id: businessId,
      total_amount: totalAmount,
      orders_count: pendingDebts.length,
      payment_method: paymentMethod,
      notes,
    })
    .select()
    .single();

  if (settlementError) throw settlementError;

  // Link debts to settlement (mark as settled)
  const debtIds = pendingDebts.map(d => d.id);
  const { error: updateError } = await supabase
    .from('driver_debts')
    .update({
      status: 'settled',
      settled_at: new Date().toISOString(),
      settlement_id: settlement.id,
    })
    .in('id', debtIds);

  if (updateError) throw updateError;

  return mapSettlement(settlement);
}

/**
 * Negocio confirma que recibio el pago
 */
export async function confirmSettlement(
  settlementId: string,
  confirmedBy: string = 'business'
): Promise<void> {
  const { data: settlement, error: fetchError } = await supabase
    .from('debt_settlements')
    .select('driver_id, business_id, total_amount, status')
    .eq('id', settlementId)
    .single();

  if (fetchError) throw fetchError;
  if (settlement.status === 'confirmed') return; // Already confirmed

  // Confirm settlement
  const { error } = await supabase
    .from('debt_settlements')
    .update({
      status: 'confirmed',
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', settlementId);

  if (error) throw error;

  // Update trust level
  await updateTrustAfterSettlement(
    settlement.driver_id,
    settlement.business_id,
    Number(settlement.total_amount)
  );
}

/**
 * Obtiene historial de liquidaciones de un driver
 */
export async function getDriverSettlements(
  driverId: string,
  limit: number = 20
): Promise<DebtSettlement[]> {
  const { data, error } = await supabase
    .from('debt_settlements')
    .select('*, businesses (business_name)')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((s: any) => ({
    ...mapSettlement(s),
    businessName: s.businesses?.business_name,
  }));
}

// =============================================
// TRUST LEVELS
// =============================================

/**
 * Obtiene o crea el trust level de un driver con un negocio
 */
export async function getDriverTrustLevel(
  driverId: string,
  businessId: string
): Promise<DriverTrustLevel> {
  const { data, error } = await supabase
    .from('driver_trust_levels')
    .select('*')
    .eq('driver_id', driverId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) throw error;

  if (data) return mapTrustLevel(data);

  // Auto-create with default values
  const { data: newTrust, error: insertError } = await supabase
    .from('driver_trust_levels')
    .insert({
      driver_id: driverId,
      business_id: businessId,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return mapTrustLevel(newTrust);
}

/**
 * Actualiza trust level despues de confirmar una liquidacion
 */
async function updateTrustAfterSettlement(
  driverId: string,
  businessId: string,
  settledAmount: number
): Promise<void> {
  const trust = await getDriverTrustLevel(driverId, businessId);

  const newTotalSettled = trust.totalSettled + settledAmount;
  const newCount = trust.settlementsCount + 1;

  // Evaluar upgrade de tier
  let newTier = trust.trustTier;
  if (trust.trustTier === 'blocked') {
    // No auto-upgrade from blocked
  } else if (newCount >= 20) {
    // Check if rating > 4.5 for verified
    const { data: driver } = await supabase
      .from('drivers')
      .select('rating_average')
      .eq('id', driverId)
      .single();

    if (driver && driver.rating_average >= 4.5) {
      newTier = 'verified';
    } else {
      newTier = 'trusted';
    }
  } else if (newCount >= 5) {
    newTier = 'trusted';
  }

  const newMaxDebt = TRUST_LIMITS[newTier];

  await supabase
    .from('driver_trust_levels')
    .update({
      total_settled: newTotalSettled,
      settlements_count: newCount,
      last_settled_at: new Date().toISOString(),
      trust_tier: newTier,
      max_debt_amount: newMaxDebt,
      updated_at: new Date().toISOString(),
    })
    .eq('driver_id', driverId)
    .eq('business_id', businessId);
}

// =============================================
// MAPPERS
// =============================================

function mapDebt(d: any): DriverDebt {
  return {
    id: d.id,
    driverId: d.driver_id,
    businessId: d.business_id,
    orderId: d.order_id,
    foodAmount: Number(d.food_amount),
    status: d.status,
    createdAt: d.created_at,
    settledAt: d.settled_at,
    settlementId: d.settlement_id,
  };
}

function mapSettlement(s: any): DebtSettlement {
  return {
    id: s.id,
    driverId: s.driver_id,
    businessId: s.business_id,
    totalAmount: Number(s.total_amount),
    ordersCount: s.orders_count,
    paymentMethod: s.payment_method,
    status: s.status,
    confirmedBy: s.confirmed_by,
    confirmedAt: s.confirmed_at,
    notes: s.notes,
    createdAt: s.created_at,
  };
}

function mapTrustLevel(t: any): DriverTrustLevel {
  return {
    id: t.id,
    driverId: t.driver_id,
    businessId: t.business_id,
    maxDebtAmount: Number(t.max_debt_amount),
    maxDebtHours: t.max_debt_hours,
    trustTier: t.trust_tier,
    totalSettled: Number(t.total_settled),
    settlementsCount: t.settlements_count,
    lastSettledAt: t.last_settled_at,
    blockedReason: t.blocked_reason,
  };
}
