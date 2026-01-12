import { API_BASE } from '@/constants/api';
import * as ExpoLocation from 'expo-location';

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
  distance?: number;
  updatedAt: string;
}

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
  location: ExpoLocation.LocationObject,
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
        timestamp: location.timestamp,
      }),
    });

    if (!response.ok) {
      console.error('Error updating GPS location:', response.status);
    }
  } catch (error) {
    console.error('Error updating GPS location:', error);
  }
}
