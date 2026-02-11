/**
 * YESSWERA: Yessi BI - Asistente de Business Intelligence
 *
 * Procesa consultas en lenguaje natural del admin y responde
 * con datos de Supabase. Funciona localmente (sin edge functions).
 * Cuando se desplieguen las edge functions, se puede migrar a Claude API.
 */

import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface YessiMessage {
  id: string;
  role: 'user' | 'yessi';
  content: string;
  timestamp: string;
  data?: YessiDataResult;
}

export interface YessiDataResult {
  type: 'table' | 'number' | 'list' | 'chart';
  title: string;
  rows?: { label: string; value: string | number; extra?: string }[];
  value?: number | string;
  unit?: string;
}

type QueryIntent =
  | 'top_businesses'
  | 'top_drivers'
  | 'top_products'
  | 'total_orders'
  | 'total_revenue'
  | 'cancelled_orders'
  | 'new_users'
  | 'active_drivers'
  | 'business_detail'
  | 'driver_detail'
  | 'order_status'
  | 'peak_hours'
  | 'daily_summary'
  | 'create_survey'
  | 'general_stats'
  | 'help'
  | 'unknown';

// ============================================================================
// DETECCION DE INTENTO
// ============================================================================

function detectIntent(query: string): { intent: QueryIntent; params: Record<string, string> } {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const params: Record<string, string> = {};

  // Top negocios / ventas
  if (q.match(/negocio.*(mas|mejor|top|mayor).*(vent|orden|ingreso|popular)/i) ||
      q.match(/(mas|mejor|top|mayor).*(vent|orden|ingreso).*(negocio)/i) ||
      q.match(/(mejor|top).*(negocio|restaurante|tienda)/i)) {
    return { intent: 'top_businesses', params };
  }

  // Top repartidores
  if (q.match(/repartidor.*(mas|mejor|top|mayor)/i) ||
      q.match(/(mas|mejor|top|mayor).*(repartidor|driver|delivery)/i) ||
      q.match(/(mejor|top).*(calificacion|rating).*(repartidor|driver)/i)) {
    return { intent: 'top_drivers', params };
  }

  // Top productos
  if (q.match(/producto.*(mas|mejor|top|mayor).*(vend|popular)/i) ||
      q.match(/(mas|mejor|top|mayor).*(vend|popular).*(producto|platillo|articulo)/i)) {
    return { intent: 'top_products', params };
  }

  // Ordenes canceladas
  if (q.match(/orden.*(cancel|rechaz)/i) || q.match(/cancel.*(orden|pedido)/i)) {
    return { intent: 'cancelled_orders', params };
  }

  // Revenue / ingresos
  if (q.match(/(ingreso|revenue|ganancia|factur|dinero|cobr)/i) &&
      !q.match(/negocio.*(mas|mejor)/i)) {
    return { intent: 'total_revenue', params };
  }

  // Total ordenes
  if (q.match(/(cuant|total|numer).*(orden|pedido)/i) ||
      q.match(/(orden|pedido).*(hoy|total|cuant)/i)) {
    return { intent: 'total_orders', params };
  }

  // Usuarios nuevos
  if (q.match(/(usuario|cliente|registro).*(nuev|recien|ultim)/i) ||
      q.match(/(nuev|recien).*(usuario|cliente|registro)/i) ||
      q.match(/cuant.*(usuario|cliente|registr)/i)) {
    return { intent: 'new_users', params };
  }

  // Drivers activos
  if (q.match(/(repartidor|driver).*(activ|online|linea|conect)/i) ||
      q.match(/(activ|online|conect).*(repartidor|driver)/i)) {
    return { intent: 'active_drivers', params };
  }

  // Horas pico
  if (q.match(/(hora|horario).*(pico|mas|mayor|mejor)/i) ||
      q.match(/(pico|peak|demanda)/i)) {
    return { intent: 'peak_hours', params };
  }

  // Resumen diario
  if (q.match(/(resumen|reporte|estadistic).*(hoy|dia|diario|general)/i) ||
      q.match(/(como|que tal).*(va|vamos|esta|anda)/i) ||
      q.match(/estado.*(general|plataforma|app)/i)) {
    return { intent: 'general_stats', params };
  }

  // Encuesta
  if (q.match(/(encuesta|survey|pregunt)/i) && q.match(/(crear|haz|envia|lanz|mand)/i)) {
    return { intent: 'create_survey', params };
  }

  // Ayuda
  if (q.match(/(ayuda|help|que puedo|que sabes|como funciona)/i) ||
      q.match(/(que puedes|que haces)/i)) {
    return { intent: 'help', params };
  }

  return { intent: 'unknown', params };
}

