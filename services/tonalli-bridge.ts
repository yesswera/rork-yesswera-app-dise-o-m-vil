// TONALLI BRIDGE SERVICE
// Maneja la comunicacion entre Yesswera y Tonalli API
// Ref: C:\tonalli-yesswera-bridge\INTEGRATION-CONTRACT.md

import { supabase } from '@/constants/supabase';

// =============================================
// CONFIGURACION
// =============================================

const TONALLI_BASE_URL = 'https://api.tonalli.app';
const TONALLI_API_PREFIX = '/api/v1';

// =============================================
// TIPOS
// =============================================

export interface TonalliBusinessConfig {
  tonalli_slug: string;
  tonalli_linked: boolean;
  tonalli_api_key: string;
}

export interface TonalliMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
}

export interface TonalliMenuCategory {
  id: string;
  name: string;
  description: string | null;
  products: TonalliMenuItem[];
}

export interface TonalliMenuResponse {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    config: Record<string, any>;
  };
  categories: TonalliMenuCategory[];
}

export interface TonalliOrderItem {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface TonalliCreateOrderRequest {
  slug: string;
  externalOrderId: string;
  items: TonalliOrderItem[];
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
}

export interface TonalliOrderResponse {
  tonalliOrderId: string;
  orderNumber: number;
  status: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes?: string;
  }>;
  subtotal: number;
  total: number;
  createdAt: string;
  externalOrderId?: string;
  confirmedAt?: string;
  deliveryMeta?: {
    driverName: string | null;
    driverPhone: string | null;
    estimatedMinutes: number | null;
  };
}

export type TonalliWebhookEvent =
  | 'driver_assigned'
  | 'driver_verified'
  | 'picked_up'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export interface TonalliWebhookPayload {
  slug: string; // Requerido por middleware HMAC de Tonalli
  event: TonalliWebhookEvent;
  externalOrderId: string;
  data: Record<string, any>;
}

// =============================================
// PURE JS SHA-256 + HMAC-SHA256 (no native modules)
// Compatible con Expo Go sin dev build
// =============================================

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number { return (x >>> n) | (x << (32 - n)); }
function ch(x: number, y: number, z: number): number { return (x & y) ^ (~x & z); }
function maj(x: number, y: number, z: number): number { return (x & y) ^ (x & z) ^ (y & z); }
function sigma0(x: number): number { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
function sigma1(x: number): number { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
function gamma0(x: number): number { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3); }
function gamma1(x: number): number { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10); }

function sha256(bytes: number[]): number[] {
  // Pre-processing: pad message
  const l = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // Append length as 64-bit big-endian
  for (let i = 56; i >= 0; i -= 8) bytes.push((l >>> i) & 0xff);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let off = 0; off < bytes.length; off += 64) {
    const w: number[] = [];
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) |
             (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + w[i]) | 0;
      const t2 = (sigma0(a) + maj(a, b, c)) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const result: number[] = [];
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach(h => {
    result.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
  });
  return result;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff);
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function hmacSHA256(key: string, message: string): string {
  const BLOCK_SIZE = 64;
  let keyBytes = stringToBytes(key);
  if (keyBytes.length > BLOCK_SIZE) keyBytes = sha256(keyBytes);
  while (keyBytes.length < BLOCK_SIZE) keyBytes.push(0);

  const ipad = keyBytes.map(b => b ^ 0x36);
  const opad = keyBytes.map(b => b ^ 0x5c);

  const inner = sha256([...ipad, ...stringToBytes(message)]);
  const outer = sha256([...opad, ...inner]);
  return bytesToHex(outer);
}

/**
 * Firma un request para Tonalli con HMAC-SHA256
 * Formato: HMAC-SHA256(apiKey, "{timestamp}.{JSON body}")
 */
export function signRequest(
  apiKey: string,
  body: object
): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const signature = hmacSHA256(apiKey, payload);
  return { signature, timestamp };
}

// =============================================
// BUSINESS CONFIG HELPERS
// =============================================

/**
 * Obtiene la configuracion Tonalli de un negocio
 * Retorna null si el negocio no esta vinculado
 */
export async function getBusinessTonalliConfig(
  businessId: string
): Promise<TonalliBusinessConfig | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('tonalli_slug, tonalli_linked, tonalli_api_key')
    .eq('id', businessId)
    .single();

  if (error || !data) return null;
  if (!data.tonalli_linked || !data.tonalli_slug || !data.tonalli_api_key) return null;

  return data as TonalliBusinessConfig;
}

// =============================================
// API CALLS
// =============================================

/**
 * Obtiene el menu de un restaurante en Tonalli
 * Este endpoint es PUBLICO (no requiere HMAC)
 */
export async function fetchTonalliMenu(
  slug: string
): Promise<TonalliMenuResponse | null> {
  try {
    const url = `${TONALLI_BASE_URL}${TONALLI_API_PREFIX}/menu/${slug}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(`fetchTonalliMenu error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('fetchTonalliMenu error:', error);
    return null;
  }
}

/**
 * Crea un pedido de delivery en Tonalli
 * POST /api/v1/delivery/orders (requiere HMAC auth)
 */
