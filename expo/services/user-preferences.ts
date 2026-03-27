// ============================================================================
// YESSWERA: PREFERENCIAS DE USUARIO
// Sistema de personalización y analytics de uso
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export type ServiceType = 'food' | 'shopping' | 'delivery';

export interface NotificationPreferences {
  orderUpdates: boolean;      // Actualizaciones de pedidos
  driverArrival: boolean;     // Llegada del repartidor
  promotions: boolean;        // Promociones y ofertas
  newBusinesses: boolean;     // Nuevos negocios en tu zona
  systemAlerts: boolean;      // Alertas del sistema
}

export interface SoundPreferences {
  enabled: boolean;           // Sonidos globales
  orderSounds: boolean;       // Sonidos de órdenes
  arrivalSounds: boolean;     // Sonidos de llegada
  chatSounds: boolean;        // Sonidos de chat
  feedbackSounds: boolean;    // Sonidos de UI
}

export interface DisplayPreferences {
  hiddenServices: ServiceType[];  // Servicios ocultos en home
  serviceOrder: ServiceType[];    // Orden de servicios
  compactMode: boolean;           // Modo compacto
  showRecentOrders: boolean;      // Mostrar órdenes recientes en home
}

export interface UserPreferences {
  userId: string;
  display: DisplayPreferences;
  notifications: NotificationPreferences;
  sounds: SoundPreferences;
  lastUpdated: string;
}

export interface UsageStats {
  ordersPerService: Record<ServiceType, number>;
  totalOrders: number;
  lastOrderDate: string | null;
  favoriteHours: number[];        // Horas más frecuentes (0-23)
  avgOrderValue: number;
  sessionsCount: number;
  lastSessionDate: string;
}

// ============================================================================
// VALORES POR DEFECTO
// ============================================================================

const DEFAULT_DISPLAY: DisplayPreferences = {
  hiddenServices: [],
  serviceOrder: ['food', 'shopping', 'delivery'],
  compactMode: false,
  showRecentOrders: true,
};

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  orderUpdates: true,
  driverArrival: true,
  promotions: true,
  newBusinesses: true,
  systemAlerts: true,
};

const DEFAULT_SOUNDS: SoundPreferences = {
  enabled: true,
  orderSounds: true,
  arrivalSounds: true,
  chatSounds: true,
  feedbackSounds: true,
};

const DEFAULT_USAGE: UsageStats = {
  ordersPerService: { food: 0, shopping: 0, delivery: 0 },
  totalOrders: 0,
  lastOrderDate: null,
  favoriteHours: [],
  avgOrderValue: 0,
  sessionsCount: 0,
  lastSessionDate: new Date().toISOString(),
};

// ============================================================================
// STORAGE KEYS
// ============================================================================

const PREFERENCES_KEY = '@yesswera_user_preferences';
const USAGE_KEY = '@yesswera_usage_stats';

