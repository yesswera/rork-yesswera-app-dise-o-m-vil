import { supabase } from '@/constants/supabase';
import { UserType } from '@/constants/types';

// ============================================
// TYPES
// ============================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: UserType;
  rating: number;
  createdAt: string;
  isActive: boolean;
  totalOrders?: number;
  // Extended fields for editing
  passwordHash?: string;
  addresses?: AdminAddress[];
}

export interface AdminAddress {
  id: string;
  userId: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export interface AdminBusiness {
  id: string;
  ownerId: string;
  ownerName: string;
  businessName: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  totalOrders: number;
  isOpen: boolean;
  createdAt: string;
}

export interface AdminDriver {
  id: string;
  userId: string;
  userName: string;
  email: string;
  phone: string;
  vehicleType: string;
  licensePlate: string;
  isOnline: boolean;
  isVerified: boolean;
  rating: number;
  totalDeliveries: number;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  businessId: string | null;
  businessName: string | null;
  driverId: string | null;
  driverName: string | null;
  serviceType: string;
  status: string;
  total: number;
  deliveryFee: number;
  deliveryAddress: string;
  pickupAddress: string | null;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
}

export interface AdminOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface AdminStats {
  totalUsers: number;
  totalClients: number;
  totalDrivers: number;
  totalBusinesses: number;
  totalAdmins: number;
  newUsersToday: number;
  totalOrders: number;
  ordersToday: number;
  ordersInProgress: number;
  averageRating: number;
  totalRevenue: number;
  revenueToday: number;
}

export interface DailyOrderSummary {
  date: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

// ============================================
// STATISTICS
// ============================================

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    // Parallel queries for all stats
    const [
      usersResult,
      clientsResult,
      driversResult,
      businessesResult,
      adminsResult,
      newTodayResult,
      ordersResult,
      ordersTodayResult,
      ordersInProgressResult,
      revenueResult,
      revenueTodayResult,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('user_type', 'client'),
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('user_type', 'admin'),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'in_transit']),
      supabase.from('orders').select('total').eq('status', 'delivered'),
      supabase.from('orders').select('total').eq('status', 'delivered').gte('created_at', todayStart),
    ]);

    const totalRevenue = (revenueResult.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const revenueToday = (revenueTodayResult.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

    // Get average rating
    const { data: ratingData } = await supabase
      .from('ratings')
      .select('overall_rating');
    const avgRating = ratingData?.length
      ? ratingData.reduce((sum, r) => sum + r.overall_rating, 0) / ratingData.length
      : 0;

    return {
      totalUsers: usersResult.count || 0,
      totalClients: clientsResult.count || 0,
      totalDrivers: driversResult.count || 0,
      totalBusinesses: businessesResult.count || 0,
      totalAdmins: adminsResult.count || 0,
      newUsersToday: newTodayResult.count || 0,
      totalOrders: ordersResult.count || 0,
      ordersToday: ordersTodayResult.count || 0,
      ordersInProgress: ordersInProgressResult.count || 0,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRevenue,
      revenueToday,
    };
  } catch (error) {
    console.error('getAdminStats error:', error);
    throw error;
  }
}

// ============================================
// USERS MANAGEMENT
// ============================================

export async function getAllUsers(filter?: UserType, search?: string): Promise<AdminUser[]> {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter) {
      query = query.eq('user_type', filter);
    }

    const { data, error } = await query;
    if (error) throw error;

    let users = (data || []).map(mapUser);

    // Apply search filter client-side
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.phone.includes(search)
      );
    }

    return users;
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw error;
  }
}

export async function getUserById(userId: string): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data ? mapUser(data) : null;
  } catch (error) {
    console.error('getUserById error:', error);
    return null;
  }
}

export async function getUserAddresses(userId: string): Promise<AdminAddress[]> {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw error;

    return (data || []).map(a => ({
      id: a.id,
      userId: a.user_id,
      label: a.label || 'Sin etiqueta',
      address: a.address,
      latitude: a.latitude,
      longitude: a.longitude,
      isDefault: a.is_default,
    }));
  } catch (error) {
    console.error('getUserAddresses error:', error);
    return [];
  }
}