// ============================================================================
// PROCESADORES DE CONSULTAS
// ============================================================================

async function processTopBusinesses(): Promise<{ text: string; data?: YessiDataResult }> {
  const { data: orders } = await supabase
    .from('orders')
    .select('business_id, total, businesses:business_id (business_name)')
    .eq('status', 'delivered');

  if (!orders || orders.length === 0) {
    return { text: 'Aun no hay ordenes completadas para analizar. Los datos se llenaran conforme los usuarios hagan pedidos.' };
  }

  const bizMap = new Map<string, { name: string; count: number; revenue: number }>();
  orders.forEach(o => {
    if (!o.business_id) return;
    const name = (o.businesses as any)?.business_name || 'Desconocido';
    const existing = bizMap.get(o.business_id) || { name, count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += o.total || 0;
    bizMap.set(o.business_id, existing);
  });

  const sorted = Array.from(bizMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return {
    text: `Estos son los negocios con mas ventas (${orders.length} ordenes totales):`,
    data: {
      type: 'table',
      title: 'Top Negocios por Ventas',
      rows: sorted.map((b, i) => ({
        label: `${i + 1}. ${b.name}`,
        value: `$${b.revenue.toFixed(2)}`,
        extra: `${b.count} ordenes`,
      })),
    },
  };
}

async function processTopDrivers(): Promise<{ text: string; data?: YessiDataResult }> {
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, user_id, total_deliveries, rating_average, users:user_id (full_name)')
    .order('total_deliveries', { ascending: false })
    .limit(10);

  if (!drivers || drivers.length === 0) {
    return { text: 'No hay repartidores registrados aun.' };
  }

  const sorted = drivers
    .filter(d => (d.total_deliveries || 0) > 0 || (d.rating_average || 0) > 0)
    .sort((a, b) => {
      const scoreA = ((a.rating_average || 0) * 0.6) + ((a.total_deliveries || 0) * 0.4);
      const scoreB = ((b.rating_average || 0) * 0.6) + ((b.total_deliveries || 0) * 0.4);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  if (sorted.length === 0) {
    return { text: 'Los repartidores aun no tienen entregas completadas. Los rankings se generaran cuando empiecen a trabajar.' };
  }

  return {
    text: 'Estos son los mejores repartidores (por calificacion y entregas):',
    data: {
      type: 'table',
      title: 'Top Repartidores',
      rows: sorted.map((d, i) => ({
        label: `${i + 1}. ${(d.users as any)?.full_name || 'Sin nombre'}`,
        value: `${Number(d.rating_average || 0).toFixed(1)} estrellas`,
        extra: `${d.total_deliveries || 0} entregas`,
      })),
    },
  };
}

async function processTopProducts(): Promise<{ text: string; data?: YessiDataResult }> {
  const { data: orders } = await supabase
    .from('orders')
    .select('order_items (product_name, quantity, unit_price)')
    .eq('status', 'delivered');

  if (!orders || orders.length === 0) {
    return { text: 'Aun no hay ordenes completadas. Los productos populares apareceran cuando los clientes hagan pedidos.' };
  }

  const productMap = new Map<string, { sold: number; revenue: number }>();
  orders.forEach(o => {
    ((o as any).order_items || []).forEach((item: any) => {
      const existing = productMap.get(item.product_name) || { sold: 0, revenue: 0 };
      existing.sold += item.quantity || 1;
      existing.revenue += (item.quantity || 1) * (item.unit_price || 0);
      productMap.set(item.product_name, existing);
    });
  });

  const sorted = Array.from(productMap.entries())
    .sort((a, b) => b[1].sold - a[1].sold)
    .slice(0, 10);

  return {
    text: 'Estos son los productos mas vendidos:',
    data: {
      type: 'table',
      title: 'Top Productos',
      rows: sorted.map(([name, data], i) => ({
        label: `${i + 1}. ${name}`,
        value: `${data.sold} vendidos`,
        extra: `$${data.revenue.toFixed(2)}`,
      })),
    },
  };
}

async function processTotalOrders(): Promise<{ text: string; data?: YessiDataResult }> {
  const today = new Date().toISOString().split('T')[0];

  const [totalResult, todayResult, progressResult, deliveredResult] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'in_transit']),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
  ]);

  return {
    text: 'Resumen de ordenes:',
    data: {
      type: 'table',
      title: 'Ordenes',
      rows: [
        { label: 'Total historico', value: totalResult.count || 0 },
        { label: 'Hoy', value: todayResult.count || 0 },
        { label: 'En progreso', value: progressResult.count || 0 },
        { label: 'Entregadas', value: deliveredResult.count || 0 },
      ],
    },
  };
}

