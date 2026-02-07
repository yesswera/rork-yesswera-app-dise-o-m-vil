// ============================================================================
// YESSWERA: SERVICIO DE SONIDOS
// Sistema de feedback auditivo - Sonidos sutiles y alertas llamativas
// ============================================================================

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TIPOS DE SONIDOS
// ============================================================================

export type SoundType =
  // Feedback suave (UI normal)
  | 'success'          // Acción completada
  | 'error'            // Error suave
  | 'warning'          // Advertencia suave
  | 'info'             // Información

  // Autenticación (suave)
  | 'login'            // Bienvenida sutil
  | 'logout'           // Despedida sutil

  // Navegación (muy suave)
  | 'navigate'         // Cambio de pantalla
  | 'back'             // Regresar
  | 'tap'              // Tap en botón
  | 'toggle'           // Toggle switch

  // ALERTAS FUERTES - Órdenes
  | 'newOrder'         // ¡NUEVA ORDEN! (campanilla fuerte)
  | 'orderAccepted'    // Orden aceptada (confirmación clara)
  | 'orderReady'       // ¡LISTO PARA RECOGER! (alerta fuerte)
  | 'orderPickedUp'    // Recogido (confirmación)
  | 'orderDelivered'   // ¡ENTREGADO! (celebración)
  | 'orderCancelled'   // Cancelado (alerta)

  // ALERTAS FUERTES - Driver/Llegadas
  | 'driverArrived'    // ¡LLEGÓ EL REPARTIDOR! (muy fuerte)
  | 'arrivedAtBusiness'// Driver llegó al negocio
  | 'arrivedAtClient'  // Driver llegó con cliente

  // Chat (suave)
  | 'messageSent'      // Enviado (pop suave)
  | 'messageReceived'  // Recibido (notificación suave)

  // EMERGENCIA (máximo volumen)
  | 'panic'            // ¡EMERGENCIA!
  | 'alert';           // Alerta crítica

// ============================================================================
// CONFIGURACIÓN DE SONIDOS
// URLs de Mixkit - Sonidos libres de regalías
// Organizados por intensidad
// ============================================================================

interface SoundConfig {
  url: string;
  volume: number;      // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'subtle' | 'normal' | 'alert' | 'emergency';
}

const SOUND_URLS: Record<SoundType, SoundConfig> = {
  // =========================================================================
  // SONIDOS SUAVES (para flujo normal de la app)
  // =========================================================================

  success: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3', // Soft positive ding
    volume: 0.3,
    priority: 'medium',
    category: 'subtle',
  },
  error: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2221/2221-preview.mp3', // Soft negative
    volume: 0.4,
    priority: 'high',
    category: 'normal',
  },
  warning: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2220/2220-preview.mp3', // Soft warning
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
  },
  info: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Soft notification
    volume: 0.25,
    priority: 'low',
    category: 'subtle',
  },

  // Autenticación - MUY suave, agradable
  login: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2352/2352-preview.mp3', // Gentle welcome chime
    volume: 0.3,
    priority: 'medium',
    category: 'subtle',
  },
  logout: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2205/2205-preview.mp3', // Soft goodbye
    volume: 0.2,
    priority: 'low',
    category: 'subtle',
  },

  // Navegación - Muy sutil, casi imperceptible
  navigate: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Soft swoosh
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },
  back: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // Soft reverse swoosh
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },
  tap: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft click
    volume: 0.1,
    priority: 'low',
    category: 'subtle',
  },
  toggle: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', // Soft switch
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },

  // =========================================================================
  // ALERTAS FUERTES (para eventos importantes)
  // =========================================================================

  // ¡NUEVA ORDEN! - Campanilla llamativa
  newOrder: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1531/1531-preview.mp3', // Restaurant bell ring
    volume: 0.9,
    priority: 'critical',
    category: 'alert',
  },

  // Orden aceptada - Confirmación clara
  orderAccepted: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Achievement unlock
    volume: 0.6,
    priority: 'high',
    category: 'normal',
  },

  // ¡LISTO PARA RECOGER! - Alerta fuerte para driver
  orderReady: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1530/1530-preview.mp3', // Kitchen bell ding
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },

  // Recogido - Confirmación
  orderPickedUp: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Pickup confirmation
    volume: 0.5,
    priority: 'high',
    category: 'normal',
  },

  // ¡ENTREGADO! - Celebración
  orderDelivered: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Success fanfare
    volume: 0.7,
    priority: 'high',
    category: 'alert',
  },

  // Cancelado - Alerta negativa
  orderCancelled: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2223/2223-preview.mp3', // Negative alert
    volume: 0.6,
    priority: 'high',
    category: 'alert',
  },

  // =========================================================================
  // ALERTAS DE LLEGADA (MUY FUERTES)
  // =========================================================================

  // ¡LLEGÓ EL REPARTIDOR! - Para cliente
  driverArrived: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3', // Doorbell
    volume: 0.95,
    priority: 'critical',
    category: 'alert',
  },

  // Driver llegó al negocio
  arrivedAtBusiness: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1529/1529-preview.mp3', // Arrival chime
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },

  // Driver llegó con cliente
  arrivedAtClient: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3', // Doorbell
    volume: 0.95,
    priority: 'critical',
    category: 'alert',
  },

  // =========================================================================
  // CHAT (suave)
  // =========================================================================

  messageSent: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Soft pop
    volume: 0.2,
    priority: 'low',
    category: 'subtle',
  },
  messageReceived: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Soft notification
    volume: 0.35,
    priority: 'medium',
    category: 'subtle',
  },

  // =========================================================================
  // EMERGENCIA (máximo volumen, siempre suena)
  // =========================================================================

  panic: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1491/1491-preview.mp3', // Emergency alarm
    volume: 1.0,
    priority: 'critical',
    category: 'emergency',
  },
  alert: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1490/1490-preview.mp3', // Critical alert
    volume: 0.95,
    priority: 'critical',
    category: 'emergency',
  },
};