export async function updateUser(userId: string, updates: {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}): Promise<void> {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.full_name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('updateUser error:', error);
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('deleteUser error:', error);
    throw error;
  }
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  try {
    // Use Supabase Auth Admin API to reset password
    // This requires service_role key which should be configured server-side
    // For now, we use the admin user update endpoint
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      // Fallback: store temp password in users table for manual reset
      console.warn('Auth admin API failed, using fallback:', error);
      const { error: dbError } = await supabase
        .from('users')
        .update({
          password_reset_pending: true,
          temp_password: newPassword
        })
        .eq('id', userId);

      if (dbError) throw dbError;
    }
  } catch (error) {
    console.error('resetUserPassword error:', error);
    throw error;
  }
}

export async function activateUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('activateUser error:', error);
    throw error;
  }
}

export async function updateUserType(userId: string, userType: UserType): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ user_type: userType })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('updateUserType error:', error);
    throw error;
  }
}

export async function hardDeleteUser(userId: string): Promise<void> {
  try {
    // First delete related records
    await supabase.from('addresses').delete().eq('user_id', userId);
    await supabase.from('push_tokens').delete().eq('user_id', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);

    // Then delete the user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    // Also delete from auth if possible
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authError) {
      console.warn('Could not delete auth user:', authError);
    }
  } catch (error) {
    console.error('hardDeleteUser error:', error);
    throw error;
  }
}

// ============================================
// BUSINESSES MANAGEMENT
// ============================================

export async function getAllBusinesses(search?: string): Promise<AdminBusiness[]> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        users:owner_id (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let businesses = (data || []).map(mapBusiness);

    if (search) {
      const searchLower = search.toLowerCase();
      businesses = businesses.filter(b =>
        b.businessName.toLowerCase().includes(searchLower) ||
        b.category.toLowerCase().includes(searchLower)
      );
    }

    return businesses;
  } catch (error) {
    console.error('getAllBusinesses error:', error);
    throw error;
  }
}

export async function getBusinessById(businessId: string): Promise<AdminBusiness | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        users:owner_id (full_name)
      `)
      .eq('id', businessId)
      .single();

    if (error) throw error;
    return data ? mapBusiness(data) : null;
  } catch (error) {
    console.error('getBusinessById error:', error);
    return null;
  }
}

export async function updateBusiness(businessId: string, updates: {
  businessName?: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isOpen?: boolean;
}): Promise<void> {
  try {
    const updateData: any = {};
    if (updates.businessName !== undefined) updateData.business_name = updates.businessName;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.isOpen !== undefined) updateData.is_open = updates.isOpen;

    const { error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId);

    if (error) throw error;
  } catch (error) {
    console.error('updateBusiness error:', error);
    throw error;
  }
}

export async function deleteBusiness(businessId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('businesses')
      .update({ is_open: false })
      .eq('id', businessId);

    if (error) throw error;
  } catch (error) {
    console.error('deleteBusiness error:', error);
    throw error;
  }
}

// ============================================
// DRIVERS MANAGEMENT
// ============================================

export async function getAllDrivers(search?: string): Promise<AdminDriver[]> {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        users:user_id (full_name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let drivers = (data || []).map(mapDriver);

    if (search) {
      const searchLower = search.toLowerCase();
      drivers = drivers.filter(d =>
        d.userName.toLowerCase().includes(searchLower) ||
        d.email.toLowerCase().includes(searchLower) ||
        d.licensePlate.toLowerCase().includes(searchLower)
      );
    }

    return drivers;
  } catch (error) {
    console.error('getAllDrivers error:', error);
    throw error;
  }
}

export async function getDriverById(driverId: string): Promise<AdminDriver | null> {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        users:user_id (full_name, email, phone)
      `)
      .eq('id', driverId)
      .single();

    if (error) throw error;
    return data ? mapDriver(data) : null;
  } catch (error) {
    console.error('getDriverById error:', error);
    return null;
  }
}

