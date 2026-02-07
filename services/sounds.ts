// ============================================================================
// YESSWERA: SERVICIO DE SONIDOS
// Sonidos locales en assets/sounds/
// ============================================================================

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TIPOS DE SONIDOS
// ============================================================================

export type SoundType =
  // Feedback suave
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

  // Autenticación
  | 'login'
  | 'logout'

  // Navegación
  | 'navigate'
  | 'back'
  | 'tap'
  | 'toggle'
  | 'refresh'

  // Órdenes
  | 'newOrder'
  | 'orderAccepted'
  | 'orderReady'
  | 'orderPickedUp'
  | 'orderDelivered'
  | 'orderCancelled'

  // Llegadas
  | 'driverArrived'
  | 'arrivedAtBusiness'
  | 'arrivedAtClient'

  // Chat
  | 'messageSent'
  | 'messageReceived'

  // Emergencia
  | 'panic'
  | 'alert';

// ============================================================================
// CONFIGURACIÓN - Archivos locales en assets/sounds/
// ============================================================================

interface SoundConfig {
  file: any;  // require() del archivo
  volume: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'subtle' | 'normal' | 'alert' | 'emergency';
}

// Sonidos locales - Archivos en assets/sounds/
const SOUND_FILES: Record<SoundType, SoundConfig> = {
  // =========================================================================
  // SONIDOS SUAVES (8-25% volumen)
  // =========================================================================

  success: {
    file: require('@/assets/sounds/success.mp3'),
    volume: 0.20,
    priority: 'medium',
    category: 'subtle',
  },
  error: {
    file: require('@/assets/sounds/error.mp3'),
    volume: 0.30,
    priority: 'high',
    category: 'normal',
  },
  warning: {
    file: require('@/assets/sounds/warning.mp3'),
    volume: 0.25,
    priority: 'medium',
    category: 'normal',
  },
  info: {
    file: require('@/assets/sounds/info.mp3'),
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },

  login: {
    file: require('@/assets/sounds/login.mp3'),
    volume: 0.25,
    priority: 'medium',
    category: 'subtle',
  },
  logout: {
    file: require('@/assets/sounds/logout.mp3'),
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },

  navigate: {
    file: require('@/assets/sounds/navigate.mp3'),
    volume: 0.10,
    priority: 'low',
    category: 'subtle',
  },
  back: {
    file: require('@/assets/sounds/back.mp3'),
    volume: 0.10,
    priority: 'low',
    category: 'subtle',
  },
  tap: {
    file: require('@/assets/sounds/tap.mp3'),
    volume: 0.08,
    priority: 'low',
    category: 'subtle',
  },
  toggle: {
    file: require('@/assets/sounds/toggle.mp3'),
    volume: 0.12,
    priority: 'low',
    category: 'subtle',
  },
  refresh: {
    file: require('@/assets/sounds/refresh.mp3'),
    volume: 0.10,
    priority: 'low',
    category: 'subtle',
  },

  // =========================================================================
  // ALERTAS FUERTES (70-95% volumen)
  // =========================================================================

  newOrder: {
    file: require('@/assets/sounds/new-order.mp3'),
    volume: 0.90,
    priority: 'critical',
    category: 'alert',
  },
  orderAccepted: {
    file: require('@/assets/sounds/order-accepted.mp3'),
    volume: 0.50,
    priority: 'high',
    category: 'normal',
  },
  orderReady: {
    file: require('@/assets/sounds/order-ready.mp3'),
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },
  orderPickedUp: {
    file: require('@/assets/sounds/order-pickup.mp3'),
    volume: 0.45,
    priority: 'high',
    category: 'normal',
  },
  orderDelivered: {
    file: require('@/assets/sounds/order-delivered.mp3'),
    volume: 0.70,
    priority: 'high',
    category: 'alert',
  },
  orderCancelled: {
    file: require('@/assets/sounds/order-cancelled.mp3'),
    volume: 0.55,
    priority: 'high',
    category: 'alert',
  },

  // =========================================================================
  // LLEGADAS (85-95% volumen)
  // =========================================================================

  driverArrived: {
    file: require('@/assets/sounds/driver-arrived.mp3'),
    volume: 0.95,
    priority: 'critical',
    category: 'alert',
  },
  arrivedAtBusiness: {
    file: require('@/assets/sounds/arrived-business.mp3'),
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },
  arrivedAtClient: {
    file: require('@/assets/sounds/arrived-client.mp3'),
    volume: 0.95,
    priority: 'critical',
    category: 'alert',
  },

  // =========================================================================
  // CHAT (18-30% volumen)
  // =========================================================================

  messageSent: {
    file: require('@/assets/sounds/message-sent.mp3'),
    volume: 0.18,
    priority: 'low',
    category: 'subtle',
  },
  messageReceived: {
    file: require('@/assets/sounds/message-received.mp3'),
    volume: 0.30,
    priority: 'medium',
    category: 'subtle',
  },

  // =========================================================================
  // EMERGENCIA (100%)
  // =========================================================================

  panic: {
    file: require('@/assets/sounds/panic.mp3'),
    volume: 1.0,
    priority: 'critical',
    category: 'emergency',
  },
  alert: {
    file: require('@/assets/sounds/alert.mp3'),
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
  volume: number;
  muteLowPriority: boolean;
  alertsOnly: boolean;
}

const DEFAULT_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.8,
  muteLowPriority: false,
  alertsOnly: false,
};

