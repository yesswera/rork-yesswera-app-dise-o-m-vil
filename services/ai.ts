// AI Services - Claude API integration via Supabase Edge Functions
import { supabase } from '@/constants/supabase';

const FUNCTIONS_URL = 'https://jdvundwewwobkznxwkvj.supabase.co/functions/v1';

interface SupportResponse {
  response: string;
  needsHuman: boolean;
  responseTimeMs: number;
  error?: string;
  fallback?: string;
}

interface RiskCheckResponse {
  orderId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  flags: string[];
  recommendation: string;
  requiresHumanReview: boolean;
  reasoning?: string;
  responseTimeMs: number;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  needsHuman: boolean;
  isUrgent: boolean;
  tokensUsed: number;
  responseTimeMs: number;
  error?: boolean;
}

// Get auth token for authenticated requests
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Quick support question - single message, single response
 */
export async function askSupport(
  message: string,
  options?: {
    orderId?: string;
    context?: string;
  }
): Promise<SupportResponse> {
  try {
    const token = await getAuthToken();
    const { data: { user } } = await supabase.auth.getUser();

    const response = await fetch(`${FUNCTIONS_URL}/ai-support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        userId: user?.id,
        orderId: options?.orderId,
        context: options?.context,
      }),
    });

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    return await response.json();
  } catch (error) {
    console.error('askSupport error:', error);
    return {
      response: 'Lo siento, no pude conectar con el asistente. Por favor intenta de nuevo.',
      needsHuman: true,
      responseTimeMs: 0,
      error: 'Connection failed',
    };
  }
}

/**
 * Check order for potential risks (fraud, harassment, etc.)
 * Called automatically when creating orders with sensitive data
 */
export async function checkOrderRisk(
  orderId: string,
  orderData: {
    serviceType: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    packageDetails?: {
      isMinorRecipient?: boolean;
      recipientName?: string;
      description?: string;
    };
    total: number;
    customerId: string;
    customerCreatedAt?: string;
    previousOrdersCount?: number;
    previousCancellations?: number;
  }
): Promise<RiskCheckResponse> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${FUNCTIONS_URL}/ai-risk-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, orderData }),
    });

    if (!response.ok) {
      // On failure, default to low risk (don't block orders)
      return {
        orderId,
        riskLevel: 'low',
        riskScore: 0,
        flags: [],
        recommendation: 'Risk check unavailable',
        requiresHumanReview: false,
        responseTimeMs: 0,
        error: 'Service unavailable',
      };
    }

    return await response.json();
  } catch (error) {
    console.error('checkOrderRisk error:', error);
    return {
      orderId,
      riskLevel: 'low',
      riskScore: 0,
      flags: [],
      recommendation: 'Risk check failed',
      requiresHumanReview: false,
      responseTimeMs: 0,
      error: 'Connection failed',
    };
  }
}

/**
 * Full chat conversation with history
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  sessionId?: string
): Promise<ChatResponse> {
  try {
    const token = await getAuthToken();
    const { data: { user } } = await supabase.auth.getUser();

    const response = await fetch(`${FUNCTIONS_URL}/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        userId: user?.id,
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error('Chat service unavailable');
    }

    return await response.json();
  } catch (error) {
    console.error('sendChatMessage error:', error);
    return {
      response: 'Lo siento, tengo problemas técnicos. ¿Podrías intentar de nuevo?',
      needsHuman: false,
      isUrgent: false,
      tokensUsed: 0,
      responseTimeMs: 0,
      error: true,
    };
  }
}

/**
 * Quick answers for common questions (cached/local first)
 */
export function getQuickAnswer(question: string): string | null {
  const q = question.toLowerCase().trim();

  const quickAnswers: Record<string, string> = {
    // Horarios
    'horario': 'Yesswera opera de 8am a 10pm todos los días.',
    'a que hora': 'Nuestro horario es de 8am a 10pm.',
    'están abiertos': 'Sí, operamos de 8am a 10pm diariamente.',

    // Pagos
    'formas de pago': 'Aceptamos efectivo y transferencia al momento de recibir tu pedido.',
    'puedo pagar con tarjeta': 'Por ahora solo aceptamos efectivo o transferencia.',
    'métodos de pago': 'Puedes pagar en efectivo o por transferencia cuando llegue tu pedido.',

    // Cobertura
    'zona de cobertura': 'Operamos en Tomatlán y alrededores (aproximadamente 15km).',
    'llegan a': 'Cubrimos Tomatlán y comunidades cercanas. ¿A qué zona necesitas?',

    // Costos
    'cuánto cuesta el envío': 'La tarifa base es $15 + $4 por cada km extra después de los primeros 2km.',
    'costo de envío': 'Envío: $15 base + $4/km adicional. Depende de la distancia.',

    // Códigos
    'código de entrega': 'Tu código de entrega está en la pantalla de tracking. Nunca lo compartas antes de recibir.',
    'olvidé mi código': 'Puedes ver tu código en la app, sección "Mis Pedidos" → tu orden activa.',

    // Cancelar
    'cancelar pedido': 'Puedes cancelar gratis solo si el negocio aún no ha aceptado. Después, contacta al negocio.',
    'quiero cancelar': 'Para cancelar, ve a tu pedido y busca el botón "Cancelar". Solo funciona si está pendiente.',
  };

  for (const [key, answer] of Object.entries(quickAnswers)) {
    if (q.includes(key)) {
      return answer;
    }
  }

  return null;
}

/**
 * Analyze order before creation to warn about potential issues
 * Returns warnings but doesn't block the order
 */
export async function preCheckOrder(orderData: {
  serviceType: string;
  deliveryAddress: string;
  packageDetails?: {
    isMinorRecipient?: boolean;
    recipientName?: string;
  };
}): Promise<string[]> {
  const warnings: string[] = [];

  // Check for minor recipient
  if (orderData.packageDetails?.isMinorRecipient) {
    warnings.push('Este pedido será entregado a un menor de edad. Asegúrate de que los datos sean correctos.');
  }

  // Check for vague address
  if (orderData.deliveryAddress.length < 20) {
    warnings.push('La dirección parece muy corta. Verifica que incluya referencias claras.');
  }

  // Check for late night orders (if we have time)
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 8) {
    warnings.push('Es un horario nocturno. Los tiempos de entrega podrían ser mayores.');
  }

  return warnings;
}
