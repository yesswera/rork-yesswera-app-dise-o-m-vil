// ============================================================================
// YESSWERA: MOTOR DE RECOMENDACIONES
// Genera sugerencias personalizadas basadas en historial del usuario
// ============================================================================

import { supabase } from '@/constants/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductRecommendation {
  productId: string;
  productName: string;
  businessId: string;
  businessName: string;
  price: number;
  imageUrl: string;
  reason: string; // "Pediste esto 3 veces" / "Popular en tu zona" / "Los que piden X tambien piden Y"
  score: number;
}

export interface BusinessRecommendation {
  businessId: string;
  businessName: string;
  category: string;
  rating: number;
  imageUrl: string;
  reason: string;
  score: number;
}

export interface RecommendationSet {
  forYou: ProductRecommendation[];      // Based on order history
  popular: ProductRecommendation[];     // Most ordered globally
  trending: ProductRecommendation[];    // Rising in last 7 days
  alsoOrdered: ProductRecommendation[]; // "Clientes que pidieron X tambien pidieron Y"
  suggestedBusinesses: BusinessRecommendation[];
}

// ============================================================================
// PERSONALIZED RECOMMENDATIONS
// ============================================================================

export async function getRecommendations(userId: string): Promise<RecommendationSet> {
  const [forYou, popular, trending, alsoOrdered, suggestedBusinesses] = await Promise.all([
    getForYouProducts(userId),
    getPopularProducts(),
    getTrendingProducts(),
    getAlsoOrderedProducts(userId),
    getSuggestedBusinesses(userId),
  ]);

  return { forYou, popular, trending, alsoOrdered, suggestedBusinesses };
}

// ============================================================================
// "Para Ti" — Based on user's order history
// ============================================================================

async function getForYouProducts(userId: string): Promise<ProductRecommendation[]> {
  try {
    // Get user's past orders with items
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        business_id,
        order_items(product_id, product_name, quantity, unit_price)
      `)
      .eq('customer_id', userId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!orders || orders.length === 0) return [];

    // Count product frequency
    const productFreq = new Map<string, {
      name: string;
      businessId: string;
      price: number;
      count: number;
    }>();

    orders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        const existing = productFreq.get(item.product_id) || {
          name: item.product_name,
          businessId: order.business_id,
          price: item.unit_price,
          count: 0,
        };
        existing.count += item.quantity;
        productFreq.set(item.product_id, existing);
      });
    });

    // Get business names
    const bizIds = [...new Set(Array.from(productFreq.values()).map(p => p.businessId))];
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, business_name, logo_url')
      .in('id', bizIds);

    const bizMap = new Map<string, { name: string; logo: string }>();
    (businesses || []).forEach(b => bizMap.set(b.id, { name: b.business_name, logo: b.logo_url || '' }));

    // Get product images
    const prodIds = Array.from(productFreq.keys());
    const { data: products } = await supabase
      .from('products')
      .select('id, image_url')
      .in('id', prodIds);

    const imgMap = new Map<string, string>();
    (products || []).forEach(p => imgMap.set(p.id, p.image_url || ''));

    return Array.from(productFreq.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        businessId: data.businessId,
        businessName: bizMap.get(data.businessId)?.name || '',
        price: data.price,
        imageUrl: imgMap.get(productId) || '',
        reason: data.count >= 3 ? `Lo has pedido ${data.count} veces` : 'Basado en tus pedidos',
        score: data.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('getForYouProducts error:', error);
    return [];
  }
}

// ============================================================================
// "Popular" — Most ordered in the platform
// ============================================================================

async function getPopularProducts(): Promise<ProductRecommendation[]> {
  try {
    const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        business_id,
        businesses:business_id(business_name),
        order_items(product_id, product_name, quantity, unit_price)
      `)
      .eq('status', 'delivered')
      .gte('created_at', thirtyDays);

    if (!orders || orders.length === 0) return [];

    const productMap = new Map<string, {
      name: string;
      businessId: string;
      businessName: string;
      price: number;
      totalSold: number;
    }>();

    orders.forEach((order: any) => {
      const bizName = order.businesses?.business_name || '';
      (order.order_items || []).forEach((item: any) => {
        const existing = productMap.get(item.product_id) || {
          name: item.product_name,
          businessId: order.business_id,
          businessName: bizName,
          price: item.unit_price,
          totalSold: 0,
        };
        existing.totalSold += item.quantity;
        productMap.set(item.product_id, existing);
      });
    });

    // Get images
    const prodIds = Array.from(productMap.keys()).slice(0, 10);
    const { data: products } = await supabase
      .from('products')
      .select('id, image_url')
      .in('id', prodIds);

    const imgMap = new Map<string, string>();
    (products || []).forEach(p => imgMap.set(p.id, p.image_url || ''));

    return Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        businessId: data.businessId,
        businessName: data.businessName,
        price: data.price,
        imageUrl: imgMap.get(productId) || '',
        reason: `${data.totalSold} pedidos este mes`,
        score: data.totalSold,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('getPopularProducts error:', error);
    return [];
  }
}

