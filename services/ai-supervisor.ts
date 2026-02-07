// ============================================================================
// YESSWERA: IA SUPERVISOR
// Sistema de inteligencia artificial para gestión automática
// La IA supervisa PROCESOS, no tiene control total de la app
// ============================================================================

import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDriverCapacityStats,
  analyzeDriverCapacity,
  autoAdjustDriverCapacity,
  updateDriverCapacitySettings,
  CapacityAnalysis,
} from './driver-capacity';

// ============================================================================
// TIPOS
// ============================================================================

export interface AIDecision {
  id: string;
  timestamp: string;
  category: 'driver_capacity' | 'zone_activation' | 'pricing' | 'support' | 'quality';
  action: string;
  reason: string;
  previousState: any;
  newState: any;
  confidence: number;
  wasAutomatic: boolean;
  wasApplied: boolean;
}

export interface AISupervisorConfig {
  enabled: boolean;
  autoDriverCapacity: boolean;
  autoZoneActivation: boolean;
  autoPricing: boolean;
  checkIntervalMinutes: number;
  minConfidenceToAct: number;
  notifyOnDecisions: boolean;
}

export interface AIHealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
  metrics: {
    driverCapacity: CapacityAnalysis;
    activeZones: number;
    orderVolume24h: number;
    avgDeliveryTime: number;
    customerSatisfaction: number;
  };
  recommendations: string[];
  pendingActions: AIDecision[];
}

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

const DEFAULT_CONFIG: AISupervisorConfig = {
  enabled: true,
  autoDriverCapacity: true,
  autoZoneActivation: false, // Requiere más análisis manual
  autoPricing: false, // Muy sensible, manual por ahora
  checkIntervalMinutes: 30,
  minConfidenceToAct: 0.75,
  notifyOnDecisions: true,
};

