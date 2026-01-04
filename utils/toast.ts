import { Alert, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom';
}

class ToastManager {
  show(message: string, type: ToastType = 'info', options?: ToastOptions) {
    if (Platform.OS === 'web') {
      Alert.alert(
        this.getTitle(type),
        message,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        this.getTitle(type),
        message,
        [{ text: 'OK' }]
      );
    }
  }

  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  }

  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }

  private getTitle(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✅ Éxito';
      case 'error':
        return '❌ Error';
      case 'warning':
        return '⚠️ Advertencia';
      case 'info':
      default:
        return 'ℹ️ Información';
    }
  }
}

export const Toast = new ToastManager();
