import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: MENSAJES DEL REPARTIDOR
// Usa ScreenContainer para diseño unificado con soporte de tema
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageCircle, User, Store, ShieldCheck, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

// Theme colors via useTheme() — no local COLORS needed

interface DriverConversation {
  id: string;          // order_id (used as conversation id)
  orderId: string;
  orderNumber: string;
  type: 'client' | 'business';
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'closed';
}

const CLOSED_STATUSES = ['delivered', 'cancelled'];

export default function DriverMessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors, radius, space } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<DriverConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Get the driver record for this user
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (driverError || !driver) {
        console.error('Error fetching driver record:', driverError);
        setConversations([]);
        return;
      }

      // 2. Get orders assigned to this driver (recent 30)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          client_id,
          business_id,
          updated_at
        `)
        .eq('driver_id', driver.id)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (ordersError || !orders || orders.length === 0) {
        setConversations([]);
        return;
      }

      // 3. Get client names for all orders
      const clientIds = [...new Set(orders.map(o => o.client_id).filter(Boolean))];
      const { data: clients } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', clientIds);

      const clientMap = new Map<string, string>();
      (clients || []).forEach((c: any) => clientMap.set(c.id, c.full_name));

      // 4. Get business names for all orders
      const businessIds = [...new Set(orders.map(o => o.business_id).filter(Boolean))];
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name')
        .in('id', businessIds);

      const businessMap = new Map<string, string>();
      (businesses || []).forEach((b: any) => businessMap.set(b.id, b.business_name));

      // 5. For each order, get last message and unread count
      const orderIds = orders.map(o => o.id);

      // Get all messages for these orders in one query (last message per order)
      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('id, order_id, message, created_at, sender_id, receiver_id, is_read')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      // Group messages by order and find last message + unread count
      const lastMessageMap = new Map<string, { message: string; created_at: string }>();
      const unreadCountMap = new Map<string, number>();

      (allMessages || []).forEach((msg: any) => {
        // Track last message per order (first one found since sorted desc)
        if (!lastMessageMap.has(msg.order_id)) {
          lastMessageMap.set(msg.order_id, {
            message: msg.message,
            created_at: msg.created_at,
          });
        }

        // Count unread messages where this driver is the receiver
        if (msg.receiver_id === user.id && !msg.is_read) {
          unreadCountMap.set(msg.order_id, (unreadCountMap.get(msg.order_id) || 0) + 1);
        }
      });

      // 6. Build conversation list - only include orders that have messages
      const convos: DriverConversation[] = [];

      for (const order of orders) {
        const lastMsg = lastMessageMap.get(order.id);
        if (!lastMsg) continue; // Skip orders with no messages

        const isClosed = CLOSED_STATUSES.includes(order.status);
        const clientName = clientMap.get(order.client_id) || 'Cliente';

        convos.push({
          id: order.id,
          orderId: order.id,
          orderNumber: order.order_number ? `YS-${order.order_number}` : order.id.substring(0, 8),
          type: 'client',
          name: clientName,
          lastMessage: lastMsg.message,
          lastMessageTime: new Date(lastMsg.created_at),
          unreadCount: unreadCountMap.get(order.id) || 0,
          status: isClosed ? 'closed' : 'active',
        });
      }

      // Sort: active first (by lastMessageTime desc), then closed (by lastMessageTime desc)
      convos.sort((a, b) => {
        if (a.status === 'active' && b.status === 'closed') return -1;
        if (a.status === 'closed' && b.status === 'active') return 1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadConversations();
      setIsLoading(false);
    };
    init();
  }, [loadConversations]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    return conversations.filter(conv =>
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, conversations]);

  const activeConversations = useMemo(() => {
    return filteredConversations.filter(conv => conv.status === 'active');
  }, [filteredConversations]);

  const closedConversations = useMemo(() => {
    return filteredConversations.filter(conv => conv.status === 'closed');
  }, [filteredConversations]);

  const totalUnread = useMemo(() => {
    return activeConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  }, [activeConversations]);

  const getTimeDisplay = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'h:mm a', { locale: es });
    } else if (isYesterday(date)) {
      return 'Ayer';
    } else {
      return format(date, 'd MMM', { locale: es });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return User;
      case 'business': return Store;
      case 'support': return ShieldCheck;
      default: return MessageCircle;
    }
  };

  const handleOpenConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}` as any);
  };

  // Search bar header content
  const headerContent = (
    <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md }]}>
      <Search size={20} color="rgba(255,255,255,0.8)" />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar conversacion..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="rgba(255,255,255,0.6)"
      />
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={MessageSquare}
      headerTitle="Mensajes"
      headerSubtitle={totalUnread > 0 ? `${totalUnread} mensajes sin leer` : 'Tus conversaciones'}
      headerContent={headerContent}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" style={[styles.emptySubtext, { color: colors.text.secondary }]}>
            Cargando conversaciones...
          </ThemedText>
        </View>
      ) : activeConversations.length === 0 && closedConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={48} color={colors.text.muted} />
          <ThemedText variant="subtitle" bold style={[styles.emptyText, { color: colors.text.primary }]}>
            No hay conversaciones
          </ThemedText>
          <ThemedText variant="body" style={[styles.emptySubtext, { color: colors.text.secondary }]}>
            {searchQuery ? 'Intenta con otro termino de busqueda' : 'Tus mensajes apareceran aqui'}
          </ThemedText>
        </View>
      ) : (
        <>
          {activeConversations.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 12 }}>
                Activas
              </ThemedText>
              {activeConversations.map((conversation) => {
                const Icon = getTypeIcon(conversation.type);
                return (
                  <TouchableSound
                    key={conversation.id}
                    style={[styles.conversationCard, { backgroundColor: colors.card, borderBottomColor: colors.border.light }]}
                    onPress={() => handleOpenConversation(conversation.id)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={[styles.avatar, { backgroundColor: colors.background.secondary }]}>
                        <Icon size={24} color={colors.primary} />
                      </View>
                      {conversation.unreadCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.error }]}>
                          <ThemedText variant="caption" bold style={styles.badgeText}>
                            {conversation.unreadCount}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={styles.conversationContent}>
                      <View style={styles.conversationHeader}>
                        <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>
                          {conversation.name}
                        </ThemedText>
                        <ThemedText variant="caption" style={{ color: colors.text.secondary }}>
                          {getTimeDisplay(conversation.lastMessageTime)}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                        Orden {conversation.orderNumber}
                      </ThemedText>
                      <ThemedText
                        variant="body"
                        style={[
                          { color: colors.text.secondary },
                          conversation.unreadCount > 0 && { fontWeight: '600', color: colors.text.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {conversation.lastMessage}
                      </ThemedText>
                    </View>
                  </TouchableSound>
                );
              })}
            </View>
          )}

          {closedConversations.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 12 }}>
                Conversaciones Cerradas
              </ThemedText>
              {closedConversations.map((conversation) => {
                const Icon = getTypeIcon(conversation.type);
                return (
                  <TouchableSound
                    key={conversation.id}
                    style={[
                      styles.conversationCard,
                      styles.conversationCardClosed,
                      { backgroundColor: colors.card, borderBottomColor: colors.border.light },
                    ]}
                    onPress={() => handleOpenConversation(conversation.id)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={[styles.avatar, styles.avatarClosed, { backgroundColor: colors.background.secondary }]}>
                        <Icon size={24} color={colors.text.muted} />
                      </View>
                    </View>
                    <View style={styles.conversationContent}>
                      <View style={styles.conversationHeader}>
                        <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>
                          {conversation.name}
                        </ThemedText>
                        <ThemedText variant="caption" style={{ color: colors.text.secondary }}>
                          {getTimeDisplay(conversation.lastMessageTime)}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" style={{ color: colors.text.muted }}>
                        Orden {conversation.orderNumber}
                      </ThemedText>
                      <ThemedText variant="body" style={{ color: colors.text.secondary }} numberOfLines={1}>
                        {conversation.lastMessage}
                      </ThemedText>
                    </View>
                  </TouchableSound>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  conversationCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 16,
    marginBottom: 8,
  },
  conversationCardClosed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarClosed: {},
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomPadding: {
    height: 32,
  },
});