// ============================================================================
// ESTADO Y PREFERENCIAS
// ============================================================================

const STORAGE_KEY = '@yesswera_sound_preferences';

interface SoundPreferences {
  enabled: boolean;
  volume: number;           // Volumen global (0-1)
  muteLowPriority: boolean; // Silenciar sonidos suaves
  alertsOnly: boolean;      // Solo alertas importantes
}

const DEFAULT_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.8,
  muteLowPriority: false,
  alertsOnly: false,
};

// Cache de sonidos cargados
const soundCache: Map<SoundType, Audio.Sound> = new Map();

// Preferencias actuales
let currentPreferences: SoundPreferences = { ...DEFAULT_PREFERENCES };

// Estado de inicialización
let isInitialized = false;

// ============================================================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================================================

export async function initializeSounds(): Promise<void> {
  if (isInitialized) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    await loadPreferences();
    await preloadCriticalSounds();

    isInitialized = true;
    console.log('[Sounds] Sistema inicializado');
  } catch (error) {
    console.error('[Sounds] Error inicializando:', error);
  }
}

async function preloadCriticalSounds(): Promise<void> {
  // Solo pre-cargar sonidos de alerta críticos
  const criticalSounds: SoundType[] = ['newOrder', 'orderReady', 'driverArrived', 'panic'];

  for (const soundType of criticalSounds) {
    try {
      await loadSound(soundType);
    } catch (error) {
      console.warn(`[Sounds] No se pudo pre-cargar ${soundType}`);
    }
  }
}

async function loadSound(type: SoundType): Promise<Audio.Sound | null> {
  if (soundCache.has(type)) {
    return soundCache.get(type)!;
  }

  try {
    const config = SOUND_URLS[type];
    const { sound } = await Audio.Sound.createAsync(
      { uri: config.url },
      { volume: config.volume * currentPreferences.volume }
    );

    soundCache.set(type, sound);
    return sound;
  } catch (error) {
    console.error(`[Sounds] Error cargando ${type}:`, error);
    return null;
  }
}

// ============================================================================
// FUNCIONES DE REPRODUCCIÓN
// ============================================================================

export async function playSound(
  type: SoundType,
  options?: { volume?: number; force?: boolean }
): Promise<void> {
  const config = SOUND_URLS[type];

  // Verificar preferencias
  if (!currentPreferences.enabled && !options?.force) {
    return;
  }

  // Si solo alertas, ignorar sonidos suaves
  if (currentPreferences.alertsOnly && config.category === 'subtle') {
    return;
  }

  // Si silenciar baja prioridad
  if (currentPreferences.muteLowPriority && config.priority === 'low') {
    return;
  }

  try {
    let sound = soundCache.get(type);
    if (!sound) {
      sound = await loadSound(type);
      if (!sound) return;
    }

    // Calcular volumen final
    const finalVolume = (options?.volume ?? config.volume) * currentPreferences.volume;
    await sound.setVolumeAsync(finalVolume);

    // Rebobinar si necesario
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.positionMillis > 0) {
      await sound.setPositionAsync(0);
    }

    await sound.playAsync();
  } catch (error) {
    console.error(`[Sounds] Error reproduciendo ${type}:`, error);
  }
}

