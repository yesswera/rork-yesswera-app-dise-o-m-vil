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
  // Sistema
  | 'startupChime'
  | 'uiTap'

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
  // SISTEMA (Startup + UI Tap)
  // =========================================================================

  startupChime: {
    file: require('@/assets/sounds/startup-chime.wav'),
    volume: 0.55,
    priority: 'critical',
    category: 'alert',  // Siempre suena (no se silencia)
  },
  uiTap: {
    file: require('@/assets/sounds/ui-tap.wav'),
    volume: 0.45,
    priority: 'high',
    category: 'normal',
  },

  // =========================================================================
  // SONIDOS SUAVES (8-25% volumen)
  // =========================================================================

  success: {
    file: require('@/assets/sounds/success.wav'),
    volume: 0.45,
    priority: 'medium',
    category: 'normal',
  },
  error: {
    file: require('@/assets/sounds/error.wav'),
    volume: 0.30,
    priority: 'high',
    category: 'normal',
  },
  warning: {
    file: require('@/assets/sounds/warning.wav'),
    volume: 0.25,
    priority: 'medium',
    category: 'normal',
  },
  info: {
    file: require('@/assets/sounds/info.wav'),
    volume: 0.40,
    priority: 'medium',
    category: 'normal',
  },

  login: {
    file: require('@/assets/sounds/login.wav'),
    volume: 0.30,
    priority: 'medium',
    category: 'subtle',
  },
  logout: {
    file: require('@/assets/sounds/logout.wav'),
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
  },

  navigate: {
    file: require('@/assets/sounds/navigate.wav'),
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
  },
  back: {
    file: require('@/assets/sounds/back.wav'),
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
  },
  tap: {
    file: require('@/assets/sounds/ui-tap.wav'),
    volume: 0.40,
    priority: 'medium',
    category: 'normal',
  },
  toggle: {
    file: require('@/assets/sounds/toggle.wav'),
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
  },
  refresh: {
    file: require('@/assets/sounds/refresh.wav'),
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
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
    file: require('@/assets/sounds/order-accepted.wav'),
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
    file: require('@/assets/sounds/order-pickup.wav'),
    volume: 0.45,
    priority: 'high',
    category: 'normal',
  },
  orderDelivered: {
    file: require('@/assets/sounds/order-delivered.wav'),
    volume: 0.70,
    priority: 'high',
    category: 'alert',
  },
  orderCancelled: {
    file: require('@/assets/sounds/order-cancelled.wav'),
    volume: 0.55,
    priority: 'high',
    category: 'alert',
  },

  // =========================================================================
  // LLEGADAS (85-95% volumen)
  // =========================================================================

  driverArrived: {
    file: require('@/assets/sounds/driver-arrived.mp3'),
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },
  arrivedAtBusiness: {
    file: require('@/assets/sounds/arrived-business.mp3'),
    volume: 0.75,
    priority: 'critical',
    category: 'alert',
  },
  arrivedAtClient: {
    file: require('@/assets/sounds/arrived-client.mp3'),
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },

  // =========================================================================
  // CHAT (18-30% volumen)
  // =========================================================================

  messageSent: {
    file: require('@/assets/sounds/message-sent.wav'),
    volume: 0.35,
    priority: 'medium',
    category: 'normal',
  },
  messageReceived: {
    file: require('@/assets/sounds/message-received.wav'),
    volume: 0.40,
    priority: 'medium',
    category: 'normal',
  },

  // =========================================================================
  // EMERGENCIA (100%)
  // =========================================================================

  panic: {
    file: require('@/assets/sounds/panic.wav'),
    volume: 1.0,
    priority: 'critical',
    category: 'emergency',
  },
  alert: {
    file: require('@/assets/sounds/alert.wav'),
    volume: 0.90,
    priority: 'critical',
    category: 'emergency',
  },
};

// ============================================================================
// ESTADO Y PREFERENCIAS
// ============================================================================

const STORAGE_KEY = '@yesswera_sound_preferences';
const PREFS_VERSION = 2; // Incrementar para forzar reset

interface SoundPreferences {
  version: number;
  enabled: boolean;
  volume: number;
  muteLowPriority: boolean;
  alertsOnly: boolean;
  tapSoundEnabled: boolean;
}

const DEFAULT_PREFERENCES: SoundPreferences = {
  version: PREFS_VERSION,
  enabled: true,
  volume: 0.8,
  muteLowPriority: false,
  alertsOnly: false,
  tapSoundEnabled: true,
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
  const criticalSounds: SoundType[] = ['startupChime', 'uiTap', 'newOrder', 'orderReady', 'driverArrived', 'success', 'error'];

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
  const isForced = options?.force === true;

  // Si NO es forzado, aplicar filtros de preferencias
  if (!isForced) {
    if (!currentPreferences.enabled) {
      return;
    }
    if (currentPreferences.alertsOnly && config.category === 'subtle') {
      return;
    }
    if (currentPreferences.muteLowPriority && config.priority === 'low') {
      return;
    }
  }

  try {
    let sound = soundCache.get(type);
    if (!sound) {
      sound = await loadSound(type);
      if (!sound) return;
    }

    const finalVolume = (options?.volume ?? config.volume) * currentPreferences.volume;
    await sound.setVolumeAsync(Math.max(finalVolume, 0.1));

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

// ============================================================================
// SONIDOS DE SISTEMA
// ============================================================================

/**
 * Reproduce el chime de inicio de la app.
 * SIEMPRE suena, no respeta preferencias del usuario (es persistente).
 * Similar al sonido de inicio de Windows/Samsung/Mac.
 */
export async function playStartupChime(): Promise<void> {
  await playSound('startupChime', { force: true });
}

/**
 * Reproduce el sonido de tap/clic en UI.
 * Solo suena si el usuario lo tiene activado (tapSoundEnabled).
 * Usa force:true para que no sea filtrado por alertsOnly/muteLowPriority.
 */
export async function playUiTap(): Promise<void> {
  if (!currentPreferences.tapSoundEnabled) return;
  await playSound('uiTap', { force: true });
}

export const SoundFeedback = {
  success: () => playSound('success'),
  error: () => playSound('error'),
  warning: () => playSound('warning'),
  info: () => playSound('info'),
  tap: () => playUiTap(),
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
      const parsed = JSON.parse(stored);
      // Si la version no coincide, forzar reset a defaults limpios
      if (!parsed.version || parsed.version < PREFS_VERSION) {
        currentPreferences = { ...DEFAULT_PREFERENCES };
        await savePreferences();
        console.log('[Sounds] Preferencias reseteadas a v' + PREFS_VERSION);
      } else {
        currentPreferences = { ...DEFAULT_PREFERENCES, ...parsed };
      }
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

export async function setTapSoundEnabled(enabled: boolean): Promise<void> {
  await updateSoundPreferences({ tapSoundEnabled: enabled });
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
