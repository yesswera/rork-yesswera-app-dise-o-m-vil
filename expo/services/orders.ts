import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';
import { parseLocation } from '@/utils/geo';
import {
  getBusinessTonalliConfig,
  createTonalliOrder,
  sendTonalliWebhook,
  mapYessweraEventToTonalli,
  type TonalliOrderItem,
} from '@/services/tonalli-bridge';

// Haversine distance in km (for payment routing)
function calculateHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Safe characters (no O/0/I/1 to avoid confusion)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// Generate all 4 verification codes (unique from each other)
function generateOrderCodes() {
  let driverCode = generateCode(4);
  let comandaCode = generateCode(4);
  let pickupCode = generateCode(4);
  let deliveryCode = generateCode(5);

  // Ensure all 4-char codes are different
  const used = new Set<string>();
  used.add(driverCode);
  while (used.has(comandaCode)) comandaCode = generateCode(4);
  used.add(comandaCode);
  while (used.has(pickupCode)) pickupCode = generateCode(4);
  used.add(pickupCode);
  while (deliveryCode.startsWith(driverCode) || deliveryCode.startsWith(comandaCode) || deliveryCode.startsWith(pickupCode)) {
    deliveryCode = generateCode(5);
  }

  return { driverCode, comandaCode, pickupCode, deliveryCode };
}

