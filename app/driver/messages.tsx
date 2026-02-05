import { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, MessageCircle, User, Store, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Mensajes</Text>
            {totalUnread > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversación..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.text.light}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.emptySubtext, { marginTop: 16 }]}>Cargando conversaciones...</Text>
          </View>
        ) : activeConversations.length === 0 && closedConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color={Colors.text.light} />
            <Text style={styles.emptyText}>No hay conversaciones</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'Tus mensajes aparecerán aquí'}
            </Text>
          </View>
        ) : (
          <>
            {activeConversations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Activas</Text>
                {activeConversations.map((conversation) => {
                  const Icon = getTypeIcon(conversation.type);
                  return (
                    <TouchableOpacity
                      key={conversation.id}
                      style={styles.conversationCard}
                      onPress={() => handleOpenConversation(conversation.id)}
                    >
                      <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                          <Icon size={24} color={Colors.primary} />
                        </View>
                        {conversation.unreadCount > 0 && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.conversationContent}>
                        <View style={styles.conversationHeader}>
                          <Text style={styles.conversationName}>{conversation.name}</Text>
                          <Text style={styles.conversationTime}>
                            {getTimeDisplay(conversation.lastMessageTime)}
                          </Text>
                        </View>
                        <Text style={styles.orderNumber}>Orden {conversation.orderNumber}</Text>
                        <Text
                          style={[
                            styles.lastMessage,
                            conversation.unreadCount > 0 && styles.lastMessageUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {conversation.lastMessage}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {closedConversations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conversaciones Cerradas</Text>
                {closedConversations.map((conversation) => {
                  const Icon = getTypeIcon(conversation.type);
                  return (
                    <TouchableOpacity
                      key={conversation.id}
                      style={[styles.conversationCard, styles.conversationCardClosed]}
                      onPress={() => handleOpenConversation(conversation.id)}
                    >
                      <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, styles.avatarClosed]}>
                          <Icon size={24} color={Colors.text.light} />
                        </View>
                      </View>
                      <View style={styles.conversationContent}>
                        <View style={styles.conversationHeader}>
                          <Text style={styles.conversationName}>{conversation.name}</Text>
                          <Text style={styles.conversationTime}>
                            {getTimeDisplay(conversation.lastMessageTime)}
                          </Text>
                        </View>
                        <Text style={styles.orderNumber}>Orden {conversation.orderNumber}</Text>
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {conversation.lastMessage}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerBadge: {
    backgroundColor: Colors.error,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  conversationCard: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  conversationCardClosed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarClosed: {
    backgroundColor: Colors.background.secondary,
  },
  badge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  conversationTime: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  orderNumber: {
    fontSize: 12,
    color: Colors.text.light,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  lastMessageUnread: {
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 32,
  },
});