// ============================================================================
// PREFERENCIAS
// ============================================================================

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const stored = await AsyncStorage.getItem(`${PREFERENCES_KEY}_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        userId,
        display: { ...DEFAULT_DISPLAY, ...parsed.display },
        notifications: { ...DEFAULT_NOTIFICATIONS, ...parsed.notifications },
        sounds: { ...DEFAULT_SOUNDS, ...parsed.sounds },
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('[UserPreferences] Error loading:', error);
  }

  return {
    userId,
    display: DEFAULT_DISPLAY,
    notifications: DEFAULT_NOTIFICATIONS,
    sounds: DEFAULT_SOUNDS,
    lastUpdated: new Date().toISOString(),
  };
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'userId' | 'lastUpdated'>>
): Promise<void> {
  try {
    const current = await getUserPreferences(userId);
    const newPreferences: UserPreferences = {
      ...current,
      display: updates.display ? { ...current.display, ...updates.display } : current.display,
      notifications: updates.notifications
        ? { ...current.notifications, ...updates.notifications }
        : current.notifications,
      sounds: updates.sounds ? { ...current.sounds, ...updates.sounds } : current.sounds,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      `${PREFERENCES_KEY}_${userId}`,
      JSON.stringify(newPreferences)
    );

    // Registrar evento de analytics
    await trackPreferenceChange(userId, updates);

    console.log('[UserPreferences] Updated for user:', userId);
  } catch (error) {
    console.error('[UserPreferences] Error saving:', error);
    throw error;
  }
}

// ============================================================================
// HELPERS DE DISPLAY
// ============================================================================

export async function toggleServiceVisibility(
  userId: string,
  service: ServiceType
): Promise<DisplayPreferences> {
  const prefs = await getUserPreferences(userId);
  const hidden = prefs.display.hiddenServices;

  const newHidden = hidden.includes(service)
    ? hidden.filter(s => s !== service)
    : [...hidden, service];

  // No permitir ocultar todos los servicios
  if (newHidden.length >= 3) {
    throw new Error('Debes tener al menos un servicio visible');
  }

  await updateUserPreferences(userId, {
    display: { ...prefs.display, hiddenServices: newHidden },
  });

  return { ...prefs.display, hiddenServices: newHidden };
}

export async function reorderServices(
  userId: string,
  newOrder: ServiceType[]
): Promise<void> {
  const prefs = await getUserPreferences(userId);
  await updateUserPreferences(userId, {
    display: { ...prefs.display, serviceOrder: newOrder },
  });
}

export async function moveServiceUp(userId: string, service: ServiceType): Promise<ServiceType[]> {
  const prefs = await getUserPreferences(userId);
  const order = [...prefs.display.serviceOrder];
  const index = order.indexOf(service);

  if (index > 0) {
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    await reorderServices(userId, order);
  }

  return order;
}

export async function moveServiceDown(userId: string, service: ServiceType): Promise<ServiceType[]> {
  const prefs = await getUserPreferences(userId);
  const order = [...prefs.display.serviceOrder];
  const index = order.indexOf(service);

  if (index < order.length - 1) {
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    await reorderServices(userId, order);
  }

  return order;
}

// ============================================================================
// ANALYTICS DE USO
// ============================================================================

export async function getUserUsageStats(userId: string): Promise<UsageStats> {
  try {
    const stored = await AsyncStorage.getItem(`${USAGE_KEY}_${userId}`);
    if (stored) {
      return { ...DEFAULT_USAGE, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[UsageStats] Error loading:', error);
  }
  return DEFAULT_USAGE;
}

export async function trackServiceUsage(
  userId: string,
  service: ServiceType,
  orderValue: number
): Promise<void> {
  try {
    const stats = await getUserUsageStats(userId);
    const hour = new Date().getHours();

    // Actualizar contadores
    stats.ordersPerService[service] = (stats.ordersPerService[service] || 0) + 1;
    stats.totalOrders += 1;
    stats.lastOrderDate = new Date().toISOString();

    // Actualizar horas favoritas
    if (!stats.favoriteHours.includes(hour)) {
      stats.favoriteHours.push(hour);
      // Mantener solo las 5 horas más recientes
      if (stats.favoriteHours.length > 5) {
        stats.favoriteHours.shift();
      }
    }

    // Calcular promedio de valor de orden
    stats.avgOrderValue = (
      (stats.avgOrderValue * (stats.totalOrders - 1) + orderValue) / stats.totalOrders
    );

    await AsyncStorage.setItem(`${USAGE_KEY}_${userId}`, JSON.stringify(stats));

    // También guardar en Supabase para analytics agregados (sin datos personales)
    await saveAggregateAnalytics(service, hour, orderValue);

  } catch (error) {
    console.error('[UsageStats] Error tracking:', error);
  }
}

export async function trackSession(userId: string): Promise<void> {
  try {
    const stats = await getUserUsageStats(userId);
    stats.sessionsCount += 1;
    stats.lastSessionDate = new Date().toISOString();
    await AsyncStorage.setItem(`${USAGE_KEY}_${userId}`, JSON.stringify(stats));
  } catch (error) {
    console.error('[UsageStats] Error tracking session:', error);
  }
}

// ============================================================================
// ANALYTICS AGREGADOS (para admin dashboard)
// ============================================================================

async function saveAggregateAnalytics(
  service: ServiceType,
  hour: number,
  orderValue: number
): Promise<void> {
  try {
    // Guardar estadísticas anónimas agregadas
    const today = new Date().toISOString().split('T')[0];

    await supabase.from('app_analytics').upsert({
      date: today,
      service_type: service,
      hour,
      orders_count: 1,
      total_value: orderValue,
    }, {
      onConflict: 'date,service_type,hour',
    });
  } catch (error) {
    // No bloquear si falla analytics
    console.warn('[Analytics] Could not save aggregate:', error);
  }
}

async function trackPreferenceChange(
  userId: string,
  changes: Partial<Omit<UserPreferences, 'userId' | 'lastUpdated'>>
): Promise<void> {
  try {
    const changeTypes: string[] = [];
    if (changes.display) changeTypes.push('display');
    if (changes.notifications) changeTypes.push('notifications');
    if (changes.sounds) changeTypes.push('sounds');

    await supabase.from('preference_events').insert({
      user_id: userId,
      change_types: changeTypes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // No bloquear si falla
    console.warn('[Analytics] Could not track preference change:', error);
  }
}

// ============================================================================
// INSIGHTS DE USO (para recomendaciones)
// ============================================================================

export async function getUserInsights(userId: string): Promise<{
  preferredService: ServiceType | null;
  peakHours: number[];
  isFrequentUser: boolean;
  suggestedOrder: ServiceType[];
}> {
  const stats = await getUserUsageStats(userId);
  const prefs = await getUserPreferences(userId);

  // Determinar servicio preferido
  let preferredService: ServiceType | null = null;
  let maxOrders = 0;
  for (const [service, count] of Object.entries(stats.ordersPerService)) {
    if (count > maxOrders) {
      maxOrders = count;
      preferredService = service as ServiceType;
    }
  }

  // Determinar si es usuario frecuente (más de 5 órdenes)
  const isFrequentUser = stats.totalOrders >= 5;

  // Sugerir orden basado en uso
  const suggestedOrder = [...prefs.display.serviceOrder].sort((a, b) => {
    return (stats.ordersPerService[b] || 0) - (stats.ordersPerService[a] || 0);
  });

  return {
    preferredService,
    peakHours: stats.favoriteHours,
    isFrequentUser,
    suggestedOrder,
  };
}

// ============================================================================
// RESET
// ============================================================================

export async function resetUserPreferences(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${PREFERENCES_KEY}_${userId}`);
    console.log('[UserPreferences] Reset for user:', userId);
  } catch (error) {
    console.error('[UserPreferences] Error resetting:', error);
  }
}

export async function resetUsageStats(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${USAGE_KEY}_${userId}`);
    console.log('[UsageStats] Reset for user:', userId);
  } catch (error) {
    console.error('[UsageStats] Error resetting:', error);
  }
}
