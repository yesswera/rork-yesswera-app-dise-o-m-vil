/**
 * Configuración global de la app
 * Optimizada para ser ligera y eficiente
 */

// Cache settings
export const CACHE_CONFIG = {
  // Imágenes: tiempo de caché (ms)
  images: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    staleWhileRevalidate: 24 * 60 * 60 * 1000, // 1 día
  },
  // Datos: tiempo de caché para React Query (ms)
  data: {
    businesses: 5 * 60 * 1000, // 5 minutos
    products: 5 * 60 * 1000, // 5 minutos
    orders: 30 * 1000, // 30 segundos (más frecuente)
    user: 10 * 60 * 1000, // 10 minutos
    addresses: 30 * 60 * 1000, // 30 minutos
  },
  // Stale time - cuando consideramos datos "viejos"
  staleTime: {
    businesses: 2 * 60 * 1000, // 2 minutos
    products: 2 * 60 * 1000,
    orders: 10 * 1000, // 10 segundos
    user: 5 * 60 * 1000,
  },
};

// Pagination settings
export const PAGINATION = {
  defaultPageSize: 20,
  ordersPageSize: 15,
  productsPageSize: 30,
};

// API retry settings
export const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  timeout: 30000, // 30 segundos
};

// Analytics events to track
export const ANALYTICS_EVENTS = {
  // Screen views
  SCREEN_VIEW: 'screen_view',

  // User actions
  SEARCH: 'search',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  CHECKOUT_START: 'checkout_start',
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',

  // Business interactions
  BUSINESS_VIEW: 'business_view',
  PRODUCT_VIEW: 'product_view',
  CATEGORY_VIEW: 'category_view',

  // Driver actions
  DRIVER_ONLINE: 'driver_online',
  DRIVER_OFFLINE: 'driver_offline',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
};

// Feature flags (se pueden actualizar remotamente)
export const FEATURE_FLAGS = {
  enableAnalytics: true,
  enablePushNotifications: true,
  enableGPS: true,
  enableOfflineMode: false, // Para futuro
  showDebugInfo: __DEV__,
};

// App version
export const APP_VERSION = {
  version: '1.0.0',
  buildNumber: 1,
  minSupportedVersion: '1.0.0',
};
