export const API_BASE = 'http://192.168.100.3:3000/api';

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE}/login`,
    register: `${API_BASE}/register`,
    logout: `${API_BASE}/logout`,
  },

  addresses: {
    getUserAddresses: (userId: string) => `${API_BASE}/addresses/user/${userId}`,
    create: `${API_BASE}/addresses`,
    update: (addressId: string) => `${API_BASE}/addresses/${addressId}`,
    delete: (addressId: string) => `${API_BASE}/addresses/${addressId}`,
    setDefault: (addressId: string) => `${API_BASE}/addresses/${addressId}/default`,
  },

  orders: {
    getActive: (userId: string) => `${API_BASE}/orders/user/${userId}/active`,
    getAll: (userId: string) => `${API_BASE}/orders/user/${userId}`,
    getById: (orderId: string) => `${API_BASE}/orders/${orderId}`,
    create: `${API_BASE}/orders`,
    cancel: (orderId: string) => `${API_BASE}/orders/${orderId}/cancel`,
    validatePickup: (orderId: string) => `${API_BASE}/orders/${orderId}/validate-pickup`,
    validateDelivery: (orderId: string) => `${API_BASE}/orders/${orderId}/validate-delivery`,
  },

  gps: {
    getLocation: (orderId: string) => `${API_BASE}/gps/${orderId}`,
    updateLocation: (orderId: string) => `${API_BASE}/gps/${orderId}`,
  },

  driver: {
    profile: (driverId: string) => `${API_BASE}/driver/profile/${driverId}`,
    stats: (driverId: string) => `${API_BASE}/driver/stats/${driverId}`,
    earnings: (driverId: string, period: string) => `${API_BASE}/driver/earnings/${driverId}?period=${period}`,
    ratings: (driverId: string) => `${API_BASE}/driver/ratings/${driverId}`,
    settlements: (driverId: string) => `${API_BASE}/driver/settlements/${driverId}`,
    confirmSettlement: `${API_BASE}/driver/settlements/confirm`,
    workPhone: {
      setup: `${API_BASE}/driver/work-phone/setup`,
      verify: `${API_BASE}/driver/work-phone/verify`,
      change: `${API_BASE}/driver/work-phone/change`,
    },
  },

  business: {
    profile: (businessId: string) => `${API_BASE}/business/profile/${businessId}`,
    products: (businessId: string) => `${API_BASE}/business/${businessId}/products`,
    product: (businessId: string, productId: string) => `${API_BASE}/business/${businessId}/products/${productId}`,
    productAvailability: (businessId: string, productId: string) => `${API_BASE}/business/${businessId}/products/${productId}/availability`,
    categories: (businessId: string) => `${API_BASE}/business/${businessId}/categories`,
    category: (businessId: string, categoryId: string) => `${API_BASE}/business/${businessId}/categories/${categoryId}`,
    settlements: (businessId: string) => `${API_BASE}/business/${businessId}/settlements`,
    settlement: (settlementId: string) => `${API_BASE}/business/settlement/${settlementId}`,
    schedule: (businessId: string) => `${API_BASE}/business/${businessId}/schedule`,
    deliveryConfig: (businessId: string) => `${API_BASE}/business/${businessId}/delivery-config`,
  },

  security: {
    reportThreat: `${API_BASE}/security/report-threat`,
    panic: `${API_BASE}/security/panic`,
    phoneRegistry: (phoneNumber: string) => `${API_BASE}/security/phone-registry/${phoneNumber}`,
  },

  notifications: {
    registerToken: `${API_BASE}/notifications/register-token`,
    send: `${API_BASE}/notifications/send`,
  },
};
