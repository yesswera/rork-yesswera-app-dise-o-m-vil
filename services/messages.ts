import { Message } from '@/constants/types';
import { supabase } from '@/constants/supabase';

// In Supabase, chat_messages are linked to orders (order_id).
// The "conversationId" from the UI maps directly to order_id.

export async function getMessages(orderId: string, _token?: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, sender:users!sender_id(full_name, user_type)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Error al obtener mensajes');

  return (data || []).map((msg: any) => ({
    id: msg.id,
    conversationId: msg.order_id,
    senderId: msg.sender_id,
    senderName: msg.sender?.full_name || 'Usuario',
    senderType: msg.sender?.user_type || 'client',
    content: msg.message,
    createdAt: msg.created_at,
    read: msg.is_read,
  }));
}

export async function sendMessage(orderId: string, content: string, _token?: string): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Get the order to find the other participant
  const { data: order } = await supabase
    .from('orders')
    .select('client_id, driver_id, business_id')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Orden no encontrada');

  // Determine receiver: if sender is client, receiver is driver (or business if no driver)
  let receiverId: string;
  if (user.id === order.client_id) {
    receiverId = order.driver_id || order.business_id;
  } else {
    receiverId = order.client_id;
  }

  const { data: msg, error } = await supabase
    .from('chat_messages')
    .insert({
      order_id: orderId,
      sender_id: user.id,
      receiver_id: receiverId,
      message: content,
    })
    .select('*, sender:users!sender_id(full_name, user_type)')
    .single();

  if (error) throw new Error('Error al enviar mensaje');

  return {
    id: msg.id,
    conversationId: msg.order_id,
    senderId: msg.sender_id,
    senderName: msg.sender?.full_name || 'Usuario',
    senderType: msg.sender?.user_type || 'client',
    content: msg.message,
    createdAt: msg.created_at,
    read: msg.is_read,
  };
}

export async function markMessagesAsRead(orderId: string, _token?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('order_id', orderId)
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  if (error) console.error('Error marking messages as read:', error);
}

export async function getUnreadCount(orderId: string, _token?: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

// Virtual conversation helper - creates conversation object from messages
export async function getConversation(orderId: string, _type?: string, _token?: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('id, client_id, driver_id, business_id, client:users!client_id(full_name), driver:users!driver_id(full_name)')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Orden no encontrada');

  const { data: { user } } = await supabase.auth.getUser();
  const isClient = user?.id === order.client_id;

  const messages = await getMessages(orderId);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const unread = await getUnreadCount(orderId);

  return {
    id: orderId,
    orderId: orderId,
    type: isClient ? 'client_driver' : 'client_driver',
    participants: {
      clientId: order.client_id,
      clientName: (order.client as any)?.full_name || 'Cliente',
      otherPartyId: isClient ? (order.driver_id || '') : order.client_id,
      otherPartyName: isClient ? ((order.driver as any)?.full_name || 'Repartidor') : ((order.client as any)?.full_name || 'Cliente'),
    },
    lastMessage,
    unreadCount: unread,
    createdAt: lastMessage?.createdAt || new Date().toISOString(),
  };
}
