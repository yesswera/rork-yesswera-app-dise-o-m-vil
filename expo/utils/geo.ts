// Parsea ubicaciones PostGIS que pueden venir como WKB hex o GeoJSON

export function parseLocation(location: any): { latitude: number; longitude: number } | null {
  if (!location) return null;

  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (typeof location === 'object' && location.coordinates) {
    const coords = location.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return { latitude: coords[1], longitude: coords[0] };
    }
  }

  // WKB hex format: "0101000020E6100000..."
  if (typeof location === 'string' && location.length >= 42) {
    return parseWKBPoint(location);
  }

  return null;
}

function parseWKBPoint(wkb: string): { latitude: number; longitude: number } | null {
  try {
    // WKB with SRID: 01 01000020 E6100000 <8-byte-x> <8-byte-y>
    // WKB without SRID: 01 01000000 <8-byte-x> <8-byte-y>
    const typeHex = wkb.substring(2, 10);
    const hasSRID = typeHex === '01000020' || typeHex === '20000001';
    const offset = hasSRID ? 18 : 10;

    const xHex = wkb.substring(offset, offset + 16);
    const yHex = wkb.substring(offset + 16, offset + 32);

    const longitude = hexToFloat64(xHex);
    const latitude = hexToFloat64(yHex);

    if (isNaN(longitude) || isNaN(latitude)) return null;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

function hexToFloat64(hex: string): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return new DataView(bytes.buffer).getFloat64(0, true); // little-endian
}
