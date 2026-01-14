import { Order } from '@/constants/types';

const API_BASE = 'http://192.168.100.3:3000/api';

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

export async function validatePickupCode(
  orderId: string,
  pickupCode: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/validate-pickup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pickupCode: pickupCode.toUpperCase() }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.error || 'Código incorrecto' };
    }

    return { success: true, message: 'Recolección validada exitosamente' };
  } catch (error) {
    console.error('Error validating pickup code:', error);
    return { success: false, message: 'Error al validar código' };
  }
}

export async function validateDeliveryCode(
  orderId: string,
  deliveryCode: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/validate-delivery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deliveryCode: deliveryCode.toUpperCase() }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.error || 'Código incorrecto' };
    }

    return { success: true, message: 'Entrega validada exitosamente' };
  } catch (error) {
    console.error('Error validating delivery code:', error);
    return { success: false, message: 'Error al validar código' };
  }
}

export async function acceptOrder(
  orderId: string,
  estimatedPrepTime: number,
  token: string
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ estimatedPrepTime }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al aceptar orden');
  }

  return response.json();
}
