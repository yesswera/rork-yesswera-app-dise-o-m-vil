import { supabase } from '@/constants/supabase';
import { sendLocalNotification } from '@/services/notifications';

// ============================================
// TYPES
// ============================================

// Case Types
export interface CaseView {
  caseNumber: string;
  status: string;
  createdAt: string;
  escalatedAt?: string;

  // Participants
  participant1: CaseParticipant;
  participant2: CaseParticipant;

  // Order info
  order?: CaseOrder;

  // Chat messages
  messages: CaseMessage[];

  // Timeline
  timeline: CaseTimelineEvent[];

  // Actions taken
  actions: CaseSupportAction[];
}

export interface CaseParticipant {
  id: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  lastLocation?: { lat: number; lng: number; address?: string; timestamp?: string };
}

export interface CaseOrder {
  id: string;
  status: string;
  serviceType: string;
  total: number;
  deliveryFee: number;
  deliveryAddress: string;
  pickupAddress?: string;
  businessName?: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}

export interface CaseMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: string;
  content: string;
  messageType: string;
  createdAt: string;
}

export interface CaseTimelineEvent {
  id: string;
  eventType: string;
  actorName?: string;
  actorType?: string;
  description: string;
  location?: { lat: number; lng: number; address?: string };
  createdAt: string;
}

export interface CaseSupportAction {
  id: string;
  actionCode: string;
  title: string;
  message: string;
  executedBy: string;
  executedAt: string;
  pushSent: boolean;
}

export interface SupportActionTemplate {
  id: string;
  code: string;
  category: string;
  title: string;
  message: string;
  instructions?: string;
  requiresExternal: boolean;
  externalAgency?: string;
  icon?: string;
}

export type TicketCategory =
  | 'order_issue'
  | 'payment'
  | 'driver'
  | 'business'
  | 'app_bug'
  | 'account'
  | 'other';

export type TicketSubcategory =
  | 'not_delivered'
  | 'wrong_items'
  | 'late_delivery'
  | 'cold_food'
  | 'driver_rude'
  | 'driver_no_response'
  | 'business_closed'
  | 'double_charge'
  | 'refund_request'
  | 'other';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_user'
  | 'resolved'
  | 'closed'
  | 'escalated';

export type ResolutionType =
  | 'refund'
  | 'replacement'
  | 'apology'
  | 'coupon'
  | 'no_action'
  | 'escalated';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userType: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  orderId?: string;
  orderNumber?: string;
  category: TicketCategory;
  subcategory?: TicketSubcategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  status: TicketStatus;
  resolutionType?: ResolutionType;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  autoResolutionAttempted: boolean;
  autoResolutionResult?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  slaDeadline?: string;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  messagesCount?: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'system';
  senderName?: string;
  message: string;
  attachments?: { url: string; type: string; name: string }[];
  isSystemMessage: boolean;
  systemAction?: string;
  createdAt: string;
}

export interface QuickReply {
  id: string;
  category: string;
  title: string;
  message: string;
  actionType?: string;
  actionParams?: any;
}

export interface AutoResolutionResult {
  canAutoResolve: boolean;
  suggestedAction?: string;
  suggestedMessage?: string;
  quickReply?: QuickReply;
  confidence: number; // 0-100
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  avgResolutionTime: number; // in minutes
  slaBreached: number;
}

// ============================================
// TICKET MANAGEMENT
// ============================================

