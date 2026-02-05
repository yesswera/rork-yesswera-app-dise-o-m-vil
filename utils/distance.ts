interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371;
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateETA(
  driverLocation: Coordinates,
  destination: Coordinates,
  averageSpeed: number = 30
): number {
  const distanceKm = calculateDistance(driverLocation, destination);
  const timeHours = distanceKm / averageSpeed;
  const timeMinutes = Math.ceil(timeHours * 60);
  
  return Math.max(timeMinutes, 2);
}

export function formatETA(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Calculate delivery fee based on distance
 * Formula: $15 base + $4 per km after first 2km
 * Fase 1: Sin comisiones (GRATIS para negocios)
 */
export function calculateDeliveryFee(distanceKm: number): number {
  const BASE_FEE = 15; // MXN mínimo
  const COST_PER_KM = 4; // MXN por km después de 2km
  const FREE_KM = 2;

  if (distanceKm <= FREE_KM) return BASE_FEE;
  return Math.round((BASE_FEE + (distanceKm - FREE_KM) * COST_PER_KM) * 100) / 100;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