export async function updateDriver(driverId: string, updates: {
  vehicleType?: string;
  licensePlate?: string;
  isVerified?: boolean;
  isOnline?: boolean;
}): Promise<void> {
  try {
    const updateData: any = {};
    if (updates.vehicleType !== undefined) updateData.vehicle_type = updates.vehicleType;
    if (updates.licensePlate !== undefined) updateData.license_plate = updates.licensePlate;
    if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;
    if (updates.isOnline !== undefined) updateData.is_online = updates.isOnline;

    const { error } = await supabase
      .from('drivers')
      .update(updateData)
      .eq('id', driverId);

    if (error) throw error;
  } catch (error) {
    console.error('updateDriver error:', error);
    throw error;
  }
}

export async function deleteDriver(driverId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('drivers')
      .update({ is_online: false, is_verified: false })
      .eq('id', driverId);

    if (error) throw error;
  } catch (error) {
    console.error('deleteDriver error:', error);
    throw error;
  }
}

// ============================================
// ORDERS MANAGEMENT
// ============================================

export async function getAllOrders(filters?: {
  status?: string;
  serviceType?: string;
  dateFrom?: string;
  dateTo?: string;
}, search?: string): Promise<AdminOrder[]> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        client:client_id (full_name, phone),
        business:business_id (business_name),
        driver:driver_id (user_id),
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.serviceType) {
      query = query.eq('service_type', filters.serviceType);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get driver names if needed
    const orders = await Promise.all((data || []).map(async (order) => {
      let driverName = null;
      if (order.driver?.user_id) {
        const { data: driverUser } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', order.driver.user_id)
          .single();
        driverName = driverUser?.full_name || null;
      }
      return mapOrder(order, driverName);
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      return orders.filter(o =>
        o.clientName.toLowerCase().includes(searchLower) ||
        o.id.toLowerCase().includes(searchLower) ||
        (o.businessName?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    return orders;
  } catch (error) {
    console.error('getAllOrders error:', error);
    throw error;
  }
}

export async function getOrdersInProgress(): Promise<AdminOrder[]> {
  return getAllOrders({
    status: undefined, // We'll filter for multiple statuses
  }).then(orders =>
    orders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'in_transit'].includes(o.status))
  );
}

export async function getTodayOrders(): Promise<AdminOrder[]> {
  const today = new Date().toISOString().split('T')[0];
  return getAllOrders({ dateFrom: `${today}T00:00:00` });
}

export async function getOrderById(orderId: string): Promise<AdminOrder | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:client_id (full_name, phone),
        business:business_id (business_name),
        driver:driver_id (user_id),
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;

    let driverName = null;
    if (data?.driver?.user_id) {
      const { data: driverUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', data.driver.user_id)
        .single();
      driverName = driverUser?.full_name || null;
    }

    return data ? mapOrder(data, driverName) : null;
  } catch (error) {
    console.error('getOrderById error:', error);
    return null;
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    throw error;
  }
}

export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;
  } catch (error) {
    console.error('cancelOrder error:', error);
    throw error;
  }
}

// ============================================
// DAILY REPORTS
// ============================================

export async function getDailyOrderSummary(days: number = 7): Promise<DailyOrderSummary[]> {
  try {
    const summaries: DailyOrderSummary[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = `${dateStr}T00:00:00`;
      const dayEnd = `${dateStr}T23:59:59`;

      const [totalResult, completedResult, cancelledResult, revenueResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .gte('created_at', dayStart).lte('created_at', dayEnd).eq('status', 'delivered'),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .gte('created_at', dayStart).lte('created_at', dayEnd).eq('status', 'cancelled'),
        supabase.from('orders').select('total')
          .gte('created_at', dayStart).lte('created_at', dayEnd).eq('status', 'delivered'),
      ]);

      summaries.push({
        date: dateStr,
        totalOrders: totalResult.count || 0,
        completedOrders: completedResult.count || 0,
        cancelledOrders: cancelledResult.count || 0,
        totalRevenue: (revenueResult.data || []).reduce((sum, o) => sum + (o.total || 0), 0),
      });
    }

    return summaries;
  } catch (error) {
    console.error('getDailyOrderSummary error:', error);
    throw error;
  }
}

// ============================================
// MAPPERS
// ============================================

