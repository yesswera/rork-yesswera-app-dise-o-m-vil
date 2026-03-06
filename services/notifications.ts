import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/constants/supabase';

// Detectar si estamos en Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// expo-notifications NO funciona en Expo Go desde SDK 53
// Solo lo cargamos en builds de desarrollo/producción
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let notificationsInitialized = false;

function initNotifications() {
  if (notificationsInitialized) return;
  notificationsInitialized = true;

  // NO cargar expo-notifications en Expo Go
  if (isExpoGo) {
    console.log('[Notifications] Expo Go detectado - Push notifications deshabilitadas');
    console.log('[Notifications] Para push reales, usar development build');
    return;
  }

  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    console.log('[Notifications] expo-notifications inicializado correctamente');
  } catch (error) {
    console.warn('[Notifications] No se pudo cargar expo-notifications:', error);
  }
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // En Expo Go, no intentar registrar push
  if (isExpoGo) {
    console.log('[Notifications] Push no disponible en Expo Go');
    return null;
  }

  initNotifications();

  if (!Notifications || !Device) {
    console.log('[Notifications] Push no disponible en este entorno');
    return null;
  }

  if (Platform.OS === 'web') {
    console.log('[Notifications] Push notifications not supported on web');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push notifications');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('[Notifications] No projectId found - skipping token registration');
      return null;
    }

    const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    console.log('[Notifications] Push token obtained:', pushToken);

    // Save token to Supabase
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token: pushToken,
          platform: Platform.OS,
        },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('[Notifications] Error saving token to Supabase:', error);
    } else {
      console.log('[Notifications] Token registered successfully in Supabase');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00C896',
      });
    }

    return pushToken;
  } catch (error) {
    console.error('[Notifications] Error registering for push notifications:', error);
    return null;
  }
}

export async function sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
  // En Expo Go, usar console.log como fallback visual
  if (isExpoGo) {
    console.log(`[Notification] ${title}: ${body}`);
    return;
  }

  initNotifications();

  if (!Notifications) {
    console.log('[Notifications] Local notifications no disponibles');
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[Notifications] Error sending local notification:', error);
  }
}

// Tipo dummy para cuando expo-notifications no está disponible
type DummySubscription = { remove: () => void };

export function addNotificationReceivedListener(
  handler: (notification: any) => void
): DummySubscription {
  if (isExpoGo || !Notifications) {
    return { remove: () => {} };
  }
  initNotifications();
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (response: any) => void
): DummySubscription {
  if (isExpoGo || !Notifications) {
    return { remove: () => {} };
  }
  initNotifications();
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}