export async function createTicket(data: {
  userId: string;
  userType: string;
  orderId?: string;
  category: TicketCategory;
  subcategory?: TicketSubcategory;
  subject: string;
  description: string;
  priority?: TicketPriority;
}): Promise<SupportTicket> {
  try {
    // Determine priority based on category if not provided
    const priority = data.priority || determinePriority(data.category, data.subcategory);

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: data.userId,
        user_type: data.userType,
        order_id: data.orderId,
        category: data.category,
        subcategory: data.subcategory,
        subject: data.subject,
        description: data.description,
        priority,
      })
      .select()
      .single();

    if (error) throw error;

    // Try auto-resolution
    const autoResult = await attemptAutoResolution(ticket.id, data.category, data.description);

    // Add initial system message
    await addTicketMessage(ticket.id, {
      senderId: data.userId,
      senderType: 'system',
      message: `Ticket creado: ${data.subject}`,
      isSystemMessage: true,
      systemAction: 'ticket_created',
    });

    if (autoResult.canAutoResolve && autoResult.suggestedMessage) {
      await addTicketMessage(ticket.id, {
        senderId: data.userId,
        senderType: 'system',
        message: autoResult.suggestedMessage,
        isSystemMessage: true,
        systemAction: 'auto_response',
      });
    }

    return mapTicket(ticket);
  } catch (error) {
    console.error('createTicket error:', error);
    throw error;
  }
}

