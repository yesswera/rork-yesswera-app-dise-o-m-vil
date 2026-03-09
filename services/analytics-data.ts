/**
 * Analytics Data Service
 * Recopila y consulta datos analíticos para el dashboard admin
 *
 * IMPORTANTE: Este servicio prepara la infraestructura para analytics.
 * Los datos se irán llenando conforme los usuarios usen la app.
 */

import { supabase } from '@/constants/supabase';

// ============================================
// TYPES
// ============================================

export interface ProductSales {
  productId: string;
  productName: string;
  businessId: string;
  businessName: string;
  totalSold: number;
  totalRevenue: number;
  lastSoldAt: string;
}

export interface HourlySales {
  hour: number;
  orderCount: number;
  revenue: number;
}

export interface DailySales {
  dayOfWeek: number; // 0=Domingo, 1=Lunes, etc.
  dayName: string;
  orderCount: number;
  revenue: number;
}

export interface BusinessAnalytics {
  businessId: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: ProductSales[];
  hourlySales: HourlySales[];
  dailySales: DailySales[];
  peakHour: number;
  peakDay: string;
}

export interface GlobalAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: ProductSales[];
  topBusinesses: { businessId: string; businessName: string; orderCount: number; revenue: number }[];
  searchTrends: { term: string; count: number }[];
  hourlySales: HourlySales[];
  dailySales: DailySales[];
}

// ============================================
// TRACK EVENTS
// ============================================

/**
 * Registra un evento de analytics
 * Se usa para recopilar datos de comportamiento
 */
export async function trackEvent(
  userId: string | null,
  eventType: string,
  eventData: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('analytics_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // No bloquear la app si falla el tracking
    console.error('Analytics track error:', error);
  }
}

/**
 * Registra una búsqueda para análisis de tendencias
 */
export async function trackSearch(
  userId: string | null,
  searchTerm: string,
  resultsCount: number
): Promise<void> {
  await trackEvent(userId, 'search', {
    term: searchTerm.toLowerCase().trim(),
    results_count: resultsCount,
  });
}

/**
 * Registra vista de producto
 */
export async function trackProductView(
  userId: string | null,
  productId: string,
  businessId: string
): Promise<void> {
  await trackEvent(userId, 'product_view', {
    product_id: productId,
    business_id: businessId,
  });
}

/**
 * Registra vista de negocio
 */
export async function trackBusinessView(
  userId: string | null,
  businessId: string
): Promise<void> {
  await trackEvent(userId, 'business_view', {
    business_id: businessId,
  });
}

// ============================================
// QUERY ANALYTICS - BUSINESS SPECIFIC
// ============================================

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Obtiene analytics completos de un negocio
 */
