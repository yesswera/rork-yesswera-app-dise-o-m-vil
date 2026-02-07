// ============================================================================
// YESSWERA: PANTALLA DE SOPORTE
// Usa ScreenContainer para diseño unificado
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  CreditCard,
  Truck,
  Store,
  Bug,
  User,
  X,
  Send,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import {
  createTicket,
  getUserTickets,
  getTicketMessages,
  addTicketMessage,
  SupportTicket,
  TicketMessage,
  TicketCategory,
  TicketSubcategory,
  TICKET_CATEGORIES,
  TICKET_SUBCATEGORIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/services/support';

// Colores explícitos para modo oscuro
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

export default function SupportCenterScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Create Ticket Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<TicketSubcategory | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ticket Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadTickets();

    // Si viene de una orden, abrir modal de crear ticket
    if (orderId) {
      setCreateModalVisible(true);
      setSelectedCategory('order_issue');
    }
  }, [orderId]);

  const loadTickets = async () => {
    if (!user) return;
    try {
      const data = await getUserTickets(user.id);
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    if (!user || !selectedCategory || !subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await createTicket({
        userId: user.id,
        userType: user.userType || 'client',
        orderId: orderId || undefined,
        category: selectedCategory,
        subcategory: selectedSubcategory || undefined,
        subject: subject.trim(),
        description: description.trim(),
      });

      Alert.alert(
        'Ticket Creado',
        `Tu ticket ${ticket.ticketNumber} ha sido creado. Te responderemos lo antes posible.`,
        [{ text: 'OK', onPress: () => {
          setCreateModalVisible(false);
          resetForm();
          loadTickets();
        }}]
      );
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'No se pudo crear el ticket. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubject('');
    setDescription('');
  };

  const handleOpenTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailModalVisible(true);

    try {
      const messages = await getTicketMessages(ticket.id);
      setTicketMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user) return;

    setSendingMessage(true);
    try {
      const msg = await addTicketMessage(selectedTicket.id, {
        senderId: user.id,
        senderType: 'user',
        message: newMessage.trim(),
      });

      if (msg) {
        setTicketMessages([...ticketMessages, msg]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const getCategoryIcon = (category: TicketCategory) => {
    switch (category) {
      case 'order_issue': return <Package size={24} color={colors.primary} />;
      case 'payment': return <CreditCard size={24} color={colors.warning || '#F59E0B'} />;
      case 'driver': return <Truck size={24} color={colors.accent} />;
      case 'business': return <Store size={24} color={colors.success || '#22C55E'} />;
      case 'account': return <User size={24} color={colors.primary} />;
      case 'app_bug': return <Bug size={24} color={colors.error || '#EF4444'} />;
      default: return <HelpCircle size={24} color={theme.textSecondary} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
      case 'in_progress':
        return <Clock size={16} color={colors.warning || '#F59E0B'} />;
      case 'resolved':
      case 'closed':
        return <CheckCircle size={16} color={colors.success || '#22C55E'} />;
      case 'escalated':
        return <AlertTriangle size={16} color={colors.error || '#EF4444'} />;
      default:
        return <Clock size={16} color={theme.textSecondary} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#1C1917' : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={HelpCircle}
      headerTitle="Centro de Ayuda"
      headerSubtitle="¿En qué podemos ayudarte?"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Create Ticket Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => setCreateModalVisible(true)}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Nuevo Ticket de Soporte</Text>
      </TouchableOpacity>

      {/* Quick Help */}
      <View style={styles.quickHelpSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ayuda Rápida</Text>
        <View style={styles.quickHelpGrid}>
          {TICKET_CATEGORIES.slice(0, 4).map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.quickHelpCard, { backgroundColor: theme.card }]}
              onPress={() => {
                setSelectedCategory(cat.value);
                setCreateModalVisible(true);
              }}
            >
              {getCategoryIcon(cat.value)}
              <Text style={[styles.quickHelpText, { color: theme.textSecondary }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* My Tickets */}
      <View style={styles.ticketsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Mis Tickets ({tickets.length})</Text>

        {tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tienes tickets</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Crea uno si necesitas ayuda</Text>
          </View>
        ) : (
          tickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={[styles.ticketCard, { backgroundColor: theme.card }]}
              onPress={() => handleOpenTicket(ticket)}
            >
              <View style={styles.ticketHeader}>
                <Text style={[styles.ticketNumber, { color: colors.primary }]}>{ticket.ticketNumber}</Text>
                <View style={styles.ticketStatus}>
                  {getStatusIcon(ticket.status)}
                  <Text style={[styles.ticketStatusText, { color: theme.textSecondary }]}>
                    {STATUS_LABELS[ticket.status]}
                  </Text>
                </View>
              </View>
              <Text style={[styles.ticketSubject, { color: theme.text }]} numberOfLines={1}>
                {ticket.subject}
              </Text>
              <View style={styles.ticketFooter}>
                <Text style={[styles.ticketDate, { color: theme.textMuted }]}>{formatDate(ticket.createdAt)}</Text>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Create Ticket Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: isDark ? '#1C1917' : '#FFFFFF' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => {
              setCreateModalVisible(false);
              resetForm();
            }}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Nuevo Ticket</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Category Selection */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.text }]}>¿Cuál es el problema?</Text>
              <View style={styles.categoryGrid}>
                {TICKET_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      selectedCategory === cat.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.value);
                      setSelectedSubcategory(null);
                    }}
                  >
                    {getCategoryIcon(cat.value)}
                    <Text style={[
                      styles.categoryText,
                      { color: theme.textSecondary },
                      selectedCategory === cat.value && { color: colors.primary },
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Subcategory Selection */}
            {selectedCategory && TICKET_SUBCATEGORIES[selectedCategory]?.length > 1 && (
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Especifica el problema</Text>
                <View style={styles.subcategoryList}>
                  {TICKET_SUBCATEGORIES[selectedCategory].map((sub) => (
                    <TouchableOpacity
                      key={sub.value}
                      style={[
                        styles.subcategoryOption,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        selectedSubcategory === sub.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                      ]}
                      onPress={() => setSelectedSubcategory(sub.value)}
                    >
                      <Text style={[
                        styles.subcategoryText,
                        { color: theme.textSecondary },
                        selectedSubcategory === sub.value && { color: colors.primary, fontWeight: '600' },
                      ]}>
                        {sub.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Subject */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Asunto</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Resumen breve del problema"
                placeholderTextColor={theme.textMuted}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Describe el problema con el mayor detalle posible"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={[styles.charCount, { color: theme.textMuted }]}>{description.length}/1000</Text>
            </View>

            {orderId && (
              <View style={[styles.orderLinked, { backgroundColor: colors.accent + '15' }]}>
                <Package size={18} color={colors.accent} />
                <Text style={[styles.orderLinkedText, { color: colors.accent }]}>
                  Vinculado a orden: {orderId.slice(0, 8)}...
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!selectedCategory || !subject.trim() || !description.trim()) && styles.submitButtonDisabled,
              ]}
              onPress={handleCreateTicket}
              disabled={!selectedCategory || !subject.trim() || !description.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enviar Ticket</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: isDark ? '#1C1917' : '#FFFFFF' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedTicket?.ticketNumber}</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedTicket && (
            <>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Ticket Info */}
                <View style={[styles.ticketInfoCard, { backgroundColor: theme.card }]}>
                  <View style={styles.ticketInfoHeader}>
                    <View style={styles.ticketInfoStatus}>
                      {getStatusIcon(selectedTicket.status)}
                      <Text style={[styles.ticketInfoStatusText, { color: theme.textSecondary }]}>
                        {STATUS_LABELS[selectedTicket.status]}
                      </Text>
                    </View>
                    <Text style={[styles.ticketInfoPriority, { color: theme.textMuted, backgroundColor: theme.cardAlt }]}>
                      {PRIORITY_LABELS[selectedTicket.priority]}
                    </Text>
                  </View>
                  <Text style={[styles.ticketInfoSubject, { color: theme.text }]}>{selectedTicket.subject}</Text>
                  <Text style={[styles.ticketInfoDescription, { color: theme.textSecondary }]}>
                    {selectedTicket.description}
                  </Text>
                  <Text style={[styles.ticketInfoDate, { color: theme.textMuted }]}>
                    Creado: {formatDate(selectedTicket.createdAt)}
                  </Text>
                </View>

                {/* Resolution */}
                {selectedTicket.status === 'resolved' && selectedTicket.resolutionNotes && (
                  <View style={[styles.resolutionCard, { backgroundColor: (colors.success || '#22C55E') + '15' }]}>
                    <CheckCircle size={20} color={colors.success || '#22C55E'} />
                    <View style={styles.resolutionContent}>
                      <Text style={[styles.resolutionTitle, { color: colors.success || '#22C55E' }]}>Resolución</Text>
                      <Text style={[styles.resolutionText, { color: theme.textSecondary }]}>
                        {selectedTicket.resolutionNotes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Messages */}
                <View style={styles.messagesSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Conversación</Text>
                  {ticketMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageCard,
                        { backgroundColor: theme.cardAlt },
                        msg.senderType === 'user' && { backgroundColor: colors.primary + '15', alignSelf: 'flex-end' },
                        msg.senderType !== 'user' && !msg.isSystemMessage && { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignSelf: 'flex-start' },
                        msg.isSystemMessage && { backgroundColor: theme.textMuted + '20', alignSelf: 'center', maxWidth: '100%' },
                      ]}
                    >
                      <View style={styles.messageHeader}>
                        <Text style={[styles.messageSender, { color: theme.text }]}>
                          {msg.senderType === 'user' ? 'Tú' : msg.isSystemMessage ? 'Sistema' : 'Soporte'}
                        </Text>
                        <Text style={[styles.messageTime, { color: theme.textMuted }]}>
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <Text style={[styles.messageText, { color: theme.textSecondary }]}>{msg.message}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>

              {/* Message Input (only if not resolved) */}
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                  <TextInput
                    style={[styles.messageInput, { backgroundColor: theme.cardAlt, color: theme.text }]}
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
                      (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Send size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </KeyboardAvoidingView>
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
  },
  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Quick Help
  quickHelpSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickHelpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickHelpCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  quickHelpText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Tickets
  ticketsSection: {
    marginBottom: 24,
  },
  ticketCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  ticketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketStatusText: {
    fontSize: 12,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  // Form
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '31%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  subcategoryList: {
    gap: 8,
  },
  subcategoryOption: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
  },
  subcategoryText: {
    fontSize: 14,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    height: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  orderLinked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  orderLinkedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Ticket Detail
  ticketInfoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ticketInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketInfoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketInfoStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ticketInfoPriority: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ticketInfoSubject: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  ticketInfoDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketInfoDate: {
    fontSize: 12,
  },
  resolutionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resolutionContent: {
    flex: 1,
  },
  resolutionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  resolutionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messagesSection: {
    marginBottom: 16,
  },
  messageCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
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