export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id (full_name, email, phone),
        order:order_id (id),
        assigned:assigned_to (full_name),
        resolver:resolved_by (full_name)
      `)
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    return data ? mapTicketWithRelations(data) : null;
  } catch (error) {
    console.error('getTicketById error:', error);
    return null;
  }
}

export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapTicket);
  } catch (error) {
    console.error('getUserTickets error:', error);
    return [];
  }
}

export async function getAllTickets(filters?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  slaBreached?: boolean;
}): Promise<SupportTicket[]> {
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id (full_name, email, phone),
        assigned:assigned_to (full_name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters?.slaBreached) query = query.eq('sla_breached', true);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapTicketWithRelations);
  } catch (error) {
    console.error('getAllTickets error:', error);
    return [];
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  adminId?: string
): Promise<void> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'in_progress' && adminId) {
      updates.assigned_to = adminId;
      updates.assigned_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) throw error;

    // Add system message
    await addTicketMessage(ticketId, {
      senderId: adminId || 'system',
      senderType: 'system',
      message: `Estado cambiado a: ${getStatusLabel(status)}`,
      isSystemMessage: true,
      systemAction: 'status_change',
    });
  } catch (error) {
    console.error('updateTicketStatus error:', error);
    throw error;
  }
}

export async function resolveTicket(
  ticketId: string,
  adminId: string,
  resolution: {
    type: ResolutionType;
    notes: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'resolved',
        resolution_type: resolution.type,
        resolution_notes: resolution.notes,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;

    // Add resolution message
    await addTicketMessage(ticketId, {
      senderId: adminId,
      senderType: 'system',
      message: `Ticket resuelto: ${resolution.notes}`,
      isSystemMessage: true,
      systemAction: 'resolved',
    });
  } catch (error) {
    console.error('resolveTicket error:', error);
    throw error;
  }
}

export async function assignTicket(
  ticketId: string,
  adminId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: adminId,
        assigned_at: new Date().toISOString(),
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;
  } catch (error) {
    console.error('assignTicket error:', error);
    throw error;
  }
}

// ============================================
// TICKET MESSAGES
// ============================================

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:sender_id (full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(m => ({
      id: m.id,
      ticketId: m.ticket_id,
      senderId: m.sender_id,
      senderType: m.sender_type,
      senderName: m.sender?.full_name || 'Sistema',
      message: m.message,
      attachments: m.attachments,
      isSystemMessage: m.is_system_message,
      systemAction: m.system_action,
      createdAt: m.created_at,
    }));
  } catch (error) {
    console.error('getTicketMessages error:', error);
    return [];
  }
}

export async function addTicketMessage(
  ticketId: string,
  data: {
    senderId: string;
    senderType: 'user' | 'admin' | 'system';
    message: string;
    attachments?: { url: string; type: string; name: string }[];
    isSystemMessage?: boolean;
    systemAction?: string;
  }
): Promise<TicketMessage | null> {
  try {
    const { data: msg, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: data.senderId,
        sender_type: data.senderType,
        message: data.message,
        attachments: data.attachments,
        is_system_message: data.isSystemMessage || false,
        system_action: data.systemAction,
      })
      .select()
      .single();

    if (error) throw error;

    // Update ticket's updated_at
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return {
      id: msg.id,
      ticketId: msg.ticket_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      message: msg.message,
      attachments: msg.attachments,
      isSystemMessage: msg.is_system_message,
      systemAction: msg.system_action,
      createdAt: msg.created_at,
    };
  } catch (error) {
    console.error('addTicketMessage error:', error);
    return null;
  }
}

// ============================================
// AUTO-RESOLUTION
// ============================================

export async function attemptAutoResolution(
  ticketId: string,
  category: TicketCategory,
  description: string
): Promise<AutoResolutionResult> {
  try {
    // Get quick replies for this category
    const { data: quickReplies } = await supabase
      .from('support_quick_replies')
      .select('*')
      .eq('category', category)
      .eq('is_active', true);

    if (!quickReplies || quickReplies.length === 0) {
      return { canAutoResolve: false, confidence: 0 };
    }

    // Find matching quick reply based on keywords
    const descLower = description.toLowerCase();
    let bestMatch: any = null;
    let bestScore = 0;

    for (const qr of quickReplies) {
      if (!qr.trigger_keywords) continue;

      let matchCount = 0;
      for (const keyword of qr.trigger_keywords) {
        if (descLower.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      const score = matchCount / qr.trigger_keywords.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = qr;
      }
    }

    // Update ticket with auto-resolution attempt
    await supabase
      .from('support_tickets')
      .update({
        auto_resolution_attempted: true,
        auto_resolution_result: bestScore >= 0.5 ? 'suggested' : 'no_match',
      })
      .eq('id', ticketId);

    if (bestMatch && bestScore >= 0.3) {
      // Increment usage count
      await supabase
        .from('support_quick_replies')
        .update({ usage_count: (bestMatch.usage_count || 0) + 1 })
        .eq('id', bestMatch.id);

      return {
        canAutoResolve: bestScore >= 0.5,
        suggestedAction: bestMatch.action_type,
        suggestedMessage: bestMatch.message,
        quickReply: {
          id: bestMatch.id,
          category: bestMatch.category,
          title: bestMatch.title,
          message: bestMatch.message,
          actionType: bestMatch.action_type,
          actionParams: bestMatch.action_params,
        },
        confidence: Math.round(bestScore * 100),
      };
    }

    return { canAutoResolve: false, confidence: 0 };
  } catch (error) {
    console.error('attemptAutoResolution error:', error);
    return { canAutoResolve: false, confidence: 0 };
  }
}

// ============================================
// STATISTICS
// ============================================

export async function getTicketStats(): Promise<TicketStats> {
  try {
    const [
      totalResult,
      openResult,
      inProgressResult,
      resolvedResult,
      escalatedResult,
      breachedResult,
    ] = await Promise.all([
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('sla_breached', true),
    ]);

    // Calculate average resolution time
    const { data: resolved } = await supabase
      .from('support_tickets')
      .select('created_at, resolved_at')
      .eq('status', 'resolved')
      .not('resolved_at', 'is', null)
      .limit(100);

    let avgTime = 0;
    if (resolved && resolved.length > 0) {
      const times = resolved.map(t => {
        const created = new Date(t.created_at).getTime();
        const resolvedAt = new Date(t.resolved_at).getTime();
        return (resolvedAt - created) / 60000; // minutes
      });
      avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    }

    return {
      total: totalResult.count || 0,
      open: openResult.count || 0,
      inProgress: inProgressResult.count || 0,
      resolved: resolvedResult.count || 0,
      escalated: escalatedResult.count || 0,
      avgResolutionTime: Math.round(avgTime),
      slaBreached: breachedResult.count || 0,
    };
  } catch (error) {
    console.error('getTicketStats error:', error);
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      escalated: 0,
      avgResolutionTime: 0,
      slaBreached: 0,
    };
  }
}

// ============================================
// QUICK REPLIES
// ============================================

export async function getQuickReplies(category?: string): Promise<QuickReply[]> {
  try {
    let query = supabase
      .from('support_quick_replies')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(qr => ({
      id: qr.id,
      category: qr.category,
      title: qr.title,
      message: qr.message,
      actionType: qr.action_type,
      actionParams: qr.action_params,
    }));
  } catch (error) {
    console.error('getQuickReplies error:', error);
    return [];
  }
}

// ============================================
// HELPERS
// ============================================

function determinePriority(category: TicketCategory, subcategory?: TicketSubcategory): TicketPriority {
  // Urgent priorities
  if (category === 'order_issue' && subcategory === 'not_delivered') return 'high';
  if (category === 'driver' && subcategory === 'driver_rude') return 'high';
  if (category === 'payment' && subcategory === 'double_charge') return 'high';

  // Normal priorities
  if (category === 'order_issue') return 'normal';
  if (category === 'payment') return 'normal';
  if (category === 'driver') return 'normal';

  // Low priorities
  if (category === 'app_bug') return 'low';
  if (category === 'other') return 'low';

  return 'normal';
}

function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    open: 'Abierto',
    in_progress: 'En Proceso',
    waiting_user: 'Esperando Usuario',
    resolved: 'Resuelto',
    closed: 'Cerrado',
    escalated: 'Escalado',
  };
  return labels[status] || status;
}

function mapTicket(db: any): SupportTicket {
  return {
    id: db.id,
    ticketNumber: db.ticket_number,
    userId: db.user_id,
    userType: db.user_type,
    orderId: db.order_id,
    category: db.category,
    subcategory: db.subcategory,
    priority: db.priority,
    subject: db.subject,
    description: db.description,
    status: db.status,
    resolutionType: db.resolution_type,
    resolutionNotes: db.resolution_notes,
    resolvedAt: db.resolved_at,
    resolvedBy: db.resolved_by,
    autoResolutionAttempted: db.auto_resolution_attempted,
    autoResolutionResult: db.auto_resolution_result,
    assignedTo: db.assigned_to,
    assignedAt: db.assigned_at,
    slaDeadline: db.sla_deadline,
    slaBreached: db.sla_breached,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapTicketWithRelations(db: any): SupportTicket {
  return {
    ...mapTicket(db),
    userName: db.user?.full_name,
    userEmail: db.user?.email,
    userPhone: db.user?.phone,
    assignedToName: db.assigned?.full_name,
  };
}

// ============================================
// CATEGORY/SUBCATEGORY LABELS
// ============================================

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'order_issue', label: 'Problema con Pedido' },
  { value: 'payment', label: 'Pagos y Cobros' },
  { value: 'driver', label: 'Repartidor' },
  { value: 'business', label: 'Negocio' },
  { value: 'account', label: 'Mi Cuenta' },
  { value: 'app_bug', label: 'Error en la App' },
  { value: 'other', label: 'Otro' },
];

export const TICKET_SUBCATEGORIES: Record<TicketCategory, { value: TicketSubcategory; label: string }[]> = {
  order_issue: [
    { value: 'not_delivered', label: 'No llegó mi pedido' },
    { value: 'wrong_items', label: 'Pedido incorrecto' },
    { value: 'late_delivery', label: 'Llegó muy tarde' },
    { value: 'cold_food', label: 'Comida fría/maltratada' },
    { value: 'other', label: 'Otro problema' },
  ],
  payment: [
    { value: 'double_charge', label: 'Cobro duplicado' },
    { value: 'refund_request', label: 'Solicitar reembolso' },
    { value: 'other', label: 'Otro problema de pago' },
  ],
  driver: [
    { value: 'driver_rude', label: 'Mal trato del repartidor' },
    { value: 'driver_no_response', label: 'No responde el repartidor' },
    { value: 'other', label: 'Otro problema' },
  ],
  business: [
    { value: 'business_closed', label: 'Negocio cerrado' },
    { value: 'wrong_items', label: 'Prepararon mal el pedido' },
    { value: 'other', label: 'Otro problema' },
  ],
  account: [
    { value: 'other', label: 'Problema con mi cuenta' },
  ],
  app_bug: [
    { value: 'other', label: 'Error o falla en la app' },
  ],
  other: [
    { value: 'other', label: 'Otra consulta' },
  ],
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En Proceso',
  waiting_user: 'Esperando Usuario',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  escalated: 'Escalado',
};

// ============================================
// CASE MANAGEMENT (ID Corto)
// ============================================

export async function getCaseByNumber(caseNumber: string): Promise<CaseView | null> {
  try {
    // Get conversation with case number
    const { data: conv, error: convError } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        participant1:participant_1_id (id, full_name, email, phone, user_type),
        participant2:participant_2_id (id, full_name, email, phone, user_type)
      `)
      .eq('case_number', caseNumber.toUpperCase())
      .single();

    if (convError || !conv) {
      console.error('Case not found:', convError);
      return null;
    }

    // Get order details if exists
    let order: CaseOrder | undefined;
    if (conv.order_id) {
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          business:business_id (business_name),
          order_items (product_name, quantity, unit_price)
        `)
        .eq('id', conv.order_id)
        .single();

      if (orderData) {
        order = {
          id: orderData.id,
          status: orderData.status,
          serviceType: orderData.service_type,
          total: orderData.total,
          deliveryFee: orderData.delivery_fee,
          deliveryAddress: orderData.delivery_address,
          pickupAddress: orderData.pickup_address,
          businessName: orderData.business?.business_name,
          createdAt: orderData.created_at,
          items: (orderData.order_items || []).map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.unit_price,
          })),
        };
      }
    }

    // Get chat messages
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:sender_id (full_name)
      `)
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    const messages: CaseMessage[] = (messagesData || []).map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender?.full_name || 'Usuario',
      senderType: m.sender_type,
      content: m.content,
      messageType: m.message_type,
      createdAt: m.created_at,
    }));

    // Get timeline
    const { data: timelineData } = await supabase
      .from('case_timeline')
      .select('*')
      .eq('case_number', caseNumber.toUpperCase())
      .order('created_at', { ascending: true });

    const timeline: CaseTimelineEvent[] = (timelineData || []).map((t: any) => ({
      id: t.id,
      eventType: t.event_type,
      actorName: t.actor_name,
      actorType: t.actor_type,
      description: t.description,
      location: t.location_lat ? {
        lat: t.location_lat,
        lng: t.location_lng,
        address: t.location_address,
      } : undefined,
      createdAt: t.created_at,
    }));

    // Get support actions
    const { data: actionsData } = await supabase
      .from('support_actions')
      .select(`
        *,
        executor:executed_by (full_name)
      `)
      .eq('case_number', caseNumber.toUpperCase())
      .order('executed_at', { ascending: true });

    const actions: CaseSupportAction[] = (actionsData || []).map((a: any) => ({
      id: a.id,
      actionCode: a.action_code,
      title: a.title,
      message: a.message,
      executedBy: a.executor?.full_name || 'Admin',
      executedAt: a.executed_at,
      pushSent: a.push_sent,
    }));

    return {
      caseNumber: conv.case_number,
      status: conv.status,
      createdAt: conv.created_at,
      escalatedAt: conv.escalated_at,
      participant1: {
        id: conv.participant1?.id,
        name: conv.participant1?.full_name || 'Usuario',
        type: conv.participant_1_type,
        phone: conv.participant1?.phone,
        email: conv.participant1?.email,
      },
      participant2: {
        id: conv.participant2?.id,
        name: conv.participant2?.full_name || 'Usuario',
        type: conv.participant_2_type,
        phone: conv.participant2?.phone,
        email: conv.participant2?.email,
      },
      order,
      messages,
      timeline,
      actions,
    };
  } catch (error) {
    console.error('getCaseByNumber error:', error);
    return null;
  }
}

