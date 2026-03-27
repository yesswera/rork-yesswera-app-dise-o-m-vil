// ============================================================================
// YESSWERA: SISTEMA DE SUSCRIPCIONES
// Controla acceso a features segun plan del negocio
// Durante lanzamiento: todo habilitado para todos
// ============================================================================

import { supabase } from '@/constants/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionPlan = 'launch' | 'free' | 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface BusinessSubscription {
  id: string;
  businessId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  createdAt: string;
}

// ============================================================================
// FEATURES POR PLAN
// ============================================================================

export type Feature =
  | 'dashboard_basic'        // Ordenes de hoy, ingresos de hoy
  | 'manage_products'        // CRUD productos
  | 'manage_orders'          // Aceptar/rechazar ordenes
  | 'notifications'          // Notificaciones de ordenes
  | 'reports_basic'          // Reporte semanal simple
  | 'reports_advanced'       // Productos top, hora pico, tendencias
  | 'analytics_ai'           // Predicciones IA, recomendaciones
  | 'customer_insights'      // Clientes nuevos vs recurrentes
  | 'search_analytics'       // Busquedas que llevan al negocio
  | 'export_csv'             // Exportar datos
  | 'priority_listing'       // Aparecer primero en la lista
  | 'unlimited_products';    // Sin limite de productos

const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  // Lanzamiento: TODO habilitado (modo actual)
  launch: [
    'dashboard_basic', 'manage_products', 'manage_orders', 'notifications',
    'reports_basic', 'reports_advanced', 'analytics_ai', 'customer_insights',
    'search_analytics', 'export_csv', 'priority_listing', 'unlimited_products',
  ],

  // Gratis: solo lo basico (cuando termine el lanzamiento)
  free: [
    'dashboard_basic', 'manage_products', 'manage_orders', 'notifications',
  ],

  // Basico ($99 MXN/mes): herramientas + compromiso formal
  basic: [
    'dashboard_basic', 'manage_products', 'manage_orders', 'notifications',
    'reports_basic', 'reports_advanced', 'customer_insights',
    'unlimited_products',
  ],

  // Pro ($249 MXN/mes): todo + IA + prioridad
  pro: [
    'dashboard_basic', 'manage_products', 'manage_orders', 'notifications',
    'reports_basic', 'reports_advanced', 'analytics_ai', 'customer_insights',
    'search_analytics', 'export_csv', 'priority_listing', 'unlimited_products',
  ],
};

// ============================================================================
// PRECIOS (Stripe Price IDs se configuran aqui)
// ============================================================================

export const PLAN_PRICES: Record<string, { name: string; price: number; currency: string; features: string[]; stripePriceId: string }> = {
  basic: {
    name: 'Yesswera Basico',
    price: 99,
    currency: 'MXN',
    stripePriceId: 'price_1T9AHx2QogbirSNpUcI59Rro',
    features: [
      'Gestion completa de pedidos',
      'Reportes de ventas semanales',
      'Productos mas vendidos',
      'Hora pico y dia mas activo',
      'Analisis de clientes',
      'Productos ilimitados',
      'Soporte prioritario',
    ],
  },
  pro: {
    name: 'Yesswera Pro',
    price: 249,
    currency: 'MXN',
    stripePriceId: 'price_1T9C4w2QogbirSNpGCivfSPb',
    features: [
      'Todo lo de Basico +',
      'Analitica avanzada con IA',
      'Predicciones de ventas',
      'Busquedas que llevan a tu negocio',
      'Exportar datos (CSV)',
      'Tu negocio aparece primero',
      'Soporte premium',
    ],
  },
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Obtiene la suscripcion actual de un negocio
 */
export async function getBusinessSubscription(businessId: string): Promise<BusinessSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      businessId: data.business_id,
      plan: data.plan as SubscriptionPlan,
      status: data.status as SubscriptionStatus,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      currentPeriodEnd: data.current_period_end,
      trialEnd: data.trial_end,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('getBusinessSubscription error:', error);
    return null;
  }
}

/**
 * Verifica si un negocio tiene acceso a una feature
 * Durante lanzamiento: siempre true (plan = 'launch')
 */
export async function hasFeatureAccess(businessId: string, feature: Feature): Promise<boolean> {
  const sub = await getBusinessSubscription(businessId);

  // Si no tiene suscripcion, dar acceso launch por default
  if (!sub) return true;

  // Si la suscripcion no esta activa (cancelled, past_due), limitar a free
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    return PLAN_FEATURES.free.includes(feature);
  }

  return PLAN_FEATURES[sub.plan].includes(feature);
}

/**
 * Verifica acceso sincrono (usa suscripcion ya cargada)
 */
export function checkFeatureAccess(plan: SubscriptionPlan, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

/**
 * Obtiene las features disponibles para un plan
 */
export function getPlanFeatures(plan: SubscriptionPlan): Feature[] {
  return PLAN_FEATURES[plan];
}

/**
 * Verifica si un plan es de pago
 */
export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan === 'basic' || plan === 'pro';
}

/**
 * Obtiene el nombre legible del plan
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'launch': return 'Lanzamiento';
    case 'free': return 'Gratuito';
    case 'basic': return 'Basico';
    case 'pro': return 'Pro';
  }
}

/**
 * Obtiene el color del badge del plan
 */
export function getPlanColor(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'launch': return '#8B5CF6'; // purple
    case 'free': return '#78716C';   // gray
    case 'basic': return '#3B82F6';  // blue
    case 'pro': return '#F59E0B';    // gold
  }
}
