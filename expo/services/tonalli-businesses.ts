// Service to fetch businesses for the map and listings
// Primary: Supabase (auto-synced from Tonalli via webhooks)
// Secondary: Tonalli public API (GET /api/v1/restaurants/nearby)

import { supabase } from '@/constants/supabase';

const TONALLI_API = 'https://api.tonalli.app/api/v1';

export interface MapBusiness {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  rating: number;
  deliveryTimeMin: number;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  description: string | null;
  isTonalli: boolean;
}

/**
 * Fetch businesses from Supabase + Tonalli API
 * Supabase has synced businesses, Tonalli API fills gaps
 */
export async function fetchBusinessesForMap(
  userLat?: number,
  userLng?: number,
): Promise<MapBusiness[]> {
  // Fetch from both sources in parallel
  const [supabaseBiz, tonalliBiz] = await Promise.all([
    fetchFromSupabase(),
    fetchFromTonalliAPI(userLat, userLng),
  ]);

  // Merge: Supabase is primary, Tonalli fills gaps (by slug dedup)
  const seen = new Set(supabaseBiz.map((b) => b.slug?.toLowerCase()).filter(Boolean));
  const merged = [...supabaseBiz];

  for (const tb of tonalliBiz) {
    if (tb.slug && seen.has(tb.slug.toLowerCase())) continue;
    merged.push(tb);
  }

  return merged;
}

async function fetchFromSupabase(): Promise<MapBusiness[]> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, tonalli_slug, category, address, location, is_open, rating_average, preparation_time_minutes, logo_url, cover_url, phone, description, tonalli_linked')
      .eq('is_open', true)
      .not('location', 'is', null);

    if (error || !data) return [];

    return data
      .map((b: any) => {
        const coords = parseLocation(b.location);
        if (!coords) return null;
        return {
          id: b.id,
          name: b.business_name || 'Sin nombre',
          slug: b.tonalli_slug || null,
          category: b.category || 'restaurante',
          address: b.address || '',
          latitude: coords.latitude,
          longitude: coords.longitude,
          isOpen: b.is_open ?? true,
          rating: Number(b.rating_average) || 0,
          deliveryTimeMin: (b.preparation_time_minutes || 20) + 10,
          logoUrl: b.logo_url || null,
          coverUrl: b.cover_url || null,
          phone: b.phone || null,
          description: b.description || null,
          isTonalli: b.tonalli_linked === true,
        };
      })
      .filter(Boolean) as MapBusiness[];
  } catch {
    return [];
  }
}

/** Parse PostGIS WKB hex or GeoJSON point to {lat, lng} */
function parseLocation(loc: any): { latitude: number; longitude: number } | null {
  if (!loc) return null;
  // GeoJSON format: { type: 'Point', coordinates: [lng, lat] }
  if (typeof loc === 'object' && loc.coordinates) {
    return { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
  }
  // WKB hex format (PostGIS via REST): starts with 0101000020E6100000
  if (typeof loc === 'string' && loc.startsWith('01')) {
    try {
      // WKB point: 01 (little-endian) 01000020E6100000 (point SRID 4326)
      // Then 8 bytes longitude (double) + 8 bytes latitude (double)
      const hex = loc;
      // SRID point WKB = 21 bytes header (42 hex chars) + 16 bytes coords (32 hex chars)
      // Byte layout: endian(1) + type(4) + SRID(4) + X(8) + Y(8) = 25 bytes = 50 hex
      // Or without SRID: endian(1) + type(4) + X(8) + Y(8) = 21 bytes = 42 hex
      let offset = 0;
      const endian = hex.substring(0, 2); // 01 = little-endian
      offset = 2;
      const typeHex = hex.substring(offset, offset + 8);
      offset += 8;
      // Check if SRID is included (type has 0x20000000 flag)
      const typeInt = endian === '01'
        ? parseInt(typeHex.match(/../g)!.reverse().join(''), 16)
        : parseInt(typeHex, 16);
      if (typeInt & 0x20000000) {
        offset += 8; // skip SRID (4 bytes = 8 hex)
      }
      const xHex = hex.substring(offset, offset + 16);
      offset += 16;
      const yHex = hex.substring(offset, offset + 16);

      const xBytes = xHex.match(/../g)!;
      const yBytes = yHex.match(/../g)!;
      if (endian === '01') { xBytes.reverse(); yBytes.reverse(); }

      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      xBytes.forEach((b, i) => view.setUint8(i, parseInt(b, 16)));
      const lng = view.getFloat64(0);
      yBytes.forEach((b, i) => view.setUint8(i, parseInt(b, 16)));
      const lat = view.getFloat64(0);

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchFromTonalliAPI(
  lat?: number,
  lng?: number,
): Promise<MapBusiness[]> {
  try {
    const qLat = lat || 19.942;
    const qLng = lng || -105.372;
    const url = `${TONALLI_API}/restaurants/nearby?lat=${qLat}&lng=${qLng}&radius=10`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const list = data.restaurants || data;
    if (!Array.isArray(list)) return [];

    return list.map((r: any) => {
      const config = r.config || {};
      return {
        id: r.id || r.slug || '',
        name: r.name || 'Sin nombre',
        slug: r.slug || null,
        category: r.businessType || r.type || 'restaurante',
        address: r.address || '',
        latitude: Number(r.latitude || qLat),
        longitude: Number(r.longitude || qLng),
        isOpen: true, // API doesn't return status, assume open
        rating: Number(r.rating || 0),
        deliveryTimeMin: Number(r.deliveryTime || 25),
        logoUrl: null,
        coverUrl: null,
        phone: r.phone || null,
        description: config.description || r.description || null,
        isTonalli: true,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Trigger a menu sync for all linked businesses
 */
export async function triggerMenuSync(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-tonalli-menu');
    return !error && data?.success;
  } catch {
    return false;
  }
}
