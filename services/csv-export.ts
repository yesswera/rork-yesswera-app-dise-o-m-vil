// ============================================================================
// YESSWERA: CSV EXPORT SERVICE
// Genera archivos CSV para reportes de negocio y admin
// Usa Sharing API de Expo para compartir/descargar
// ============================================================================

import { documentDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/constants/supabase';

// ============================================================================
// CSV helpers
// ============================================================================

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

async function saveAndShare(csv: string, filename: string): Promise<boolean> {
  try {
    const path = `${documentDirectory}${filename}`;
    await writeAsStringAsync(path, csv, {
      encoding: EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: `Exportar ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('CSV export error:', error);
    return false;
  }
}

// ============================================================================
// EXPORTS: Business Reports
// ============================================================================

/**
 * Exporta historial de ordenes de un negocio
 */
export async function exportBusinessOrders(
  businessId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<boolean> {
  const query = supabase
    .from('orders')
    .select('id, status, subtotal, delivery_fee, total, payment_method, created_at, updated_at, notes')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (dateFrom) query.gte('created_at', dateFrom);
  if (dateTo) query.lte('created_at', dateTo);

  const { data, error } = await query;
  if (error || !data) return false;

  const headers = ['ID', 'Estado', 'Subtotal', 'Envio', 'Total', 'Metodo Pago', 'Fecha', 'Ultima Actualizacion', 'Notas'];
  const rows = data.map(o => [
    o.id,
    o.status,
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.payment_method || 'efectivo',
    new Date(o.created_at).toLocaleString('es-MX'),
    new Date(o.updated_at).toLocaleString('es-MX'),
    o.notes || '',
  ]);

  const csv = toCSV(headers, rows);
  const date = new Date().toISOString().slice(0, 10);
  return saveAndShare(csv, `ordenes_${date}.csv`);
}

/**
 * Exporta productos de un negocio
 */
export async function exportBusinessProducts(businessId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, unit, category_id, is_available, created_at')
    .eq('business_id', businessId)
    .order('name');

  if (error || !data) return false;

  const headers = ['ID', 'Nombre', 'Descripcion', 'Precio', 'Unidad', 'Disponible', 'Fecha Creacion'];
  const rows = data.map(p => [
    p.id,
    p.name,
    p.description || '',
    p.price,
    p.unit || 'pieza',
    p.is_available ? 'Si' : 'No',
    new Date(p.created_at).toLocaleString('es-MX'),
  ]);

  const csv = toCSV(headers, rows);
  return saveAndShare(csv, `productos_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Exporta resumen de ventas (agrupado por dia)
 */
export async function exportSalesSummary(
  businessId: string,
  days: number = 30
): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('orders')
    .select('total, status, created_at')
    .eq('business_id', businessId)
    .gte('created_at', since.toISOString())
    .in('status', ['delivered', 'completed']);

  if (error || !data) return false;

  // Group by date
  const byDate: Record<string, { count: number; total: number }> = {};
  for (const order of data) {
    const date = order.created_at.slice(0, 10);
    if (!byDate[date]) byDate[date] = { count: 0, total: 0 };
    byDate[date].count++;
    byDate[date].total += order.total || 0;
  }

  const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  const headers = ['Fecha', 'Ordenes', 'Ventas Total ($MXN)'];
  const rows = sorted.map(([date, stats]) => [date, stats.count, stats.total.toFixed(2)]);

  // Add totals row
  const totalOrders = sorted.reduce((sum, [, s]) => sum + s.count, 0);
  const totalSales = sorted.reduce((sum, [, s]) => sum + s.total, 0);
  rows.push(['TOTAL', totalOrders, totalSales.toFixed(2)]);

  const csv = toCSV(headers, rows);
  return saveAndShare(csv, `ventas_${days}dias_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ============================================================================
// EXPORTS: Admin Reports
// ============================================================================

/**
 * Exporta todos los negocios (admin)
 */
export async function exportAllBusinesses(): Promise<boolean> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, description, address, phone, is_open, rating_average, rating_count, created_at')
    .order('name');

  if (error || !data) return false;

  const headers = ['ID', 'Nombre', 'Descripcion', 'Direccion', 'Telefono', 'Abierto', 'Rating', 'Num Ratings', 'Fecha Registro'];
  const rows = data.map(b => [
    b.id,
    b.name,
    b.description || '',
    b.address || '',
    b.phone || '',
    b.is_open ? 'Si' : 'No',
    b.rating_average || 0,
    b.rating_count || 0,
    new Date(b.created_at).toLocaleString('es-MX'),
  ]);

  const csv = toCSV(headers, rows);
  return saveAndShare(csv, `negocios_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Exporta todos los repartidores (admin)
 */
export async function exportAllDrivers(): Promise<boolean> {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, user_id, vehicle_type, is_available, is_verified, rating_average, rating_count, total_deliveries, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return false;

  // Get user names
  const userIds = data.map(d => d.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .in('id', userIds);

  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  const headers = ['ID', 'Nombre', 'Telefono', 'Vehiculo', 'Disponible', 'Verificado', 'Rating', 'Entregas', 'Fecha Registro'];
  const rows = data.map(d => {
    const user = userMap.get(d.user_id);
    return [
      d.id,
      user?.full_name || 'Sin nombre',
      user?.phone || '',
      d.vehicle_type || '',
      d.is_available ? 'Si' : 'No',
      d.is_verified ? 'Si' : 'No',
      d.rating_average || 0,
      d.total_deliveries || 0,
      new Date(d.created_at).toLocaleString('es-MX'),
    ];
  });

  const csv = toCSV(headers, rows);
  return saveAndShare(csv, `repartidores_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Exporta todas las ordenes del sistema (admin)
 */
export async function exportAllOrders(days: number = 30): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('orders')
    .select('id, business_id, driver_id, status, subtotal, delivery_fee, total, payment_method, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return false;

  const headers = ['ID', 'Negocio ID', 'Repartidor ID', 'Estado', 'Subtotal', 'Envio', 'Total', 'Metodo Pago', 'Fecha'];
  const rows = data.map(o => [
    o.id,
    o.business_id || '',
    o.driver_id || '',
    o.status,
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.payment_method || 'efectivo',
    new Date(o.created_at).toLocaleString('es-MX'),
  ]);

  const csv = toCSV(headers, rows);
  return saveAndShare(csv, `todas_ordenes_${days}dias_${new Date().toISOString().slice(0, 10)}.csv`);
}
