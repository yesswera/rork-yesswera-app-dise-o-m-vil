// Driver Monitoring Service - Fase 2B
// Detecta problemas de conexion, GPS quieto, y emergencias

import { ref, onValue, off, set, get } from 'firebase/database';
import { realtimeDb } from '@/constants/firebase';
import { supabase } from '@/constants/supabase';
import { DriverLocation } from './gps';

// Velocidades promedio por tipo de vehiculo (km/h)
const VELOCIDADES: Record<string, number> = {
  moto: 25,
  bicicleta: 12,
  auto: 20,
  pie: 5,
};

export interface DriverStatus {
  isOnline: boolean;
  lastLocation?: DriverLocation;
  lastUpdateTimestamp?: number;
  secondsSinceUpdate: number;
  isStalled: boolean;
  hasActiveOrder: boolean;
  currentOrderId?: string;
  vehicleType?: string;
}

export interface MonitoringAlert {
  type: 'connection_lost' | 'gps_stalled' | 'driver_delayed' | 'driver_not_responding';
  driverId: string;
  orderId?: string;
  message: string;
  severity: 'warning' | 'critical';
  timestamp: string;
  data?: Record<string, any>;
}

export type PanicReason =
  | 'accident'
  | 'robbery_attempt'
  | 'client_harassment'
  | 'medical_emergency'
  | 'vehicle_breakdown'
  | 'feeling_unsafe';

export const PANIC_REASONS: Record<PanicReason, string> = {
  accident: 'Accidente',
  robbery_attempt: 'Intento de robo',
  client_harassment: 'Acoso del cliente',
  medical_emergency: 'Emergencia medica',
  vehicle_breakdown: 'Falla mecanica',
  feeling_unsafe: 'Me siento en peligro',
};

// Calculate expected travel time
export function calculateExpectedTime(
  distanceKm: number,
  vehicleType: string = 'moto'
): number {
  const speed = VELOCIDADES[vehicleType] || 20;
  const baseTime = (distanceKm / speed) * 60; // minutes
  const buffer = baseTime * 0.3; // 30% buffer
  return Math.round(baseTime + buffer);
}

// Check if driver GPS is stalled (no movement)
export function isGpsStalled(
  lastLocation: DriverLocation | undefined,
  currentLocation: DriverLocation,
  maxStalledMinutes: number = 3
): boolean {
  if (!lastLocation) return false;

  // Check time difference
  const lastTime = new Date(lastLocation.timestamp).getTime();
  const currentTime = new Date(currentLocation.timestamp).getTime();
  const minutesElapsed = (currentTime - lastTime) / 60000;

  if (minutesElapsed < maxStalledMinutes) return false;

  // Check if position changed significantly (more than 10 meters)
  const latDiff = Math.abs(currentLocation.latitude - lastLocation.latitude);
  const lngDiff = Math.abs(currentLocation.longitude - lastLocation.longitude);
  const moved = latDiff > 0.0001 || lngDiff > 0.0001; // ~10m

  return !moved;
}

// Get driver's current status
export async function getDriverStatus(driverId: string): Promise<DriverStatus> {
  try {
    // Get location from Firebase
    const locationRef = ref(realtimeDb, `drivers_location/${driverId}`);
    const snapshot = await get(locationRef);
    const locationData = snapshot.val();

    // Get active order from Supabase
    const { data: activeOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'driver_verified', 'in_transit', 'arrived'])
      .single();

    // Get driver vehicle type
    const { data: driver } = await supabase
      .from('drivers')
      .select('vehicle_type')
      .eq('id', driverId)
      .single();

    const now = Date.now();
    const lastUpdateTimestamp = locationData
      ? new Date(locationData.timestamp).getTime()
      : 0;
    const secondsSinceUpdate = Math.round((now - lastUpdateTimestamp) / 1000);

    return {
      isOnline: !!locationData && secondsSinceUpdate < 300, // 5 min threshold
      lastLocation: locationData
        ? {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            speed: locationData.speed,
            heading: locationData.heading,
          }
        : undefined,
      lastUpdateTimestamp,
      secondsSinceUpdate,
      isStalled: secondsSinceUpdate > 180, // 3 min without movement
      hasActiveOrder: !!activeOrder,
      currentOrderId: activeOrder?.id,
      vehicleType: driver?.vehicle_type,
    };
  } catch (error) {
    console.error('getDriverStatus error:', error);
    return {
      isOnline: false,
      secondsSinceUpdate: 9999,
      isStalled: true,
      hasActiveOrder: false,
    };
  }
}

