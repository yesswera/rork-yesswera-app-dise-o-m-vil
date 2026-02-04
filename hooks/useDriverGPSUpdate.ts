import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/auth';
import { updateDriverLocation } from '@/services/gps';

export function useDriverGPSUpdate(orderId: string | null, isActive: boolean) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!orderId || !isActive || !user) {
      return;
    }

    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Permiso de ubicación denegado');
          console.error('Location permission denied');
          return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 50,
          },
          async (newLocation) => {
            setLocation(newLocation);
            console.log('[GPS] Updating location for order:', orderId);

            await updateDriverLocation(user.id, orderId, newLocation);
          }
        );
      } catch (err) {
        console.error('[GPS] Error starting tracking:', err);
        setError('Error al iniciar seguimiento GPS');
      }
    };

    startTracking();

    return () => {
      if (subscription) {
        subscription.remove();
        console.log('[GPS] Stopped tracking for order:', orderId);
      }
    };
  }, [orderId, isActive, user]);

  return { location, error };
}
