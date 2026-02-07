// ============================================================================
// YESSWERA: SISTEMA DE SOPORTE AUTOMATIZADO (TIER 1)
// Respuestas automáticas sin IA - Costo $0
// ============================================================================

import { supabase } from '@/constants/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface AutoResponse {
  matched: boolean;
  response?: string;
  action?: SupportAction;
  escalateToAI?: boolean;
  escalateToHuman?: boolean;
  category?: string;
}

export interface SupportAction {
  type: 'link' | 'function' | 'info' | 'escalate';
  target?: string;
  data?: any;
}

export interface OrderStatusInfo {
  orderId: string;
  status: string;
  statusLabel: string;
  businessName?: string;
  driverName?: string;
  estimatedTime?: string;
  trackingAvailable: boolean;
}

// ============================================================================
// FAQ DATABASE
// Respuestas predefinidas por categoría
// ============================================================================

interface FAQEntry {
  keywords: string[];
  category: string;
  response: string;
  action?: SupportAction;
}

const FAQ_DATABASE: FAQEntry[] = [
  // === HORARIO Y DISPONIBILIDAD ===
  {
    keywords: ['horario', 'hora', 'abierto', 'abren', 'cierran', 'disponible', 'trabajan'],
    category: 'horario',
    response: 'Nuestro horario de servicio es de 8:00 AM a 10:00 PM, todos los días. Los negocios tienen sus propios horarios que puedes ver en su perfil.',
  },
  {
    keywords: ['zona', 'cobertura', 'areas', 'llegan', 'entregan', 'cubren', 'alcance'],
    category: 'cobertura',
    response: 'Actualmente damos servicio en Tomatlán y alrededores (radio de 5 km). Estamos expandiéndonos pronto a más zonas.',
  },

  // === PEDIDOS ===
  {
    keywords: ['donde esta', 'dónde está', 'mi pedido', 'estado', 'tracking', 'rastrear', 'seguir'],
    category: 'tracking',
    response: 'Para ver el estado de tu pedido, ve a "Mis Pedidos" en el menú. Ahí verás el estado en tiempo real y podrás ver la ubicación del repartidor cuando esté en camino.',
    action: { type: 'link', target: '/orders/history' },
  },
  {
    keywords: ['cancelar', 'cancela', 'anular', 'ya no quiero'],
    category: 'cancelacion',
    response: 'Puedes cancelar tu pedido solo si el negocio aún no lo ha aceptado. Ve a "Mis Pedidos", selecciona el pedido y presiona "Cancelar" si está disponible. Si ya fue aceptado, contacta a soporte.',
    action: { type: 'link', target: '/orders/history' },
  },
  {
    keywords: ['tiempo', 'cuanto tarda', 'demora', 'llega', 'tardará', 'espera'],
    category: 'tiempo',
    response: 'El tiempo de entrega depende del negocio y la distancia. En promedio:\n• Preparación: 15-30 min\n• Entrega: 10-20 min\nPuedes ver el tiempo estimado en el tracking de tu pedido.',
  },
  {
    keywords: ['codigo', 'código', 'verificacion', 'entrega', 'pin'],
    category: 'codigo',
    response: 'Al crear un pedido recibes un código de 6 caracteres. Este código lo debes dar al repartidor cuando llegue para confirmar la entrega. ¡No lo compartas antes de que llegue!',
  },

  // === PAGOS ===
  {
    keywords: ['pago', 'pagar', 'efectivo', 'tarjeta', 'transferencia', 'metodo'],
    category: 'pagos',
    response: 'Aceptamos:\n• Efectivo al recibir\n• Transferencia al recibir\n\nPronto agregaremos pago con tarjeta.',
  },
  {
    keywords: ['propina', 'tip'],
    category: 'propina',
    response: 'La propina es opcional pero muy apreciada por los repartidores. Puedes agregarla al hacer tu pedido o darla en efectivo al recibir.',
  },
  {
    keywords: ['costo', 'precio', 'envio', 'envío', 'delivery', 'tarifa'],
    category: 'costos',
    response: 'La tarifa de entrega es:\n• $15 MXN base (primeros 2 km)\n• $4 MXN por cada km adicional\n\nEl costo exacto se calcula según la distancia a tu domicilio.',
  },

  // === CUENTA ===
  {
    keywords: ['contraseña', 'password', 'olvidé', 'olvide', 'cambiar', 'recuperar'],
    category: 'password',
    response: 'Para recuperar tu contraseña:\n1. Ve a la pantalla de Login\n2. Presiona "¿Olvidaste tu contraseña?"\n3. Ingresa tu correo\n4. Revisa tu email y sigue las instrucciones',
    action: { type: 'link', target: '/password-recovery/request' },
  },
  {
    keywords: ['perfil', 'datos', 'actualizar', 'cambiar', 'telefono', 'direccion'],
    category: 'perfil',
    response: 'Para actualizar tus datos, ve a tu Perfil desde el menú y presiona "Editar Perfil". Ahí puedes cambiar tu nombre, teléfono y foto.',
    action: { type: 'link', target: '/profile' },
  },
  {
    keywords: ['eliminar', 'borrar', 'cuenta', 'baja'],
    category: 'eliminar_cuenta',
    response: 'Para eliminar tu cuenta, necesitamos verificar tu identidad. Por favor contacta a soporte y te ayudaremos con el proceso.',
    action: { type: 'escalate' },
  },

  // === PROBLEMAS ===
  {
    keywords: ['problema', 'error', 'fallo', 'no funciona', 'bug', 'mal'],
    category: 'problema_general',
    response: 'Lamento que tengas un problema. Para ayudarte mejor, ¿podrías decirnos más detalles sobre qué está pasando? Si es urgente, selecciona "Hablar con Soporte".',
    action: { type: 'escalate' },
  },
  {
    keywords: ['repartidor', 'driver', 'entregador', 'no llega', 'perdido'],
    category: 'problema_driver',
    response: 'Si tienes problemas con la entrega, puedes:\n1. Ver la ubicación en tiempo real en el tracking\n2. Llamar al repartidor desde la app\n3. Contactar a soporte si es urgente',
    action: { type: 'escalate' },
  },
  {
    keywords: ['negocio', 'restaurante', 'tienda', 'cerrado', 'no acepta'],
    category: 'problema_negocio',
    response: 'Si el negocio no acepta tu pedido, recibirás una notificación y el pedido se cancelará automáticamente sin costo. Puedes intentar con otro negocio.',
  },
  {
    keywords: ['reembolso', 'devolucion', 'dinero', 'cobro', 'cargo'],
    category: 'reembolso',
    response: 'Para solicitar un reembolso necesitamos revisar tu caso. Por favor contacta a soporte con el número de orden y el motivo.',
    action: { type: 'escalate' },
  },
  {
    keywords: ['queja', 'reclamo', 'mal servicio', 'insatisfecho', 'molesto'],
    category: 'queja',
    response: 'Lamentamos mucho tu experiencia. Tu opinión es importante para nosotros. Un agente de soporte revisará tu caso personalmente.',
    action: { type: 'escalate' },
  },

  // === REFERIDOS Y SORTEOS ===
  {
    keywords: ['referir', 'invitar', 'amigo', 'codigo', 'código', 'compartir', 'ganar'],
    category: 'referidos',
    response: 'Puedes ganar créditos invitando amigos:\n• Tú ganas: $20 de crédito\n• Tu amigo gana: $15 de crédito\n• Ambos: 1 entrada al sorteo\n\nEncuentra tu código en "Mis Referidos".',
    action: { type: 'link', target: '/referrals' },
  },
  {
    keywords: ['sorteo', 'premio', 'rifa', 'ganar', 'participar'],
    category: 'sorteo',
    response: 'Cada mes hacemos un sorteo con premios de negocios locales. Participas automáticamente al registrarte y ganas entradas extra por cada amigo que refieras.',
    action: { type: 'link', target: '/referrals' },
  },
  {
    keywords: ['credito', 'crédito', 'saldo', 'balance'],
    category: 'creditos',
    response: 'Tus créditos se aplican automáticamente en tu próximo pedido. Puedes ver tu balance en "Mis Referidos". Los créditos tienen fecha de expiración, ¡úsalos pronto!',
    action: { type: 'link', target: '/referrals' },
  },

  // === INFO GENERAL ===
  {
    keywords: ['que es', 'qué es', 'yesswera', 'app', 'aplicacion', 'funciona'],
    category: 'info',
    response: 'Yesswera es tu app de delivery local en Tomatlán. Puedes:\n• Pedir comida de restaurantes\n• Hacer lista de compras del súper\n• Enviar paquetes\n\n¡Todo desde tu celular!',
  },
  {
    keywords: ['contacto', 'telefono', 'llamar', 'whatsapp', 'email'],
    category: 'contacto',
    response: 'Puedes contactarnos por:\n• WhatsApp: 322-100-0000\n• Email: soporte@yesswera.com\n\nO usa el chat de soporte en la app.',
  },
  {
    keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hi', 'hello'],
    category: 'saludo',
    response: '¡Hola! Soy el asistente de Yesswera. ¿En qué puedo ayudarte hoy?',
  },
  {
    keywords: ['gracias', 'thanks', 'genial', 'perfecto', 'excelente'],
    category: 'agradecimiento',
    response: '¡Con gusto! Si tienes alguna otra pregunta, aquí estoy para ayudarte.',
  },
];

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Procesar mensaje del usuario y dar respuesta automática
 */
