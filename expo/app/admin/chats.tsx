import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ADMIN CHATS
// Visualizacion de chats para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import {
  Search,
  MessageCircle,
  User,
  Truck,
  Store,
  Shield,
  X,
  Package,
  Clock,
  ChevronRight,
  Eye,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import {
  getAllConversations,
  getMessages,
  ChatConversation,
  ChatMessage,
  ParticipantType,
} from '@/services/chat';

// ============================================================================
// COLORES EXPLICITOS (modo oscuro)
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

const FIXED_COLORS = {
  primary: '#22C55E',
  accent: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

export default function AdminChatsScreen() {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'with_order'>('all');

  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllConversations({
        status: filter === 'active' ? 'active' : undefined,
        hasOrder: filter === 'with_order' ? true : undefined,
      });
      setConversations(data);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenConversation = async (conv: ChatConversation) => {
    setSelectedConversation(conv);
    setDetailModalVisible(true);
    setLoadingMessages(true);

    try {
      const msgs = await getMessages(conv.id, 100);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getParticipantIcon = (type: ParticipantType) => {
    switch (type) {
      case 'client': return <User size={16} color={FIXED_COLORS.primary} />;
      case 'driver': return <Truck size={16} color={FIXED_COLORS.accent} />;
      case 'business': return <Store size={16} color={FIXED_COLORS.success} />;
      case 'admin': return <Shield size={16} color={FIXED_COLORS.error} />;
    }
  };

  const getParticipantLabel = (type: ParticipantType) => {
    switch (type) {
      case 'client': return 'Cliente';
      case 'driver': return 'Repartidor';
      case 'business': return 'Negocio';
      case 'admin': return 'Admin';
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(c => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        c.participant1Name?.toLowerCase().includes(search) ||
        c.participant2Name?.toLowerCase().includes(search) ||
        c.orderId?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando chats...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={MessageCircle}
      headerTitle="Chats"
      headerSubtitle="Conversaciones del sistema"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <MessageCircle size={24} color={FIXED_COLORS.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{conversations.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Chats</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Package size={24} color={FIXED_COLORS.accent} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {conversations.filter(c => c.orderId).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Con Orden</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Clock size={24} color={FIXED_COLORS.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {conversations.filter(c => c.status === 'active').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Activos</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Search size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar por nombre o ID de orden..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableSound onPress={() => setSearchQuery('')}>
            <X size={18} color={theme.textSecondary} />
          </TouchableSound>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <TouchableSound
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.border },
            filter === 'all' && { backgroundColor: FIXED_COLORS.primary, borderColor: FIXED_COLORS.primary },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, { color: theme.textSecondary }, filter === 'all' && styles.filterChipTextActive]}>
            Todos
          </Text>
        </TouchableSound>
        <TouchableSound
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.border },
            filter === 'active' && { backgroundColor: FIXED_COLORS.primary, borderColor: FIXED_COLORS.primary },
          ]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterChipText, { color: theme.textSecondary }, filter === 'active' && styles.filterChipTextActive]}>
            Activos
          </Text>
        </TouchableSound>
        <TouchableSound
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.border },
            filter === 'with_order' && { backgroundColor: FIXED_COLORS.primary, borderColor: FIXED_COLORS.primary },
          ]}
          onPress={() => setFilter('with_order')}
        >
          <Package size={14} color={filter === 'with_order' ? FIXED_COLORS.white : theme.textSecondary} />
          <Text style={[styles.filterChipText, { color: theme.textSecondary }, filter === 'with_order' && styles.filterChipTextActive]}>
            Con Orden
          </Text>
        </TouchableSound>
      </View>

      {/* Conversations List */}
      <View style={styles.chatsList}>
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay conversaciones</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Las conversaciones apareceran aqui</Text>
          </View>
        ) : (
          filteredConversations.map((conv) => (
            <TouchableSound
              key={conv.id}
              style={[styles.chatCard, { backgroundColor: theme.card }]}
              onPress={() => handleOpenConversation(conv)}
            >
              <View style={styles.chatHeader}>
                <View style={styles.participantsRow}>
                  <View style={styles.participant}>
                    {getParticipantIcon(conv.participant1Type)}
                    <Text style={[styles.participantName, { color: theme.text }]} numberOfLines={1}>
                      {conv.participant1Name || getParticipantLabel(conv.participant1Type)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.textMuted} />
                  <View style={styles.participant}>
                    {getParticipantIcon(conv.participant2Type)}
                    <Text style={[styles.participantName, { color: theme.text }]} numberOfLines={1}>
                      {conv.participant2Name || getParticipantLabel(conv.participant2Type)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.chatTime, { color: theme.textMuted }]}>{formatTime(conv.lastMessageAt)}</Text>
              </View>

              {conv.orderId && (
                <View style={[styles.orderBadge, { backgroundColor: FIXED_COLORS.accent + '15' }]}>
                  <Package size={12} color={FIXED_COLORS.accent} />
                  <Text style={[styles.orderBadgeText, { color: FIXED_COLORS.accent }]}>Orden vinculada</Text>
                </View>
              )}

              <View style={styles.chatFooter}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: conv.status === 'active' ? FIXED_COLORS.success : theme.textMuted },
                ]} />
                <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                  {conv.status === 'active' ? 'Activo' : conv.status === 'closed' ? 'Cerrado' : 'Archivado'}
                </Text>
                <View style={styles.viewButton}>
                  <Eye size={14} color={FIXED_COLORS.primary} />
                  <Text style={[styles.viewButtonText, { color: FIXED_COLORS.primary }]}>Ver</Text>
                </View>
              </View>
            </TouchableSound>
          ))
        )}
      </View>

      {/* Conversation Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? COLORS.dark.cardAlt : '#F5F5F4' }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableSound onPress={() => setDetailModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableSound>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Conversacion</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedConversation && (
            <>
              {/* Participants Info */}
              <View style={[styles.participantsInfo, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View style={styles.participantInfo}>
                  {getParticipantIcon(selectedConversation.participant1Type)}
                  <View>
                    <Text style={[styles.participantInfoName, { color: theme.text }]}>
                      {selectedConversation.participant1Name || 'Usuario'}
                    </Text>
                    <Text style={[styles.participantInfoType, { color: theme.textSecondary }]}>
                      {getParticipantLabel(selectedConversation.participant1Type)}
                    </Text>
                  </View>
                </View>
                <View style={styles.arrowContainer}>
                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
                <View style={styles.participantInfo}>
                  {getParticipantIcon(selectedConversation.participant2Type)}
                  <View>
                    <Text style={[styles.participantInfoName, { color: theme.text }]}>
                      {selectedConversation.participant2Name || 'Usuario'}
                    </Text>
                    <Text style={[styles.participantInfoType, { color: theme.textSecondary }]}>
                      {getParticipantLabel(selectedConversation.participant2Type)}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedConversation.orderId && (
                <View style={[styles.orderInfoBanner, { backgroundColor: FIXED_COLORS.accent + '15' }]}>
                  <Package size={18} color={FIXED_COLORS.accent} />
                  <Text style={[styles.orderInfoText, { color: FIXED_COLORS.accent }]}>
                    Orden: {selectedConversation.orderId.slice(0, 8)}...
                  </Text>
                </View>
              )}

              {/* Messages */}
              <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
                {loadingMessages ? (
                  <View style={styles.loadingMessages}>
                    <ActivityIndicator size="small" color={FIXED_COLORS.primary} />
                    <Text style={[styles.loadingMessagesText, { color: theme.textSecondary }]}>Cargando mensajes...</Text>
                  </View>
                ) : messages.length === 0 ? (
                  <View style={styles.noMessages}>
                    <Text style={[styles.noMessagesText, { color: theme.textMuted }]}>No hay mensajes</Text>
                  </View>
                ) : (
                  messages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageCard,
                        { backgroundColor: theme.cardAlt },
                        msg.senderType === selectedConversation.participant1Type
                          ? [styles.messageLeft, { backgroundColor: theme.card, borderColor: theme.border }]
                          : [styles.messageRight, { backgroundColor: FIXED_COLORS.primary + '10' }],
                        msg.messageType === 'system' && [styles.messageSystem, { backgroundColor: theme.textMuted + '20' }],
                      ]}
                    >
                      <View style={styles.messageHeader}>
                        <View style={styles.messageSenderRow}>
                          {getParticipantIcon(msg.senderType)}
                          <Text style={[styles.messageSender, { color: theme.text }]}>{msg.senderName || 'Usuario'}</Text>
                        </View>
                        <Text style={[styles.messageTime, { color: theme.textMuted }]}>
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <Text style={[styles.messageContent, { color: theme.textSecondary }]}>{msg.content}</Text>
                      {msg.isRead && (
                        <Text style={[styles.readIndicator, { color: FIXED_COLORS.success }]}>Leido</Text>
                      )}
                    </View>
                  ))
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  // Filters
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  // Chats List
  chatsList: {
    gap: 12,
  },
  chatCard: {
    borderRadius: 12,
    padding: 14,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  participantInfoName: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantInfoType: {
    fontSize: 12,
  },
  arrowContainer: {
    paddingHorizontal: 10,
  },
  orderInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  orderInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Messages
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  loadingMessages: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingMessagesText: {
    fontSize: 14,
  },
  noMessages: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMessagesText: {
    fontSize: 14,
  },
  messageCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    maxWidth: '85%',
  },
  messageLeft: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  messageRight: {
    alignSelf: 'flex-end',
  },
  messageSystem: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 10,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  readIndicator: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
});
