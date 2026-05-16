import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getConversationById,
  getOrCreateConversation,
  type ChatMessage,
} from '@/services/chat';

export default function ChatScreen() {
  const { conversationId: rawId, otherPartyName } = useLocalSearchParams<{
    conversationId: string;
    otherPartyName?: string;
  }>();
  const { user } = useAuth();

  const [resolvedConversationId, setResolvedConversationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState(otherPartyName || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Resolve conversationId: it might be an orderId from tracking screen
  useEffect(() => {
    if (!rawId || !user) return;

    async function resolve() {
      // Try to fetch as a conversation first
      const conv = await getConversationById(rawId as string);
      if (conv) {
        setResolvedConversationId(conv.id);
        // Determine partner name from conversation
        if (!partnerName) {
          const isP1 = conv.participant1Id === user!.id;
          setPartnerName(
            (isP1 ? conv.participant2Name : conv.participant1Name) || 'Chat'
          );
        }
        return;
      }

      // If not found as conversation, treat rawId as an orderId
      // and create/get a conversation for it
      const newConv = await getOrCreateConversation(
        rawId as string,
        user!.id,
        (user!.userType || 'client') as any,
        '', // participant2Id unknown — will be matched by order
        'driver'
      );
      if (newConv) {
        setResolvedConversationId(newConv.id);
      } else {
        // Last resort: use rawId directly
        setResolvedConversationId(rawId as string);
      }
    }

    resolve();
  }, [rawId, user]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!resolvedConversationId) return;
    try {
      const data = await getMessages(resolvedConversationId);
      setMessages(data);
      if (user?.id) {
        markMessagesAsRead(resolvedConversationId, user.id).catch(() => {});
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedConversationId, user?.id]);

  useEffect(() => {
    if (!resolvedConversationId) return;

    setLoading(true);
    loadMessages();

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`chat:${resolvedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${resolvedConversationId}`,
        },
        (payload) => {
          const row = payload.new as any;
          // Skip messages sent by current user (already added optimistically)
          if (row.sender_id === user?.id) return;
          const newMsg: ChatMessage = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderType: row.sender_type,
            senderName: row.sender_name,
            messageType: row.message_type || 'text',
            content: row.content,
            imageUrl: row.image_url,
            isRead: row.is_read || false,
            createdAt: row.created_at,
          };
          setMessages((prev) => [...prev, newMsg]);
          if (user?.id) {
            markMessagesAsRead(resolvedConversationId!, user.id).catch(() => {});
          }
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedConversationId, loadMessages]);

  // Send message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !resolvedConversationId || !user || sending) return;

    setText('');
    Keyboard.dismiss();
    setSending(true);

    try {
      const msg = await sendMessage(resolvedConversationId, {
        senderId: user.id,
        senderType: (user.userType || 'client') as any,
        content: trimmed,
      });
      if (msg) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  // Redirect if not logged in
  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  // Render a single message
  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === user.id;
    const isSystem = item.messageType === 'system';

    if (isSystem) {
      return (
        <View style={s.systemRow}>
          <Text style={s.systemText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[s.bubbleRow, isMine ? s.bubbleRowRight : s.bubbleRowLeft]}>
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
          <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextOther]}>
            {item.content}
          </Text>
          <Text style={[s.bubbleTime, isMine ? s.bubbleTimeMine : s.bubbleTimeOther]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // Empty list component
  const EmptyChat = () => (
    <View style={s.emptyWrap}>
      <Feather name="message-circle" size={48} color={DS.colors.placeholder} />
      <Text style={s.emptyTitle}>Inicia la conversacion</Text>
      <Text style={s.emptySub}>Envia un mensaje para comenzar</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.backBtn}
        >
          <Feather name="arrow-left" size={24} color={DS.colors.dark} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>
            {partnerName || 'Chat'}
          </Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>Activo</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading ? (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={DS.colors.green} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              s.listContent,
              messages.length === 0 && s.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            inverted={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={EmptyChat}
          />
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={DS.colors.placeholder}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  flex1: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    backgroundColor: DS.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.hairline,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DS.space.sm,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.colors.green,
  },
  statusText: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },

  // Center loading
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    padding: DS.space.lg,
    gap: DS.space.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.xxxl,
  },
  emptyTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.body,
    marginTop: DS.space.sm,
  },
  emptySub: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },

  // System message
  systemRow: {
    alignItems: 'center',
    paddingVertical: DS.space.xs,
  },
  systemText: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    fontStyle: 'italic',
  },

  // Bubble row
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: DS.space.xs,
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },

  // Bubble
  bubble: {
    maxWidth: '78%',
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.md,
    paddingVertical: DS.space.sm,
  },
  bubbleMine: {
    backgroundColor: DS.colors.green,
    borderBottomRightRadius: DS.space.xs,
  },
  bubbleOther: {
    backgroundColor: DS.colors.card,
    borderBottomLeftRadius: DS.space.xs,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
  },
  bubbleText: {
    ...DS.fonts.body,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: DS.colors.dark,
  },
  bubbleTime: {
    ...DS.fonts.tiny,
    marginTop: DS.space.xs,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleTimeOther: {
    color: DS.colors.muted,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: DS.space.sm,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    backgroundColor: DS.colors.card,
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: DS.radius.xl,
    backgroundColor: DS.colors.divider,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.sm,
    ...DS.fonts.body,
    color: DS.colors.dark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
