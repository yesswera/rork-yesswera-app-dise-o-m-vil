// COVERAGE SERVICE
// Verifica si hay repartidores disponibles en una zona
// Usa Firebase para drivers online + Haversine para distancia

import { ref, get } from 'firebase/database';
import { realtimeDb } from '@/constants/firebase';
import { CoverageCheck } from '@/constants/types';

/**
 * Verifica si hay repartidores activos dentro de un radio
 * @param lat Latitud del punto central (ej: ubicacion del negocio)
 * @param lng Longitud del punto central
 * @param radiusKm Radio de busqueda en km (default: 5)
 * @returns { hasDrivers, count, nearestKm }
 */
export async function checkDriverCoverage(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<CoverageCheck> {
  try {
    const driversRef = ref(realtimeDb, 'drivers_location');
    const snapshot = await get(driversRef);
    const data = snapshot.val();

    if (!data) {
      return { hasDrivers: false, count: 0, nearestKm: null };
    }

    let count = 0;
    let nearestKm: number | null = null;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    for (const [, location] of Object.entries(data)) {
      if (!location || typeof location !== 'object') continue;

      const loc = location as any;
      const timestamp = new Date(loc.timestamp).getTime();

      // Solo drivers con ubicacion reciente (5 min)
      if (timestamp < fiveMinutesAgo) continue;

      const distanceKm = calculateDistanceKm(
        lat,
        lng,
        loc.latitude,
        loc.longitude
      );

      if (distanceKm <= radiusKm) {
        count++;
        if (nearestKm === null || distanceKm < nearestKm) {
          nearestKm = Math.round(distanceKm * 10) / 10;
        }
      }
    }

    return {
      hasDrivers: count > 0,
      count,
      nearestKm,
    };
  } catch (error) {
    console.error('checkDriverCoverage error:', error);
    return { hasDrivers: false, count: 0, nearestKm: null };
  }
}

/**
 * Calcula distancia entre dos puntos usando Haversine (en km)
 */
function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
