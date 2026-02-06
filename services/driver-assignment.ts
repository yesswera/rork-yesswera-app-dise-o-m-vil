// Driver Assignment Service - Fase 2B
// Sistema de asignacion automatica con radios ascendentes

import { supabase } from '@/constants/supabase';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '@/constants/firebase';
import { DriverLocation } from './gps';

export interface DriverCandidate {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  rating: number;
  vehicleType: string;
  distanceMeters: number;
  activeOrders: number;
  location?: DriverLocation;
}

export interface AssignmentConfig {
  radiusMeters: number;
  minRating: number;
  timeoutMs: number;
  maxActiveOrders: number;
}

// Configuration for each radius step
export const ASSIGNMENT_STEPS: AssignmentConfig[] = [
  { radiusMeters: 500, minRating: 4.5, timeoutMs: 60000, maxActiveOrders: 2 },
  { radiusMeters: 1000, minRating: 4.0, timeoutMs: 60000, maxActiveOrders: 2 },
  { radiusMeters: 2000, minRating: 0, timeoutMs: 60000, maxActiveOrders: 3 },
  { radiusMeters: 5000, minRating: 0, timeoutMs: 60000, maxActiveOrders: 3 }, // fallback
];

// Get online drivers from Firebase
async function getOnlineDriversFromFirebase(): Promise<Map<string, DriverLocation>> {
  try {
    const driversRef = ref(realtimeDb, 'drivers_location');
    const snapshot = await get(driversRef);
    const data = snapshot.val();

    const drivers = new Map<string, DriverLocation>();
    if (data) {
      for (const [driverId, location] of Object.entries(data)) {
        if (location && typeof location === 'object') {
          const loc = location as any;
          // Only include drivers with recent location (last 5 minutes)
          const timestamp = new Date(loc.timestamp).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (timestamp > fiveMinutesAgo) {
            drivers.set(driverId, {
              latitude: loc.latitude,
              longitude: loc.longitude,
              timestamp: loc.timestamp,
              speed: loc.speed,
              heading: loc.heading,
            });
          }
        }
      }
    }
    return drivers;
  } catch (error) {
    console.error('Error getting online drivers from Firebase:', error);
    return new Map();
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Find drivers within radius, sorted by rating and distance
export async function findDriversInRadius(
  businessLat: number,
  businessLng: number,
  config: AssignmentConfig
): Promise<DriverCandidate[]> {
  try {
    // 1. Get online drivers from Firebase
    const onlineDrivers = await getOnlineDriversFromFirebase();
    if (onlineDrivers.size === 0) {
      console.log('No online drivers found in Firebase');
      return [];
    }

    // 2. Get driver details from Supabase
    const driverIds = Array.from(onlineDrivers.keys());
    const { data: driversData, error } = await supabase
      .from('drivers')
      .select(`
        id,
        user_id,
        vehicle_type,
        rating_average,
        is_active,
        users:user_id (full_name, phone)
      `)
      .in('id', driverIds)
      .eq('is_active', true)
      .gte('rating_average', config.minRating);

    if (error) {
      console.error('Error fetching drivers from Supabase:', error);
      return [];
    }

    // 3. Get active orders count for each driver
    const { data: activeOrdersData, error: ordersError } = await supabase
      .from('orders')
      .select('driver_id')
      .in('driver_id', driverIds)
      .in('status', ['assigned', 'driver_verified', 'in_transit']);

    const activeOrdersCount = new Map<string, number>();
    if (!ordersError && activeOrdersData) {
      for (const order of activeOrdersData) {
        const count = activeOrdersCount.get(order.driver_id) || 0;
        activeOrdersCount.set(order.driver_id, count + 1);
      }
    }

    // 4. Filter and sort drivers
    const candidates: DriverCandidate[] = [];

    for (const driver of driversData || []) {
      const location = onlineDrivers.get(driver.id);
      if (!location) continue;

      const distance = calculateDistance(
        businessLat,
        businessLng,
        location.latitude,
        location.longitude
      );

      // Check if within radius
      if (distance > config.radiusMeters) continue;

      // Check active orders limit
      const activeOrders = activeOrdersCount.get(driver.id) || 0;
      if (activeOrders >= config.maxActiveOrders) continue;

      const userData = driver.users as any;
      candidates.push({
        id: driver.id,
        userId: driver.user_id,
        name: userData?.full_name || 'Repartidor',
        phone: userData?.phone,
        rating: driver.rating_average || 0,
        vehicleType: driver.vehicle_type || 'moto',
        distanceMeters: Math.round(distance),
        activeOrders,
        location,
      });
    }

    // Sort by rating (desc) then distance (asc)
    candidates.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.distanceMeters - b.distanceMeters;
    });

    return candidates.slice(0, 5); // Return top 5
  } catch (error) {
    console.error('findDriversInRadius error:', error);
    return [];
  }
}

