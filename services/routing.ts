// ============================================================================
// YESSWERA: ROUTING SERVICE
// Obtiene rutas reales (siguiendo calles) usando OSRM (gratuito)
// Alternativa sin costo a Google Directions API
// ============================================================================

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RouteResult {
  coordinates: Coordinate[];
  distanceKm: number;
  durationMin: number;
}

/**
 * Decodifica un polyline encoded string (formato Google/OSRM)
 */
function decodePolyline(encoded: string): Coordinate[] {
  const coords: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coords;
}

/**
 * Obtiene ruta real entre dos puntos usando OSRM (gratuito, sin API key)
 * Fallback: linea recta si OSRM no responde
 */
export async function getRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`OSRM error: ${response.status}`);

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const coordinates = decodePolyline(route.geometry);

    return {
      coordinates,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch (error) {
    console.warn('OSRM routing failed, using straight line:', error);
    // Fallback: linea recta
    return {
      coordinates: [origin, destination],
      distanceKm: haversineDistance(origin, destination),
      durationMin: 0,
    };
  }
}

/**
 * Distancia haversine entre dos puntos (km)
 */
function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return Math.round(R * c * 10) / 10;
}
