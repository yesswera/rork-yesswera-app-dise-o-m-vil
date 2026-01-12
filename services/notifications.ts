import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '@/constants/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string, token: string): Promise<string | null> {
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

    await registerTokenWithBackend(userId, pushToken, token);

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

async function registerTokenWithBackend(userId: string, pushToken: string, token: string): Promise<void> {
  try {
    const response = await fetch(API_ENDPOINTS.notifications.registerToken, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        expoPushToken: pushToken,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      console.error('[Notifications] Error registering token with backend');
    } else {
      console.log('[Notifications] Token registered successfully with backend');
    }
  } catch (error) {
    console.error('[Notifications] Error registering token:', error);
  }
}

export async function sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
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

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