export async function searchCases(query: string): Promise<{
  caseNumber: string;
  status: string;
  participant1Name: string;
  participant2Name: string;
  createdAt: string;
}[]> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        case_number,
        status,
        created_at,
        participant1:participant_1_id (full_name),
        participant2:participant_2_id (full_name)
      `)
      .or(`case_number.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((c: any) => ({
      caseNumber: c.case_number,
      status: c.status,
      participant1Name: c.participant1?.full_name || 'Usuario',
      participant2Name: c.participant2?.full_name || 'Usuario',
      createdAt: c.created_at,
    }));
  } catch (error) {
    console.error('searchCases error:', error);
    return [];
  }
}

// ============================================
// SUPPORT ACTIONS
// ============================================

export async function getSupportActionTemplates(): Promise<SupportActionTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('support_action_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((t: any) => ({
      id: t.id,
      code: t.code,
      category: t.category,
      title: t.title,
      message: t.message,
      instructions: t.instructions,
      requiresExternal: t.requires_external,
      externalAgency: t.external_agency,
      icon: t.icon,
    }));
  } catch (error) {
    console.error('getSupportActionTemplates error:', error);
    return [];
  }
}

export async function executeSupportAction(
  caseNumber: string,
  actionCode: string,
  adminId: string,
  targetUserIds: string[],
  customMessage?: string,
  externalReference?: string
): Promise<boolean> {
  try {
    // Get the action template
    const { data: template } = await supabase
      .from('support_action_templates')
      .select('*')
      .eq('code', actionCode)
      .single();

    if (!template) {
      console.error('Action template not found:', actionCode);
      return false;
    }

    const message = customMessage || template.message;
    const fullMessage = template.instructions
      ? `${message}\n\n${template.instructions}`
      : message;

    // Create the support action record
    const { data: action, error: actionError } = await supabase
      .from('support_actions')
      .insert({
        case_number: caseNumber.toUpperCase(),
        action_type: template.category,
        action_code: actionCode,
        target_user_ids: targetUserIds,
        title: template.title,
        message: fullMessage,
        instructions: template.instructions,
        external_agency: template.external_agency,
        external_reference: externalReference,
        executed_by: adminId,
      })
      .select()
      .single();

    if (actionError) throw actionError;

    // Add to timeline
    await supabase.from('case_timeline').insert({
      case_number: caseNumber.toUpperCase(),
      event_type: 'action_taken',
      actor_id: adminId,
      actor_type: 'admin',
      description: `Acción de soporte: ${template.title}`,
      event_data: { actionCode, actionId: action.id },
    });

    // Send push notifications to target users
    for (const userId of targetUserIds) {
      try {
        // Get push token
        const { data: tokenData } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', userId)
          .single();

        if (tokenData?.token) {
          await sendLocalNotification(
            `📋 Caso ${caseNumber}: ${template.title}`,
            fullMessage,
            { caseNumber, actionCode }
          );
        }

        // Update action as sent
        await supabase
          .from('support_actions')
          .update({ push_sent: true, push_sent_at: new Date().toISOString() })
          .eq('id', action.id);
      } catch (pushError) {
        console.warn('Push notification failed for user:', userId, pushError);
      }
    }

    // If escalated to external, update conversation status
    if (template.requires_external) {
      await supabase
        .from('chat_conversations')
        .update({
          status: 'escalated',
          escalated_at: new Date().toISOString(),
          escalated_reason: template.title,
        })
        .eq('case_number', caseNumber.toUpperCase());
    }

    return true;
  } catch (error) {
    console.error('executeSupportAction error:', error);
    return false;
  }
}

