import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnection = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      // Use Supabase health endpoint (lightweight)
      await fetch('https://jdvundwewwobkznxwkvj.supabase.co/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Check every 10 seconds
    intervalRef.current = setInterval(checkConnection, 10000);

    // Also check when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkConnection();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, []);

  return { isConnected, retry: checkConnection };
}
