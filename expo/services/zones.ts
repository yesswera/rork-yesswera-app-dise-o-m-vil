// ============================================================================
// YESSWERA: SERVICIO DE ZONAS
// Sistema de gestión de zonas geográficas y activación
// ============================================================================

import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface Zone {
  id: string;
  name: string;
  slug: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  status: 'inactive' | 'developing' | 'active' | 'paused';
  currentDrivers: number;
  currentBusinesses: number;
  currentUsers: number;
  minDriversRequired: number;
  minBusinessesRequired: number;
  activationProgress: number;
  activatedAt?: string;
  createdAt: string;
  deliveryBaseFee: number;
  deliveryPerKmFee: number;
  isFeatured: boolean;
}

export interface ZoneBusinessStatus {
  zoneId: string;
  zoneName: string;
  status: 'pending' | 'active' | 'waitlist';
  driversNeeded: number;
  driversRecruited: number;
  activationProgress: number;
}

export interface NearbyZone extends Zone {
  distanceKm: number;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtener todas las zonas
 */
export async function getAllZones(): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('zone_status_view')
    .select('*')
    .order('name');

  if (error || !data) return [];

  return data.map(mapZone);
}

/**
 * Obtener zonas activas
 */
export async function getActiveZones(): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('zone_status_view')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error || !data) return [];

  return data.map(mapZone);
}

/**
 * Obtener zona por slug
 */
export async function getZoneBySlug(slug: string): Promise<Zone | null> {
  const { data, error } = await supabase
    .from('zone_status_view')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return mapZone(data);
}

/**
 * Obtener zona por ID
 */
export async function getZoneById(id: string): Promise<Zone | null> {
  const { data, error } = await supabase
    .from('zone_status_view')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapZone(data);
}

/**
 * Encontrar zona más cercana a una ubicación
 */
export async function findNearestZone(lat: number, lng: number): Promise<NearbyZone | null> {
  const { data, error } = await supabase.rpc('find_nearest_zone', {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    console.error('Error finding nearest zone:', error);

    // Fallback: buscar manualmente
    const zones = await getAllZones();
    if (zones.length === 0) return null;

    let nearestZone: NearbyZone | null = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      const distance = calculateDistance(lat, lng, zone.centerLat, zone.centerLng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = { ...zone, distanceKm: distance };
      }
    }

    return nearestZone;
  }

  if (!data) return null;

  return {
    ...mapZone(data),
    distanceKm: data.distance_km,
  };
}

/**
 * Verificar si una ubicación está dentro de una zona activa
 */
export async function isLocationInActiveZone(lat: number, lng: number): Promise<{
  inZone: boolean;
  zone?: Zone;
  distanceToCenter?: number;
}> {
  const nearestZone = await findNearestZone(lat, lng);

  if (!nearestZone) {
    return { inZone: false };
  }

  const isInside = nearestZone.distanceKm <= nearestZone.radiusKm;
  const isActive = nearestZone.status === 'active';

  return {
    inZone: isInside && isActive,
    zone: nearestZone,
    distanceToCenter: nearestZone.distanceKm,
  };
}

/**
 * Registrar negocio en zona
 */
export async function registerBusinessInZone(businessId: string, zoneId: string): Promise<{
  success: boolean;
  status?: 'active' | 'waitlist';
  error?: string;
}> {
  // Verificar estado de la zona
  const zone = await getZoneById(zoneId);
  if (!zone) {
    return { success: false, error: 'Zona no encontrada' };
  }

  const status = zone.status === 'active' ? 'active' : 'waitlist';

  const { error } = await supabase
    .from('zone_businesses')
    .upsert({
      zone_id: zoneId,
      business_id: businessId,
      status: status,
      joined_at: new Date().toISOString(),
      activated_at: status === 'active' ? new Date().toISOString() : null,
    });

  if (error) {
    console.error('Error registering business in zone:', error);
    return { success: false, error: error.message };
  }

  return { success: true, status };
}

/**
 * Registrar driver en zona
 */
export async function registerDriverInZone(
  driverId: string,
  zoneId: string,
  referredByUserId?: string,
  referredByBusinessId?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('zone_drivers')
    .upsert({
      zone_id: zoneId,
      driver_id: driverId,
      is_active: true,
      joined_at: new Date().toISOString(),
      referred_by_user_id: referredByUserId,
      referred_by_business_id: referredByBusinessId,
    });

  if (error) {
    console.error('Error registering driver in zone:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Obtener estado de zona para un negocio
 */
export async function getBusinessZoneStatus(businessId: string): Promise<ZoneBusinessStatus | null> {
  const { data, error } = await supabase
    .from('zone_businesses')
    .select(`
      zone_id,
      status,
      drivers_recruited,
      zones (
        name,
        current_drivers,
        min_drivers_required,
        status
      )
    `)
    .eq('business_id', businessId)
    .single();

  if (error || !data) return null;

  const zone = (data as any).zones;
  const driversNeeded = Math.max(0, zone.min_drivers_required - zone.current_drivers);
  const progress = zone.status === 'active' ? 100 :
    Math.min(99, (zone.current_drivers / zone.min_drivers_required) * 100);

  return {
    zoneId: data.zone_id,
    zoneName: zone.name,
    status: data.status,
    driversNeeded,
    driversRecruited: data.drivers_recruited || 0,
    activationProgress: progress,
  };
}

/**
 * Incrementar contador de drivers reclutados por negocio
 */
export async function incrementBusinessDriversRecruited(
  businessId: string,
  zoneId: string
): Promise<void> {
  const { data: current } = await supabase
    .from('zone_businesses')
    .select('drivers_recruited')
    .eq('business_id', businessId)
    .eq('zone_id', zoneId)
    .single();

  if (current) {
    await supabase
      .from('zone_businesses')
      .update({ drivers_recruited: (current.drivers_recruited || 0) + 1 })
      .eq('business_id', businessId)
      .eq('zone_id', zoneId);
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Mapear datos de BD a tipo Zone
 */
function mapZone(data: any): Zone {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    centerLat: parseFloat(data.center_lat),
    centerLng: parseFloat(data.center_lng),
    radiusKm: parseFloat(data.radius_km),
    status: data.status,
    currentDrivers: data.current_drivers || 0,
    currentBusinesses: data.current_businesses || 0,
    currentUsers: data.current_users || 0,
    minDriversRequired: data.min_drivers_required || 1,
    minBusinessesRequired: data.min_businesses_required || 1,
    activationProgress: data.activation_progress || 0,
    activatedAt: data.activated_at,
    createdAt: data.created_at,
    deliveryBaseFee: parseFloat(data.delivery_base_fee || '15'),
    deliveryPerKmFee: parseFloat(data.delivery_per_km_fee || '4'),
    isFeatured: data.is_featured || false,
  };
}

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Obtener color según estado de zona
 */
export function getZoneStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#10B981'; // green
    case 'developing': return '#F59E0B'; // yellow
    case 'inactive': return '#6B7280'; // gray
    case 'paused': return '#EF4444'; // red
    default: return '#6B7280';
  }
}

/**
 * Obtener label según estado de zona
 */
export function getZoneStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Activa';
    case 'developing': return 'En desarrollo';
    case 'inactive': return 'Inactiva';
    case 'paused': return 'Pausada';
    default: return status;
  }
}

/**
 * Obtener emoji según estado de zona
 */
export function getZoneStatusEmoji(status: string): string {
  switch (status) {
    case 'active': return '🟢';
    case 'developing': return '🟡';
    case 'inactive': return '⚪';
    case 'paused': return '🔴';
    default: return '⚪';
  }
}