// Map database order to app Order type
function mapOrder(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number || `ORD-${dbOrder.id}`,
    type: dbOrder.service_type || 'food',
    status: dbOrder.status,
    createdAt: new Date(dbOrder.created_at),
    deliveredAt: dbOrder.delivered_at ? new Date(dbOrder.delivered_at) : undefined,
    customerId: dbOrder.client_id,
    customerName: dbOrder.users?.full_name || 'Cliente',
    customerPhone: dbOrder.users?.phone || '',
    driverId: dbOrder.driver_id,
    driverName: dbOrder.drivers?.users?.full_name,
    driverPhone: dbOrder.drivers?.users?.phone,
    driverRating: dbOrder.drivers?.rating_average,
    businessId: dbOrder.business_id,
    businessName: dbOrder.businesses?.business_name,
    items: (dbOrder.order_items || []).map((item: any) => ({
      id: item.id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.unit_price,
    })),
    subtotal: dbOrder.subtotal,
    deliveryFee: dbOrder.delivery_fee || 0,
    total: dbOrder.total,
    pickupAddress: dbOrder.pickup_address,
    deliveryAddress: dbOrder.delivery_address,
    notes: dbOrder.delivery_instructions,
    cancelReason: dbOrder.cancellation_reason,
    rated: dbOrder.rated || false,
    paymentMethod: dbOrder.payment_method || 'cash',
    paymentStatus: dbOrder.payment_status || 'pending',
    driverCode: dbOrder.driver_code || '',
    comandaCode: dbOrder.comanda_code || '',
    deliveryCode: dbOrder.delivery_code || '',
    pickupCode: dbOrder.pickup_code || '',
    driverVerification: {
      validated: !!dbOrder.driver_verified_at,
      validatedAt: dbOrder.driver_verified_at,
    },
    pickupValidation: {
      validated: !!dbOrder.picked_up_at,
      validatedAt: dbOrder.picked_up_at,
    },
    deliveryValidation: {
      validated: !!dbOrder.delivered_at,
      validatedAt: dbOrder.delivered_at,
    },
    // Parse PostGIS locations using geo utility
    pickupLocation: parseLocation(dbOrder.pickup_location) || undefined,
    deliveryLocation: parseLocation(dbOrder.delivery_location) || { latitude: 0, longitude: 0 },
    driverAtBusiness: !!dbOrder.driver_at_business,
    // Distance & payment routing
    distanceKm: dbOrder.distance_km ? Number(dbOrder.distance_km) : undefined,
    paymentRouting: dbOrder.payment_routing || 'cash_debt',
    // Priority client system
    isPriorityClient: dbOrder.is_priority_client || false,
    priorityReason: dbOrder.priority_reason,
    // Timeout tracking
    timeoutAt: dbOrder.timeout_at,
    cancellationReason: dbOrder.cancellation_reason,
    // Driver transfer
    needsDriverTransfer: dbOrder.needs_driver_transfer || false,
    transferReason: dbOrder.transfer_reason,
    // Package details (for delivery orders)
    packageDetails: dbOrder.package_details,
    // Tonalli integration
    tonalliOrderId: dbOrder.tonalli_order_id || undefined,
    tonalliPickupConfirmed: dbOrder.tonalli_pickup_confirmed || false,
  };
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:client_id (full_name, phone),
        businesses (id, business_name, address, logo_url),
        drivers (id, user_id, vehicle_type, rating_average, users:user_id (full_name, phone)),
        order_items (*)
      `)
      .eq('client_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapOrder);
  } catch (error) {
    console.error('getUserOrders error:', error);
    throw error;
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:client_id (full_name, phone),
        businesses (id, business_name, address, logo_url, phone),
        drivers (id, user_id, vehicle_type, rating_average, users:user_id (full_name, phone)),
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return mapOrder(data);
  } catch (error) {
    console.error('getOrderById error:', error);
    throw error;
  }
}

export async function createOrder(orderData: {
  clientId: string;
  businessId: string | null; // null para lista general de compras o delivery
  serviceType: 'food' | 'shopping' | 'delivery';
  deliveryAddress: string;
  deliveryInstructions?: string;
  pickupAddress?: string; // Para delivery/mensajería
  pickupLocation?: { latitude: number; longitude: number }; // Coordenadas de recogida
  deliveryLocation?: { latitude: number; longitude: number }; // Coordenadas de entrega
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    variants?: any;
    specialInstructions?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  tip?: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  // Package delivery specific fields
  packageDetails?: {
    type: string;
    size: string;
    weight: string;
    isFragile: boolean;
    description: string;
    recipientName?: string;
    recipientPhone?: string;
    isMinorRecipient?: boolean;
    minorDetails?: {
      name: string;
      age: string;
      relationship: string;
      authorizedBy: string;
    };
  };
}): Promise<Order> {
  try {
    const total = orderData.subtotal + orderData.deliveryFee + (orderData.tip || 0);
    const { driverCode, comandaCode, pickupCode, deliveryCode } = generateOrderCodes();

    // Get pickup address: from param, from business, or empty
    let pickupAddress = orderData.pickupAddress || '';
    if (!pickupAddress && orderData.businessId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('address')
        .eq('id', orderData.businessId)
        .single();
      pickupAddress = business?.address || '';
    }

    // Build PostGIS point strings if coordinates provided
    const pickupPoint = orderData.pickupLocation
      ? `POINT(${orderData.pickupLocation.longitude} ${orderData.pickupLocation.latitude})`
      : null;
    const deliveryPoint = orderData.deliveryLocation
      ? `POINT(${orderData.deliveryLocation.longitude} ${orderData.deliveryLocation.latitude})`
      : null;

    // Calculate distance between pickup and delivery if both coordinates available
    let distanceKm: number | null = null;
    let paymentRouting: 'cash_debt' | 'prepaid_transfer' = 'cash_debt';

    if (orderData.pickupLocation && orderData.deliveryLocation) {
      distanceKm = calculateHaversineKm(
        orderData.pickupLocation.latitude,
        orderData.pickupLocation.longitude,
        orderData.deliveryLocation.latitude,
        orderData.deliveryLocation.longitude
      );
      paymentRouting = distanceKm < 5 ? 'cash_debt' : 'prepaid_transfer';
    } else if (orderData.businessId) {
      // Try to get business location for distance calculation
      try {
        const { data: bizLoc } = await supabase
          .from('businesses')
          .select('location')
          .eq('id', orderData.businessId)
          .single();
        if (bizLoc?.location?.coordinates && orderData.deliveryLocation) {
          distanceKm = calculateHaversineKm(
            bizLoc.location.coordinates[1],
            bizLoc.location.coordinates[0],
            orderData.deliveryLocation.latitude,
            orderData.deliveryLocation.longitude
          );
          paymentRouting = distanceKm < 5 ? 'cash_debt' : 'prepaid_transfer';
        }
      } catch {
        // Non-critical, default to cash_debt
      }
    }

    // Create order
    const insertData: Record<string, any> = {
      client_id: orderData.clientId,
      business_id: orderData.businessId, // puede ser null para lista general
      service_type: orderData.serviceType,
      status: orderData.businessId ? 'pending' : 'ready', // Lista general va directo a drivers
      pickup_address: pickupAddress,
      delivery_address: orderData.deliveryAddress,
      delivery_instructions: orderData.deliveryInstructions,
      driver_code: driverCode,
      comanda_code: comandaCode,
      pickup_code: pickupCode,
      delivery_code: deliveryCode,
      subtotal: orderData.subtotal,
      delivery_fee: orderData.deliveryFee,
      tip: orderData.tip || 0,
      total: total,
      payment_method: orderData.paymentMethod,
      payment_status: 'pending',
      distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
      payment_routing: paymentRouting,
    };

    // Add location points if available
    if (pickupPoint) insertData.pickup_location = pickupPoint;
    if (deliveryPoint) insertData.delivery_location = deliveryPoint;

    // Add package details as JSON if it's a delivery order
    if (orderData.packageDetails) {
      insertData.package_details = orderData.packageDetails;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertData)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items ONLY if not a delivery/package order
    // Delivery orders don't have real products - package info is in package_details JSON
    if (orderData.serviceType !== 'delivery' && orderData.items.length > 0) {
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        variants_json: item.variants,
        special_instructions: item.specialInstructions,
        subtotal: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
    }

    // === TONALLI BRIDGE: Enviar orden a Tonalli si el negocio esta vinculado ===
    if (orderData.businessId && orderData.serviceType === 'food') {
      try {
        const tonalliConfig = await getBusinessTonalliConfig(orderData.businessId);
        if (tonalliConfig) {
          // Mapear items de Yesswera a items de Tonalli usando tonalli_product_id
          const { data: productsWithTonalli } = await supabase
            .from('products')
            .select('id, tonalli_product_id')
            .in('id', orderData.items.map(i => i.productId))
            .not('tonalli_product_id', 'is', null);

          const tonalliProductMap = new Map(
            (productsWithTonalli || []).map(p => [p.id, p.tonalli_product_id])
          );

          // Solo enviar a Tonalli si TODOS los items tienen tonalli_product_id
          const tonalliItems: TonalliOrderItem[] = [];
          let allMapped = true;
          for (const item of orderData.items) {
            const tonalliProductId = tonalliProductMap.get(item.productId);
            if (!tonalliProductId) {
              allMapped = false;
              break;
            }
            tonalliItems.push({
              productId: tonalliProductId,
              quantity: item.quantity,
              notes: item.specialInstructions || '',
            });
          }

          if (allMapped && tonalliItems.length > 0) {
            // Obtener datos del cliente
            const { data: clientData } = await supabase
              .from('users')
              .select('full_name, phone')
              .eq('id', orderData.clientId)
              .single();

            const tonalliResponse = await createTonalliOrder(
              tonalliConfig.tonalli_api_key,
              {
                slug: tonalliConfig.tonalli_slug,
                externalOrderId: order.id,
                items: tonalliItems,
                customerName: clientData?.full_name || 'Cliente Yesswera',
                customerPhone: clientData?.phone || '',
                deliveryAddress: orderData.deliveryAddress || '',
                notes: orderData.deliveryInstructions || '',
              }
            );

            if (tonalliResponse) {
              // Guardar el tonalli_order_id en la orden de Yesswera
              await supabase
                .from('orders')
                .update({ tonalli_order_id: tonalliResponse.tonalliOrderId })
                .eq('id', order.id);
            }
            // Si Tonalli falla, la orden ya existe en Supabase (fallback)
            // Un job posterior puede reintentar la sincronizacion
          }
        }
      } catch (tonalliError) {
        // Tonalli caido: la orden vive solo en Supabase por ahora
        console.warn('Tonalli bridge error (non-blocking):', tonalliError);
      }
    }

    // === PUSH NOTIFICATION: Notificar al negocio de nueva orden ===
    if (orderData.businessId) {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('user_id, business_name')
          .eq('id', orderData.businessId)
          .single();

        if (biz?.user_id) {
          await supabase.from('notifications').insert({
            user_id: biz.user_id,
            type: 'new_order',
            title: 'Nueva orden recibida',
            body: `Tienes un nuevo pedido por $${total.toFixed(2)}`,
            data_json: { orderId: order.id, total },
          });
        }
      } catch {
        // Non-critical
      }
    }

    return mapOrder(order);
  } catch (error) {
    console.error('createOrder error:', error);
    throw error;
  }
}

// === CANCELLATION SYSTEM ===

// Client cancels a pending/ready order (before driver accepts) — free, no penalty
export async function cancelPendingOrder(orderId: string, reason?: string): Promise<void> {
  try {
    // Verify order can be cancelled
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, driver_id')
      .eq('id', orderId)
      .single();

    if (fetchError?.code === 'PGRST116' || !order) throw new Error('Orden no encontrada');

    // Can cancel: pending OR ready without driver assigned
    const canCancel = order.status === 'pending' ||
      (order.status === 'ready' && !order.driver_id);

    if (!canCancel) {
      if (order.driver_id) {
        throw new Error('Ya hay un repartidor asignado. Contacta soporte para cancelar.');
      }
      throw new Error('Esta orden ya no puede cancelarse directamente.');
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Cancelado por cliente',
      })
      .eq('id', orderId)
      .in('status', ['pending', 'ready']); // Allow both statuses

    if (error) throw error;
  } catch (error) {
    console.error('cancelPendingOrder error:', error);
    throw error;
  }
}

// Business REJECTS a pending order (before accepting)
// This notifies the client with the reason so they can find alternatives
export const REJECTION_REASONS = {
  too_busy: 'Demasiados pedidos en este momento',
  out_of_stock: 'Ingredientes agotados',
  closing_soon: 'Estamos por cerrar',
  technical_issue: 'Problema tecnico',
  other: 'Otro motivo',
} as const;

export type RejectionReason = keyof typeof REJECTION_REASONS;

export async function businessRejectOrder(
  orderId: string,
  reason: RejectionReason,
  customMessage?: string
): Promise<void> {
  try {
    // Validate reason exists
    if (!reason || !REJECTION_REASONS[reason]) {
      throw new Error(`Motivo de rechazo invalido: ${reason}`);
    }

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, client_id')
      .eq('id', orderId)
      .single();

    if (fetchError?.code === 'PGRST116' || !order) throw new Error('Orden no encontrada');
    if (order.status !== 'pending') {
      throw new Error('Solo se pueden rechazar ordenes pendientes');
    }

    const reasonText = REJECTION_REASONS[reason];
    const fullReason = customMessage
      ? `Rechazado por negocio: ${reasonText} - ${customMessage}`
      : `Rechazado por negocio: ${reasonText}`;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: fullReason,
      })
      .eq('id', orderId)
      .eq('status', 'pending');

    if (error) throw error;

    // TODO: Send push notification to client about rejection
    // This would trigger the alternatives flow on the client side

  } catch (error) {
    console.error('businessRejectOrder error:', error);
    throw error;
  }
}

// Business cancels an accepted order (after client requests via chat)
// If driver is assigned, calculates compensation
export async function businessCancelOrder(
  orderId: string,
  reason?: string
): Promise<{ driverCompensation: number; clientRefund: number }> {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, driver:drivers!driver_id(user_id)')
      .eq('id', orderId)
      .single();

    if (fetchError?.code === 'PGRST116' || !order) throw new Error('Orden no encontrada');
    if (order.status === 'pending') throw new Error('Orden pendiente, el cliente puede cancelar directamente');
    if (order.status === 'delivered') throw new Error('Orden ya entregada, no se puede cancelar');
    if (order.status === 'cancelled') throw new Error('Orden ya cancelada');

    let driverCompensation = 0;
    const orderTotal = Number(order.total) || 0;

    // If driver is assigned, calculate compensation
    if (order.driver_id) {
      driverCompensation = calculateDriverCompensation(order);
    }

    const clientRefund = Math.max(0, orderTotal - driverCompensation);

    const cancellationDetail = [
      reason || 'Cancelado por negocio a solicitud del cliente',
      order.driver_id ? `| Compensación driver: $${driverCompensation.toFixed(2)}` : '',
      `| Reembolso cliente: $${clientRefund.toFixed(2)}`,
    ].filter(Boolean).join(' ');

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationDetail,
      })
      .eq('id', orderId);

    if (error) throw error;

    return { driverCompensation, clientRefund };
  } catch (error) {
    console.error('businessCancelOrder error:', error);
    throw error;
  }
}

// Calculate driver compensation based on time elapsed since assignment
// Formula: $15 base + ($4 × estimated km) + ($1 × minutes elapsed)
function calculateDriverCompensation(order: any): number {
  const BASE_FEE = 15; // MXN minimum
  const COST_PER_KM = 4; // MXN per km
  const COST_PER_MINUTE = 1; // MXN per minute

  // Time elapsed since order was accepted (driver likely started moving)
  const acceptedAt = order.accepted_at ? new Date(order.accepted_at) : null;
  const now = new Date();
  const minutesElapsed = acceptedAt
    ? Math.max(0, (now.getTime() - acceptedAt.getTime()) / 60000)
    : 0;

  // Estimate distance from delivery fee (reverse our formula: fee = $15 + $4*km)
  // If delivery_fee > 15, estimate km = (fee - 15) / 4
  const deliveryFee = Number(order.delivery_fee) || 0;
  const estimatedKm = deliveryFee > 15 ? (deliveryFee - 15) / 4 : 1;

  // Scale by how far in the process we are
  // assigned/driver_verified = driver going to business (partial distance)
  // in_transit = driver has product, going to client (more distance)
  const status = order.status;
  let distanceFactor = 0.5; // default: assume halfway

  if (['assigned'].includes(status)) {
    distanceFactor = 0.3; // just started going to business
  } else if (['picked_up', 'in_transit', 'arrived'].includes(status)) {
    distanceFactor = 0.8; // already picked up, most distance covered
  }

  const distanceCompensation = estimatedKm * distanceFactor * COST_PER_KM;
  const timeCompensation = minutesElapsed * COST_PER_MINUTE;

  const total = BASE_FEE + distanceCompensation + timeCompensation;

  // Cap at delivery fee (driver shouldn't earn more than the delivery fee)
  return Math.min(Math.round(total * 100) / 100, deliveryFee);
}

// Get estimated compensation (for UI display before business confirms)
export async function getEstimatedCompensation(orderId: string): Promise<{
  driverCompensation: number;
  clientRefund: number;
  hasDriver: boolean;
}> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) return { driverCompensation: 0, clientRefund: 0, hasDriver: false };

  const hasDriver = !!order.driver_id;
  const driverCompensation = hasDriver ? calculateDriverCompensation(order) : 0;
  const clientRefund = Math.max(0, (Number(order.total) || 0) - driverCompensation);

  return { driverCompensation, clientRefund, hasDriver };
}

// Legacy wrapper (keep backward compatibility)
export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (error?.code === 'PGRST116' || !order) throw new Error('Orden no encontrada');

  if (order?.status === 'pending') {
    await cancelPendingOrder(orderId, reason);
  } else {
    await businessCancelOrder(orderId, reason);
  }
}

export async function getActiveOrders(userId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:client_id (full_name, phone),
        businesses (id, business_name, address, logo_url),
        drivers (id, user_id, vehicle_type, rating_average, users:user_id (full_name, phone)),
        order_items (*)
      `)
      .eq('client_id', userId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapOrder);
  } catch (error) {
    console.error('getActiveOrders error:', error);
    throw error;
  }
}