export async function getBusinessAnalytics(
  businessId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<BusinessAnalytics | null> {
  try {
    // Fechas por defecto: últimos 30 días
    const to = dateTo || new Date().toISOString();
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Obtener info del negocio
    const { data: business } = await supabase
      .from('businesses')
      .select('business_name')
      .eq('id', businessId)
      .single();

    if (!business) return null;

    // Obtener órdenes del negocio
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        created_at,
        status,
        order_items (
          product_id,
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('business_id', businessId)
      .eq('status', 'delivered')
      .gte('created_at', from)
      .lte('created_at', to);

    const ordersList = orders || [];

    // Calcular totales
    const totalOrders = ordersList.length;
    const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calcular productos más vendidos
    const productMap = new Map<string, { name: string; sold: number; revenue: number; lastSold: string }>();

    ordersList.forEach(order => {
      (order.order_items || []).forEach((item: any) => {
        const existing = productMap.get(item.product_id) || { name: item.product_name, sold: 0, revenue: 0, lastSold: '' };
        existing.sold += item.quantity;
        existing.revenue += item.quantity * item.unit_price;
        if (order.created_at > existing.lastSold) existing.lastSold = order.created_at;
        productMap.set(item.product_id, existing);
      });
    });

    const topProducts: ProductSales[] = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        businessId,
        businessName: business.business_name,
        totalSold: data.sold,
        totalRevenue: data.revenue,
        lastSoldAt: data.lastSold,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    // Calcular ventas por hora
    const hourlyMap = new Map<number, { count: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { count: 0, revenue: 0 });
    }

    ordersList.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const existing = hourlyMap.get(hour)!;
      existing.count++;
      existing.revenue += order.total || 0;
    });

    const hourlySales: HourlySales[] = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        orderCount: data.count,
        revenue: data.revenue,
      }));

    // Calcular ventas por día de la semana
    const dailyMap = new Map<number, { count: number; revenue: number }>();
    for (let d = 0; d < 7; d++) {
      dailyMap.set(d, { count: 0, revenue: 0 });
    }

    ordersList.forEach(order => {
      const day = new Date(order.created_at).getDay();
      const existing = dailyMap.get(day)!;
      existing.count++;
      existing.revenue += order.total || 0;
    });

    const dailySales: DailySales[] = Array.from(dailyMap.entries())
      .map(([dayOfWeek, data]) => ({
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek],
        orderCount: data.count,
        revenue: data.revenue,
      }));

    // Encontrar hora y día pico
    const peakHour = hourlySales.reduce((max, h) => h.orderCount > max.orderCount ? h : max, hourlySales[0]).hour;
    const peakDay = dailySales.reduce((max, d) => d.orderCount > max.orderCount ? d : max, dailySales[0]).dayName;

    return {
      businessId,
      businessName: business.business_name,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      topProducts,
      hourlySales,
      dailySales,
      peakHour,
      peakDay,
    };
  } catch (error) {
    console.error('getBusinessAnalytics error:', error);
    return null;
  }
}

// ============================================
// QUERY ANALYTICS - GLOBAL
// ============================================

/**
 * Obtiene analytics globales de toda la plataforma
 */
