import { supabase } from '@/constants/supabase';

// ============================================
// TYPES
// ============================================

export type ParticipantType = 'client' | 'driver' | 'business' | 'admin';

export interface ChatConversation {
  id: string;
  caseNumber: string; // ID corto para soporte (A1B2C3)
  orderId?: string;
  participant1Id: string;
  participant1Type: ParticipantType;
  participant1Name?: string;
  participant2Id: string;
  participant2Type: ParticipantType;
  participant2Name?: string;
  status: 'active' | 'closed' | 'archived' | 'escalated';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ParticipantType;
  senderName?: string;
  messageType: 'text' | 'image' | 'location' | 'system';
  content: string;
  imageUrl?: string;
  location?: { lat: number; lng: number };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ConversationSummary {
  conversationId: string;
  orderId?: string;
  otherParticipantId: string;
  otherParticipantName: string;
  otherParticipantType: ParticipantType;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
}

// ============================================
// CONVERSATIONS
// ============================================

export async function getOrCreateConversation(
  orderId: string,
  participant1Id: string,
  participant1Type: ParticipantType,
  participant2Id: string,
  participant2Type: ParticipantType
): Promise<ChatConversation | null> {
  try {
    // First, check if conversation already exists for this order and participants
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('order_id', orderId)
      .or(`and(participant_1_id.eq.${participant1Id},participant_2_id.eq.${participant2Id}),and(participant_1_id.eq.${participant2Id},participant_2_id.eq.${participant1Id})`)
      .single();

    if (existing) {
      return mapConversation(existing);
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        order_id: orderId,
        participant_1_id: participant1Id,
        participant_1_type: participant1Type,
        participant_2_id: participant2Id,
        participant_2_type: participant2Type,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // Send system message
    await sendMessage(data.id, {
      senderId: participant1Id,
      senderType: 'client',
      messageType: 'system',
      content: 'Conversación iniciada',
    });

    return mapConversation(data);
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    return null;
  }
}

export async function getConversationById(conversationId: string): Promise<ChatConversation | null> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        participant1:participant_1_id (full_name),
        participant2:participant_2_id (full_name)
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    return data ? {
      ...mapConversation(data),
      participant1Name: data.participant1?.full_name,
      participant2Name: data.participant2?.full_name,
    } : null;
  } catch (error) {
    console.error('getConversationById error:', error);
    return null;
  }
}

export async function getUserConversations(userId: string): Promise<ConversationSummary[]> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        participant1:participant_1_id (full_name),
        participant2:participant_2_id (full_name)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (data || []).map(conv => {
      const isParticipant1 = conv.participant_1_id === userId;
      return {
        conversationId: conv.id,
        orderId: conv.order_id,
        otherParticipantId: isParticipant1 ? conv.participant_2_id : conv.participant_1_id,
        otherParticipantName: isParticipant1
          ? conv.participant2?.full_name || 'Usuario'
          : conv.participant1?.full_name || 'Usuario',
        otherParticipantType: isParticipant1 ? conv.participant_2_type : conv.participant_1_type,
        lastMessage: conv.last_message || '',
        lastMessageAt: conv.last_message_at || conv.created_at,
        unreadCount: isParticipant1 ? conv.unread_count_1 : conv.unread_count_2,
        status: conv.status,
      };
    });
  } catch (error) {
    console.error('getUserConversations error:', error);
    return [];
  }
}

export async function getOrderConversations(orderId: string): Promise<ChatConversation[]> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        participant1:participant_1_id (full_name),
        participant2:participant_2_id (full_name)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(conv => ({
      ...mapConversation(conv),
      participant1Name: conv.participant1?.full_name,
      participant2Name: conv.participant2?.full_name,
    }));
  } catch (error) {
    console.error('getOrderConversations error:', error);
    return [];
  }
}

