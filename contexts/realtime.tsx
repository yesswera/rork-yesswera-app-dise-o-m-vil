import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './auth';
import { supabase } from '@/constants/supabase';
import {
  useClientOrderSubscription,
  useBusinessOrderSubscription,
  useDriverOrderSubscription,
} from '@/hooks/useRealtimeOrders';

interface RealtimeContextType {
  isConnected: boolean;
  lastUpdate: Date | null;
  refreshOrders: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastUpdate: null,
  refreshOrders: () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  // Load business/driver ID based on user type
  useEffect(() => {
    if (!user?.id) {
      setBusinessId(null);
      setDriverId(null);
      return;
    }

    const loadUserProfile = async () => {
      if (user.userType === 'business') {
        const { data } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();
        setBusinessId(data?.id || null);
      } else if (user.userType === 'driver') {
        const { data } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .single();
        setDriverId(data?.id || null);
      }
    };

    loadUserProfile();
  }, [user?.id, user?.userType]);

  // Handle order updates
  const handleOrderUpdate = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  // Subscribe based on user type
  // Client subscription
  useClientOrderSubscription(
    user?.userType === 'client' ? handleOrderUpdate : undefined
  );

  // Business subscription
  useBusinessOrderSubscription(
    user?.userType === 'business' ? businessId : null,
    handleOrderUpdate
  );

  // Driver subscription
  useDriverOrderSubscription(
    user?.userType === 'driver' ? driverId : null,
    handleOrderUpdate,
    handleOrderUpdate
  );

  // Monitor connection status
  useEffect(() => {
    if (!user?.id) {
      setIsConnected(false);
      return;
    }

    // Simple connection check - if we have a user, assume connected
    setIsConnected(true);

    return () => {
      setIsConnected(false);
    };
  }, [user?.id]);

  const refreshOrders = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastUpdate,
        refreshOrders,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