function mapUser(db: any): AdminUser {
  return {
    id: db.id,
    name: db.full_name || 'Sin nombre',
    email: db.email || '',
    phone: db.phone || '',
    userType: db.user_type || 'client',
    rating: Number(db.rating_average) || 0,
    createdAt: db.created_at,
    isActive: db.is_active !== false,
    totalOrders: db.total_orders,
  };
}

function mapBusiness(db: any): AdminBusiness {
  return {
    id: db.id,
    ownerId: db.owner_id,
    ownerName: db.users?.full_name || 'Desconocido',
    businessName: db.business_name,
    category: db.category || 'general',
    description: db.description || '',
    address: db.address || '',
    phone: db.phone || '',
    email: db.email || '',
    rating: Number(db.rating_average) || 0,
    totalOrders: db.total_orders || 0,
    isOpen: db.is_open !== false,
    createdAt: db.created_at,
  };
}

function mapDriver(db: any): AdminDriver {
  return {
    id: db.id,
    userId: db.user_id,
    userName: db.users?.full_name || 'Desconocido',
    email: db.users?.email || '',
    phone: db.users?.phone || '',
    vehicleType: db.vehicle_type || 'moto',
    licensePlate: db.license_plate || '',
    isOnline: db.is_online === true,
    isVerified: db.is_verified === true,
    rating: Number(db.rating_average) || 0,
    totalDeliveries: db.total_deliveries || 0,
    createdAt: db.created_at,
  };
}

function mapOrder(db: any, driverName: string | null): AdminOrder {
  return {
    id: db.id,
    clientId: db.client_id,
    clientName: db.client?.full_name || 'Cliente',
    clientPhone: db.client?.phone || '',
    businessId: db.business_id,
    businessName: db.business?.business_name || null,
    driverId: db.driver_id,
    driverName,
    serviceType: db.service_type || 'food',
    status: db.status,
    total: Number(db.total) || 0,
    deliveryFee: Number(db.delivery_fee) || 0,
    deliveryAddress: db.delivery_address || '',
    pickupAddress: db.pickup_address,
    createdAt: db.created_at,
    updatedAt: db.updated_at || db.created_at,
    items: (db.order_items || []).map((item: any) => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
    })),
  };
}

// ============================================
// SEED DATA - Productos de prueba
// ============================================

