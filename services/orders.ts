import { Order } from '@/constants/types';

const API_BASE = 'http://192.168.100.2:3000/api';

export async function getUserOrders(userId: string, token: string): Promise<Order[]> {
  try {
    const response = await fetch(`${API_BASE}/orders/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error getting orders:', response.status, errorData);
      throw new Error(errorData.error || `Error ${response.status}: Error al obtener órdenes`);
    }

    return response.json();
  } catch (error) {
    console.error('getUserOrders error:', error);
    throw error;
  }
}

export async function getOrderById(orderId: string, token: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener orden');
  }

  return response.json();
}

export async function createOrder(orderData: any, token: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    throw new Error('Error al crear orden');
  }

  return response.json();
}

export async function cancelOrder(orderId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al cancelar orden');
  }
}

export async function getActiveOrders(userId: string, token: string): Promise<Order[]> {
  try {
    console.log('[getActiveOrders] Fetching for user:', userId);
    const response = await fetch(`${API_BASE}/orders/user/${userId}/active`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[getActiveOrders] Error:', response.status, errorData);
      throw new Error(errorData.error || `Error ${response.status}: Error al obtener órdenes activas`);
    }

    const data = await response.json();
    console.log('[getActiveOrders] Success, found', data.length, 'active orders');
    return data;
  } catch (error) {
    console.error('[getActiveOrders] Exception:', error);
    throw error;
  }
}
