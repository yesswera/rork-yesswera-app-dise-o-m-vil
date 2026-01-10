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
