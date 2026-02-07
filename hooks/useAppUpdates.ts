/**
 * Hook para manejar actualizaciones OTA (Over-The-Air)
 *
 * Permite actualizar la app sin pasar por las tiendas.
 * Solo funciona con builds de producción (no en Expo Go).
 */

import { useEffect, useState, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  error: Error | null;
}

interface UseAppUpdatesReturn extends UpdateState {
  checkForUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  applyUpdate: () => Promise<void>;
}

export function useAppUpdates(): UseAppUpdatesReturn {
  const [state, setState] = useState<UpdateState>({
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    isUpdatePending: false,
    error: null,
  });

  // Verificar si hay actualizaciones al montar
  useEffect(() => {
    // Solo verificar en builds de producción
    if (!__DEV__ && Updates.isEnabled) {
      checkForUpdateSilently();
    }
  }, []);

  // Verificar silenciosamente (sin UI)
  const checkForUpdateSilently = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setState(prev => ({ ...prev, isUpdateAvailable: true }));
        // Auto-descargar en background
        await Updates.fetchUpdateAsync();
        setState(prev => ({ ...prev, isUpdatePending: true }));
      }
    } catch (error) {
      console.log('Silent update check error:', error);
    }
  };

  // Verificar actualizaciones (con UI)
  const checkForUpdate = useCallback(async () => {
    if (__DEV__) {
      Alert.alert('Info', 'Las actualizaciones OTA solo funcionan en builds de producción');
      return;
    }

    if (!Updates.isEnabled) {
      Alert.alert('Info', 'Las actualizaciones no están habilitadas en esta versión');
      return;
    }

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setState(prev => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: true,
        }));

        Alert.alert(
          'Nueva Versión Disponible',
          '¿Deseas descargar la actualización ahora?',
          [
            { text: 'Después', style: 'cancel' },
            { text: 'Descargar', onPress: downloadUpdate },
          ]
        );
      } else {
        setState(prev => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: false,
        }));
        Alert.alert('Sin Actualizaciones', 'Ya tienes la última versión');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: error as Error,
      }));
      console.error('Error checking for updates:', error);
    }
  }, []);

  // Descargar actualización
  const downloadUpdate = useCallback(async () => {
    setState(prev => ({ ...prev, isDownloading: true, error: null }));

    try {
      await Updates.fetchUpdateAsync();

      setState(prev => ({
        ...prev,
        isDownloading: false,
        isUpdatePending: true,
      }));

      Alert.alert(
        'Actualización Lista',
        'La actualización se aplicará cuando reinicies la app. ¿Reiniciar ahora?',
        [
          { text: 'Después', style: 'cancel' },
          { text: 'Reiniciar', onPress: applyUpdate },
        ]
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        isDownloading: false,
        error: error as Error,
      }));
      Alert.alert('Error', 'No se pudo descargar la actualización');
      console.error('Error downloading update:', error);
    }
  }, []);

  // Aplicar actualización (reinicia la app)
  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error applying update:', error);
      Alert.alert('Error', 'No se pudo aplicar la actualización. Reinicia la app manualmente.');
    }
  }, []);

  return {
    ...state,
    checkForUpdate,
    downloadUpdate,
    applyUpdate,
  };
}

/**
 * Información de la versión actual
 */
export function getUpdateInfo() {
  return {
    isEnabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}

/**
 * Verificar y aplicar actualizaciones automáticamente al inicio
 * Llamar en el componente raíz de la app
 */
export async function checkAndApplyUpdatesOnStart(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) {
    return false;
  }

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // En la próxima apertura de la app, se aplicará automáticamente
      return true;
    }

    return false;
  } catch (error) {
    console.error('Auto-update check error:', error);
    return false;
  }
}
