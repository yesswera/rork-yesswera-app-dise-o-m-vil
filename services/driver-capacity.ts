// ============================================================================
// YESSWERA: SERVICIO DE CAPACIDAD DE REPARTIDORES
// Gestión inteligente de oferta/demanda de drivers
// ============================================================================

import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TIPOS
// ============================================================================

export interface DriverCapacityStats {
  totalDrivers: number;
  activeDrivers: number;
  onlineDrivers: number;
  pausedDrivers: number;
  waitlistCount: number;
  ordersToday: number;
  ordersThisWeek: number;
  currentRatio: number;  // órdenes por driver
  settings: DriverCapacitySettings;
  lastUpdated: string;
}

export interface DriverCapacitySettings {
  maxDrivers: number;
  targetOrdersPerDriver: number;
  registrationOpen: boolean;
  autoManage: boolean;  // Si la IA controla automáticamente
}

export interface DriverWaitlistEntry {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  requestedAt: string;
  status: 'waiting' | 'approved' | 'rejected';
}

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

const DEFAULT_SETTINGS: DriverCapacitySettings = {
  maxDrivers: 10,
  targetOrdersPerDriver: 10,
  registrationOpen: true,
  autoManage: true,
};

const SETTINGS_KEY = '@yesswera_driver_capacity_settings';

// ============================================================================
// OBTENER ESTADÍSTICAS
// ============================================================================

