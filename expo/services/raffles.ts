// ============================================================================
// YESSWERA: SERVICIO DE SORTEOS
// Sistema de sorteos mensuales con premios de negocios
// ============================================================================

import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface Raffle {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  drawDate: string;
  status: 'upcoming' | 'active' | 'drawing' | 'completed' | 'cancelled';
  totalEntries: number;
  totalParticipants: number;
  prizes: RafflePrize[];
  zoneId?: string;
  entriesPerRegistration: number;
  entriesPerReferral: number;
}

export interface RafflePrize {
  id: string;
  raffleId: string;
  businessId: string;
  businessName?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  estimatedValue?: number;
  status: 'pending' | 'confirmed' | 'awarded' | 'claimed' | 'expired';
  winnerId?: string;
  winnerName?: string;
  wonAt?: string;
  claimCode?: string;
  claimDeadline?: string;
  prizeOrder: number;
}

export interface MyRaffleEntry {
  raffleId: string;
  raffleTitle: string;
  totalEntries: number;
  registrationEntries: number;
  referralEntries: number;
  drawDate: string;
  status: string;
}

export interface RaffleWinner {
  prizeName: string;
  businessName: string;
  winnerName: string;
  wonAt: string;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtener sorteo activo
 */
export async function getActiveRaffle(): Promise<Raffle | null> {
  const { data, error } = await supabase
    .from('raffles')
    .select(`
      *,
      raffle_prizes (
        id,
        business_id,
        title,
        description,
        image_url,
        estimated_value,
        status,
        winner_id,
        won_at,
        prize_order,
        businesses (name)
      )
    `)
    .eq('status', 'active')
    .order('end_date', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  return mapRaffle(data);
}

/**
 * Obtener próximo sorteo
 */
export async function getUpcomingRaffle(): Promise<Raffle | null> {
  const { data, error } = await supabase
    .from('raffles')
    .select(`
      *,
      raffle_prizes (
        id,
        business_id,
        title,
        description,
        image_url,
        estimated_value,
        status,
        prize_order,
        businesses (name)
      )
    `)
    .eq('status', 'upcoming')
    .order('start_date', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  return mapRaffle(data);
}

/**
 * Obtener sorteo por ID
 */
export async function getRaffleById(id: string): Promise<Raffle | null> {
  const { data, error } = await supabase
    .from('raffles')
    .select(`
      *,
      raffle_prizes (
        id,
        business_id,
        title,
        description,
        image_url,
        estimated_value,
        status,
        winner_id,
        won_at,
        claim_code,
        claim_deadline,
        prize_order,
        businesses (name),
        users:winner_id (name)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapRaffle(data);
}

/**
 * Obtener mis entradas en el sorteo activo
 */
export async function getMyRaffleEntries(): Promise<MyRaffleEntry | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Obtener sorteo activo
  const activeRaffle = await getActiveRaffle();
  if (!activeRaffle) return null;

  // Obtener mis entradas
  const { data, error } = await supabase
    .from('user_raffle_summary')
    .select('*')
    .eq('raffle_id', activeRaffle.id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // Usuario no tiene entradas aún
    return {
      raffleId: activeRaffle.id,
      raffleTitle: activeRaffle.title,
      totalEntries: 0,
      registrationEntries: 0,
      referralEntries: 0,
      drawDate: activeRaffle.drawDate,
      status: activeRaffle.status,
    };
  }

  return {
    raffleId: activeRaffle.id,
    raffleTitle: activeRaffle.title,
    totalEntries: data.total_entries || 0,
    registrationEntries: data.registration_entries || 0,
    referralEntries: data.referral_entries || 0,
    drawDate: activeRaffle.drawDate,
    status: activeRaffle.status,
  };
}

/**
 * Obtener todos mis premios ganados
 */
export async function getMyWonPrizes(): Promise<RafflePrize[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('raffle_prizes')
    .select(`
      *,
      businesses (name),
      raffles (title)
    `)
    .eq('winner_id', user.id)
    .order('won_at', { ascending: false });

  if (error || !data) return [];

  return data.map(p => ({
    id: p.id,
    raffleId: p.raffle_id,
    businessId: p.business_id,
    businessName: (p as any).businesses?.name,
    title: p.title,
    description: p.description,
    imageUrl: p.image_url,
    estimatedValue: p.estimated_value,
    status: p.status,
    winnerId: p.winner_id,
    wonAt: p.won_at,
    claimCode: p.claim_code,
    claimDeadline: p.claim_deadline,
    prizeOrder: p.prize_order,
  }));
}

/**
 * Obtener ganadores del último sorteo
 */
export async function getRecentWinners(): Promise<RaffleWinner[]> {
  const { data, error } = await supabase
    .from('raffle_prizes')
    .select(`
      title,
      won_at,
      businesses (name),
      users:winner_id (name)
    `)
    .eq('status', 'awarded')
    .not('winner_id', 'is', null)
    .order('won_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map(w => ({
    prizeName: w.title,
    businessName: (w as any).businesses?.name || 'Negocio',
    winnerName: (w as any).users?.name || 'Usuario',
    wonAt: w.won_at,
  }));
}

/**
 * Reclamar premio (negocio marca como entregado)
 */
export async function claimPrize(prizeId: string, claimCode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: prize, error: fetchError } = await supabase
    .from('raffle_prizes')
    .select('claim_code, claim_deadline, status')
    .eq('id', prizeId)
    .single();

  if (fetchError || !prize) {
    return { success: false, error: 'Premio no encontrado' };
  }

  if (prize.status !== 'awarded') {
    return { success: false, error: 'Este premio ya fue reclamado o no está disponible' };
  }

  if (prize.claim_code !== claimCode.toUpperCase()) {
    return { success: false, error: 'Código de reclamo incorrecto' };
  }

  if (prize.claim_deadline && new Date(prize.claim_deadline) < new Date()) {
    return { success: false, error: 'El tiempo para reclamar este premio ha expirado' };
  }

  const { error } = await supabase
    .from('raffle_prizes')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    })
    .eq('id', prizeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// PARA NEGOCIOS
// ============================================================================

/**
 * Agregar premio al sorteo (negocio)
 */
export async function addPrizeToRaffle(
  raffleId: string,
  businessId: string,
  prize: {
    title: string;
    description?: string;
    imageUrl?: string;
    estimatedValue?: number;
  }
): Promise<{ success: boolean; prizeId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('raffle_prizes')
    .insert({
      raffle_id: raffleId,
      business_id: businessId,
      title: prize.title,
      description: prize.description,
      image_url: prize.imageUrl,
      estimated_value: prize.estimatedValue,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, prizeId: data.id };
}

/**
 * Confirmar premio (admin)
 */
export async function confirmPrize(prizeId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('raffle_prizes')
    .update({ status: 'confirmed' })
    .eq('id', prizeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Obtener premios pendientes de confirmar (admin)
 */
export async function getPendingPrizes(): Promise<RafflePrize[]> {
  const { data, error } = await supabase
    .from('raffle_prizes')
    .select(`
      *,
      businesses (name),
      raffles (title)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(mapPrize);
}

// ============================================================================
// PARA ADMIN
// ============================================================================

/**
 * Crear nuevo sorteo
 */
export async function createRaffle(raffle: {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  drawDate: Date;
  zoneId?: string;
}): Promise<{ success: boolean; raffleId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('raffles')
    .insert({
      title: raffle.title,
      description: raffle.description,
      start_date: raffle.startDate.toISOString(),
      end_date: raffle.endDate.toISOString(),
      draw_date: raffle.drawDate.toISOString(),
      zone_id: raffle.zoneId,
      status: new Date() >= raffle.startDate ? 'active' : 'upcoming',
      created_by: user?.id,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, raffleId: data.id };
}

/**
 * Realizar sorteo (seleccionar ganadores)
 */
export async function performDraw(raffleId: string): Promise<{
  success: boolean;
  winners?: Array<{ prizeName: string; winnerName: string }>;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('perform_raffle_draw', {
    p_raffle_id: raffleId,
    p_drawn_by: user?.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data?.success || false,
    winners: data?.winners,
    error: data?.error,
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

function mapRaffle(data: any): Raffle {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    startDate: data.start_date,
    endDate: data.end_date,
    drawDate: data.draw_date,
    status: data.status,
    totalEntries: data.total_entries || 0,
    totalParticipants: data.total_participants || 0,
    prizes: (data.raffle_prizes || []).map(mapPrize),
    zoneId: data.zone_id,
    entriesPerRegistration: data.entries_per_registration || 1,
    entriesPerReferral: data.entries_per_referral || 1,
  };
}

function mapPrize(p: any): RafflePrize {
  return {
    id: p.id,
    raffleId: p.raffle_id,
    businessId: p.business_id,
    businessName: p.businesses?.name,
    title: p.title,
    description: p.description,
    imageUrl: p.image_url,
    estimatedValue: p.estimated_value,
    status: p.status,
    winnerId: p.winner_id,
    winnerName: p.users?.name,
    wonAt: p.won_at,
    claimCode: p.claim_code,
    claimDeadline: p.claim_deadline,
    prizeOrder: p.prize_order || 1,
  };
}

/**
 * Formatear fecha de sorteo
 */
export function formatDrawDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calcular tiempo restante para el sorteo
 */
export function getTimeUntilDraw(drawDate: string): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
} {
  const now = new Date();
  const draw = new Date(drawDate);
  const diff = draw.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isExpired: false };
}

/**
 * Obtener color según estado del sorteo
 */
export function getRaffleStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#10B981';
    case 'upcoming': return '#3B82F6';
    case 'drawing': return '#F59E0B';
    case 'completed': return '#6B7280';
    case 'cancelled': return '#EF4444';
    default: return '#6B7280';
  }
}
