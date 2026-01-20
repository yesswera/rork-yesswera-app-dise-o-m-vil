import * as Location from 'expo-location';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface GPSResponse {
  location: DriverLocation;
  eta?: number;
}

const API_BASE = 'http://192.168.100.3:3000/api';

export async function getDriverLocation(orderId: string, token: string): Promise<GPSResponse> {
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

export async function updateDriverLocation(
  orderId: string,
  location: Location.LocationObject,
  token: string
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/gps/${orderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: new Date(location.timestamp).toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar ubicación');
    }
  } catch (error) {
    console.error('Error updating driver location:', error);
    throw error;
  }
}
