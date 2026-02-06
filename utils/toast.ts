export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
}

interface QueuedToast {
  message: string;
  type: ToastType;
  duration: number;
}

let toastCallback: ((toast: QueuedToast) => void) | null = null;

export function registerToastCallback(callback: (toast: QueuedToast) => void) {
  toastCallback = callback;
}

class ToastManager {
  show(message: string, type: ToastType = 'info', options?: ToastOptions) {
    const duration = options?.duration || 3000;
    if (toastCallback) {
      toastCallback({ message, type, duration });
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
}

export const Toast = new ToastManager();

// Función de conveniencia para compatibilidad
export function showToast(message: string, type: ToastType = 'info', duration?: number) {
  Toast.show(message, type, duration ? { duration } : undefined);
}