// Business validates driver identity (Step 4: driver shows driverCode)
export async function validateDriverCode(
  orderId: string,
  driverCode: string
): Promise<{ success: boolean; message: string; comandaCode?: string }> {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('driver_code, comanda_code, status')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return { success: false, message: 'Orden no encontrada' };
      throw fetchError;
    }

    if (order.driver_code?.toUpperCase() !== driverCode.toUpperCase()) {
      return { success: false, message: 'Código de repartidor incorrecto' };
    }

    // Update status to driver_verified
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'driver_verified',
        driver_verified_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Repartidor verificado',
      comandaCode: order.comanda_code,
    };
  } catch (error) {
    console.error('validateDriverCode error:', error);
    return { success: false, message: 'Error al validar código' };
  }
}

// Driver confirms pickup after being verified (Step 6)
export async function confirmPickup(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'in_transit',
        picked_up_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    return { success: true, message: 'Recogida confirmada, en camino al cliente' };
  } catch (error) {
    console.error('confirmPickup error:', error);
    return { success: false, message: 'Error al confirmar recogida' };
  }
}

// Driver confirms arrival at CLIENT's location (for delivery)
export async function confirmArrivalAtClient(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'arrived',
      })
      .eq('id', orderId);

    if (error) throw error;

    return { success: true, message: 'Llegada confirmada, el cliente fue notificado' };
  } catch (error) {
    console.error('confirmArrivalAtClient error:', error);
    return { success: false, message: 'Error al confirmar llegada' };
  }
}