async function processTotalRevenue(): Promise<{ text: string; data?: YessiDataResult }> {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const [allTime, monthly, todayRevenue] = await Promise.all([
    supabase.from('orders').select('total').eq('status', 'delivered'),
    supabase.from('orders').select('total').eq('status', 'delivered').gte('created_at', `${thisMonth}-01T00:00:00`),
    supabase.from('orders').select('total').eq('status', 'delivered').gte('created_at', `${today}T00:00:00`),
  ]);

  const totalAll = (allTime.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const totalMonth = (monthly.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const totalToday = (todayRevenue.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

  return {
    text: 'Resumen de ingresos:',
    data: {
      type: 'table',
      title: 'Ingresos',
      rows: [
        { label: 'Total historico', value: `$${totalAll.toFixed(2)}` },
        { label: 'Este mes', value: `$${totalMonth.toFixed(2)}` },
        { label: 'Hoy', value: `$${totalToday.toFixed(2)}` },
      ],
    },
  };
}

async function processCancelledOrders(): Promise<{ text: string; data?: YessiDataResult }> {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, cancellation_reason, cancelled_at, total, client:client_id (full_name)')
    .eq('status', 'cancelled')
    .order('cancelled_at', { ascending: false })
    .limit(10);

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'cancelled');

  if (!orders || orders.length === 0) {
    return { text: 'No hay ordenes canceladas. Eso es buena senal.' };
  }

  return {
    text: `Se han cancelado ${count || orders.length} ordenes en total. Las mas recientes:`,
    data: {
      type: 'table',
      title: 'Ordenes Canceladas (recientes)',
      rows: orders.map(o => ({
        label: (o.client as any)?.full_name || 'Cliente',
        value: `$${(o.total || 0).toFixed(2)}`,
        extra: o.cancellation_reason || 'Sin razon',
      })),
    },
  };
}

async function processNewUsers(): Promise<{ text: string; data?: YessiDataResult }> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [total, clients, drivers, businesses, todayCount, weekCount] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('user_type', 'client'),
    supabase.from('drivers').select('id', { count: 'exact', head: true }),
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', `${weekAgo}T00:00:00`),
  ]);

  return {
    text: 'Resumen de usuarios:',
    data: {
      type: 'table',
      title: 'Usuarios',
      rows: [
        { label: 'Total usuarios', value: total.count || 0 },
        { label: 'Clientes', value: clients.count || 0 },
        { label: 'Repartidores', value: drivers.count || 0 },
        { label: 'Negocios', value: businesses.count || 0 },
        { label: 'Nuevos hoy', value: todayCount.count || 0 },
        { label: 'Nuevos esta semana', value: weekCount.count || 0 },
      ],
    },
  };
}

async function processActiveDrivers(): Promise<{ text: string; data?: YessiDataResult }> {
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, is_online, users:user_id (full_name)')
    .eq('is_online', true);

  const { count: totalDrivers } = await supabase
    .from('drivers')
    .select('id', { count: 'exact', head: true });

  const online = drivers?.length || 0;

  if (online === 0) {
    return {
      text: `No hay repartidores en linea ahora. Total registrados: ${totalDrivers || 0}.`,
    };
  }

  return {
    text: `Hay ${online} repartidor(es) en linea de ${totalDrivers || 0} registrados:`,
    data: {
      type: 'list',
      title: 'Repartidores en Linea',
      rows: drivers!.map(d => ({
        label: (d.users as any)?.full_name || 'Sin nombre',
        value: 'En linea',
      })),
    },
  };
}