// ============================================================================
// "Trending" — Rising in the last 7 days vs previous 7
// ============================================================================

async function getTrendingProducts(): Promise<ProductRecommendation[]> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // This week
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('order_items(product_id, product_name, quantity, unit_price), business_id, businesses:business_id(business_name)')
      .eq('status', 'delivered')
      .gte('created_at', sevenDaysAgo);

    // Previous week
    const { data: prevOrders } = await supabase
      .from('orders')
      .select('order_items(product_id, quantity)')
      .eq('status', 'delivered')
      .gte('created_at', fourteenDaysAgo)
      .lt('created_at', sevenDaysAgo);

    const recentMap = new Map<string, { name: string; bizId: string; bizName: string; price: number; count: number }>();
    (recentOrders || []).forEach((o: any) => {
      (o.order_items || []).forEach((item: any) => {
        const existing = recentMap.get(item.product_id) || {
          name: item.product_name, bizId: o.business_id, bizName: o.businesses?.business_name || '', price: item.unit_price, count: 0,
        };
        existing.count += item.quantity;
        recentMap.set(item.product_id, existing);
      });
    });

    const prevMap = new Map<string, number>();
    (prevOrders || []).forEach((o: any) => {
      (o.order_items || []).forEach((item: any) => {
        prevMap.set(item.product_id, (prevMap.get(item.product_id) || 0) + item.quantity);
      });
    });

    // Calculate growth
    const trending = Array.from(recentMap.entries())
      .map(([productId, data]) => {
        const prev = prevMap.get(productId) || 0;
        const growth = prev > 0 ? ((data.count - prev) / prev) * 100 : (data.count > 2 ? 100 : 0);
        return {
          productId,
          productName: data.name,
          businessId: data.bizId,
          businessName: data.bizName,
          price: data.price,
          imageUrl: '',
          reason: growth > 50 ? 'En tendencia esta semana' : `${data.count} pedidos esta semana`,
          score: growth,
        };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return trending;
  } catch (error) {
    console.error('getTrendingProducts error:', error);
    return [];
  }
}

// ============================================================================
// "Tambien pidieron" — Collaborative filtering simple
// ============================================================================

