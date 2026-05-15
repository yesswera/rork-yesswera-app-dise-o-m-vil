// ============================================================================
// YESSWERA: YESSI IA - ORDENAR POR CONVERSACION
// Parsea lenguaje natural para encontrar negocios y productos
// ============================================================================

import { ANTHROPIC_CONFIG } from '@/constants/anthropic';
import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface OrderIntent {
  understood: boolean;
  businessQuery?: string;
  items: { name: string; quantity: number; notes?: string }[];
  message: string;
}

interface BusinessSummary {
  id: string;
  name: string;
  category: string;
}

interface MatchedProduct {
  id: string;
  name: string;
  price: number;
  businessId: string;
  businessName: string;
  description: string;
  image: string;
  category: string;
}

// ============================================================================
// PARSEAR INTENCION DE ORDEN CON CLAUDE
// ============================================================================

export async function parseOrderIntent(
  userMessage: string,
  availableBusinesses: BusinessSummary[]
): Promise<OrderIntent> {
  try {
    if (!ANTHROPIC_CONFIG.apiKey) {
      return {
        understood: false,
        items: [],
        message: 'Yessi no esta disponible en este momento. Intenta mas tarde.',
      };
    }

    const businessList = availableBusinesses
      .map((b) => `- "${b.name}" (${b.category || 'general'})`)
      .join('\n');

    const systemPrompt = `Eres Yessi, la asistente amigable de Yesswera, una app de delivery en Tomatlan, Jalisco, Mexico.
Tu trabajo es entender lo que el usuario quiere pedir y de donde.

Negocios disponibles:
${businessList || '(No hay negocios registrados aun)'}

REGLAS:
1. Si el usuario menciona un negocio o tipo de comida, intenta asociarlo con uno de los negocios disponibles.
2. Extrae los productos y cantidades que quiere.
3. Si no hay negocios disponibles o no entiendes, pide mas detalles amablemente.
4. Responde SIEMPRE en espanol informal y amigable (tuteo).
5. Si el usuario saluda o platica, responde brevemente y pregunta que quiere pedir.

Responde SOLO con JSON valido (sin markdown, sin backticks):
{
  "understood": true/false,
  "businessQuery": "nombre o tipo de negocio buscado",
  "items": [{"name": "producto", "quantity": 1, "notes": "opcional"}],
  "message": "tu respuesta amigable al usuario"
}

Si understood=false, items debe ser [] y message debe pedir aclaracion.
Si understood=true, message debe confirmar lo que entendiste.`;

    const response = await fetch(ANTHROPIC_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_CONFIG.model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('Yessi Ordering API error:', response.status, errorBody);
      return {
        understood: false,
        items: [],
        message: 'Ups, tuve un problema al procesar tu mensaje. Intenta de nuevo.',
      };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        understood: false,
        items: [],
        message: 'No entendi bien tu mensaje. Dime que quieres pedir y de donde.',
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      understood: Boolean(result.understood),
      businessQuery: result.businessQuery || undefined,
      items: Array.isArray(result.items) ? result.items : [],
      message: result.message || 'Dime que quieres pedir.',
    };
  } catch (error) {
    console.error('Yessi Ordering parse error:', error);
    return {
      understood: false,
      items: [],
      message: 'Tuve un error procesando tu mensaje. Intenta de nuevo por favor.',
    };
  }
}

// ============================================================================
// BUSCAR NEGOCIOS ACTIVOS
// ============================================================================

export async function searchBusinesses(): Promise<BusinessSummary[]> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, category')
      .eq('is_active', true)
      .limit(50);

    if (error || !data) {
      console.error('searchBusinesses error:', error);
      return [];
    }

    return data.map((b: any) => ({
      id: b.id,
      name: b.business_name,
      category: b.category || '',
    }));
  } catch (error) {
    console.error('searchBusinesses error:', error);
    return [];
  }
}

// ============================================================================
// BUSCAR PRODUCTOS EN UN NEGOCIO
// ============================================================================

export async function searchProducts(
  businessId: string,
  productNames: string[]
): Promise<MatchedProduct[]> {
  try {
    if (!productNames.length) return [];

    const results: MatchedProduct[] = [];

    for (const name of productNames) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, business_id, description, image_url, category, businesses:business_id(business_name)')
        .eq('business_id', businessId)
        .ilike('name', `%${name}%`)
        .eq('available', true)
        .limit(3);

      if (!error && data) {
        for (const p of data as any[]) {
          // Avoid duplicates
          if (!results.find((r) => r.id === p.id)) {
            results.push({
              id: p.id,
              name: p.name,
              price: p.price,
              businessId: p.business_id,
              businessName: p.businesses?.business_name || '',
              description: p.description || '',
              image: p.image_url || '',
              category: p.category || '',
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('searchProducts error:', error);
    return [];
  }
}

// ============================================================================
// BUSCAR MEJOR NEGOCIO POR QUERY
// ============================================================================

export async function findBestBusiness(
  query: string,
  businesses: BusinessSummary[]
): Promise<BusinessSummary | null> {
  if (!query || !businesses.length) return null;

  const lower = query.toLowerCase();

  // Exact name match first
  const exact = businesses.find(
    (b) => b.name.toLowerCase() === lower
  );
  if (exact) return exact;

  // Partial name match
  const partial = businesses.find(
    (b) => b.name.toLowerCase().includes(lower) || lower.includes(b.name.toLowerCase())
  );
  if (partial) return partial;

  // Category match
  const catMatch = businesses.find(
    (b) => b.category.toLowerCase().includes(lower) || lower.includes(b.category.toLowerCase())
  );
  if (catMatch) return catMatch;

  return null;
}
