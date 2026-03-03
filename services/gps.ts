import * as Location from 'expo-location';
import { ref, set, onValue, off, get } from 'firebase/database';
import { realtimeDb } from '@/constants/firebase';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface GPSResponse {
  location: DriverLocation;
  eta?: number;
}

// Update driver location in Firebase Realtime Database
export async function updateDriverLocation(
  driverId: string,
  orderId: string,
  location: Location.LocationObject
): Promise<void> {
  try {
    const locationData: DriverLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
      speed: location.coords.speed || undefined,
      heading: location.coords.heading || undefined,
      accuracy: location.coords.accuracy || undefined,
    };

    // Update driver's current location
    const driverRef = ref(realtimeDb, `drivers_location/${driverId}`);
    await set(driverRef, locationData);

    // Also update order tracking if orderId provided
    if (orderId) {
      const orderRef = ref(realtimeDb, `orders_tracking/${orderId}`);
      await set(orderRef, {
        ...locationData,
        driverId,
      });
    }
  } catch (error: any) {
    // No lanzar error para evitar crash - solo logear
    // El error común es PERMISSION_DENIED si las reglas de Firebase no están configuradas
    if (error?.message?.includes('PERMISSION_DENIED')) {
      console.warn('[GPS] Firebase permission denied - verifica las reglas de Firebase Realtime Database');
    } else {
      console.error('[GPS] Error updating driver location:', error);
    }
    // No throw - permitir que la app continúe
  }
}

// Get driver location once (not real-time)
export async function getDriverLocation(orderId: string): Promise<GPSResponse | null> {
  try {
    const orderRef = ref(realtimeDb, `orders_tracking/${orderId}`);
    const snapshot = await get(orderRef);
    const data = snapshot.val();
    if (data) {
      return {
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          speed: data.speed,
          heading: data.heading,
        },
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting driver location:', error);
    return null;
  }
}

// Subscribe to real-time driver location updates
export function subscribeToDriverLocation(
  orderId: string,
  callback: (location: DriverLocation | null) => void
): () => void {
  const orderRef = ref(realtimeDb, `orders_tracking/${orderId}`);

  const unsubscribe = onValue(orderRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        speed: data.speed,
        heading: data.heading,
        accuracy: data.accuracy,
      });
    } else {
      callback(null);
    }
  });

  // Return unsubscribe function
  return () => {
    off(orderRef);
  };
}

// Subscribe to driver's location (for business/admin)
export function subscribeToDriverById(
  driverId: string,
  callback: (location: DriverLocation | null) => void
): () => void {
  const driverRef = ref(realtimeDb, `drivers_location/${driverId}`);

  onValue(driverRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        speed: data.speed,
        heading: data.heading,
        accuracy: data.accuracy,
      });
    } else {
      callback(null);
    }
  });

  // Return unsubscribe function
  return () => {
    off(driverRef);
  };
}

// Request location permissions
// requestBackground: only set to true for drivers who need GPS tracking
export async function requestLocationPermissions(requestBackground: boolean = false): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return false;
    }

    // Only request background permission for drivers (causes extra dialog on Android 11+)
    if (requestBackground) {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied (optional)');
      }
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

// Get current location once (foreground only - for clients and general use)
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const hasPermission = await requestLocationPermissions(false);
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

// Start watching location (for drivers - requests background permission)
export async function startLocationUpdates(
  driverId: string,
  orderId: string,
  intervalMs: number = 5000
): Promise<Location.LocationSubscription | null> {
  try {
    const hasPermission = await requestLocationPermissions(true);
    if (!hasPermission) return null;

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 10, // Update if moved 10 meters
      },
      (location) => {
        updateDriverLocation(driverId, orderId, location);
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error starting location updates:', error);
    return null;
  }
}

// Stop watching location
export function stopLocationUpdates(subscription: Location.LocationSubscription): void {
  subscription.remove();
}

// Clear driver location from Firebase (when going offline)
export async function clearDriverLocation(driverId: string): Promise<void> {
  try {
    const driverRef = ref(realtimeDb, `drivers_location/${driverId}`);
    await set(driverRef, null);
  } catch (error) {
    console.error('Error clearing driver location:', error);
  }
}
