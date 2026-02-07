// ============================================================================
// YESSWERA: SERVICIO DE REFERIDOS
// Sistema completo de códigos de referido, tracking y recompensas
// ============================================================================

import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  timesShared: number;
  timesScanned: number;
  successfulReferrals: number;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCodeUsed: string;
  source: 'qr_scan' | 'link_share' | 'manual_entry';
  status: 'registered' | 'first_order' | 'active';
  referredName?: string;
  referredAt: string;
  firstOrderAt?: string;
  creditEarned?: number;
}

export interface UserCredit {
  id: string;
  userId: string;
  creditType: 'referral_bonus' | 'welcome' | 'compensation' | 'promo';
  amount: number;
  usedAmount: number;
  status: 'active' | 'used' | 'expired';
  expiresAt?: string;
  description?: string;
  createdAt: string;
}

export interface CreditBalance {
  availableBalance: number;
  totalUsed: number;
  totalExpired: number;
  expiringSoonCount: number;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCreditsEarned: number;
  pendingCredits: number;
  raffleEntries: number;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtener el código de referido del usuario actual
 */
export async function getMyReferralCode(): Promise<ReferralCode | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    code: data.code,
    isActive: data.is_active,
    timesShared: data.times_shared || 0,
    timesScanned: data.times_scanned || 0,
    successfulReferrals: data.successful_referrals || 0,
    createdAt: data.created_at,
  };
}

/**
 * Validar un código de referido (verificar que existe y está activo)
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  referrerName?: string;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select(`
      id,
      is_active,
      user_id,
      users!inner(name)
    `)
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) {
    return { valid: false, error: 'Código no encontrado' };
  }

  if (!data.is_active) {
    return { valid: false, error: 'Este código ya no está activo' };
  }

  return {
    valid: true,
    referrerName: (data as any).users?.name || 'Un usuario de Yesswera',
  };
}

/**
 * Procesar un referido (llamar después del registro con código)
 */
export async function processReferral(
  referralCode: string,
  source: 'qr_scan' | 'link_share' | 'manual_entry' = 'link_share'
): Promise<{
  success: boolean;
  error?: string;
  referralId?: string;
  raffleEntryAdded?: boolean;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' };
  }

  // Llamar a la función de base de datos
  const { data, error } = await supabase.rpc('process_referral', {
    p_referrer_code: referralCode.toUpperCase(),
    p_referred_user_id: user.id,
    p_source: source,
  });

  if (error) {
    console.error('Error processing referral:', error);
    return { success: false, error: error.message };
  }

  return {
    success: data?.success || false,
    error: data?.error,
    referralId: data?.referral_id,
    raffleEntryAdded: data?.raffle_entry_added,
  };
}

/**
 * Obtener mis referidos
 */
export async function getMyReferrals(): Promise<Referral[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('my_referrals_view')
    .select('*')
    .eq('referrer_id', user.id)
    .order('referred_at', { ascending: false });

  if (error || !data) return [];

  return data.map(r => ({
    id: r.referred_id,
    referrerId: r.referrer_id,
    referredId: r.referred_id,
    referralCodeUsed: '',
    source: 'link_share',
    status: r.status,
    referredName: r.referred_name,
    referredAt: r.referred_at,
    firstOrderAt: r.first_order_at,
    creditEarned: r.credit_earned,
  }));
}

/**
 * Obtener estadísticas de referidos del usuario
 */
export async function getMyReferralStats(): Promise<ReferralStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      totalCreditsEarned: 0,
      pendingCredits: 0,
      raffleEntries: 0,
    };
  }

  // Obtener referidos
  const { data: referrals } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', user.id);

  const totalReferrals = referrals?.length || 0;
  const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;

  // Obtener créditos
  const { data: credits } = await supabase
    .from('user_credits')
    .select('amount, used_amount, status')
    .eq('user_id', user.id)
    .eq('credit_type', 'referral_bonus');

  const totalCreditsEarned = credits?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
  const pendingCredits = credits?.reduce((sum, c) =>
    c.status === 'active' ? sum + (c.amount - c.used_amount) : sum, 0) || 0;

  // Obtener entradas de sorteo
  const { data: entries } = await supabase
    .from('raffle_entries')
    .select('entry_count')
    .eq('user_id', user.id);

  const raffleEntries = entries?.reduce((sum, e) => sum + (e.entry_count || 0), 0) || 0;

  return {
    totalReferrals,
    activeReferrals,
    totalCreditsEarned,
    pendingCredits,
    raffleEntries,
  };
}

/**
 * Registrar que el código fue compartido
 */
export async function trackCodeShared(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('referral_codes')
    .update({ times_shared: supabase.rpc('increment_counter', { row_id: user.id }) })
    .eq('user_id', user.id);

  // Alternativa más simple si la función RPC no existe:
  const { data: current } = await supabase
    .from('referral_codes')
    .select('times_shared')
    .eq('user_id', user.id)
    .single();

  if (current) {
    await supabase
      .from('referral_codes')
      .update({ times_shared: (current.times_shared || 0) + 1 })
      .eq('user_id', user.id);
  }
}

// ============================================================================
// CRÉDITOS
// ============================================================================

/**
 * Obtener balance de créditos del usuario
 */
export async function getMyCreditBalance(): Promise<CreditBalance> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { availableBalance: 0, totalUsed: 0, totalExpired: 0, expiringSoonCount: 0 };
  }

  const { data, error } = await supabase
    .from('user_credit_balance')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return { availableBalance: 0, totalUsed: 0, totalExpired: 0, expiringSoonCount: 0 };
  }

  return {
    availableBalance: data.available_balance || 0,
    totalUsed: data.total_used || 0,
    totalExpired: data.total_expired || 0,
    expiringSoonCount: data.expiring_soon_count || 0,
  };
}

/**
 * Obtener lista de créditos del usuario
 */
export async function getMyCredits(): Promise<UserCredit[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(c => ({
    id: c.id,
    userId: c.user_id,
    creditType: c.credit_type,
    amount: c.amount,
    usedAmount: c.used_amount || 0,
    status: c.status,
    expiresAt: c.expires_at,
    description: c.description,
    createdAt: c.created_at,
  }));
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Generar URL de referido para compartir
 */
export function generateReferralLink(code: string): string {
  // URL base de la app (cuando esté en producción)
  const baseUrl = 'https://yesswera.com/r';
  return `${baseUrl}/${code}`;
}

/**
 * Generar datos para QR de referido
 */
export function generateReferralQRData(code: string): string {
  // El QR contendrá un deep link que la app puede manejar
  return `yesswera://referral/${code}`;
}

/**
 * Mensaje predeterminado para compartir
 */
export function getShareMessage(code: string, userName?: string): string {
  const link = generateReferralLink(code);
  return `¡Únete a Yesswera! 🛵\n\n` +
    `Pide comida, compras y envíos a domicilio en Tomatlán.\n\n` +
    `Usa mi código: ${code}\n` +
    `O entra aquí: ${link}\n\n` +
    `¡Ambos ganamos créditos y participamos en sorteos! 🎉`;
}

/**
 * Formatear crédito para mostrar
 */
export function formatCredit(amount: number): string {
  return `$${amount.toFixed(2)} MXN`;
}

/**
 * Obtener color según estado de crédito
 */
export function getCreditStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#10B981'; // green
    case 'used': return '#6B7280'; // gray
    case 'expired': return '#EF4444'; // red
    default: return '#6B7280';
  }
}

/**
 * Obtener label según estado de crédito
 */
export function getCreditStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Disponible';
    case 'used': return 'Usado';
    case 'expired': return 'Expirado';
    default: return status;
  }
}