// ============================================
// CASE TIMELINE
// ============================================

export async function addTimelineEvent(
  caseNumber: string,
  eventType: string,
  description: string,
  actorId?: string,
  actorType?: string,
  location?: { lat: number; lng: number; address?: string },
  eventData?: any
): Promise<void> {
  try {
    await supabase.from('case_timeline').insert({
      case_number: caseNumber.toUpperCase(),
      event_type: eventType,
      actor_id: actorId,
      actor_type: actorType,
      description,
      event_data: eventData,
      location_lat: location?.lat,
      location_lng: location?.lng,
      location_address: location?.address,
    });
  } catch (error) {
    console.error('addTimelineEvent error:', error);
  }
}

// ============================================
// CASE REPORT (EXPEDIENTE)
// ============================================

export async function generateCaseReport(
  caseNumber: string,
  adminId: string,
  forAgency?: string
): Promise<{ reportNumber: string; accessCode: string } | null> {
  try {
    const caseView = await getCaseByNumber(caseNumber);
    if (!caseView) return null;

    // Generate report number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('case_reports')
      .select('id', { count: 'exact', head: true });
    const reportNumber = `EXP-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

    // Generate access code
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Build summary
    const summary = buildCaseSummary(caseView);

    // Insert report
    const { error } = await supabase.from('case_reports').insert({
      case_number: caseNumber.toUpperCase(),
      report_number: reportNumber,
      summary,
      timeline_snapshot: caseView.timeline,
      participants: {
        participant1: caseView.participant1,
        participant2: caseView.participant2,
      },
      order_details: caseView.order,
      chat_transcript: caseView.messages,
      actions_taken: caseView.actions,
      for_external_agency: forAgency,
      generated_by: adminId,
      access_code: accessCode,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    if (error) throw error;

    // Add to timeline
    await addTimelineEvent(
      caseNumber,
      'report_generated',
      `Expediente generado: ${reportNumber}${forAgency ? ` para ${forAgency}` : ''}`,
      adminId,
      'admin'
    );

    return { reportNumber, accessCode };
  } catch (error) {
    console.error('generateCaseReport error:', error);
    return null;
  }
}

function buildCaseSummary(caseView: CaseView): string {
  const lines: string[] = [
    `EXPEDIENTE DE CASO`,
    `==================`,
    ``,
    `Número de Caso: ${caseView.caseNumber}`,
    `Fecha de Inicio: ${new Date(caseView.createdAt).toLocaleString('es-MX')}`,
    `Estado: ${caseView.status}`,
    ``,
    `PARTICIPANTES:`,
    `- ${caseView.participant1.name} (${caseView.participant1.type})`,
    `  Tel: ${caseView.participant1.phone || 'N/A'}`,
    `  Email: ${caseView.participant1.email || 'N/A'}`,
    ``,
    `- ${caseView.participant2.name} (${caseView.participant2.type})`,
    `  Tel: ${caseView.participant2.phone || 'N/A'}`,
    `  Email: ${caseView.participant2.email || 'N/A'}`,
  ];

  if (caseView.order) {
    lines.push(
      ``,
      `ORDEN ASOCIADA:`,
      `- ID: ${caseView.order.id}`,
      `- Tipo: ${caseView.order.serviceType}`,
      `- Total: $${caseView.order.total}`,
      `- Estado: ${caseView.order.status}`,
      `- Dirección Entrega: ${caseView.order.deliveryAddress}`,
    );
  }

  lines.push(
    ``,
    `RESUMEN DE EVENTOS: ${caseView.timeline.length} eventos registrados`,
    `MENSAJES EN CHAT: ${caseView.messages.length} mensajes`,
    `ACCIONES DE SOPORTE: ${caseView.actions.length} acciones tomadas`,
  );

  return lines.join('\n');
}

export async function getCaseReport(
  reportNumber: string,
  accessCode: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('case_reports')
      .select('*')
      .eq('report_number', reportNumber)
      .eq('access_code', accessCode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    return data;
  } catch (error) {
    console.error('getCaseReport error:', error);
    return null;
  }
}