// ============================================================================
// FUNCIONES DE CONVENIENCIA - SUAVES
// ============================================================================

export const SoundFeedback = {
  success: () => playSound('success'),
  error: () => playSound('error'),
  warning: () => playSound('warning'),
  info: () => playSound('info'),
  tap: () => playSound('tap'),
};

export const AuthSounds = {
  login: () => playSound('login'),
  logout: () => playSound('logout'),
};

export const NavigationSounds = {
  navigate: () => playSound('navigate'),
  back: () => playSound('back'),
};

export const ChatSounds = {
  sent: () => playSound('messageSent'),
  received: () => playSound('messageReceived'),
};

// ============================================================================
// FUNCIONES DE CONVENIENCIA - ALERTAS FUERTES
// ============================================================================

export const OrderSounds = {
  /** ¡NUEVA ORDEN! - Campanilla fuerte */
  newOrder: () => playSound('newOrder'),

  /** Orden aceptada - Confirmación */
  accepted: () => playSound('orderAccepted'),

  /** ¡LISTO PARA RECOGER! - Alerta fuerte */
  ready: () => playSound('orderReady'),

  /** Orden recogida */
  pickedUp: () => playSound('orderPickedUp'),

  /** ¡ENTREGADO! - Celebración */
  delivered: () => playSound('orderDelivered'),

  /** Cancelado */
  cancelled: () => playSound('orderCancelled'),
};

export const ArrivalSounds = {
  /** ¡LLEGÓ EL REPARTIDOR! - Para cliente */
  driverArrived: () => playSound('driverArrived'),

  /** Driver llegó al negocio */
  atBusiness: () => playSound('arrivedAtBusiness'),

  /** Driver llegó con cliente */
  atClient: () => playSound('arrivedAtClient'),
};

export const EmergencySounds = {
  /** ¡EMERGENCIA! - Siempre suena */
  panic: () => playSound('panic', { force: true }),

  /** Alerta crítica */
  alert: () => playSound('alert', { force: true }),
};

// ============================================================================
// PREFERENCIAS
// ============================================================================

async function loadPreferences(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      currentPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[Sounds] Error cargando preferencias:', error);
  }
}

async function savePreferences(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentPreferences));
  } catch (error) {
    console.error('[Sounds] Error guardando preferencias:', error);
  }
}

export function getSoundPreferences(): SoundPreferences {
  return { ...currentPreferences };
}

export async function updateSoundPreferences(
  updates: Partial<SoundPreferences>
): Promise<void> {
  currentPreferences = { ...currentPreferences, ...updates };
  await savePreferences();

  if (updates.volume !== undefined) {
    for (const [type, sound] of soundCache.entries()) {
      const config = SOUND_URLS[type];
      try {
        await sound.setVolumeAsync(config.volume * currentPreferences.volume);
      } catch {
        // Ignorar
      }
    }
  }
}

export async function setSoundsEnabled(enabled: boolean): Promise<void> {
  await updateSoundPreferences({ enabled });
}

export async function setGlobalVolume(volume: number): Promise<void> {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  await updateSoundPreferences({ volume: clampedVolume });
}

export async function setAlertsOnly(alertsOnly: boolean): Promise<void> {
  await updateSoundPreferences({ alertsOnly });
}

// ============================================================================
// LIMPIEZA
// ============================================================================

export async function cleanupSounds(): Promise<void> {
  for (const sound of soundCache.values()) {
    try {
      await sound.unloadAsync();
    } catch {
      // Ignorar
    }
  }
  soundCache.clear();
  isInitialized = false;
}

// ============================================================================
// DEDUPLICACIÓN
// ============================================================================

const lastPlayedTimes: Map<SoundType, number> = new Map();
const DEBOUNCE_MS = 1000;

export async function playSoundDebounced(type: SoundType): Promise<void> {
  const now = Date.now();
  const lastPlayed = lastPlayedTimes.get(type) || 0;

  if (now - lastPlayed < DEBOUNCE_MS) {
    return;
  }

  lastPlayedTimes.set(type, now);
  await playSound(type);
}

// ============================================================================
// TESTING
// ============================================================================

export async function testSound(type: SoundType): Promise<void> {
  await playSound(type, { force: true });
}

export async function testAllAlerts(): Promise<void> {
  console.log('[Sounds] Probando alertas...');
  const alerts: SoundType[] = ['newOrder', 'orderReady', 'driverArrived', 'orderDelivered'];

  for (const type of alerts) {
    console.log(`[Sounds] ${type}`);
    await playSound(type, { force: true });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
