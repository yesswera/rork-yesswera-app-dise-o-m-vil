// useDriverMonitoring Hook - Fase 2B
// Monitor driver GPS and detect issues

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { updateDriverLocation, clearDriverLocation } from '@/services/gps';
import {
  DriverStatus,
  MonitoringAlert,
  subscribeToDriverStatus,
  checkDriverForIssues,
  setDriverOnlineStatus,
} from '@/services/driver-monitoring';
import {
  calculateDriverETA,
} from '@/services/driver-assignment';
import { Toast } from '@/utils/toast';

interface UseDriverMonitoringOptions {
  driverId: string;
  orderId?: string;
  enabled?: boolean;
  updateIntervalMs?: number;
  onAlert?: (alert: MonitoringAlert) => void;
}

interface UseDriverMonitoringResult {
  isTracking: boolean;
  status: DriverStatus | null;
  lastError: string | null;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
}

export function useDriverMonitoring({
  driverId,
  orderId,
  enabled = true,
  updateIntervalMs = 5000,
  onAlert,
}: UseDriverMonitoringOptions): UseDriverMonitoringResult {
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState<DriverStatus | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const statusUnsubscribe = useRef<(() => void) | null>(null);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to status updates
  useEffect(() => {
    if (!enabled || !driverId) return;

    statusUnsubscribe.current = subscribeToDriverStatus(
      driverId,
      (newStatus) => {
        setStatus(newStatus);
      },
      (alert) => {
        // Show toast for alerts
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Toast.show(alert.message, alert.severity === 'critical' ? 'error' : 'warning');
        onAlert?.(alert);
      }
    );

    return () => {
      statusUnsubscribe.current?.();
    };
  }, [driverId, enabled, onAlert]);

  // Periodic issue check
  useEffect(() => {
    if (!enabled || !driverId || !isTracking) return;

    checkInterval.current = setInterval(async () => {
      const alert = await checkDriverForIssues(driverId);
      if (alert) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Toast.warning(alert.message);
        onAlert?.(alert);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [driverId, enabled, isTracking, onAlert]);

  const startTracking = useCallback(async (): Promise<boolean> => {
    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        setLastError('Permiso de ubicacion denegado');
        return false;
      }

      // Try background permission (optional but recommended)
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch {
        console.log('Background location not available');
      }

      // Start watching position
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: updateIntervalMs,
          distanceInterval: 10, // Update if moved 10 meters
        },
        (location) => {
          updateDriverLocation(driverId, orderId || '', location);
        }
      );

      setIsTracking(true);
      setLastError(null);

      // Set driver as online
      await setDriverOnlineStatus(driverId, true);

      return true;
    } catch (error: any) {
      console.error('startTracking error:', error);
      setLastError(error.message || 'Error al iniciar GPS');
      return false;
    }
  }, [driverId, orderId, updateIntervalMs]);

  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  }, []);

  const goOnline = useCallback(async () => {
    try {
      await setDriverOnlineStatus(driverId, true);
      const success = await startTracking();
      if (success) {
        Toast.success('Ahora estas EN LINEA');
      }
    } catch (error: any) {
      setLastError(error.message);
      Toast.error('Error al conectar');
    }
  }, [driverId, startTracking]);

  const goOffline = useCallback(async () => {
    try {
      stopTracking();
      await clearDriverLocation(driverId);
      await setDriverOnlineStatus(driverId, false);
      Toast.info('Ahora estas DESCONECTADO');
    } catch (error: any) {
      setLastError(error.message);
    }
  }, [driverId, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (statusUnsubscribe.current) {
        statusUnsubscribe.current();
      }
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, []);

  return {
    isTracking,
    status,
    lastError,
    startTracking,
    stopTracking,
    goOnline,
    goOffline,
  };
}

// Hook for tracking a specific order
export function useOrderTracking(orderId: string | null) {
  const [driverLocation, setDriverLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    // Subscribe to order tracking in Firebase
    const { subscribeToDriverLocation } = require('@/services/gps');

    const unsubscribe = subscribeToDriverLocation(orderId, (location: any) => {
      if (location) {
        setDriverLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: null,
          accuracy: location.accuracy || null,
          altitudeAccuracy: null,
          heading: location.heading || null,
          speed: location.speed || null,
        });
      } else {
        setDriverLocation(null);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  return {
    driverLocation,
    eta,
    isLoading,
    hasDriver: driverLocation !== null,
  };
}

// Hook to check if driver should receive "Are you OK?" prompt
export function useDriverHealthCheck(
  driverId: string,
  hasActiveOrder: boolean,
  enabled: boolean = true
): { showHealthCheck: boolean; dismissHealthCheck: () => void } {
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !driverId || !hasActiveOrder) {
      setShowHealthCheck(false);
      return;
    }

    const checkHealth = async () => {
      const now = Date.now();
      // Don't check more than once per minute
      if (now - lastCheckRef.current < 60000) return;
      lastCheckRef.current = now;

      const alert = await checkDriverForIssues(driverId);
      if (alert && alert.type === 'gps_stalled') {
        setShowHealthCheck(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };

    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [driverId, hasActiveOrder, enabled]);

  const dismissHealthCheck = useCallback(() => {
    setShowHealthCheck(false);
    // Confirm driver is OK
    require('@/services/driver-monitoring').confirmDriverOk(driverId);
  }, [driverId]);

  return { showHealthCheck, dismissHealthCheck };
}