const CONFIG_KEY = '@yesswera_ai_supervisor_config';
const DECISIONS_KEY = '@yesswera_ai_decisions';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export async function getAISupervisorConfig(): Promise<AISupervisorConfig> {
  try {
    const stored = await AsyncStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('[AI Supervisor] Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

export async function updateAISupervisorConfig(
  updates: Partial<AISupervisorConfig>
): Promise<void> {
  try {
    const current = await getAISupervisorConfig();
    const newConfig = { ...current, ...updates };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    console.log('[AI Supervisor] Config updated:', updates);
  } catch (error) {
    console.error('[AI Supervisor] Error saving config:', error);
    throw error;
  }
}

// ============================================================================
// REGISTRO DE DECISIONES
// ============================================================================

async function logDecision(decision: Omit<AIDecision, 'id' | 'timestamp'>): Promise<AIDecision> {
  const fullDecision: AIDecision = {
    ...decision,
    id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const stored = await AsyncStorage.getItem(DECISIONS_KEY);
    const decisions: AIDecision[] = stored ? JSON.parse(stored) : [];

    // Mantener solo las últimas 100 decisiones
    decisions.unshift(fullDecision);
    if (decisions.length > 100) {
      decisions.pop();
    }

    await AsyncStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions));
    console.log('[AI Supervisor] Decision logged:', fullDecision.action);
  } catch (error) {
    console.error('[AI Supervisor] Error logging decision:', error);
  }

  return fullDecision;
}

export async function getAIDecisionHistory(limit: number = 20): Promise<AIDecision[]> {
  try {
    const stored = await AsyncStorage.getItem(DECISIONS_KEY);
    if (stored) {
      const decisions: AIDecision[] = JSON.parse(stored);
      return decisions.slice(0, limit);
    }
    return [];
  } catch (error) {
    console.error('[AI Supervisor] Error loading decisions:', error);
    return [];
  }
}

// ============================================================================
// ANÁLISIS Y SUPERVISIÓN
// ============================================================================

export async function runSupervisionCheck(): Promise<AIHealthReport> {
  console.log('[AI Supervisor] Running supervision check...');

  const config = await getAISupervisorConfig();
  const recommendations: string[] = [];
  const pendingActions: AIDecision[] = [];

  // 1. Analizar capacidad de drivers
  const driverAnalysis = await analyzeDriverCapacity();

  // 2. Obtener métricas adicionales
  const stats = await getDriverCapacityStats();

  // 3. Determinar estado general
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (driverAnalysis.status === 'critical' || driverAnalysis.status === 'oversupply') {
    overallStatus = 'critical';
  } else if (driverAnalysis.status === 'caution' || driverAnalysis.status === 'demand') {
    overallStatus = 'warning';
  }

  // 4. Generar recomendaciones
  recommendations.push(driverAnalysis.recommendation);

  if (stats.onlineDrivers === 0 && stats.ordersToday > 0) {
    recommendations.push('⚠️ No hay repartidores en línea pero hay órdenes pendientes.');
    overallStatus = 'critical';
  }

  if (stats.ordersToday > stats.ordersThisWeek / 7 * 1.5) {
    recommendations.push('📈 Hoy hay más órdenes de lo normal. Considera incentivar a drivers.');
  }

  // 5. Tomar acciones automáticas si está habilitado
  if (config.enabled && config.autoDriverCapacity) {
    if (driverAnalysis.confidence >= config.minConfidenceToAct) {
      const result = await autoAdjustDriverCapacity();

      if (result.action !== 'none') {
        const decision = await logDecision({
          category: 'driver_capacity',
          action: result.action,
          reason: result.reason,
          previousState: { registrationOpen: result.previousSetting },
          newState: { registrationOpen: result.newSetting },
          confidence: driverAnalysis.confidence,
          wasAutomatic: true,
          wasApplied: true,
        });
        pendingActions.push(decision);
      }
    } else {
      // Log que no se tomó acción por baja confianza
      await logDecision({
        category: 'driver_capacity',
        action: 'no_action_low_confidence',
        reason: `Confianza ${Math.round(driverAnalysis.confidence * 100)}% menor al mínimo ${Math.round(config.minConfidenceToAct * 100)}%`,
        previousState: null,
        newState: null,
        confidence: driverAnalysis.confidence,
        wasAutomatic: true,
        wasApplied: false,
      });
    }
  }

  const report: AIHealthReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    metrics: {
      driverCapacity: driverAnalysis,
      activeZones: 1, // TODO: Implementar zonas
      orderVolume24h: stats.ordersToday,
      avgDeliveryTime: 30, // TODO: Calcular real
      customerSatisfaction: 4.5, // TODO: Calcular real
    },
    recommendations,
    pendingActions,
  };

  console.log('[AI Supervisor] Check complete. Status:', overallStatus);
  return report;
}

// ============================================================================
// DECISIONES MANUALES (Admin puede pedir recomendación)
// ============================================================================

export async function getAIRecommendation(
  topic: 'driver_capacity' | 'zone' | 'pricing'
): Promise<{
  recommendation: string;
  suggestedAction: string;
  confidence: number;
  data: any;
}> {
  switch (topic) {
    case 'driver_capacity': {
      const analysis = await analyzeDriverCapacity();
      return {
        recommendation: analysis.recommendation,
        suggestedAction: analysis.shouldOpenRegistration
          ? 'Abrir registro de drivers'
          : analysis.shouldCloseRegistration
            ? 'Cerrar registro de drivers'
            : 'Mantener configuración actual',
        confidence: analysis.confidence,
        data: analysis,
      };
    }

    case 'zone':
      return {
        recommendation: 'El análisis de zonas requiere más datos históricos.',
        suggestedAction: 'Continuar recopilando datos',
        confidence: 0.5,
        data: null,
      };

    case 'pricing':
      return {
        recommendation: 'La optimización de precios está deshabilitada por seguridad.',
        suggestedAction: 'Mantener precios actuales',
        confidence: 0.9,
        data: null,
      };

    default:
      return {
        recommendation: 'Tema no reconocido',
        suggestedAction: 'Ninguna',
        confidence: 0,
        data: null,
      };
  }
}