export function processAutoSupport(message: string): AutoResponse {
  const normalizedMessage = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Buscar coincidencia en FAQ
  for (const entry of FAQ_DATABASE) {
    const matchScore = calculateMatchScore(normalizedMessage, entry.keywords);

    if (matchScore >= 0.5) { // 50% de coincidencia mínima
      return {
        matched: true,
        response: entry.response,
        action: entry.action,
        category: entry.category,
        escalateToAI: entry.action?.type === 'escalate',
      };
    }
  }

  // No se encontró coincidencia - escalar a IA
  return {
    matched: false,
    escalateToAI: true,
  };
}

/**
 * Calcular puntuación de coincidencia entre mensaje y keywords
 */
function calculateMatchScore(message: string, keywords: string[]): number {
  let matches = 0;

  for (const keyword of keywords) {
    if (message.includes(keyword.toLowerCase())) {
      matches++;
    }
  }

  return matches / keywords.length;
}

/**
 * Obtener estado de una orden para mostrar al usuario
 */
export async function getOrderStatusForSupport(orderIdOrCode: string): Promise<OrderStatusInfo | null> {
  // Intentar buscar por ID o código de entrega
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      estimated_delivery,
      businesses (name),
      drivers (
        users (name)
      )
    `)
    .or(`id.eq.${orderIdOrCode},delivery_code.eq.${orderIdOrCode.toUpperCase()}`)
    .single();

  if (error || !order) return null;

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente - Esperando que el negocio acepte',
    accepted: 'Aceptado - El negocio está preparando tu pedido',
    preparing: 'Preparando - Tu pedido está siendo preparado',
    ready: 'Listo - Esperando repartidor',
    assigned: 'Asignado - Repartidor en camino al negocio',
    in_transit: 'En camino - El repartidor va hacia ti',
    arrived: 'Llegó - El repartidor está en tu ubicación',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  return {
    orderId: order.id,
    status: order.status,
    statusLabel: statusLabels[order.status] || order.status,
    businessName: (order as any).businesses?.name,
    driverName: (order as any).drivers?.users?.name,
    estimatedTime: order.estimated_delivery,
    trackingAvailable: ['assigned', 'in_transit', 'arrived'].includes(order.status),
  };
}

/**
 * Verificar si el usuario puede cancelar una orden
 */
export async function canCancelOrder(orderId: string): Promise<{
  canCancel: boolean;
  reason?: string;
}> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { canCancel: false, reason: 'Orden no encontrada' };
  }

  if (order.status === 'pending') {
    return { canCancel: true };
  }

  if (['delivered', 'cancelled'].includes(order.status)) {
    return { canCancel: false, reason: 'Esta orden ya fue completada o cancelada' };
  }

  return {
    canCancel: false,
    reason: 'La orden ya fue aceptada por el negocio. Contacta a soporte para ayuda.',
  };
}

/**
 * Obtener respuestas sugeridas según el contexto
 */
export function getSuggestedResponses(context?: string): string[] {
  const general = [
    '¿Dónde está mi pedido?',
    '¿Cuál es el horario de servicio?',
    '¿Cómo cancelo un pedido?',
    '¿Cómo funciona el código de referido?',
  ];

  if (context === 'order') {
    return [
      '¿Cuánto falta para mi pedido?',
      '¿Puedo cambiar la dirección?',
      '¿Cómo contacto al repartidor?',
      'Tengo un problema con mi pedido',
    ];
  }

  if (context === 'payment') {
    return [
      '¿Qué métodos de pago aceptan?',
      '¿Cómo funciona la propina?',
      '¿Puedo pedir factura?',
      'Necesito un reembolso',
    ];
  }

  return general;
}

/**
 * Registrar interacción de soporte para analytics
 */
export async function logSupportInteraction(
  userId: string | null,
  message: string,
  response: string,
  category: string,
  wasAutomatic: boolean,
  wasResolved: boolean
): Promise<void> {
  try {
    await supabase.from('support_interactions').insert({
      user_id: userId,
      message_summary: message.substring(0, 200),
      response_summary: response.substring(0, 200),
      category,
      was_automatic: wasAutomatic,
      was_resolved: wasResolved,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging support interaction:', error);
  }
}
