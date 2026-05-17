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
      .select('id, business_name, tonalli_slug, category, address, latitude, longitude, is_open, rating_average, preparation_time_minutes, logo_url, cover_url, phone, description, tonalli_linked')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error || !data) return [];

    return data.map((b: any) => ({
      id: b.id,
      name: b.business_name || 'Sin nombre',
      slug: b.tonalli_slug || null,
      category: b.category || 'restaurante',
      address: b.address || '',
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
      isOpen: b.is_open ?? true,
      rating: Number(b.rating_average) || 0,
      deliveryTimeMin: (b.preparation_time_minutes || 20) + 10,
      logoUrl: b.logo_url || null,
      coverUrl: b.cover_url || null,
      phone: b.phone || null,
      description: b.description || null,
      isTonalli: b.tonalli_linked === true,
    }));
  } catch {
    return [];
  }
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
