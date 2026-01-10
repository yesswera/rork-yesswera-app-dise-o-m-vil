export interface DriverLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

const API_BASE = 'http://192.168.100.2:3000/api';

export async function getDriverLocation(orderId: string, token: string): Promise<DriverLocation> {
  const response = await fetch(`${API_BASE}/gps/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener ubicación del repartidor');
  }

  return response.json();
}
