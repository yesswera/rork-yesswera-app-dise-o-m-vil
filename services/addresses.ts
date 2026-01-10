import { SavedAddress } from '@/constants/types';

const API_BASE = 'http://192.168.100.2:3000/api';

export async function getUserAddresses(userId: string, token: string): Promise<SavedAddress[]> {
  const response = await fetch(`${API_BASE}/addresses/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al obtener direcciones');
  return response.json();
}

export async function createAddress(data: Omit<SavedAddress, 'id' | 'createdAt'>, token: string): Promise<SavedAddress> {
  const response = await fetch(`${API_BASE}/addresses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear dirección');
  return response.json();
}

export async function updateAddress(addressId: string, data: Partial<SavedAddress>, token: string): Promise<SavedAddress> {
  const response = await fetch(`${API_BASE}/addresses/${addressId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar dirección');
  return response.json();
}

export async function deleteAddress(addressId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/addresses/${addressId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Error al eliminar dirección');
}

export async function setDefaultAddress(addressId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/addresses/${addressId}/default`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Error al cambiar dirección predeterminada');
}
