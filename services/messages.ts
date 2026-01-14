import { Message, Conversation, ConversationType } from '@/constants/types';

const API_BASE = 'http://192.168.100.3:3000/api';

export async function getConversation(orderId: string, type: ConversationType, token: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/messages/conversation/${orderId}?type=${type}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al obtener conversación');
  return response.json();
}

export async function getMessages(conversationId: string, token: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/messages/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al obtener mensajes');
  return response.json();
}

export async function sendMessage(conversationId: string, content: string, token: string): Promise<Message> {
  const response = await fetch(`${API_BASE}/messages/${conversationId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Error al enviar mensaje');
  return response.json();
}

export async function markMessagesAsRead(conversationId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/messages/${conversationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Error al marcar mensajes como leídos');
}

export async function getUnreadCount(conversationId: string, token: string): Promise<number> {
  const response = await fetch(`${API_BASE}/messages/${conversationId}/unread`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al obtener mensajes no leídos');
  const data = await response.json();
  return data.count;
}