async function getAlsoOrderedProducts(userId: string): Promise<ProductRecommendation[]> {
  try {
    // Get user's product IDs
    const { data: userOrders } = await supabase
      .from('orders')
      .select('order_items(product_id)')
      .eq('customer_id', userId)
      .eq('status', 'delivered')
      .limit(20);

    if (!userOrders || userOrders.length === 0) return [];

    const userProductIds = new Set<string>();
    userOrders.forEach((o: any) => {
      (o.order_items || []).forEach((item: any) => userProductIds.add(item.product_id));
    });

    if (userProductIds.size === 0) return [];

    // Find other customers who ordered the same products
    const { data: similarOrders } = await supabase
      .from('orders')
      .select('customer_id, order_items(product_id, product_name, unit_price), business_id, businesses:business_id(business_name)')
      .eq('status', 'delivered')
      .neq('customer_id', userId)
      .limit(200);

    if (!similarOrders || similarOrders.length === 0) return [];

    // Find customers who share products with our user
    const coProductMap = new Map<string, { name: string; bizId: string; bizName: string; price: number; count: number }>();

    similarOrders.forEach((order: any) => {
      const theirProducts = (order.order_items || []).map((i: any) => i.product_id);
      const hasOverlap = theirProducts.some((pid: string) => userProductIds.has(pid));

      if (hasOverlap) {
        // This customer has similar taste — their OTHER products are recommendations
        (order.order_items || []).forEach((item: any) => {
          if (!userProductIds.has(item.product_id)) {
            const existing = coProductMap.get(item.product_id) || {
              name: item.product_name,
              bizId: order.business_id,
              bizName: order.businesses?.business_name || '',
              price: item.unit_price,
              count: 0,
            };
            existing.count++;
            coProductMap.set(item.product_id, existing);
          }
        });
      }
    });

    return Array.from(coProductMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        businessId: data.bizId,
        businessName: data.bizName,
        price: data.price,
        imageUrl: '',
        reason: 'Clientes con gustos similares lo pidieron',
        score: data.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  } catch (error) {
    console.error('getAlsoOrderedProducts error:', error);
    return [];
  }
}

// ============================================================================
// Suggested Businesses — Based on user preferences
// ============================================================================

async function getSuggestedBusinesses(userId: string): Promise<BusinessRecommendation[]> {
  try {
    // Get user's favorite categories from order history
    const { data: orders } = await supabase
      .from('orders')
      .select('business_id')
      .eq('customer_id', userId)
      .eq('status', 'delivered');

    const orderedBizIds = new Set((orders || []).map(o => o.business_id).filter(Boolean));

    // Get all open businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, business_name, category, rating_average, logo_url, cover_url')
      .eq('is_open', true);

    if (!businesses || businesses.length === 0) return [];

    // Separate: new businesses the user hasn't tried
    const notTried = businesses.filter(b => !orderedBizIds.has(b.id));
    const tried = businesses.filter(b => orderedBizIds.has(b.id));

    // Get categories user prefers
    const triedCategories = new Map<string, number>();
    tried.forEach(b => {
      if (b.category) {
        triedCategories.set(b.category, (triedCategories.get(b.category) || 0) + 1);
      }
    });

    return notTried
      .map(b => {
        const categoryMatch = triedCategories.get(b.category || '') || 0;
        const ratingScore = (b.rating_average || 0) * 10;
        const score = categoryMatch * 20 + ratingScore;

        return {
          businessId: b.id,
          businessName: b.business_name,
          category: b.category || '',
          rating: b.rating_average || 0,
          imageUrl: b.cover_url || b.logo_url || '',
          reason: categoryMatch > 0 ? 'Te puede gustar — similar a lo que pides' : 'Nuevo para ti',
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  } catch (error) {
    console.error('getSuggestedBusinesses error:', error);
    return [];
  }
}

// ============================================================================
// OPTIMAL NOTIFICATION TIMING
// Returns the best hour to send a push notification to this user
// ============================================================================

export async function getOptimalNotificationTime(userId: string): Promise<{
  bestHour: number;
  bestDay: number;
  confidence: number;
}> {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('created_at')
      .eq('customer_id', userId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!orders || orders.length < 3) {
      return { bestHour: 13, bestDay: 5, confidence: 0 }; // Default: Friday 1pm
    }

    const hourMap = new Map<number, number>();
    const dayMap = new Map<number, number>();

    orders.forEach(o => {
      const d = new Date(o.created_at);
      const h = d.getHours();
      const day = d.getDay();
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });

    let bestHour = 13, bestHourCount = 0;
    hourMap.forEach((count, hour) => {
      if (count > bestHourCount) { bestHour = hour; bestHourCount = count; }
    });

    let bestDay = 5, bestDayCount = 0;
    dayMap.forEach((count, day) => {
      if (count > bestDayCount) { bestDay = day; bestDayCount = count; }
    });

    const confidence = Math.min(orders.length / 10, 1); // 0-1 based on data quantity

    return { bestHour, bestDay, confidence };
  } catch (error) {
    return { bestHour: 13, bestDay: 5, confidence: 0 };
  }
}
