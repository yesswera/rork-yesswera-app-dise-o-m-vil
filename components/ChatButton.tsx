import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import TouchableSound from '@/components/TouchableSound';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getUnreadCount, getConversation } from '@/services/messages';
import { ConversationType } from '@/constants/types';
import { useAuth } from '@/contexts/auth';

interface ChatButtonProps {
  orderId: string;
  type: ConversationType;
  otherPartyName: string;
  compact?: boolean;
}

export default function ChatButton({ orderId, type, otherPartyName, compact = false }: ChatButtonProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConversation = async () => {
      if (!token) return;

      try {
        const conversation = await getConversation(orderId, type, token);
        setConversationId(conversation.id);
        setUnreadCount(conversation.unreadCount);
      } catch (err) {
        console.error('Error cargando conversación:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();

    const interval = setInterval(async () => {
      if (!token || !conversationId) return;

      try {
        const count = await getUnreadCount(conversationId, token);
        setUnreadCount(count);
      } catch (err) {
        console.error('Error obteniendo mensajes no leídos:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, type, token, conversationId]);

  const handlePress = () => {
    if (!conversationId) return;

    router.push({
      pathname: '/chat/[conversationId]' as any,
      params: {
        conversationId,
        otherPartyName,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[compact ? styles.compactButton : styles.button, styles.loadingButton]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableSound
        style={styles.compactButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MessageCircle size={20} color={Colors.primary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableSound>
    );
  }

  return (
    <TouchableSound
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MessageCircle size={20} color={Colors.primary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.buttonText}>Chat</Text>
    </TouchableSound>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  compactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  loadingButton: {
    opacity: 0.6,
  },
  iconContainer: {
    position: 'relative' as const,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  badge: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