async function processGeneralStats(): Promise<{ text: string; data?: YessiDataResult }> {
  const today = new Date().toISOString().split('T')[0];

  const [
    users, orders, ordersToday, revenue, onlineDrivers, businesses
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('orders').select('total').eq('status', 'delivered'),
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('is_online', true),
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
  ]);

  const totalRevenue = (revenue.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

  return {
    text: 'Aqui esta el estado general de Yesswera:',
    data: {
      type: 'table',
      title: 'Estado General',
      rows: [
        { label: 'Usuarios totales', value: users.count || 0 },
        { label: 'Negocios', value: businesses.count || 0 },
        { label: 'Repartidores en linea', value: onlineDrivers.count || 0 },
        { label: 'Ordenes totales', value: orders.count || 0 },
        { label: 'Ordenes hoy', value: ordersToday.count || 0 },
        { label: 'Ingresos totales', value: `$${totalRevenue.toFixed(2)}` },
      ],
    },
  };
}

function processHelp(): { text: string } {
  return {
    text: `Hola, soy Yessi, tu asistente de Business Intelligence. Puedes preguntarme cosas como:

- "Cuales negocios tienen mas ventas?"
- "Quien es el mejor repartidor?"
- "Cuantas ordenes hay hoy?"
- "Cuales son los productos mas vendidos?"
- "Cuanto hemos facturado este mes?"
- "Cuantas ordenes se han cancelado?"
- "Cuantos usuarios nuevos hay?"
- "Cuantos repartidores estan en linea?"
- "Como vamos hoy?" (resumen general)
- "Haz una encuesta de satisfaccion"

Preguntame lo que necesites sobre los datos de la plataforma.`,
  };
}

function processCreateSurvey(): { text: string } {
  return {
    text: `La funcion de encuestas via push esta en desarrollo. Pronto podras decirme:

- "Haz encuesta de satisfaccion a clientes"
- "Pregunta a repartidores sobre la app"
- "Encuesta a negocios sobre tiempos de espera"

Y yo me encargare de crear y enviar la encuesta al grupo que indiques. Por ahora puedes usar la pantalla de Encuestas en el panel admin para ver las que existen.`,
  };
}

// ============================================================================
// PROCESADOR PRINCIPAL
// ============================================================================

export async function processYessiQuery(query: string): Promise<{
  text: string;
  data?: YessiDataResult;
}> {
  try {
    const { intent } = detectIntent(query);

    switch (intent) {
      case 'top_businesses':
        return await processTopBusinesses();
      case 'top_drivers':
        return await processTopDrivers();
      case 'top_products':
        return await processTopProducts();
      case 'total_orders':
        return await processTotalOrders();
      case 'total_revenue':
        return await processTotalRevenue();
      case 'cancelled_orders':
        return await processCancelledOrders();
      case 'new_users':
        return await processNewUsers();
      case 'active_drivers':
        return await processActiveDrivers();
      case 'general_stats':
        return await processGeneralStats();
      case 'create_survey':
        return processCreateSurvey();
      case 'help':
        return processHelp();
      case 'unknown':
      default:
        return {
          text: `No entendi exactamente tu pregunta. Intenta reformularla o escribe "ayuda" para ver lo que puedo hacer.

Ejemplos:
- "Negocios con mas ventas"
- "Mejor repartidor"
- "Cuantas ordenes hoy"
- "Como vamos?"`,
        };
    }
  } catch (error) {
    console.error('[Yessi] Error procesando consulta:', error);
    return {
      text: 'Hubo un error al consultar los datos. Verifica tu conexion e intenta de nuevo.',
    };
  }
}

// ============================================================================
// SALUDO INICIAL
// ============================================================================

export function getYessiGreeting(): string {
  const hour = new Date().getHours();
  let greeting = 'Hola';
  if (hour < 12) greeting = 'Buenos dias';
  else if (hour < 18) greeting = 'Buenas tardes';
  else greeting = 'Buenas noches';

  return `${greeting}, soy Yessi, tu asistente de Business Intelligence para Yesswera.\n\nPuedo ayudarte a consultar datos de ventas, repartidores, negocios, ordenes y mas. Escribe "ayuda" para ver todo lo que puedo hacer.`;
}