export async function getGlobalAnalytics(
  dateFrom?: string,
  dateTo?: string
): Promise<GlobalAnalytics> {
  try {
    const to = dateTo || new Date().toISOString();
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Obtener todas las órdenes entregadas
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        created_at,
        business_id,
        businesses:business_id (business_name),
        order_items (
          product_id,
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('status', 'delivered')
      .gte('created_at', from)
      .lte('created_at', to);

    const ordersList = orders || [];

    // Totales
    const totalOrders = ordersList.length;
    const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top productos
    const productMap = new Map<string, { name: string; sold: number; revenue: number; lastSold: string }>();
    ordersList.forEach(order => {
      (order.order_items || []).forEach((item: any) => {
        const existing = productMap.get(item.product_id) || { name: item.product_name, sold: 0, revenue: 0, lastSold: '' };
        existing.sold += item.quantity;
        existing.revenue += item.quantity * item.unit_price;
        if (order.created_at > existing.lastSold) existing.lastSold = order.created_at;
        productMap.set(item.product_id, existing);
      });
    });

    const topProducts: ProductSales[] = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        businessId: '',
        businessName: '',
        totalSold: data.sold,
        totalRevenue: data.revenue,
        lastSoldAt: data.lastSold,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    // Top negocios
    const businessMap = new Map<string, { name: string; count: number; revenue: number }>();
    ordersList.forEach(order => {
      if (!order.business_id) return;
      const bizName = (order.businesses as any)?.business_name || 'Desconocido';
      const existing = businessMap.get(order.business_id) || { name: bizName, count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += order.total || 0;
      businessMap.set(order.business_id, existing);
    });

    const topBusinesses = Array.from(businessMap.entries())
      .map(([businessId, data]) => ({
        businessId,
        businessName: data.name,
        orderCount: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    // Tendencias de búsqueda (si hay datos)
    const { data: searchEvents } = await supabase
      .from('analytics_events')
      .select('event_data')
      .eq('event_type', 'search')
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(1000);

    const searchMap = new Map<string, number>();
    (searchEvents || []).forEach(event => {
      const term = event.event_data?.term;
      if (term) {
        searchMap.set(term, (searchMap.get(term) || 0) + 1);
      }
    });

    const searchTrends = Array.from(searchMap.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Ventas por hora
    const hourlyMap = new Map<number, { count: number; revenue: number }>();
    for (let h = 0; h < 24; h++) hourlyMap.set(h, { count: 0, revenue: 0 });
    ordersList.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const existing = hourlyMap.get(hour)!;
      existing.count++;
      existing.revenue += order.total || 0;
    });
    const hourlySales: HourlySales[] = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({ hour, orderCount: data.count, revenue: data.revenue }));

    // Ventas por día
    const dailyMap = new Map<number, { count: number; revenue: number }>();
    for (let d = 0; d < 7; d++) dailyMap.set(d, { count: 0, revenue: 0 });
    ordersList.forEach(order => {
      const day = new Date(order.created_at).getDay();
      const existing = dailyMap.get(day)!;
      existing.count++;
      existing.revenue += order.total || 0;
    });
    const dailySales: DailySales[] = Array.from(dailyMap.entries())
      .map(([dayOfWeek, data]) => ({ dayOfWeek, dayName: DAY_NAMES[dayOfWeek], orderCount: data.count, revenue: data.revenue }));

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      topProducts,
      topBusinesses,
      searchTrends,
      hourlySales,
      dailySales,
    };
  } catch (error) {
    console.error('getGlobalAnalytics error:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topProducts: [],
      topBusinesses: [],
      searchTrends: [],
      hourlySales: [],
      dailySales: [],
    };
  }
}

/**
 * Obtiene lista de negocios con su rendimiento básico
 */
export async function getBusinessesPerformance(): Promise<{
  businessId: string;
  businessName: string;
  category: string;
  totalOrders: number;
  totalRevenue: number;
  rating: number;
}[]> {
  try {
    // Obtener negocios
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, business_name, category, rating_average');

    // Obtener órdenes agrupadas por negocio
    const { data: orders } = await supabase
      .from('orders')
      .select('business_id, total')
      .eq('status', 'delivered');

    const ordersByBusiness = new Map<string, { count: number; revenue: number }>();
    (orders || []).forEach(o => {
      if (!o.business_id) return;
      const existing = ordersByBusiness.get(o.business_id) || { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += o.total || 0;
      ordersByBusiness.set(o.business_id, existing);
    });

    return (businesses || []).map(b => ({
      businessId: b.id,
      businessName: b.business_name,
      category: b.category || 'general',
      totalOrders: ordersByBusiness.get(b.id)?.count || 0,
      totalRevenue: ordersByBusiness.get(b.id)?.revenue || 0,
      rating: Number(b.rating_average) || 0,
    }));
  } catch (error) {
    console.error('getBusinessesPerformance error:', error);
    return [];
  }
}

// ============================================
// COHORT ANALYSIS — Retencion de clientes
// ============================================

export interface CohortData {
  totalClients: number;
  repeatClients: number;
  repeatRate: number;
  avgOrdersPerClient: number;
  avgRevenuePerClient: number;
  cohorts: {
    label: string;
    clients: number;
    percentage: number;
  }[];
  topClients: {
    userId: string;
    name: string;
    orderCount: number;
    totalSpent: number;
    lastOrder: string;
  }[];
}

export async function getCohortAnalysis(): Promise<CohortData> {
  try {
    // All delivered orders with client info
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_id, total, created_at, users:customer_id(full_name)')
      .eq('status', 'delivered')
      .order('created_at', { ascending: true });

    const ordersList = orders || [];

    // Group by client
    const clientMap = new Map<string, {
      name: string;
      orders: number;
      spent: number;
      firstOrder: string;
      lastOrder: string;
    }>();

    ordersList.forEach((o: any) => {
      const id = o.customer_id;
      if (!id) return;
      const existing = clientMap.get(id) || {
        name: o.users?.full_name || 'Cliente',
        orders: 0,
        spent: 0,
        firstOrder: o.created_at,
        lastOrder: o.created_at,
      };
      existing.orders++;
      existing.spent += o.total || 0;
      if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
      clientMap.set(id, existing);
    });

    const totalClients = clientMap.size;
    const repeatClients = Array.from(clientMap.values()).filter(c => c.orders > 1).length;
    const totalOrders = ordersList.length;
    const totalRevenue = ordersList.reduce((s, o) => s + (o.total || 0), 0);

    // Cohort buckets
    const buckets = [
      { label: '1 orden', min: 1, max: 1 },
      { label: '2-3 ordenes', min: 2, max: 3 },
      { label: '4-6 ordenes', min: 4, max: 6 },
      { label: '7-10 ordenes', min: 7, max: 10 },
      { label: '10+ ordenes', min: 11, max: Infinity },
    ];

    const cohorts = buckets.map(b => {
      const clients = Array.from(clientMap.values()).filter(c => c.orders >= b.min && c.orders <= b.max).length;
      return {
        label: b.label,
        clients,
        percentage: totalClients > 0 ? Math.round((clients / totalClients) * 100) : 0,
      };
    });

    // Top 10 clients
    const topClients = Array.from(clientMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        orderCount: data.orders,
        totalSpent: data.spent,
        lastOrder: data.lastOrder,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    return {
      totalClients,
      repeatClients,
      repeatRate: totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0,
      avgOrdersPerClient: totalClients > 0 ? Math.round((totalOrders / totalClients) * 10) / 10 : 0,
      avgRevenuePerClient: totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0,
      cohorts,
      topClients,
    };
  } catch (error) {
    console.error('getCohortAnalysis error:', error);
    return {
      totalClients: 0,
      repeatClients: 0,
      repeatRate: 0,
      avgOrdersPerClient: 0,
      avgRevenuePerClient: 0,
      cohorts: [],
      topClients: [],
    };
  }
}

// ============================================
// DRIVER PERFORMANCE METRICS
// ============================================

export interface DriverPerformance {
  driverId: string;
  name: string;
  vehicleType: string;
  totalDeliveries: number;
  rating: number;
  avgDeliveryTime: number; // minutes
  acceptanceRate: number; // %
  cancelRate: number; // %
  totalEarned: number;
  onlineHoursToday: number;
  deliveriesPerHour: number;
  pendingDebt: number;
}

export async function getDriverPerformanceList(): Promise<DriverPerformance[]> {
  try {
    // Get all drivers with user info
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, user_id, vehicle_type, rating_average, total_deliveries, users:user_id(full_name)')
      .eq('is_active', true);

    if (!drivers || drivers.length === 0) return [];

    const driverIds = drivers.map(d => d.id);

    // Get delivered orders per driver (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('driver_id, total, delivery_fee, tip, created_at, delivered_at')
      .eq('status', 'delivered')
      .in('driver_id', driverIds)
      .gte('created_at', thirtyDaysAgo);

    // Get cancelled orders per driver (last 30 days)
    const { data: cancelledOrders } = await supabase
      .from('orders')
      .select('driver_id')
      .eq('status', 'cancelled')
      .in('driver_id', driverIds)
      .gte('created_at', thirtyDaysAgo);

    // Get pending debts
    const { data: debts } = await supabase
      .from('driver_debts')
      .select('driver_id, food_amount')
      .in('driver_id', driverIds)
      .eq('status', 'pending');

    // Build performance map
    const deliveryMap = new Map<string, { count: number; earned: number; totalMinutes: number }>();
    (deliveredOrders || []).forEach((o: any) => {
      if (!o.driver_id) return;
      const existing = deliveryMap.get(o.driver_id) || { count: 0, earned: 0, totalMinutes: 0 };
      existing.count++;
      existing.earned += (o.delivery_fee || 0) + (o.tip || 0);
      if (o.created_at && o.delivered_at) {
        const mins = (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 60000;
        if (mins > 0 && mins < 240) existing.totalMinutes += mins;
      }
      deliveryMap.set(o.driver_id, existing);
    });

    const cancelMap = new Map<string, number>();
    (cancelledOrders || []).forEach((o: any) => {
      if (!o.driver_id) return;
      cancelMap.set(o.driver_id, (cancelMap.get(o.driver_id) || 0) + 1);
    });

    const debtMap = new Map<string, number>();
    (debts || []).forEach((d: any) => {
      if (!d.driver_id) return;
      debtMap.set(d.driver_id, (debtMap.get(d.driver_id) || 0) + (d.food_amount || 0));
    });

    return drivers.map((driver: any) => {
      const stats = deliveryMap.get(driver.id) || { count: 0, earned: 0, totalMinutes: 0 };
      const cancels = cancelMap.get(driver.id) || 0;
      const totalAssigned = stats.count + cancels;

      return {
        driverId: driver.id,
        name: driver.users?.full_name || 'Sin nombre',
        vehicleType: driver.vehicle_type || 'N/A',
        totalDeliveries: stats.count,
        rating: driver.rating_average || 0,
        avgDeliveryTime: stats.count > 0 ? Math.round(stats.totalMinutes / stats.count) : 0,
        acceptanceRate: totalAssigned > 0 ? Math.round((stats.count / totalAssigned) * 100) : 100,
        cancelRate: totalAssigned > 0 ? Math.round((cancels / totalAssigned) * 100) : 0,
        totalEarned: stats.earned,
        onlineHoursToday: 0, // Would need online tracking
        deliveriesPerHour: 0, // Would need shift tracking
        pendingDebt: debtMap.get(driver.id) || 0,
      };
    }).sort((a, b) => b.totalDeliveries - a.totalDeliveries);
  } catch (error) {
    console.error('getDriverPerformanceList error:', error);
    return [];
  }
}

// ============================================
// EVENT ANALYTICS — Behavior insights
// ============================================

export interface EventInsights {
  totalEvents: number;
  uniqueUsers: number;
  topEventTypes: { type: string; count: number }[];
  topSearches: { term: string; count: number }[];
  topViewedBusinesses: { businessId: string; name: string; views: number }[];
  eventsByHour: { hour: number; count: number }[];
  eventsByDay: { day: string; count: number }[];
}

export async function getEventInsights(days: number = 30): Promise<EventInsights> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabase
      .from('analytics_events')
      .select('event_type, event_data, user_id, created_at')
      .gte('created_at', since)
      .limit(5000);

    const eventsList = events || [];
    const uniqueUsers = new Set(eventsList.map(e => e.user_id).filter(Boolean)).size;

    // Top event types
    const typeMap = new Map<string, number>();
    eventsList.forEach(e => {
      typeMap.set(e.event_type, (typeMap.get(e.event_type) || 0) + 1);
    });
    const topEventTypes = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top searches
    const searchMap = new Map<string, number>();
    eventsList.filter(e => e.event_type === 'search').forEach(e => {
      const term = e.event_data?.term;
      if (term) searchMap.set(term, (searchMap.get(term) || 0) + 1);
    });
    const topSearches = Array.from(searchMap.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Top viewed businesses
    const bizViewMap = new Map<string, number>();
    eventsList.filter(e => e.event_type === 'business_view').forEach(e => {
      const bizId = e.event_data?.business_id;
      if (bizId) bizViewMap.set(bizId, (bizViewMap.get(bizId) || 0) + 1);
    });

    const bizIds = Array.from(bizViewMap.keys()).slice(0, 10);
    let bizNames: Record<string, string> = {};
    if (bizIds.length > 0) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name')
        .in('id', bizIds);
      (businesses || []).forEach(b => { bizNames[b.id] = b.business_name; });
    }

    const topViewedBusinesses = Array.from(bizViewMap.entries())
      .map(([businessId, views]) => ({
        businessId,
        name: bizNames[businessId] || 'Desconocido',
        views,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Events by hour
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    eventsList.forEach(e => {
      const hour = new Date(e.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const eventsByHour = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }));

    // Events by day
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const dayMap = new Map<number, number>();
    for (let d = 0; d < 7; d++) dayMap.set(d, 0);
    eventsList.forEach(e => {
      const day = new Date(e.created_at).getDay();
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    const eventsByDay = Array.from(dayMap.entries())
      .map(([d, count]) => ({ day: dayNames[d], count }));

    return {
      totalEvents: eventsList.length,
      uniqueUsers,
      topEventTypes,
      topSearches,
      topViewedBusinesses,
      eventsByHour,
      eventsByDay,
    };
  } catch (error) {
    console.error('getEventInsights error:', error);
    return {
      totalEvents: 0,
      uniqueUsers: 0,
      topEventTypes: [],
      topSearches: [],
      topViewedBusinesses: [],
      eventsByHour: [],
      eventsByDay: [],
    };
  }
}
