import { supabase } from '@/constants/supabase';
import { Order } from '@/constants/types';

// Helper to generate random 6-character code
function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Map database order to app Order type
function mapOrder(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    clientId: dbOrder.client_id,
    businessId: dbOrder.business_id,
    driverId: dbOrder.driver_id,
    serviceType: dbOrder.service_type,
    status: dbOrder.status,
    pickupAddress: dbOrder.pickup_address,
    deliveryAddress: dbOrder.delivery_address,
    deliveryInstructions: dbOrder.delivery_instructions,
    pickupCode: dbOrder.pickup_code,
    deliveryCode: dbOrder.delivery_code,
    subtotal: dbOrder.subtotal,
    deliveryFee: dbOrder.delivery_fee,
    tip: dbOrder.tip,
    total: dbOrder.total,
    paymentMethod: dbOrder.payment_method,
    paymentStatus: dbOrder.payment_status,
    estimatedPreparationMinutes: dbOrder.estimated_preparation_minutes,
    estimatedDeliveryMinutes: dbOrder.estimated_delivery_minutes,
    scheduledFor: dbOrder.scheduled_for,
    createdAt: dbOrder.created_at,
    acceptedAt: dbOrder.accepted_at,
    readyAt: dbOrder.ready_at,
    pickedUpAt: dbOrder.picked_up_at,
    deliveredAt: dbOrder.delivered_at,
    cancelledAt: dbOrder.cancelled_at,
    cancellationReason: dbOrder.cancellation_reason,
    // Related data if joined
    business: dbOrder.businesses,
    driver: dbOrder.drivers,
    items: dbOrder.order_items,
  };
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        businesses (id, business_name, address, logo_url),
        drivers (id, user_id, vehicle_type),
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

export async function getOrderById(orderId: string): Promise<Order> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        businesses (id, business_name, address, logo_url, phone),
        drivers (id, user_id, vehicle_type, rating_average),
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;

    return mapOrder(data);
  } catch (error) {
    console.error('getOrderById error:', error);
    throw error;
  }
}

export async function createOrder(orderData: {
  clientId: string;
  businessId: string;
  serviceType: 'food' | 'shopping' | 'delivery';
  deliveryAddress: string;
  deliveryInstructions?: string;
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
  paymentMethod: 'cash' | 'card' | 'wallet';
}): Promise<Order> {
  try {
    const total = orderData.subtotal + orderData.deliveryFee + (orderData.tip || 0);
    const pickupCode = generateCode();
    const deliveryCode = generateCode();

    // Get business address for pickup
    const { data: business } = await supabase
      .from('businesses')
      .select('address')
      .eq('id', orderData.businessId)
      .single();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: orderData.clientId,
        business_id: orderData.businessId,
        service_type: orderData.serviceType,
        status: 'pending',
        pickup_address: business?.address || '',
        delivery_address: orderData.deliveryAddress,
        delivery_instructions: orderData.deliveryInstructions,
        pickup_code: pickupCode,
        delivery_code: deliveryCode,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.deliveryFee,
        tip: orderData.tip || 0,
        total: total,
        payment_method: orderData.paymentMethod,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
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

    return mapOrder(order);
  } catch (error) {
    console.error('createOrder error:', error);
    throw error;
  }
}

export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', orderId);

    if (error) throw error;
  } catch (error) {
    console.error('cancelOrder error:', error);
    throw error;
  }
}

export async function getActiveOrders(userId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        businesses (id, business_name, address, logo_url),
        drivers (id, user_id, vehicle_type),
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

export async function validatePickupCode(
  orderId: string,
  pickupCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get order and verify code
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('pickup_code, status')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    if (order.pickup_code?.toUpperCase() !== pickupCode.toUpperCase()) {
      return { success: false, message: 'Codigo incorrecto' };
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'picked_up',
        picked_up_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return { success: true, message: 'Recoleccion validada exitosamente' };
  } catch (error) {
    console.error('validatePickupCode error:', error);
    return { success: false, message: 'Error al validar codigo' };
  }
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

    if (fetchError) throw fetchError;

    if (order.delivery_code?.toUpperCase() !== deliveryCode.toUpperCase()) {
      return { success: false, message: 'Codigo incorrecto' };
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
    return { success: false, message: 'Error al validar codigo' };
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

// Driver: Get available orders
export async function getAvailableOrdersForDriver(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        businesses (id, business_name, address, logo_url)
      `)
      .eq('status', 'ready')
      .is('driver_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapOrder);
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
      .select()
      .single();

    if (error) throw error;

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
    if (status === 'picked_up') updateData.picked_up_at = new Date().toISOString();
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
      .select()
      .single();

    if (error) throw error;

    return mapOrder(data);
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    throw error;
  }
}
