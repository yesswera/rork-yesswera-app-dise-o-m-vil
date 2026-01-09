import { Order } from '@/constants/types';

const API_BASE = 'https://192.168.100.3:3443/api';

export async function getUserOrders(userId: string, token: string): Promise<Order[]> {
  const response = await fetch(`${API_BASE}/orders/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener órdenes');
  }

  return response.json();
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
  const response = await fetch(`${API_BASE}/orders/user/${userId}/active`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener órdenes activas');
  }

  return response.json();
}