export async function getAllConversations(filters?: {
  status?: string;
  hasOrder?: boolean;
}): Promise<ChatConversation[]> {
  try {
    let query = supabase
      .from('chat_conversations')
      .select(`
        *,
        participant1:participant_1_id (full_name),
        participant2:participant_2_id (full_name)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.hasOrder !== undefined) {
      if (filters.hasOrder) {
        query = query.not('order_id', 'is', null);
      } else {
        query = query.is('order_id', null);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(conv => ({
      ...mapConversation(conv),
      participant1Name: conv.participant1?.full_name,
      participant2Name: conv.participant2?.full_name,
    }));
  } catch (error) {
    console.error('getAllConversations error:', error);
    return [];
  }
}

export async function closeConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('closeConversation error:', error);
    throw error;
  }
}

// ============================================
// MESSAGES
// ============================================

export async function getMessages(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:sender_id (full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      senderName: msg.sender?.full_name || 'Usuario',
      messageType: msg.message_type,
      content: msg.content,
      imageUrl: msg.image_url,
      location: msg.location_lat && msg.location_lng
        ? { lat: msg.location_lat, lng: msg.location_lng }
        : undefined,
      isRead: msg.is_read,
      readAt: msg.read_at,
      createdAt: msg.created_at,
    }));
  } catch (error) {
    console.error('getMessages error:', error);
    return [];
  }
}

export async function sendMessage(
  conversationId: string,
  data: {
    senderId: string;
    senderType: ParticipantType;
    messageType?: 'text' | 'image' | 'location' | 'system';
    content: string;
    imageUrl?: string;
    location?: { lat: number; lng: number };
  }
): Promise<ChatMessage | null> {
  try {
    const { data: msg, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: data.senderId,
        sender_type: data.senderType,
        message_type: data.messageType || 'text',
        content: data.content,
        image_url: data.imageUrl,
        location_lat: data.location?.lat,
        location_lng: data.location?.lng,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation's last message
    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single();

    if (conv) {
      const isParticipant1 = conv.participant_1_id === data.senderId;
      const unreadField = isParticipant1 ? 'unread_count_2' : 'unread_count_1';

      await (supabase.rpc('increment_unread', {
        conv_id: conversationId,
        field_name: unreadField,
      }) as any).catch(() => {
        // Fallback if RPC doesn't exist
        supabase
          .from('chat_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            [unreadField]: supabase.rpc('coalesce', { val: unreadField, default_val: 0 }),
          })
          .eq('id', conversationId);
      });
    }

    // Simple update for last message
    await supabase
      .from('chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      messageType: msg.message_type,
      content: msg.content,
      imageUrl: msg.image_url,
      location: msg.location_lat && msg.location_lng
        ? { lat: msg.location_lat, lng: msg.location_lng }
        : undefined,
      isRead: msg.is_read,
      createdAt: msg.created_at,
    };
  } catch (error) {
    console.error('sendMessage error:', error);
    return null;
  }
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    // Mark messages as read
    await supabase
      .from('chat_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    // Reset unread count
    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('participant_1_id')
      .eq('id', conversationId)
      .single();

    if (conv) {
      const isParticipant1 = conv.participant_1_id === userId;
      const unreadField = isParticipant1 ? 'unread_count_1' : 'unread_count_2';

      await supabase
        .from('chat_conversations')
        .update({ [unreadField]: 0 })
        .eq('id', conversationId);
    }
  } catch (error) {
    console.error('markMessagesAsRead error:', error);
  }
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
) {
  const subscription = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const msg = payload.new as any;
        onMessage({
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          senderType: msg.sender_type,
          messageType: msg.message_type,
          content: msg.content,
          imageUrl: msg.image_url,
          location: msg.location_lat && msg.location_lng
            ? { lat: msg.location_lat, lng: msg.location_lng }
            : undefined,
          isRead: msg.is_read,
          createdAt: msg.created_at,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

export function subscribeToUserConversations(
  userId: string,
  onUpdate: () => void
) {
  const subscription = supabase
    .channel(`user_chats:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

// ============================================
// COMPAT FUNCTIONS (used by ChatButton)
// ============================================

export async function getConversation(
  orderId: string,
  _type: string,
  _token?: string
): Promise<{ id: string; unreadCount: number }> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, unread_count_1, unread_count_2')
      .eq('order_id', orderId)
      .limit(1)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      unreadCount: (data.unread_count_1 || 0) + (data.unread_count_2 || 0),
    };
  } catch (error) {
    console.error('getConversation error:', error);
    throw error;
  }
}

export async function getUnreadCount(
  conversationId: string,
  _token?: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('unread_count_1, unread_count_2')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    return (data.unread_count_1 || 0) + (data.unread_count_2 || 0);
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return 0;
  }
}

// ============================================
// HELPERS
// ============================================

function mapConversation(db: any): ChatConversation {
  return {
    id: db.id,
    caseNumber: db.case_number || '', // ID corto para soporte
    orderId: db.order_id,
    participant1Id: db.participant_1_id,
    participant1Type: db.participant_1_type,
    participant2Id: db.participant_2_id,
    participant2Type: db.participant_2_type,
    status: db.status,
    lastMessageAt: db.last_message_at,
    unreadCount: (db.unread_count_1 || 0) + (db.unread_count_2 || 0),
    createdAt: db.created_at,
  };
}

// ============================================
// QUICK MESSAGES (Pre-defined)
// ============================================

export const QUICK_MESSAGES = {
  client: [
    '¿Dónde está mi pedido?',
    '¿Cuánto tiempo falta?',
    'Por favor llámame cuando llegues',
    'Estoy en la entrada',
    'Gracias',
  ],
  driver: [
    'Estoy llegando',
    'Ya llegué, ¿puedes salir?',
    'Estoy en la entrada',
    '¿Puedes darme más indicaciones?',
    'Listo, entregado',
  ],
  business: [
    'Tu pedido está siendo preparado',
    'Tu pedido está listo',
    'Hay un pequeño retraso, disculpa',
    '¿Podrías confirmar tu pedido?',
  ],
};

export function getQuickMessages(userType: ParticipantType): string[] {
  return QUICK_MESSAGES[userType as keyof typeof QUICK_MESSAGES] || [];
}
