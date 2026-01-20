import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, MessageCircle, User, Store, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

interface Conversation {
  id: string;
  orderId: string;
  orderNumber: string;
  type: 'client' | 'business' | 'support';
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'closed';
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    orderId: 'YS-1234',
    orderNumber: 'YS-1234',
    type: 'client',
    name: 'Juan Pérez',
    lastMessage: '¿Ya viene en camino?',
    lastMessageTime: new Date(Date.now() - 2 * 60000),
    unreadCount: 2,
    status: 'active',
  },
  {
    id: 'conv-2',
    orderId: 'YS-1230',
    orderNumber: 'YS-1230',
    type: 'business',
    name: 'Tacos El Güero',
    lastMessage: 'La orden está lista',
    lastMessageTime: new Date(Date.now() - 15 * 60000),
    unreadCount: 0,
    status: 'active',
  },
  {
    id: 'conv-3',
    orderId: 'support-001',
    orderNumber: 'Support',
    type: 'support',
    name: 'Soporte Yesswera',
    lastMessage: 'Tu reporte fue recibido',
    lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60000),
    unreadCount: 0,
    status: 'closed',
  },
  {
    id: 'conv-4',
    orderId: 'YS-1228',
    orderNumber: 'YS-1228',
    type: 'client',
    name: 'María González',
    lastMessage: 'Muchas gracias por la entrega',
    lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60000),
    unreadCount: 0,
    status: 'closed',
  },
  {
    id: 'conv-5',
    orderId: 'YS-1225',
    orderNumber: 'YS-1225',
    type: 'business',
    name: 'Pizza Palace',
    lastMessage: 'Te esperamos para recoger',
    lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60000),
    unreadCount: 0,
    status: 'closed',
  },
];

export default function DriverMessagesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return MOCK_CONVERSATIONS;
    
    return MOCK_CONVERSATIONS.filter(conv => 
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeConversations.length === 0 && closedConversations.length === 0 ? (
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