const PRODUCTS_BY_CATEGORY: Record<string, Array<{
  name: string;
  description: string;
  price: number;
}>> = {
  farmacia: [
    { name: 'Paracetamol 500mg (20 tabs)', description: 'Analgésico y antipirético', price: 45 },
    { name: 'Ibuprofeno 400mg (10 tabs)', description: 'Antiinflamatorio', price: 65 },
    { name: 'Alcohol 96° (250ml)', description: 'Para desinfección', price: 28 },
    { name: 'Gasas estériles (10 pzas)', description: 'Para curaciones', price: 35 },
    { name: 'Vendas elásticas (5m)', description: 'Para vendajes', price: 42 },
    { name: 'Curitas surtidas (100 pzas)', description: 'Banditas adhesivas', price: 55 },
    { name: 'Vitamina C 1g (30 tabs)', description: 'Suplemento vitamínico', price: 89 },
    { name: 'Antigripal (10 sobres)', description: 'Para síntomas de gripa', price: 78 },
    { name: 'Suero oral (1L)', description: 'Rehidratación', price: 32 },
    { name: 'Termómetro digital', description: 'Medición de temperatura', price: 125 },
    { name: 'Gel antibacterial (500ml)', description: 'Desinfectante de manos', price: 65 },
    { name: 'Cubrebocas KN95 (10 pzas)', description: 'Protección respiratoria', price: 95 },
  ],
  abarrotes: [
    { name: 'Arroz (1kg)', description: 'Arroz blanco de grano largo', price: 28 },
    { name: 'Frijol negro (1kg)', description: 'Frijol negro queretano', price: 35 },
    { name: 'Aceite vegetal (1L)', description: 'Aceite para cocinar', price: 42 },
    { name: 'Azúcar (1kg)', description: 'Azúcar estándar', price: 32 },
    { name: 'Sal de mesa (1kg)', description: 'Sal refinada', price: 15 },
    { name: 'Harina de trigo (1kg)', description: 'Para pan y tortillas', price: 28 },
    { name: 'Pasta spaghetti (200g)', description: 'Pasta italiana', price: 18 },
    { name: 'Atún en agua (140g)', description: 'Atún enlatado', price: 24 },
    { name: 'Leche entera (1L)', description: 'Leche pasteurizada', price: 26 },
    { name: 'Huevos (12 pzas)', description: 'Huevos frescos de rancho', price: 48 },
    { name: 'Café soluble (200g)', description: 'Café instantáneo', price: 85 },
    { name: 'Galletas Marías (400g)', description: 'Galletas tradicionales', price: 32 },
    { name: 'Pan Bimbo (mediano)', description: 'Pan de caja blanco', price: 45 },
    { name: 'Mayonesa (400g)', description: 'Mayonesa con limón', price: 55 },
    { name: 'Salsa Valentina (370ml)', description: 'Salsa picante mexicana', price: 22 },
  ],
  ferreteria: [
    { name: 'Martillo de uña', description: 'Martillo de acero con mango de madera', price: 125 },
    { name: 'Desarmadores (juego 6 pzas)', description: 'Planos y de cruz', price: 145 },
    { name: 'Pinzas de presión', description: 'Pinzas ajustables', price: 95 },
    { name: 'Cinta de aislar (10m)', description: 'Cinta aislante negra', price: 28 },
    { name: 'Tornillos surtidos (100 pzas)', description: 'Varios tamaños', price: 55 },
    { name: 'Clavos 2" (100g)', description: 'Clavos para madera', price: 22 },
    { name: 'Flexómetro 5m', description: 'Cinta métrica retráctil', price: 75 },
    { name: 'Nivel de burbuja (30cm)', description: 'Nivel de aluminio', price: 85 },
    { name: 'Llave inglesa 10"', description: 'Llave ajustable', price: 165 },
    { name: 'Silicón transparente', description: 'Sellador multiusos', price: 65 },
    { name: 'Brocha 3"', description: 'Para pintura', price: 45 },
    { name: 'Foco LED 9W', description: 'Foco ahorrador luz blanca', price: 55 },
  ],
  carniceria: [
    { name: 'Bistec de res (kg)', description: 'Corte delgado para asar', price: 185 },
    { name: 'Carne molida de res (kg)', description: 'Molida fresca', price: 155 },
    { name: 'Costilla de res (kg)', description: 'Para caldos y asados', price: 145 },
    { name: 'Pechuga de pollo (kg)', description: 'Sin hueso', price: 98 },
    { name: 'Pierna de pollo (kg)', description: 'Con muslo', price: 65 },
    { name: 'Milanesa de pollo (kg)', description: 'Empanizada lista', price: 125 },
    { name: 'Chuleta de cerdo (kg)', description: 'Con hueso', price: 125 },
    { name: 'Chorizo casero (kg)', description: 'Chorizo rojo estilo Jalisco', price: 145 },
    { name: 'Tocino (500g)', description: 'Rebanado', price: 95 },
    { name: 'Longaniza (kg)', description: 'Longaniza fresca', price: 135 },
  ],
  tienda: [
    { name: 'Coca-Cola (600ml)', description: 'Refresco de cola', price: 22 },
    { name: 'Sabritas clásicas', description: 'Papas fritas', price: 25 },
    { name: 'Gansito', description: 'Pastelito Marinela', price: 18 },
    { name: 'Recarga Telcel $50', description: 'Tiempo aire', price: 50 },
    { name: 'Agua Ciel (1L)', description: 'Agua purificada', price: 15 },
    { name: 'Cerveza XX Lager (355ml)', description: 'Cerveza clara', price: 25 },
    { name: 'Chicles Trident', description: 'Chicle sin azúcar', price: 15 },
    { name: 'Hot Dog preparado', description: 'Con todo', price: 35 },
    { name: 'Café preparado', description: 'Café americano caliente', price: 25 },
    { name: 'Doritos Nacho', description: 'Totopos con queso', price: 28 },
  ],
  electronica: [
    { name: 'Cable USB-C (1m)', description: 'Cable de carga rápida', price: 85 },
    { name: 'Audífonos Bluetooth', description: 'Inalámbricos con micrófono', price: 350 },
    { name: 'Cargador USB dual', description: 'Cargador de pared 2 puertos', price: 145 },
    { name: 'Power Bank 10000mAh', description: 'Batería portátil', price: 450 },
    { name: 'Funda para celular', description: 'Silicón transparente universal', price: 65 },
    { name: 'Mica de cristal templado', description: 'Protector de pantalla', price: 85 },
    { name: 'Mouse inalámbrico', description: 'Mouse USB 2.4GHz', price: 185 },
    { name: 'Memoria USB 32GB', description: 'Pendrive', price: 145 },
    { name: 'Bocina Bluetooth', description: 'Bocina portátil', price: 385 },
    { name: 'Cable HDMI (2m)', description: 'Cable HD 1080p', price: 125 },
  ],
  supermercado: [
    { name: 'Canasta básica familiar', description: 'Arroz, frijol, aceite, sal, huevos', price: 250 },
    { name: 'Frutas surtidas (2kg)', description: 'Manzana, plátano, naranja', price: 85 },
    { name: 'Verduras surtidas (2kg)', description: 'Tomate, cebolla, chile, limón', price: 75 },
    { name: 'Paquete de limpieza', description: 'Jabón, cloro, detergente, escoba', price: 185 },
    { name: 'Leche (6 pack 1L)', description: 'Leche entera UHT', price: 135 },
    { name: 'Cereal de caja (500g)', description: 'Corn Flakes', price: 75 },
    { name: 'Yogurt (4 pack)', description: 'Yogurt natural o sabor', price: 55 },
    { name: 'Queso Oaxaca (500g)', description: 'Queso para quesadillas', price: 95 },
    { name: 'Jamón de pavo (500g)', description: 'Jamón bajo en grasa', price: 85 },
    { name: 'Tortillas de maíz (1kg)', description: 'Tortillas frescas', price: 22 },
    { name: 'Refrescos (6 pack 355ml)', description: 'Coca, Fanta o Sprite', price: 85 },
    { name: 'Papel higiénico (12 rollos)', description: 'Doble hoja', price: 125 },
  ],
};

