// ============================================================================
// YESSWERA: SERVICIO DE SONIDOS
// Sonidos limpios y profesionales - Pixabay (sin atribución)
// ============================================================================

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TIPOS DE SONIDOS
// ============================================================================

export type SoundType =
  // Feedback suave (UI normal)
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

  // Autenticación (suave)
  | 'login'
  | 'logout'

  // Navegación (muy suave)
  | 'navigate'
  | 'back'
  | 'tap'
  | 'toggle'
  | 'refresh'

  // ALERTAS - Órdenes
  | 'newOrder'
  | 'orderAccepted'
  | 'orderReady'
  | 'orderPickedUp'
  | 'orderDelivered'
  | 'orderCancelled'

  // ALERTAS - Llegadas
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
// CONFIGURACIÓN DE SONIDOS
// Fuente: Pixabay (100% gratis, sin atribución requerida)
// Estilo: Limpio, minimalista, profesional
// ============================================================================

interface SoundConfig {
  url: string;
  volume: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'subtle' | 'normal' | 'alert' | 'emergency';
}

// URLs de Pixabay - Sonidos limpios y modernos
const SOUND_URLS: Record<SoundType, SoundConfig> = {
  // =========================================================================
  // SONIDOS MUY SUAVES (10-25% volumen) - Flujo normal
  // =========================================================================

  success: {
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3', // Soft success ding
    volume: 0.20,
    priority: 'medium',
    category: 'subtle',
  },
  error: {
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7e21c19e66.mp3', // Soft error
    volume: 0.30,
    priority: 'high',
    category: 'normal',
  },
  warning: {
    url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3', // Gentle warning
    volume: 0.25,
    priority: 'medium',
    category: 'normal',
  },
  info: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Soft pop
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },

  // Autenticación - Muy sutil y agradable
  login: {
    url: 'https://cdn.pixabay.com/audio/2022/11/21/audio_febc508520.mp3', // Gentle welcome chime
    volume: 0.25,
    priority: 'medium',
    category: 'subtle',
  },
  logout: {
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3', // Soft goodbye
    volume: 0.15,
    priority: 'low',
    category: 'subtle',
  },

  // Navegación - Casi imperceptible
  navigate: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Soft swoosh
    volume: 0.10,
    priority: 'low',
    category: 'subtle',
  },
  back: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Soft pop
    volume: 0.10,
    priority: 'low',
    category: 'subtle',
  },
  tap: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Minimal click
    volume: 0.08,
    priority: 'low',
    category: 'subtle',
  },
  toggle: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Soft switch
    volume: 0.12,
    priority: 'low',
    category: 'subtle',
  },
  refresh: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Subtle refresh
    volume: 0.10,
    priority: 'low',
    category: 'subtle',
  },

  // =========================================================================
  // ALERTAS FUERTES (70-95% volumen) - Eventos importantes
  // =========================================================================

  // ¡NUEVA ORDEN! - Campanilla clara y llamativa
  newOrder: {
    url: 'https://cdn.pixabay.com/audio/2024/02/19/audio_e4043e6a0c.mp3', // Restaurant bell
    volume: 0.90,
    priority: 'critical',
    category: 'alert',
  },

  // Orden aceptada - Confirmación positiva
  orderAccepted: {
    url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3', // Success notification
    volume: 0.50,
    priority: 'high',
    category: 'normal',
  },

  // ¡LISTO PARA RECOGER! - Alerta clara para driver
  orderReady: {
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749bf56.mp3', // Kitchen bell
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },

  // Recogido - Confirmación media
  orderPickedUp: {
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3', // Pickup confirm
    volume: 0.45,
    priority: 'high',
    category: 'normal',
  },

  // ¡ENTREGADO! - Celebración
  orderDelivered: {
    url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3', // Success fanfare
    volume: 0.70,
    priority: 'high',
    category: 'alert',
  },

  // Cancelado - Alerta negativa
  orderCancelled: {
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7e21c19e66.mp3', // Negative tone
    volume: 0.55,
    priority: 'high',
    category: 'alert',
  },

  // =========================================================================
  // ALERTAS DE LLEGADA (MUY FUERTES - 85-95%)
  // =========================================================================

  // ¡LLEGÓ EL REPARTIDOR! - Para cliente (timbre fuerte)
  driverArrived: {
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_db7e0a88f1.mp3', // Doorbell
    volume: 0.95,
    priority: 'critical',
    category: 'alert',
  },

  // Driver llegó al negocio
  arrivedAtBusiness: {
    url: 'https://cdn.pixabay.com/audio/2024/02/19/audio_e4043e6a0c.mp3', // Arrival chime
    volume: 0.85,
    priority: 'critical',
    category: 'alert',
  },

  // Driver llegó con cliente
  arrivedAtClient: {
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_db7e0a88f1.mp3', // Doorbell
    volume: 0.95,
    priority: 'critical',
    category: 'alert',
  },

  // =========================================================================
  // CHAT (suave - 20-35%)
  // =========================================================================

  messageSent: {
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_71d86f891a.mp3', // Soft bubble
    volume: 0.18,
    priority: 'low',
    category: 'subtle',
  },
  messageReceived: {
    url: 'https://cdn.pixabay.com/audio/2022/11/21/audio_febc508520.mp3', // Soft chime
    volume: 0.30,
    priority: 'medium',
    category: 'subtle',
  },

  // =========================================================================
  // EMERGENCIA (100% - siempre suena)
  // =========================================================================

  panic: {
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c6797ed47c.mp3', // Emergency alarm
    volume: 1.0,
    priority: 'critical',
    category: 'emergency',
  },
  alert: {
    url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3', // Critical alert
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
    console.log('[Sounds] Sistema inicializado');
  } catch (error) {
    console.error('[Sounds] Error inicializando:', error);
  }
}

async function preloadCriticalSounds(): Promise<void> {
  const criticalSounds: SoundType[] = ['newOrder', 'orderReady', 'driverArrived'];

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
// REPRODUCCIÓN
// ============================================================================

export async function playSound(
  type: SoundType,
  options?: { volume?: number; force?: boolean }
): Promise<void> {
  const config = SOUND_URLS[type];

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
      const config = SOUND_URLS[type];
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