// Subscribe to driver location changes
export function subscribeToDriverStatus(
  driverId: string,
  onStatusChange: (status: DriverStatus) => void,
  onAlert?: (alert: MonitoringAlert) => void
): () => void {
  let lastLocation: DriverLocation | undefined;
  let stallWarningShown = false;

  const locationRef = ref(realtimeDb, `drivers_location/${driverId}`);

  const unsubscribe = onValue(locationRef, async (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      onStatusChange({
        isOnline: false,
        secondsSinceUpdate: 9999,
        isStalled: true,
        hasActiveOrder: false,
      });
      return;
    }

    const currentLocation: DriverLocation = {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
      speed: data.speed,
      heading: data.heading,
    };

    // Check for GPS stall
    const stalled = isGpsStalled(lastLocation, currentLocation, 3);

    if (stalled && !stallWarningShown && onAlert) {
      stallWarningShown = true;
      onAlert({
        type: 'gps_stalled',
        driverId,
        message: 'El repartidor no se ha movido en los ultimos 3 minutos',
        severity: 'warning',
        timestamp: new Date().toISOString(),
      });
    } else if (!stalled) {
      stallWarningShown = false;
    }

    lastLocation = currentLocation;

    const now = Date.now();
    const lastUpdateTimestamp = new Date(data.timestamp).getTime();
    const secondsSinceUpdate = Math.round((now - lastUpdateTimestamp) / 1000);

    // Get active order
    const { data: activeOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'driver_verified', 'in_transit', 'arrived'])
      .single();

    onStatusChange({
      isOnline: true,
      lastLocation: currentLocation,
      lastUpdateTimestamp,
      secondsSinceUpdate,
      isStalled: stalled,
      hasActiveOrder: !!activeOrder,
      currentOrderId: activeOrder?.id,
    });
  });

  return () => {
    off(locationRef);
  };
}

// Register panic event
export async function registerPanicEvent(
  driverId: string,
  orderId: string | null,
  reason: PanicReason,
  description?: string,
  location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; incidentId?: string; message: string }> {
  try {
    // Create incident record
    const { data, error } = await supabase
      .from('driver_incidents')
      .insert({
        driver_id: driverId,
        order_id: orderId,
        incident_type: 'panic',
        description: `${PANIC_REASONS[reason]}${description ? ': ' + description : ''}`,
        location: location
          ? `POINT(${location.longitude} ${location.latitude})`
          : null,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      // Table might not exist yet, log but continue
      console.warn('Could not create incident record:', error.message);
    }

    // If there's an active order, mark it for transfer
    if (orderId) {
      await supabase
        .from('orders')
        .update({
          needs_driver_transfer: true,
          transfer_reason: PANIC_REASONS[reason],
        })
        .eq('id', orderId);
    }

    // Update driver status
    const driverRef = ref(realtimeDb, `drivers_status/${driverId}`);
    await set(driverRef, {
      status: 'emergency',
      panicReason: reason,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      incidentId: data?.id,
      message: 'Alerta de emergencia registrada. Estamos contactando ayuda.',
    };
  } catch (error) {
    console.error('registerPanicEvent error:', error);
    return {
      success: false,
      message: 'Error al registrar emergencia. Intenta de nuevo.',
    };
  }
}

// Request order transfer to another driver
export async function requestOrderTransfer(
  orderId: string,
  fromDriverId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get order info first (need client_id for notification)
    const { data: order } = await supabase
      .from('orders')
      .select('client_id, business_id')
      .eq('id', orderId)
      .single();

    // Update order to make it available again
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'ready', // Back to ready so other drivers can take it
        driver_id: null,
        driver_at_business: false,
        needs_driver_transfer: true,
        transfer_reason: reason,
        previous_driver_id: fromDriverId,
      })
      .eq('id', orderId);

    if (error) throw error;

    // Log the transfer request
    await supabase.from('order_transfers').insert({
      order_id: orderId,
      from_driver_id: fromDriverId,
      to_driver_id: null, // Will be filled when new driver accepts
      reason,
    });

    // Notificar al cliente sobre el cambio de repartidor
    if (order?.client_id) {
      await supabase.from('notifications').insert({
        user_id: order.client_id,
        type: 'driver_changed',
        title: 'Cambio de repartidor',
        body: 'Tu repartidor tuvo un inconveniente. Estamos asignando uno nuevo lo antes posible.',
        data: { orderId, reason },
      });
    }

    return {
      success: true,
      message: 'Orden liberada. Otro repartidor podra tomarla.',
    };
  } catch (error) {
    console.error('requestOrderTransfer error:', error);
    return {
      success: false,
      message: 'Error al transferir orden. Contacta soporte.',
    };
  }
}

// Check driver for issues (called periodically by the app)
export async function checkDriverForIssues(
  driverId: string
): Promise<MonitoringAlert | null> {
  const status = await getDriverStatus(driverId);

  // Check connection lost
  if (status.hasActiveOrder && status.secondsSinceUpdate > 300) {
    return {
      type: 'connection_lost',
      driverId,
      orderId: status.currentOrderId,
      message: 'Repartidor sin conexion por mas de 5 minutos',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      data: { secondsOffline: status.secondsSinceUpdate },
    };
  }

  // Check GPS stalled
  if (status.hasActiveOrder && status.isStalled) {
    return {
      type: 'gps_stalled',
      driverId,
      orderId: status.currentOrderId,
      message: 'Repartidor detenido por mas de 3 minutos',
      severity: 'warning',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

// Mark driver as responding (after they confirm they're OK)
export async function confirmDriverOk(driverId: string): Promise<void> {
  const statusRef = ref(realtimeDb, `drivers_status/${driverId}`);
  await set(statusRef, {
    status: 'active',
    confirmedAt: new Date().toISOString(),
  });
}

// Set driver availability (online/offline)
export async function setDriverOnlineStatus(
  driverId: string,
  isOnline: boolean
): Promise<void> {
  try {
    // Update Supabase
    await supabase
      .from('drivers')
      .update({ is_online: isOnline })
      .eq('id', driverId);

    // If going offline, clear Firebase location
    if (!isOnline) {
      const locationRef = ref(realtimeDb, `drivers_location/${driverId}`);
      await set(locationRef, null);
    }
  } catch (error) {
    console.error('setDriverOnlineStatus error:', error);
    throw error;
  }
}
