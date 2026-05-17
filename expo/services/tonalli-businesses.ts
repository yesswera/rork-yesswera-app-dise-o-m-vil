// Service to fetch businesses for the map and listings
// Data comes from Supabase (auto-synced from Tonalli via webhooks)
// NO manual data, NO fallbacks — if it's not in Supabase, it doesn't show

import { supabase } from '@/constants/supabase';

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
 * Fetch all active businesses with coordinates from Supabase
 * These are auto-synced from Tonalli via register-tonalli-business webhook
 */
export async function fetchBusinessesForMap(): Promise<MapBusiness[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name, tonalli_slug, category, address, latitude, longitude, is_open, rating_average, preparation_time_minutes, logo_url, cover_url, phone, description, tonalli_linked')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error || !data) {
    console.error('Error fetching businesses for map:', error);
    return [];
  }

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
}

/**
 * Trigger a menu sync for a specific business
 * Calls the sync-tonalli-menu Edge Function
 */
export async function triggerMenuSync(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-tonalli-menu');
    return !error && data?.success;
  } catch {
    return false;
  }
}
