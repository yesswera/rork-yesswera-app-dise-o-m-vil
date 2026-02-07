// ============================================================================
// YESSWERA: CHAT - ORDEN
// Pantalla de chat asociada a una orden especifica
// Actualizada para usar ScreenContainer
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Send,
  User,
  Truck,
  Store,
  Package,
  MessageCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToConversation,
  ChatMessage,
  ChatConversation,
  ParticipantType,
  getQuickMessages,
} from '@/services/chat';
import { getOrderById } from '@/services/orders';
import ScreenContainer from '@/components/ScreenContainer';
import { ThemedText } from '@/components/themed';
import { ChatSounds, SoundFeedback, playSoundDebounced } from '@/services/sounds';

// ============================================================================
// COLORES EXPLICITOS PARA MODO OSCURO
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

// ============================================================================
// TIPOS
// ============================================================================

interface OrderInfo {
  id: string;
  customerId: string;
  customerName?: string;
  driverId?: string;
  driverName?: string;
  businessId?: string;
  businessName?: string;
  status: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function OrderChatScreen() {
  const router = useRouter();
  const { orderId, targetType, targetId } = useLocalSearchParams<{
    orderId: string;
    targetType?: ParticipantType;
    targetId?: string;
  }>();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [quickMessages, setQuickMessages] = useState<string[]>([]);

  // ============================================================================
  // INICIALIZACION DEL CHAT
  // ============================================================================

  useEffect(() => {
    if (!user || !orderId) return;
    initializeChat();
  }, [user, orderId, targetType, targetId]);

  useEffect(() => {
    if (!conversation) return;

    // Subscribe to new messages
    const unsubscribe = subscribeToConversation(conversation.id, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        // Play sound for messages from others
        if (newMsg.senderId !== user?.id) {
          playSoundDebounced('messageReceived');
        }
        return [...prev, newMsg];
      });
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [conversation?.id]);

  const initializeChat = async () => {
    if (!user || !orderId) return;

    try {
      // Get order info
      const order = await getOrderById(orderId);
      if (order) {
        setOrderInfo({
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          driverId: order.driverId || undefined,
          driverName: order.driverName || undefined,
          businessId: order.businessId || undefined,
          businessName: order.businessName || undefined,
          status: order.status,
        });
      }

      // Determine who we're chatting with
      let participant2Id = targetId;
      let participant2Type = targetType;

      if (!participant2Id || !participant2Type) {
        // Auto-determine based on user type
        if (user.userType === 'client') {
          // Client can chat with driver or business
          if (order?.driverId) {
            participant2Id = order.driverId;
            participant2Type = 'driver';
          } else if (order?.businessId) {
            // Need to get business owner
            participant2Id = order.businessId;
            participant2Type = 'business';
          }
        } else if (user.userType === 'driver') {
          participant2Id = order?.customerId;
          participant2Type = 'client';
        } else if (user.userType === 'business') {
          participant2Id = order?.customerId;
          participant2Type = 'client';
        }
      }

      if (!participant2Id || !participant2Type) {
        console.warn('No target participant found');
        setLoading(false);
        return;
      }

      // Get or create conversation
      const conv = await getOrCreateConversation(
        orderId,
        user.id,
        user.userType as ParticipantType,
        participant2Id,
        participant2Type
      );

      if (conv) {
        setConversation(conv);

        // Load messages
        const msgs = await getMessages(conv.id);
        setMessages(msgs);

        // Mark as read
        await markMessagesAsRead(conv.id, user.id);
      }

      // Load quick messages
      const qm = getQuickMessages(user.userType as ParticipantType);
      setQuickMessages(qm);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!conversation || !newMessage.trim() || !user) return;

    setSending(true);
    try {
      const msg = await sendMessage(conversation.id, {
        senderId: user.id,
        senderType: user.userType as ParticipantType,
        content: newMessage.trim(),
      });

      if (msg) {
        setMessages((prev) => [...prev, msg]);
        setNewMessage('');
        scrollToBottom();
        ChatSounds.sent();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      SoundFeedback.error();
    } finally {
      setSending(false);
    }
  };

  const handleQuickMessage = (msg: string) => {
    setNewMessage(msg);
  };

  const getParticipantIcon = (type: ParticipantType) => {
    switch (type) {
      case 'client':
        return <User size={16} color={colors.primary} />;
      case 'driver':
        return <Truck size={16} color={colors.accent || '#F97316'} />;
      case 'business':
        return <Store size={16} color={colors.success || '#22C55E'} />;
      default:
        return <User size={16} color={theme.textSecondary} />;
    }
  };

  const getOtherParticipantName = () => {
    if (!conversation || !user) return 'Usuario';

    if (conversation.participant1Id === user.id) {
      return conversation.participant2Name || 'Usuario';
    }
    return conversation.participant1Name || 'Usuario';
  };

  const getOtherParticipantType = (): ParticipantType => {
    if (!conversation || !user) return 'client';

    if (conversation.participant1Id === user.id) {
      return conversation.participant2Type;
    }
    return conversation.participant1Type;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================================
  // PANTALLAS DE CARGA Y ERROR
  // ============================================================================

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={MessageCircle}
        headerTitle="Chat"
        headerSubtitle="Cargando..."
        scrollEnabled={false}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText color="secondary" style={styles.loadingText}>
            Cargando chat...
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  if (!conversation) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={MessageCircle}
        headerTitle="Chat"
        headerSubtitle="Error"
        scrollEnabled={false}
      >
        <View style={styles.centerContent}>
          <MessageCircle size={48} color={theme.textMuted} strokeWidth={1.5} />
          <ThemedText color="secondary" style={styles.errorText}>
            No se pudo iniciar el chat
          </ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Volver</ThemedText>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ============================================================================
  // HEADER SUBTITLE DINAMICO
  // ============================================================================

  const headerSubtitle = orderInfo
    ? `Orden #${orderId?.slice(0, 8)}`
    : 'Conversacion activa';

  // ============================================================================
  // FOOTER - INPUT DE MENSAJE
  // ============================================================================

  const renderFooter = () => (
    <View>
      {/* Quick Messages */}
      {quickMessages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickMessagesContainer}
          contentContainerStyle={styles.quickMessagesContent}
        >
          {quickMessages.map((qm, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickMessageChip, { backgroundColor: theme.cardAlt }]}
              onPress={() => handleQuickMessage(qm)}
            >
              <ThemedText variant="caption" color="secondary">
                {qm}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.cardAlt,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={theme.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={MessageCircle}
      headerTitle={getOtherParticipantName()}
      headerSubtitle={headerSubtitle}
      scrollEnabled={false}
      keyboardAvoiding={true}
      footer={renderFooter()}
      footerPadding={quickMessages.length > 0 ? 140 : 90}
      noPadding
    >
      {/* Order Info Banners */}
      {(orderInfo || conversation?.caseNumber) && (
        <View style={[styles.bannersContainer, { borderBottomColor: theme.border }]}>
          {/* Order Banner */}
          {orderInfo && (
            <View style={[styles.orderBanner, { backgroundColor: `${colors.accent || '#F97316'}15` }]}>
              <Package size={14} color={colors.accent || '#F97316'} />
              <ThemedText variant="caption" style={{ color: colors.accent || '#F97316', marginLeft: 6 }}>
                {orderInfo.businessName && `De: ${orderInfo.businessName}`}
                {orderInfo.businessName && orderInfo.driverName && ' | '}
                {orderInfo.driverName && `Driver: ${orderInfo.driverName}`}
              </ThemedText>
            </View>
          )}

          {/* Case ID Info Banner */}
          {conversation?.caseNumber && (
            <View style={[styles.caseInfoBanner, { backgroundColor: `${colors.primary}10` }]}>
              <ThemedText variant="caption" color="secondary" style={styles.caseInfoText}>
                Necesitas ayuda? Proporciona el ID{' '}
                <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {conversation.caseNumber}
                </ThemedText>{' '}
                a soporte
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <MessageCircle size={48} color={theme.textMuted} strokeWidth={1.5} />
            <ThemedText color="muted" style={styles.emptyChatText}>
              Inicia la conversacion enviando un mensaje
            </ThemedText>
          </View>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const isSystem = msg.messageType === 'system';

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageWrapper,
                  isMe ? styles.messageWrapperRight : styles.messageWrapperLeft,
                  isSystem && styles.messageWrapperCenter,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMe
                      ? [styles.messageBubbleMe, { backgroundColor: colors.primary }]
                      : [
                          styles.messageBubbleOther,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ],
                    isSystem && [styles.messageBubbleSystem, { backgroundColor: `${theme.textMuted}30` }],
                  ]}
                >
                  {!isMe && !isSystem && (
                    <View style={styles.messageSenderRow}>
                      {getParticipantIcon(msg.senderType)}
                      <ThemedText variant="caption" style={styles.messageSender}>
                        {msg.senderName}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText
                    style={[
                      styles.messageText,
                      { color: isMe ? '#FFFFFF' : theme.text },
                      isSystem && { color: theme.textSecondary, textAlign: 'center' },
                    ]}
                  >
                    {msg.content}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.messageTime,
                      { color: isMe ? 'rgba(255, 255, 255, 0.7)' : theme.textMuted },
                    ]}
                  >
                    {formatTime(msg.createdAt)}
                    {isMe && msg.isRead && ' ✓'}
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Banners
  bannersContainer: {
    borderBottomWidth: 1,
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  caseInfoBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  caseInfoText: {
    textAlign: 'center',
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageWrapperLeft: {
    alignItems: 'flex-start',
  },
  messageWrapperRight: {
    alignItems: 'flex-end',
  },
  messageWrapperCenter: {
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageBubbleSystem: {
    maxWidth: '90%',
    borderRadius: 12,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  messageSender: {
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  // Quick Messages
  quickMessagesContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  quickMessagesContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  quickMessageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