// Driver confirms arrival at BUSINESS (waiting for order to be ready)
export async function confirmArrivalAtBusiness(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        driver_at_business: true,
        driver_arrived_at_business_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    return { success: true, message: 'Llegada al negocio confirmada' };
  } catch (error) {
    console.error('confirmArrivalAtBusiness error:', error);
    return { success: false, message: 'Error al confirmar llegada' };
  }
}

// Business validates pickup code and hands order to driver
export async function validatePickupAndHandover(
  orderId: string,
  pickupCode: string
): Promise<{ success: boolean; message: string; comandaCode?: string }> {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('comanda_code, status, driver_at_business')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return { success: false, message: 'Orden no encontrada' };
      throw fetchError;
    }

    if (order.status !== 'ready') {
      return { success: false, message: 'La orden aún no está lista' };
    }

    if (!order.driver_at_business) {
      return { success: false, message: 'El repartidor aún no ha llegado' };
    }

    if (order.comanda_code?.toUpperCase() !== pickupCode.toUpperCase()) {
      return { success: false, message: 'Código de recolección incorrecto' };
    }

    // Update status to handed_to_driver
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'handed_to_driver',
        handed_to_driver_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Código verificado. Entrega el pedido al repartidor.',
      comandaCode: order.comanda_code,
    };
  } catch (error) {
    console.error('validatePickupAndHandover error:', error);
    return { success: false, message: 'Error al validar código' };
  }
}