const soundCache: Map<SoundType, Audio.Sound> = new Map();
let currentPreferences: SoundPreferences = { ...DEFAULT_PREFERENCES };
let isInitialized = false;

// ============================================================================
// INICIALIZACIÓN
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
    console.log('[Sounds] Sistema inicializado con sonidos locales');
  } catch (error) {
    console.error('[Sounds] Error inicializando:', error);
  }
}

async function preloadCriticalSounds(): Promise<void> {
  const criticalSounds: SoundType[] = ['newOrder', 'orderReady', 'driverArrived', 'success', 'error'];

  for (const soundType of criticalSounds) {
    try {
      await loadSound(soundType);
    } catch (error) {
      console.warn(`[Sounds] No se pudo pre-cargar ${soundType}:`, error);
    }
  }
}

async function loadSound(type: SoundType): Promise<Audio.Sound | null> {
  if (soundCache.has(type)) {
    return soundCache.get(type)!;
  }

  try {
    const config = SOUND_FILES[type];
    const { sound } = await Audio.Sound.createAsync(
      config.file,
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
// REPRODUCCIÓN
// ============================================================================

export async function playSound(
  type: SoundType,
  options?: { volume?: number; force?: boolean }
): Promise<void> {
  const config = SOUND_FILES[type];

  if (!currentPreferences.enabled && !options?.force) {
    return;
  }

  if (currentPreferences.alertsOnly && config.category === 'subtle') {
    return;
  }

  if (currentPreferences.muteLowPriority && config.priority === 'low') {
    return;
  }

  try {
    let sound = soundCache.get(type);
    if (!sound) {
      sound = await loadSound(type);
      if (!sound) return;
    }

    const finalVolume = (options?.volume ?? config.volume) * currentPreferences.volume;
    await sound.setVolumeAsync(finalVolume);

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
// FUNCIONES DE CONVENIENCIA
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

export const OrderSounds = {
  newOrder: () => playSound('newOrder'),
  accepted: () => playSound('orderAccepted'),
  ready: () => playSound('orderReady'),
  pickedUp: () => playSound('orderPickedUp'),
  delivered: () => playSound('orderDelivered'),
  cancelled: () => playSound('orderCancelled'),
};

export const ArrivalSounds = {
  driverArrived: () => playSound('driverArrived'),
  atBusiness: () => playSound('arrivedAtBusiness'),
  atClient: () => playSound('arrivedAtClient'),
};

export const EmergencySounds = {
  panic: () => playSound('panic', { force: true }),
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
      const config = SOUND_FILES[type];
      try {
        await sound.setVolumeAsync(config.volume * currentPreferences.volume);
      } catch { }
    }
  }
}

export async function setSoundsEnabled(enabled: boolean): Promise<void> {
  await updateSoundPreferences({ enabled });
}

export async function setGlobalVolume(volume: number): Promise<void> {
  await updateSoundPreferences({ volume: Math.max(0, Math.min(1, volume)) });
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
    } catch { }
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