export async function getDriverCapacityStats(): Promise<DriverCapacityStats> {
  try {
    // Obtener configuración guardada
    const settings = await getDriverCapacitySettings();

    // Contar drivers totales
    const { count: totalDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true });

    // Contar drivers activos (no pausados)
    const { count: activeDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Contar drivers en línea ahora
    const { count: onlineDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);

    // Contar órdenes de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: ordersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Contar órdenes de la semana
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: ordersThisWeek } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // Calcular ratio
    const driverCount = activeDrivers || 1;
    const dailyOrders = ordersToday || 0;
    const currentRatio = dailyOrders / driverCount;

    // Contar lista de espera (simulado - en producción sería otra tabla)
    const waitlistCount = 0; // TODO: Implementar tabla de waitlist

    return {
      totalDrivers: totalDrivers || 0,
      activeDrivers: activeDrivers || 0,
      onlineDrivers: onlineDrivers || 0,
      pausedDrivers: (totalDrivers || 0) - (activeDrivers || 0),
      waitlistCount,
      ordersToday: ordersToday || 0,
      ordersThisWeek: ordersThisWeek || 0,
      currentRatio,
      settings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting driver capacity stats:', error);

    // Retornar valores por defecto en caso de error
    return {
      totalDrivers: 0,
      activeDrivers: 0,
      onlineDrivers: 0,
      pausedDrivers: 0,
      waitlistCount: 0,
      ordersToday: 0,
      ordersThisWeek: 0,
      currentRatio: 0,
      settings: DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
    };
  }
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export async function getDriverCapacitySettings(): Promise<DriverCapacitySettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading driver capacity settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateDriverCapacitySettings(
  updates: Partial<DriverCapacitySettings>
): Promise<void> {
  try {
    const current = await getDriverCapacitySettings();
    const newSettings = { ...current, ...updates };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  } catch (error) {
    console.error('Error saving driver capacity settings:', error);
    throw error;
  }
}

// ============================================================================
// ANÁLISIS AUTOMÁTICO (para la IA)
// ============================================================================

export interface CapacityAnalysis {
  status: 'oversupply' | 'caution' | 'optimal' | 'demand' | 'critical';
  ratio: number;
  recommendation: string;
  shouldOpenRegistration: boolean;
  shouldCloseRegistration: boolean;
  suggestedMaxDrivers: number;
  confidence: number; // 0-1
}

export async function analyzeDriverCapacity(): Promise<CapacityAnalysis> {
  const stats = await getDriverCapacityStats();
  const ratio = stats.currentRatio;

  let status: CapacityAnalysis['status'];
  let recommendation: string;
  let shouldOpenRegistration = false;
  let shouldCloseRegistration = false;
  let suggestedMaxDrivers = stats.settings.maxDrivers;
  let confidence = 0.8;

  // Análisis basado en ratio
  if (ratio < 6) {
    status = 'oversupply';
    recommendation = 'Cerrar registro inmediatamente. Los repartidores no tienen suficientes órdenes.';
    shouldCloseRegistration = true;
    suggestedMaxDrivers = Math.max(stats.activeDrivers - 2, 3);
  } else if (ratio < 8) {
    status = 'caution';
    recommendation = 'Pausar registro. Los repartidores están recibiendo pocas órdenes.';
    shouldCloseRegistration = true;
  } else if (ratio <= 12) {
    status = 'optimal';
    recommendation = 'Mantener configuración actual. El equilibrio es óptimo.';
    confidence = 0.95;
  } else if (ratio <= 15) {
    status = 'demand';
    recommendation = 'Considerar abrir registro. Hay demanda para más repartidores.';
    shouldOpenRegistration = true;
    suggestedMaxDrivers = stats.activeDrivers + 3;
  } else {
    status = 'critical';
    recommendation = 'Abrir registro urgentemente. Los clientes están esperando mucho.';
    shouldOpenRegistration = true;
    suggestedMaxDrivers = stats.activeDrivers + 5;
  }

  // Ajustar confianza basado en datos disponibles
  if (stats.ordersToday < 10) {
    confidence *= 0.7; // Menos confianza con pocos datos
    recommendation += ' (Datos limitados - pocas órdenes hoy)';
  }

  return {
    status,
    ratio,
    recommendation,
    shouldOpenRegistration,
    shouldCloseRegistration,
    suggestedMaxDrivers,
    confidence,
  };
}

// ============================================================================
// ACCIONES AUTOMÁTICAS (para la IA)
// ============================================================================

export async function autoAdjustDriverCapacity(): Promise<{
  action: string;
  previousSetting: boolean;
  newSetting: boolean;
  reason: string;
}> {
  const settings = await getDriverCapacitySettings();

  // Solo actuar si autoManage está habilitado
  if (!settings.autoManage) {
    return {
      action: 'none',
      previousSetting: settings.registrationOpen,
      newSetting: settings.registrationOpen,
      reason: 'Auto-gestión deshabilitada. No se tomó acción.',
    };
  }

  const analysis = await analyzeDriverCapacity();
  const previousSetting = settings.registrationOpen;
  let newSetting = previousSetting;
  let action = 'none';
  let reason = analysis.recommendation;

  // Solo actuar si la confianza es alta
  if (analysis.confidence >= 0.7) {
    if (analysis.shouldCloseRegistration && settings.registrationOpen) {
      await updateDriverCapacitySettings({ registrationOpen: false });
      newSetting = false;
      action = 'closed_registration';
      reason = `Registro cerrado automáticamente. ${analysis.recommendation}`;
    } else if (analysis.shouldOpenRegistration && !settings.registrationOpen) {
      await updateDriverCapacitySettings({ registrationOpen: true });
      newSetting = true;
      action = 'opened_registration';
      reason = `Registro abierto automáticamente. ${analysis.recommendation}`;
    }
  } else {
    reason = `Confianza insuficiente (${Math.round(analysis.confidence * 100)}%). No se tomó acción automática.`;
  }

  return {
    action,
    previousSetting,
    newSetting,
    reason,
  };
}

// ============================================================================
// VERIFICAR SI PUEDE REGISTRARSE UN DRIVER
// ============================================================================

export async function canDriverRegister(): Promise<{
  allowed: boolean;
  reason: string;
  waitlistPosition?: number;
}> {
  const stats = await getDriverCapacityStats();

  // Verificar si el registro está abierto
  if (!stats.settings.registrationOpen) {
    return {
      allowed: false,
      reason: 'El registro de repartidores está temporalmente cerrado.',
      waitlistPosition: stats.waitlistCount + 1,
    };
  }

  // Verificar si hay espacio
  if (stats.activeDrivers >= stats.settings.maxDrivers) {
    return {
      allowed: false,
      reason: `Hemos alcanzado el máximo de ${stats.settings.maxDrivers} repartidores por el momento.`,
      waitlistPosition: stats.waitlistCount + 1,
    };
  }

  return {
    allowed: true,
    reason: '¡Bienvenido! Puedes registrarte como repartidor.',
  };
}