// Driver confirms they received the order from business
export async function confirmOrderReceived(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'in_transit',
        picked_up_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    return { success: true, message: 'Orden recibida. En camino al cliente.' };
  } catch (error) {
    console.error('confirmOrderReceived error:', error);
    return { success: false, message: 'Error al confirmar recepción' };
  }
}

// Legacy alias for backward compatibility
export async function confirmArrival(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  return confirmArrivalAtClient(orderId);
}

// Legacy: kept for backward compatibility
export async function validatePickupCode(
  orderId: string,
  pickupCode: string
): Promise<{ success: boolean; message: string }> {
  return validateDriverCode(orderId, pickupCode);
}

export async function validateDeliveryCode(
  orderId: string,
  deliveryCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get order and verify code
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('delivery_code, status')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return { success: false, message: 'Orden no encontrada' };
      throw fetchError;
    }

    if (order.delivery_code?.toUpperCase() !== deliveryCode.toUpperCase()) {
      return { success: false, message: 'Código incorrecto' };
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        payment_status: 'paid',
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return { success: true, message: 'Entrega validada exitosamente' };
  } catch (error) {
    console.error('validateDeliveryCode error:', error);
    return { success: false, message: 'Error al validar código' };
  }
}

export async function acceptOrder(
  orderId: string,
  estimatedPrepTime: number
): Promise<Order> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        estimated_preparation_minutes: estimatedPrepTime,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // === PUSH NOTIFICATION: Notificar al cliente que su orden fue aceptada ===
    try {
      if (data.client_id) {
        await supabase.from('notifications').insert({
          user_id: data.client_id,
          type: 'order_accepted',
          title: 'Orden aceptada',
          body: `Tu pedido esta siendo preparado. Tiempo estimado: ${estimatedPrepTime} min`,
          data_json: { orderId, estimatedPrepTime },
        });
      }
    } catch {
      // Non-critical
    }

    return mapOrder(data);
  } catch (error) {
    console.error('acceptOrder error:', error);
    throw error;
  }
}