// ============================================================================
// APLICAR DECISIÓN MANUAL
// ============================================================================

export async function applyAIRecommendation(
  topic: 'driver_capacity',
  action: 'open_registration' | 'close_registration' | 'increase_max' | 'decrease_max'
): Promise<{ success: boolean; message: string }> {
  try {
    const stats = await getDriverCapacityStats();

    switch (action) {
      case 'open_registration':
        await updateDriverCapacitySettings({ registrationOpen: true });
        await logDecision({
          category: 'driver_capacity',
          action: 'manual_open_registration',
          reason: 'Abierto manualmente por administrador',
          previousState: { registrationOpen: false },
          newState: { registrationOpen: true },
          confidence: 1.0,
          wasAutomatic: false,
          wasApplied: true,
        });
        return { success: true, message: 'Registro de drivers abierto' };

      case 'close_registration':
        await updateDriverCapacitySettings({ registrationOpen: false });
        await logDecision({
          category: 'driver_capacity',
          action: 'manual_close_registration',
          reason: 'Cerrado manualmente por administrador',
          previousState: { registrationOpen: true },
          newState: { registrationOpen: false },
          confidence: 1.0,
          wasAutomatic: false,
          wasApplied: true,
        });
        return { success: true, message: 'Registro de drivers cerrado' };

      case 'increase_max':
        const newMax = stats.settings.maxDrivers + 5;
        await updateDriverCapacitySettings({ maxDrivers: newMax });
        await logDecision({
          category: 'driver_capacity',
          action: 'manual_increase_max',
          reason: 'Incrementado manualmente por administrador',
          previousState: { maxDrivers: stats.settings.maxDrivers },
          newState: { maxDrivers: newMax },
          confidence: 1.0,
          wasAutomatic: false,
          wasApplied: true,
        });
        return { success: true, message: `Máximo de drivers aumentado a ${newMax}` };

      case 'decrease_max':
        const reducedMax = Math.max(stats.settings.maxDrivers - 5, stats.activeDrivers);
        await updateDriverCapacitySettings({ maxDrivers: reducedMax });
        await logDecision({
          category: 'driver_capacity',
          action: 'manual_decrease_max',
          reason: 'Reducido manualmente por administrador',
          previousState: { maxDrivers: stats.settings.maxDrivers },
          newState: { maxDrivers: reducedMax },
          confidence: 1.0,
          wasAutomatic: false,
          wasApplied: true,
        });
        return { success: true, message: `Máximo de drivers reducido a ${reducedMax}` };

      default:
        return { success: false, message: 'Acción no reconocida' };
    }
  } catch (error) {
    console.error('[AI Supervisor] Error applying recommendation:', error);
    return { success: false, message: 'Error al aplicar la acción' };
  }
}

// ============================================================================
// INICIAR SUPERVISIÓN PERIÓDICA
// ============================================================================

let supervisionInterval: NodeJS.Timeout | null = null;

export async function startAISupervision(): Promise<void> {
  const config = await getAISupervisorConfig();

  if (!config.enabled) {
    console.log('[AI Supervisor] Disabled. Not starting.');
    return;
  }

  // Limpiar intervalo anterior si existe
  if (supervisionInterval) {
    clearInterval(supervisionInterval);
  }

  // Ejecutar check inicial
  await runSupervisionCheck();

  // Configurar intervalo
  const intervalMs = config.checkIntervalMinutes * 60 * 1000;
  supervisionInterval = setInterval(async () => {
    const currentConfig = await getAISupervisorConfig();
    if (currentConfig.enabled) {
      await runSupervisionCheck();
    }
  }, intervalMs);

  console.log(`[AI Supervisor] Started. Checking every ${config.checkIntervalMinutes} minutes.`);
}

export function stopAISupervision(): void {
  if (supervisionInterval) {
    clearInterval(supervisionInterval);
    supervisionInterval = null;
    console.log('[AI Supervisor] Stopped.');
  }
}
