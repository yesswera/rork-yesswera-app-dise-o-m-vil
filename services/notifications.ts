import { Platform } from 'react-native';
import { supabase } from '@/constants/supabase';

// expo-notifications no funciona en Expo Go desde SDK 53
// Lo cargamos dinámicamente para evitar crash
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants').default | null = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.warn('[Notifications] expo-notifications no disponible (Expo Go). Push deshabilitado.');
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Notifications || !Device || !Constants) {
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
  if (!Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (response: any) => void
): DummySubscription {
  if (!Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(handler);
}