// Business: Get pending orders
export async function getBusinessOrders(businessId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:client_id (full_name, phone),
        drivers (id, user_id, vehicle_type, rating_average, users:user_id (full_name, phone)),
        order_items (*)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapOrder);
  } catch (error) {
    console.error('getBusinessOrders error:', error);
    throw error;
  }
}

// Driver: Get available orders (unassigned ready + assigned to this driver)
export async function getAvailableOrdersForDriver(driverId?: string): Promise<Order[]> {
  try {
    // 1. Unassigned orders in 'ready' status (pool general)
    const { data: poolOrders, error: poolError } = await supabase
      .from('orders')
      .select(`
        *,
        users:client_id (full_name, phone),
        businesses (id, business_name, address, logo_url)
      `)
      .eq('status', 'ready')
      .is('driver_id', null)
      .order('created_at', { ascending: true });

    if (poolError) throw poolError;

    let assignedOrders: any[] = [];

    // 2. Orders auto-assigned to this driver (status 'assigned')
    if (driverId) {
      const { data: myOrders, error: myError } = await supabase
        .from('orders')
        .select(`
          *,
          users:client_id (full_name, phone),
          businesses (id, business_name, address, logo_url)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'assigned')
        .order('created_at', { ascending: true });

      if (!myError && myOrders) {
        assignedOrders = myOrders;
      }
    }

    // Assigned orders first (priority), then pool
    const all = [...assignedOrders, ...(poolOrders || [])];
    return all.map(mapOrder);
  } catch (error) {
    console.error('getAvailableOrdersForDriver error:', error);
    throw error;
  }
}

// Driver: Accept/assign order to self
export async function assignOrderToDriver(orderId: string, driverId: string): Promise<Order> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        status: 'assigned',
      })
      .eq('id', orderId)
      .select('*, businesses(id, business_name, tonalli_slug, tonalli_linked, tonalli_api_key)')
      .single();

    if (error) throw error;

    // === PUSH NOTIFICATION: Notificar al cliente que un repartidor tomó su orden ===
    try {
      if (data.client_id) {
        await supabase.from('notifications').insert({
          user_id: data.client_id,
          type: 'driver_assigned',
          title: 'Repartidor asignado',
          body: 'Un repartidor recogerá tu pedido pronto',
          data_json: { orderId },
        });
      }
    } catch {
      // Non-critical
    }

    // === TONALLI WEBHOOK: Enviar driver_assigned con codigos de verificacion ===
    try {
      if (data.tonalli_order_id && data.businesses?.tonalli_linked && data.businesses?.tonalli_api_key) {
        // Get driver info
        const { data: driver } = await supabase
          .from('drivers')
          .select('id, vehicle_type, users:user_id(full_name, phone)')
          .eq('id', driverId)
          .single();

        const driverUser = driver?.users as any;
        await sendTonalliWebhook(data.businesses.tonalli_api_key, {
          slug: data.businesses.tonalli_slug,
          event: 'driver_assigned',
          externalOrderId: orderId,
          data: {
            driverName: driverUser?.full_name || 'Repartidor Yesswera',
            driverPhone: driverUser?.phone || '',
            driverVehicle: driver?.vehicle_type || 'moto',
            driverCode: data.driver_code,
            pickupCode: data.pickup_code,
          },
        });
      }
    } catch (webhookErr) {
      console.warn('Tonalli driver_assigned webhook failed (non-critical):', webhookErr);
    }

    return mapOrder(data);
  } catch (error) {
    console.error('assignOrderToDriver error:', error);
    throw error;
  }
}

// Driver: Get assigned orders
export async function getDriverOrders(driverId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:client_id (full_name, phone),
        businesses (id, business_name, address, logo_url, phone)
      `)
      .eq('driver_id', driverId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapOrder);
  } catch (error) {
    console.error('getDriverOrders error:', error);
    throw error;
  }
}

// Update order status (generic)
export async function updateOrderStatus(
  orderId: string,
  status: string,
  additionalFields?: Record<string, any>
): Promise<Order> {
  try {
    const updateData: Record<string, any> = { status };

    // Add timestamp based on status
    if (status === 'accepted') updateData.accepted_at = new Date().toISOString();
    if (status === 'ready') updateData.ready_at = new Date().toISOString();
    if (status === 'driver_verified') updateData.driver_verified_at = new Date().toISOString();
    if (status === 'picked_up' || status === 'in_transit') updateData.picked_up_at = new Date().toISOString();
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();
    if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString();

    // Merge additional fields
    if (additionalFields) {
      Object.assign(updateData, additionalFields);
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*, businesses(id, tonalli_slug, tonalli_linked, tonalli_api_key)')
      .single();

    if (error) throw error;

    // === PUSH NOTIFICATIONS: Notificar al cliente/driver segun status ===
    try {
      const pushNotifs: Array<{ user_id: string; type: string; title: string; body: string; data_json: any }> = [];

      if (status === 'ready' && data.client_id) {
        pushNotifs.push({
          user_id: data.client_id,
          type: 'order_ready',
          title: 'Tu pedido esta listo',
          body: 'Un repartidor lo recogerá pronto',
          data_json: { orderId },
        });
      }

      if ((status === 'picked_up' || status === 'in_transit') && data.client_id) {
        pushNotifs.push({
          user_id: data.client_id,
          type: 'order_in_transit',
          title: 'Tu pedido va en camino',
          body: 'El repartidor recogió tu pedido y se dirige hacia ti',
          data_json: { orderId },
        });
      }

      if (status === 'driver_arrived' && data.client_id) {
        pushNotifs.push({
          user_id: data.client_id,
          type: 'driver_arrived',
          title: 'El repartidor llego',
          body: 'Tu repartidor esta en tu ubicacion',
          data_json: { orderId },
        });
      }

      if (status === 'delivered' && data.client_id) {
        pushNotifs.push({
          user_id: data.client_id,
          type: 'order_delivered',
          title: 'Pedido entregado',
          body: 'Tu pedido fue entregado. Califica el servicio!',
          data_json: { orderId },
        });
      }

      if (status === 'cancelled' && data.client_id) {
        pushNotifs.push({
          user_id: data.client_id,
          type: 'order_cancelled',
          title: 'Pedido cancelado',
          body: 'Tu pedido fue cancelado',
          data_json: { orderId },
        });
      }

      if (pushNotifs.length > 0) {
        await supabase.from('notifications').insert(pushNotifs);
      }
    } catch {
      // Non-critical, don't block order status update
    }

    // === TONALLI BRIDGE: Notificar a Tonalli de cambios de status del driver ===
    if (data.tonalli_order_id && data.businesses?.tonalli_linked) {
      const webhookEvent = mapYessweraEventToTonalli(status);
      if (webhookEvent) {
        const webhookData: Record<string, any> = {};

        // Agregar datos relevantes segun el evento
        if (webhookEvent === 'driver_assigned' && additionalFields) {
          webhookData.driverName = additionalFields.driverName;
          webhookData.driverPhone = additionalFields.driverPhone;
          webhookData.driverVehicle = additionalFields.driverVehicle;
          webhookData.estimatedMinutes = additionalFields.estimatedMinutes;
          // Codigos de verificacion para pickup
          webhookData.driverCode = data.driver_code;
          webhookData.pickupCode = data.pickup_code;
        }

        // Agregar datos de verificacion de entrega
        if (webhookEvent === 'delivered') {
          webhookData.deliveredAt = data.delivered_at || new Date().toISOString();
          webhookData.deliveryCodeUsed = !!data.delivery_validation?.validated;
          webhookData.deliveryVerifiedAt = data.delivery_validation?.validatedAt || null;
        }

        sendTonalliWebhook(data.businesses.tonalli_api_key, {
          slug: data.businesses.tonalli_slug,
          event: webhookEvent,
          externalOrderId: orderId,
          data: webhookData,
        }).catch((err: any) => console.warn('Tonalli webhook error (non-blocking):', err));
      }
    }

    return mapOrder(data);
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    throw error;
  }
}