export async function seedProductsForBusiness(businessId: string, category: string): Promise<number> {
  try {
    // Map category to products
    const categoryMap: Record<string, string> = {
      farmacia: 'farmacia',
      abarrotes: 'abarrotes',
      ferreteria: 'ferreteria',
      ferretería: 'ferreteria',
      carniceria: 'carniceria',
      carnicería: 'carniceria',
      tienda: 'tienda',
      oxxo: 'tienda',
      electronica: 'electronica',
      electrónica: 'electronica',
      supermercado: 'supermercado',
      super: 'supermercado',
    };

    const normalizedCategory = categoryMap[category.toLowerCase()] || 'abarrotes';
    const products = PRODUCTS_BY_CATEGORY[normalizedCategory] || PRODUCTS_BY_CATEGORY.abarrotes;

    // Insert products
    const insertData = products.map(p => ({
      business_id: businessId,
      name: p.name,
      description: p.description,
      price: p.price,
      is_available: true,
    }));

    const { error } = await supabase
      .from('products')
      .insert(insertData);

    if (error) throw error;

    return products.length;
  } catch (error) {
    console.error('seedProductsForBusiness error:', error);
    throw error;
  }
}

export async function seedAllShoppingBusinesses(): Promise<{ businessName: string; productsAdded: number }[]> {
  try {
    // Get all businesses that don't have products yet
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, business_name, category');

    if (bizError) throw bizError;

    const results: { businessName: string; productsAdded: number }[] = [];

    for (const biz of (businesses || [])) {
      // Check if business already has products
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', biz.id);

      if ((count || 0) === 0 && biz.category) {
        const added = await seedProductsForBusiness(biz.id, biz.category);
        results.push({ businessName: biz.business_name, productsAdded: added });
      }
    }

    return results;
  } catch (error) {
    console.error('seedAllShoppingBusinesses error:', error);
    throw error;
  }
}