// Get business location for an order
export async function getBusinessLocation(
  orderId: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        business_id,
        businesses:business_id (location)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) return null;

    const business = order.businesses as any;
    if (!business?.location) return null;

    // Parse PostGIS point: data.location.coordinates[0]=lng, [1]=lat
    if (business.location.coordinates) {
      return {
        lng: business.location.coordinates[0],
        lat: business.location.coordinates[1],
      };
    }

    return null;
  } catch (error) {
    console.error('getBusinessLocation error:', error);
    return null;
  }
}

// Automatic driver assignment with escalating radius
export async function autoAssignDriver(
  orderId: string,
  businessLat: number,
  businessLng: number
): Promise<{
  success: boolean;
  driver?: DriverCandidate;
  step?: number;
  message: string;
}> {
  for (let step = 0; step < ASSIGNMENT_STEPS.length; step++) {
    const config = ASSIGNMENT_STEPS[step];
    console.log(`Assignment step ${step + 1}: Searching within ${config.radiusMeters}m, min rating ${config.minRating}`);

    const candidates = await findDriversInRadius(businessLat, businessLng, config);

    if (candidates.length === 0) {
      console.log(`No drivers found in ${config.radiusMeters}m radius`);
      continue;
    }

    // For now, we notify the closest/best driver
    // In production, this would send push notifications and wait
    const bestDriver = candidates[0];

    // Update order with assignment attempt
    await supabase
      .from('orders')
      .update({
        assignment_attempts: step + 1,
        last_assignment_radius: config.radiusMeters,
      })
      .eq('id', orderId);

    return {
      success: true,
      driver: bestDriver,
      step: step + 1,
      message: `Driver encontrado a ${bestDriver.distanceMeters}m (rating: ${bestDriver.rating.toFixed(1)})`,
    };
  }

  return {
    success: false,
    message: 'No hay repartidores disponibles en este momento',
  };
}

// Get drivers to notify for an order (for push notification targeting)
export async function getDriversToNotify(
  orderId: string,
  radiusStep: number = 0
): Promise<DriverCandidate[]> {
  const location = await getBusinessLocation(orderId);
  if (!location) return [];

  const config = ASSIGNMENT_STEPS[Math.min(radiusStep, ASSIGNMENT_STEPS.length - 1)];
  return findDriversInRadius(location.lat, location.lng, config);
}

// Mark order as ready and start driver assignment
export async function markOrderReadyAndAssign(orderId: string): Promise<{
  success: boolean;
  message: string;
  driversNotified?: number;
}> {
  try {
    // Get business location
    const location = await getBusinessLocation(orderId);
    if (!location) {
      return { success: false, message: 'No se pudo obtener ubicacion del negocio' };
    }

    // Update order status to ready
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'ready',
        ready_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Find available drivers (first radius)
    const drivers = await findDriversInRadius(location.lat, location.lng, ASSIGNMENT_STEPS[0]);

    if (drivers.length === 0) {
      // No drivers in 500m, try 1km
      const driversWider = await findDriversInRadius(location.lat, location.lng, ASSIGNMENT_STEPS[1]);
      return {
        success: true,
        message: driversWider.length > 0
          ? `Orden lista. ${driversWider.length} repartidores notificados en 1km`
          : 'Orden lista. Buscando repartidores disponibles...',
        driversNotified: driversWider.length,
      };
    }

    // TODO: Send push notifications to these drivers
    // This would use the notification service with push tokens

    return {
      success: true,
      message: `Orden lista. ${drivers.length} repartidores notificados`,
      driversNotified: drivers.length,
    };
  } catch (error) {
    console.error('markOrderReadyAndAssign error:', error);
    return { success: false, message: 'Error al marcar orden como lista' };
  }
}

// Calculate ETA for a driver to reach a location
export function calculateDriverETA(
  driverLocation: DriverLocation,
  targetLat: number,
  targetLng: number,
  vehicleType: string = 'moto'
): { distanceKm: number; etaMinutes: number } {
  const SPEEDS: Record<string, number> = {
    moto: 25,
    bicicleta: 12,
    auto: 20,
    pie: 5,
  };

  const distance = calculateDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    targetLat,
    targetLng
  );

  const distanceKm = distance / 1000;
  const speed = SPEEDS[vehicleType] || 20;
  const etaMinutes = (distanceKm / speed) * 60;

  // Add buffer based on time of day
  const hour = new Date().getHours();
  let buffer = 1.2; // 20% default
  if ((hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21)) {
    buffer = 1.4; // Rush hour
  }

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMinutes: Math.round(etaMinutes * buffer),
  };
}