export async function createTonalliOrder(
  apiKey: string,
  orderData: TonalliCreateOrderRequest
): Promise<TonalliOrderResponse | null> {
  try {
    const { signature, timestamp } = await signRequest(apiKey, orderData);
    const url = `${TONALLI_BASE_URL}${TONALLI_API_PREFIX}/delivery/orders`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Yesswera-Signature': signature,
        'X-Yesswera-Timestamp': timestamp,
      },
      body: JSON.stringify(orderData),
    });

    const responseData = await response.json();

    // 201 = created (tambien para duplicados — Tonalli retorna 201 con la orden existente)
    if (response.status === 201) {
      return responseData;
    }

    console.error('createTonalliOrder error:', response.status, responseData);
    return null;
  } catch (error) {
    console.error('createTonalliOrder network error:', error);
    return null;
  }
}

/**
 * Consulta el status de una orden en Tonalli
 * GET /api/v1/delivery/orders/{tonalliOrderId} (requiere HMAC auth)
 */
export async function getTonalliOrderStatus(
  apiKey: string,
  slug: string,
  tonalliOrderId: string
): Promise<TonalliOrderResponse | null> {
  try {
    // GET requests: slug va como query param, firma usa JSON.stringify({slug})
    const bodyForSigning = { slug };
    const { signature, timestamp } = await signRequest(apiKey, bodyForSigning);
    const url = `${TONALLI_BASE_URL}${TONALLI_API_PREFIX}/delivery/orders/${tonalliOrderId}?slug=${encodeURIComponent(slug)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Yesswera-Signature': signature,
        'X-Yesswera-Timestamp': timestamp,
      },
    });

    if (!response.ok) {
      console.error('getTonalliOrderStatus error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('getTonalliOrderStatus network error:', error);
    return null;
  }
}

/**
 * Envia un webhook a Tonalli notificando eventos del delivery
 * POST /api/v1/delivery/webhook (requiere HMAC auth)
 *
 * Eventos validos:
 * - driver_assigned: Driver asignado al pedido
 * - driver_verified: Driver verificado en el negocio
 * - picked_up: Driver recogio la comida
 * - in_transit: Driver en camino al cliente
 * - arrived: Driver llego a la direccion del cliente
 * - delivered: Cliente recibio su pedido
 * - cancelled: Yesswera cancelo el pedido
 */
export async function sendTonalliWebhook(
  apiKey: string,
  payload: TonalliWebhookPayload
): Promise<boolean> {
  try {
    const { signature, timestamp } = await signRequest(apiKey, payload);
    const url = `${TONALLI_BASE_URL}${TONALLI_API_PREFIX}/delivery/webhook`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Yesswera-Signature': signature,
        'X-Yesswera-Timestamp': timestamp,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('sendTonalliWebhook error:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('sendTonalliWebhook network error:', error);
    return false;
  }
}

// =============================================
// STATUS MAPPING: Tonalli → Yesswera
// =============================================

/**
 * Mapea status de Tonalli al status de Yesswera
 * confirmed → accepted (restaurante acepto)
 * preparing → preparing (cocina trabajando)
 * ready → ready (comida lista - TRIGGER para buscar driver)
 */
export function mapTonalliStatusToYesswera(
  tonalliStatus: string
): string | null {
  const mapping: Record<string, string> = {
    confirmed: 'accepted',
    preparing: 'preparing',
    ready: 'ready',
  };
  return mapping[tonalliStatus] || null;
}

/**
 * Mapea evento de Yesswera al evento de webhook para Tonalli
 */
export function mapYessweraEventToTonalli(
  yessweraStatus: string
): TonalliWebhookEvent | null {
  const mapping: Record<string, TonalliWebhookEvent> = {
    assigned: 'driver_assigned',
    driver_verified: 'driver_verified',
    picked_up: 'picked_up',
    in_transit: 'in_transit',
    arrived: 'arrived',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return mapping[yessweraStatus] || null;
}

// =============================================
// POLLING HELPER
// =============================================

/**
 * Verifica si una orden de Tonalli cambio de status
 * y aplica la transicion correspondiente en Yesswera
 *
 * Retorna el nuevo status si cambio, null si no
 */
export async function pollTonalliOrderStatus(
  orderId: string,
  tonalliOrderId: string,
  businessId: string
): Promise<{ changed: boolean; newStatus?: string; triggerDriverSearch?: boolean }> {
  const config = await getBusinessTonalliConfig(businessId);
  if (!config) return { changed: false };

  const tonalliOrder = await getTonalliOrderStatus(
    config.tonalli_api_key,
    config.tonalli_slug,
    tonalliOrderId
  );
  if (!tonalliOrder) return { changed: false };

  const yessweraStatus = mapTonalliStatusToYesswera(tonalliOrder.status);
  if (!yessweraStatus) return { changed: false };

  // Obtener status actual en Yesswera
  const { data: currentOrder } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (!currentOrder || currentOrder.status === yessweraStatus) {
    return { changed: false };
  }

  // Actualizar status en Yesswera
  const updateData: Record<string, any> = { status: yessweraStatus };
  if (yessweraStatus === 'accepted') updateData.accepted_at = new Date().toISOString();
  if (yessweraStatus === 'ready') updateData.ready_at = new Date().toISOString();

  await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  // Si cambio a "ready", Yesswera debe buscar driver
  const triggerDriverSearch = yessweraStatus === 'ready';

  return { changed: true, newStatus: yessweraStatus, triggerDriverSearch };
}
