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
