// TONALLI BRIDGE SERVICE
// Maneja la comunicacion entre Yesswera y Tonalli API
// Ref: C:\tonalli-yesswera-bridge\INTEGRATION-CONTRACT.md

import { supabase } from '@/constants/supabase';
import * as Crypto from 'expo-crypto';

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
// HMAC-SHA256 SIGNING
// =============================================

async function hmacSHA256(key: string, message: string): Promise<string> {
  // HMAC-SHA256 implementado con expo-crypto
  // HMAC(key, message) = H((key XOR opad) || H((key XOR ipad) || message))
  const BLOCK_SIZE = 64; // SHA-256 block size in bytes

  // Convert key to bytes
  let keyBytes = new Uint8Array(stringToBytes(key));

  // If key is longer than block size, hash it first
  if (keyBytes.length > BLOCK_SIZE) {
    const hashed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key
    );
    keyBytes = hexToBytes(hashed);
  }

  // Pad key to block size
  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(keyBytes);

  // Create inner and outer padded keys
  const ipad = new Uint8Array(BLOCK_SIZE);
  const opad = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  // Inner hash: H(ipad || message)
  const innerData = bytesToHex(ipad) + bytesToHex(new Uint8Array(stringToBytes(message)));
  const innerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hexToString(innerData),
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  // Outer hash: H(opad || innerHash)
  const outerData = bytesToHex(opad) + innerHash;
  const outerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hexToString(outerData),
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  return outerHash;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToString(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

/**
 * Firma un request para Tonalli con HMAC-SHA256
 * Formato: HMAC-SHA256(apiKey, "{timestamp}.{JSON body}")
 */
export async function signRequest(
  apiKey: string,
  body: object
): Promise<{ signature: string; timestamp: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const signature = await hmacSHA256(apiKey, payload);
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
