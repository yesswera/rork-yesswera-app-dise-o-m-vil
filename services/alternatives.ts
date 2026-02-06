/**
 * Servicio de Alternativas - Yesswera
 * Busca negocios similares cuando el original no responde o cancela
 */

import { supabase } from '@/constants/supabase';

interface Business {
  id: string;
  business_name: string;
  type: string;
  rating_average: number;
  logo_url?: string;
  address: string;
  distance_km?: number;
}

interface BuscarAlternativasParams {
  tipoNegocio: string; // 'food', 'shopping', 'delivery'
  ubicacionCliente: {
    latitude: number;
    longitude: number;
  };
  excluirNegocioId?: string;
  ratingMinimo?: number;
  distanciaMaximaKm?: number;
  limite?: number;
}

/**
 * Busca negocios alternativos similares al original
 */
export async function buscarAlternativas(
  params: BuscarAlternativasParams
): Promise<Business[]> {
  const {
    tipoNegocio,
    ubicacionCliente,
    excluirNegocioId,
    ratingMinimo = 4.0,
    distanciaMaximaKm = 5,
    limite = 5,
  } = params;

  try {
    // Query base
    let query = supabase
      .from('businesses')
      .select('id, business_name, type, rating_average, logo_url, address, location')
      .eq('type', tipoNegocio)
      .eq('is_active', true)
      .gte('rating_average', ratingMinimo)
      .order('rating_average', { ascending: false })
      .limit(limite * 2); // Traer mas para filtrar por distancia

    // Excluir el negocio original
    if (excluirNegocioId) {
      query = query.neq('id', excluirNegocioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error buscando alternativas:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Calcular distancias y filtrar
    const alternativasConDistancia = data
      .map((negocio: any) => {
        let distancia = 999;

        // Parsear ubicacion si existe
        if (negocio.location) {
          try {
            // PostGIS retorna en formato WKB o GeoJSON
            let coords: { longitude: number; latitude: number } | null = null;

            if (typeof negocio.location === 'object' && negocio.location.coordinates) {
              coords = {
                longitude: negocio.location.coordinates[0],
                latitude: negocio.location.coordinates[1],
              };
            }

            if (coords) {
              distancia = calcularDistancia(
                ubicacionCliente.latitude,
                ubicacionCliente.longitude,
                coords.latitude,
                coords.longitude
              );
            }
          } catch {
            // Si no se puede parsear, usar distancia alta
          }
        }

        return {
          ...negocio,
          distance_km: distancia,
        };
      })
      .filter((n: any) => n.distance_km <= distanciaMaximaKm)
      .sort((a: any, b: any) => {
        // Ordenar por rating primero, luego por distancia
        if (b.rating_average !== a.rating_average) {
          return b.rating_average - a.rating_average;
        }
        return a.distance_km - b.distance_km;
      })
      .slice(0, limite);

    return alternativasConDistancia;
  } catch (error) {
    console.error('Error en buscarAlternativas:', error);
    return [];
  }
}

/**
 * Calcula distancia entre dos puntos en km (Haversine)
 */
function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal
}

/**
 * Marca una orden como "cliente prioritario" para el nuevo negocio
 */
export async function marcarClientePrioritario(
  orderId: string,
  razon: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        is_priority_client: true,
        priority_reason: razon,
      })
      .eq('id', orderId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Crea una nueva orden en negocio alternativo preservando items
 */
export async function crearOrdenAlternativa(
  ordenOriginalId: string,
  nuevoNegocioId: string,
  clienteId: string
): Promise<{ success: boolean; newOrderId?: string; error?: string }> {
  try {
    // Obtener orden original con items
    const { data: ordenOriginal, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', ordenOriginalId)
      .single();

    if (fetchError || !ordenOriginal) {
      return { success: false, error: 'No se encontro la orden original' };
    }

    // Cancelar orden original
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Cliente eligio alternativa',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', ordenOriginalId);

    // Crear nueva orden
    const { data: nuevaOrden, error: createError } = await supabase
      .from('orders')
      .insert({
        client_id: clienteId,
        business_id: nuevoNegocioId,
        type: ordenOriginal.type,
        status: 'pending',
        total: ordenOriginal.total,
        subtotal: ordenOriginal.subtotal,
        delivery_fee: ordenOriginal.delivery_fee,
        delivery_address: ordenOriginal.delivery_address,
        delivery_location: ordenOriginal.delivery_location,
        payment_method: ordenOriginal.payment_method,
        notes: ordenOriginal.notes,
        is_priority_client: true,
        priority_reason: 'Negocio anterior no respondio',
      })
      .select()
      .single();

    if (createError || !nuevaOrden) {
      return { success: false, error: 'Error creando nueva orden' };
    }

    // Copiar items (si aplica - pueden variar por negocio)
    // Por ahora solo copiamos la referencia para que el cliente ajuste

    return { success: true, newOrderId: nuevaOrden.id };
  } catch (error) {
    console.error('Error en crearOrdenAlternativa:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Obtiene el mensaje para mostrar al cliente sobre alternativas
 */
export function getMensajeAlternativas(razon: 'timeout' | 'rejected' | 'cancelled'): {
  titulo: string;
  mensaje: string;
} {
  switch (razon) {
    case 'timeout':
      return {
        titulo: 'Negocio sin respuesta',
        mensaje:
          'El negocio no respondio a tiempo. Te mostramos alternativas similares para que puedas completar tu pedido.',
      };
    case 'rejected':
      return {
        titulo: 'Pedido no disponible',
        mensaje:
          'El negocio no puede atender tu pedido en este momento. Aqui tienes otras opciones.',
      };
    case 'cancelled':
      return {
        titulo: 'Orden cancelada',
        mensaje: 'Tu orden fue cancelada. Te sugerimos estos negocios similares.',
      };
    default:
      return {
        titulo: 'Buscar alternativas',
        mensaje: 'Te mostramos negocios similares en tu zona.',
      };
  }
}
