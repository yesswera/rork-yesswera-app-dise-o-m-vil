// ============================================================================
// YESSWERA: CHAT - CONVERSACION
// Pantalla de chat por conversationId
// Actualizada para usar ScreenContainer
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, Send, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { Message } from '@/constants/types';
import { getMessages, sendMessage, markMessagesAsRead } from '@/services/messages';
import ErrorState from '@/components/ErrorState';
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
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId, otherPartyName } = useLocalSearchParams<{
    conversationId: string;
    otherPartyName: string;
  }>();
  const { user, token } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousMessageCountRef = useRef<number>(0);

  // ============================================================================
  // CARGA DE MENSAJES
  // ============================================================================

  const loadMessages = useCallback(async () => {
    if (!token || !conversationId) return;

    try {
      const data = await getMessages(conversationId as string, token);
      const reversedData = data.reverse();

      // Play sound if new messages received (not on initial load)
      if (previousMessageCountRef.current > 0 && reversedData.length > previousMessageCountRef.current) {
        // Check if the new message is from someone else
        const lastMessage = reversedData[reversedData.length - 1];
        if (lastMessage && lastMessage.senderId !== user?.id) {
          playSoundDebounced('messageReceived');
        }
      }
      previousMessageCountRef.current = reversedData.length;

      setMessages(reversedData);
      setError(null);

      await markMessagesAsRead(conversationId as string, token);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
      if (isLoading) {
        setError('No se pudieron cargar los mensajes');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, conversationId, isLoading, user?.id]);

  useEffect(() => {
    loadMessages();

    pollingRef.current = setInterval(loadMessages, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [conversationId, token, loadMessages]);

  // ============================================================================
  // ENVIAR MENSAJE
  // ============================================================================

  const handleSendMessage = async () => {
    if (!messageText.trim() || !token || !conversationId || isSending) return;

    const textToSend = messageText.trim();
    setMessageText('');
    Keyboard.dismiss();
    setIsSending(true);

    try {
      const newMessage = await sendMessage(conversationId as string, textToSend, token);
      setMessages((prev) => [...prev, newMessage]);
      previousMessageCountRef.current += 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      ChatSounds.sent();

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setMessageText(textToSend);
      SoundFeedback.error();
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    loadMessages();
  };

  // ============================================================================
  // VALIDACION DE USUARIO
  // ============================================================================

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  // ============================================================================
  // FORMATEO DE FECHAS
  // ============================================================================

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  // ============================================================================
  // RENDERIZADO DE MENSAJES
  // ============================================================================

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.senderId === user.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDate =
      !prevMessage ||
      new Date(item.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();
    const showAvatar = !prevMessage || prevMessage.senderId !== item.senderId;

    // Fallback to email if name is not available
    const senderName =
      item.senderName || (item as any).senderEmail || otherPartyName || 'Usuario';
    const avatarLetter = senderName.charAt(0).toUpperCase();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={[styles.dateBadge, { backgroundColor: theme.cardAlt }]}>
              <ThemedText variant="caption" color="secondary">
                {formatDate(item.createdAt)}
              </ThemedText>
            </View>
          </View>
        )}
        <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
          {!isMyMessage && showAvatar && (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.avatarText}>{avatarLetter}</ThemedText>
            </View>
          )}
          {!isMyMessage && !showAvatar && <View style={styles.avatarSpacer} />}
          <View
            style={[
              styles.messageBubble,
              isMyMessage
                ? [styles.myMessageBubble, { backgroundColor: colors.primary }]
                : [styles.otherMessageBubble, { backgroundColor: theme.card, borderColor: theme.border }],
            ]}
          >
            {!isMyMessage && showAvatar && (
              <ThemedText variant="caption" color="secondary" style={styles.senderName}>
                {senderName}
              </ThemedText>
            )}
            <ThemedText
              style={[
                styles.messageText,
                { color: isMyMessage ? '#FFFFFF' : theme.text },
              ]}
            >
              {item.content}
            </ThemedText>
            <ThemedText
              style={[
                styles.messageTime,
                { color: isMyMessage ? 'rgba(255, 255, 255, 0.7)' : theme.textMuted },
              ]}
            >
              {formatTime(item.createdAt)}
            </ThemedText>
          </View>
        </View>
      </>
    );
  };

  // ============================================================================
  // FOOTER - INPUT DE MENSAJE
  // ============================================================================

  const renderFooter = () => (
    <View style={styles.inputWrapper}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.cardAlt,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder="Escribe un mensaje..."
        placeholderTextColor={theme.textMuted}
        value={messageText}
        onChangeText={setMessageText}
        multiline
        maxLength={500}
        editable={!isSending}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          { backgroundColor: colors.primary },
          (!messageText.trim() || isSending) && styles.sendButtonDisabled,
        ]}
        onPress={handleSendMessage}
        disabled={!messageText.trim() || isSending}
        activeOpacity={0.7}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Send size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitle: (otherPartyName as string) || 'Chat',
          headerTitleStyle: { fontSize: 18, fontWeight: '700' },
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScreenContainer
        headerGradient="primary"
        headerIcon={MessageCircle}
        headerTitle={(otherPartyName as string) || 'Chat'}
        headerSubtitle="Conversacion activa"
        scrollEnabled={false}
        keyboardAvoiding={true}
        footer={renderFooter()}
        footerPadding={80}
        noPadding
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText color="secondary" style={styles.loadingText}>
              Cargando conversacion...
            </ThemedText>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messagesList, { paddingBottom: 20 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageCircle size={48} color={theme.textMuted} strokeWidth={1.5} />
                <ThemedText color="secondary" style={styles.emptyText}>
                  No hay mensajes aun
                </ThemedText>
                <ThemedText color="muted" style={styles.emptySubtext}>
                  Envia un mensaje para iniciar la conversacion
                </ThemedText>
              </View>
            }
          />
        )}
      </ScreenContainer>
    </>
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
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarSpacer: {
    width: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  senderName: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
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
