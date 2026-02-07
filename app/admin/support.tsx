// ============================================================================
// YESSWERA: ADMIN SUPPORT
// Sistema de soporte para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {
  Search,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  User,
  Truck,
  Store,
  Package,
  Phone,
  X,
  Zap,
  MapPin,
  FileText,
  Shield,
  DollarSign,
  Gift,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  HeadphonesIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/auth';
import {
  getCaseByNumber,
  searchCases,
  getSupportActionTemplates,
  executeSupportAction,
  generateCaseReport,
  CaseView,
  SupportActionTemplate,
  getTicketStats,
  TicketStats,
} from '@/services/support';

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

export default function AdminSupportScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TicketStats | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Case View Modal
  const [caseModalVisible, setCaseModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseView | null>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [actionTemplates, setActionTemplates] = useState<SupportActionTemplate[]>([]);

  // UI State
  const [expandedSections, setExpandedSections] = useState({
    order: true,
    timeline: true,
    chat: false,
    actions: true,
  });

  useEffect(() => {
    loadStats();
    loadActionTemplates();
  }, []);

  const loadStats = async () => {
    const data = await getTicketStats();
    setStats(data);
  };

  const loadActionTemplates = async () => {
    const templates = await getSupportActionTemplates();
    setActionTemplates(templates);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const caseView = await getCaseByNumber(searchQuery.trim());
      if (caseView) {
        setSelectedCase(caseView);
        setCaseModalVisible(true);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const results = await searchCases(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'No se pudo realizar la busqueda');
    } finally {
      setSearching(false);
    }
  };

  const handleOpenCase = async (caseNumber: string) => {
    setLoadingCase(true);
    setCaseModalVisible(true);

    try {
      const caseView = await getCaseByNumber(caseNumber);
      setSelectedCase(caseView);
    } catch (error) {
      console.error('Error loading case:', error);
      Alert.alert('Error', 'No se pudo cargar el caso');
    } finally {
      setLoadingCase(false);
    }
  };

  const handleExecuteAction = (template: SupportActionTemplate) => {
    if (!selectedCase || !user) return;

    const targetUsers = [selectedCase.participant1.id, selectedCase.participant2.id];

    Alert.alert(
      template.title,
      `¿Enviar esta accion a los usuarios del caso ${selectedCase.caseNumber}?\n\n"${template.message}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            const success = await executeSupportAction(
              selectedCase.caseNumber,
              template.code,
              user.id,
              targetUsers
            );

            if (success) {
              Alert.alert('Exito', 'Accion enviada correctamente');
              const updated = await getCaseByNumber(selectedCase.caseNumber);
              setSelectedCase(updated);
            } else {
              Alert.alert('Error', 'No se pudo ejecutar la accion');
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async () => {
    if (!selectedCase || !user) return;

    Alert.alert(
      'Generar Expediente',
      '¿Para que organismo es este expediente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Uso General', onPress: () => generateReport() },
        { text: 'Policia', onPress: () => generateReport('Policia Municipal') },
        { text: 'PROFECO', onPress: () => generateReport('PROFECO') },
      ]
    );
  };

  const generateReport = async (agency?: string) => {
    if (!selectedCase || !user) return;

    const result = await generateCaseReport(selectedCase.caseNumber, user.id, agency);

    if (result) {
      Alert.alert(
        'Expediente Generado',
        `Numero: ${result.reportNumber}\nCodigo de acceso: ${result.accessCode}\n\nEste codigo es valido por 30 dias.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'No se pudo generar el expediente');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'client': return <User size={16} color={FIXED_COLORS.primary} />;
      case 'driver': return <Truck size={16} color={FIXED_COLORS.accent} />;
      case 'business': return <Store size={16} color={FIXED_COLORS.success} />;
      default: return <User size={16} color={theme.textSecondary} />;
    }
  };

  const getActionIcon = (icon?: string) => {
    switch (icon) {
      case 'dollar-sign': return <DollarSign size={20} color={FIXED_COLORS.success} />;
      case 'gift': return <Gift size={20} color={FIXED_COLORS.warning} />;
      case 'refresh-cw': return <RefreshCw size={20} color={FIXED_COLORS.primary} />;
      case 'check-circle': return <CheckCircle size={20} color={FIXED_COLORS.success} />;
      case 'alert-triangle': return <AlertTriangle size={20} color={FIXED_COLORS.warning} />;
      case 'store': return <Store size={20} color={FIXED_COLORS.accent} />;
      case 'search': return <Search size={20} color={FIXED_COLORS.primary} />;
      case 'shield': return <Shield size={20} color={FIXED_COLORS.error} />;
      case 'file-text': return <FileText size={20} color={theme.textSecondary} />;
      case 'phone': return <Phone size={20} color={FIXED_COLORS.error} />;
      default: return <Zap size={20} color={FIXED_COLORS.warning} />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={HeadphonesIcon}
      headerTitle="Soporte"
      headerSubtitle="Centro de atencion"
    >
      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.primary }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.open}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Abiertos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.warning }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.inProgress}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Proceso</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: FIXED_COLORS.error }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.escalated}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Escalados</Text>
          </View>
        </View>
      )}

      {/* Search by Case Number */}
      <View style={styles.searchSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Buscar por ID de Caso</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text }]}
            placeholder="Ej: A1B2C3"
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
            maxLength={6}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: FIXED_COLORS.primary }]}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color={FIXED_COLORS.white} />
            ) : (
              <Search size={20} color={FIXED_COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.searchHint, { color: theme.textMuted }]}>
          Ingresa el ID de caso de 6 caracteres que el usuario te proporcione
        </Text>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Resultados ({searchResults.length})</Text>
          {searchResults.map((result) => (
            <TouchableOpacity
              key={result.caseNumber}
              style={[styles.resultCard, { backgroundColor: theme.card }]}
              onPress={() => handleOpenCase(result.caseNumber)}
            >
              <View style={styles.resultHeader}>
                <Text style={[styles.resultCaseNumber, { color: FIXED_COLORS.primary }]}>{result.caseNumber}</Text>
                <Text style={[styles.resultStatus, { color: theme.textSecondary, backgroundColor: theme.cardAlt }]}>{result.status}</Text>
              </View>
              <Text style={[styles.resultParticipants, { color: theme.textSecondary }]}>
                {result.participant1Name} - {result.participant2Name}
              </Text>
              <Text style={[styles.resultDate, { color: theme.textMuted }]}>{formatTime(result.createdAt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Help */}
      <View style={styles.helpSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>¿Como funciona?</Text>
        <View style={[styles.helpCard, { backgroundColor: FIXED_COLORS.primary + '10' }]}>
          <Text style={[styles.helpStep, { color: theme.textSecondary }]}>1. El usuario te da su ID de caso (ej: A1B2C3)</Text>
          <Text style={[styles.helpStep, { color: theme.textSecondary }]}>2. Ingresa el ID en el buscador</Text>
          <Text style={[styles.helpStep, { color: theme.textSecondary }]}>3. Veras toda la informacion: orden, chat, ubicaciones</Text>
          <Text style={[styles.helpStep, { color: theme.textSecondary }]}>4. Selecciona una accion para resolver el caso</Text>
          <Text style={[styles.helpStep, { color: theme.textSecondary }]}>5. El usuario recibe la notificacion automaticamente</Text>
        </View>
      </View>

      {/* Case Detail Modal */}
      <Modal
        visible={caseModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCaseModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? COLORS.dark.cardAlt : '#F5F5F4' }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setCaseModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, { color: FIXED_COLORS.primary }]}>
                {selectedCase?.caseNumber || 'Cargando...'}
              </Text>
              {selectedCase && (
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: selectedCase.status === 'escalated' ? FIXED_COLORS.error + '20' : FIXED_COLORS.primary + '20' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: selectedCase.status === 'escalated' ? FIXED_COLORS.error : FIXED_COLORS.primary }
                  ]}>
                    {selectedCase.status}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleGenerateReport}>
              <FileText size={24} color={FIXED_COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loadingCase ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando caso...</Text>
            </View>
          ) : selectedCase ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Participants */}
              <View style={[styles.participantsCard, { backgroundColor: theme.card }]}>
                <View style={styles.participant}>
                  {getParticipantIcon(selectedCase.participant1.type)}
                  <View style={styles.participantInfoModal}>
                    <Text style={[styles.participantName, { color: theme.text }]}>{selectedCase.participant1.name}</Text>
                    <Text style={[styles.participantType, { color: theme.textSecondary }]}>{selectedCase.participant1.type}</Text>
                    {selectedCase.participant1.phone && (
                      <View style={styles.contactRow}>
                        <Phone size={12} color={theme.textSecondary} />
                        <Text style={[styles.contactText, { color: theme.textSecondary }]}>{selectedCase.participant1.phone}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.participantDivider}>
                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
                <View style={styles.participant}>
                  {getParticipantIcon(selectedCase.participant2.type)}
                  <View style={styles.participantInfoModal}>
                    <Text style={[styles.participantName, { color: theme.text }]}>{selectedCase.participant2.name}</Text>
                    <Text style={[styles.participantType, { color: theme.textSecondary }]}>{selectedCase.participant2.type}</Text>
                    {selectedCase.participant2.phone && (
                      <View style={styles.contactRow}>
                        <Phone size={12} color={theme.textSecondary} />
                        <Text style={[styles.contactText, { color: theme.textSecondary }]}>{selectedCase.participant2.phone}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Order Details */}
              {selectedCase.order && (
                <View style={[styles.section, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[styles.sectionHeader, { backgroundColor: theme.cardAlt }]}
                    onPress={() => toggleSection('order')}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Package size={18} color={FIXED_COLORS.accent} />
                      <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>Orden</Text>
                    </View>
                    {expandedSections.order ? <ChevronUp size={20} color={theme.textSecondary} /> : <ChevronDown size={20} color={theme.textSecondary} />}
                  </TouchableOpacity>
                  {expandedSections.order && (
                    <View style={styles.sectionContent}>
                      <View style={styles.orderRow}>
                        <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>Estado:</Text>
                        <Text style={[styles.orderValue, { color: theme.text }]}>{selectedCase.order.status}</Text>
                      </View>
                      <View style={styles.orderRow}>
                        <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>Total:</Text>
                        <Text style={[styles.orderValueBold, { color: FIXED_COLORS.success }]}>${selectedCase.order.total}</Text>
                      </View>
                      {selectedCase.order.businessName && (
                        <View style={styles.orderRow}>
                          <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>Negocio:</Text>
                          <Text style={[styles.orderValue, { color: theme.text }]}>{selectedCase.order.businessName}</Text>
                        </View>
                      )}
                      <View style={styles.orderRow}>
                        <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>Entrega:</Text>
                        <Text style={[styles.orderValue, { color: theme.text }]}>{selectedCase.order.deliveryAddress}</Text>
                      </View>
                      {selectedCase.order.items.length > 0 && (
                        <View style={[styles.orderItems, { borderTopColor: theme.border }]}>
                          <Text style={[styles.orderItemsTitle, { color: theme.textSecondary }]}>Productos:</Text>
                          {selectedCase.order.items.map((item, idx) => (
                            <Text key={idx} style={[styles.orderItem, { color: theme.textSecondary }]}>
                              - {item.quantity}x {item.name} (${item.price})
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Timeline */}
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                  style={[styles.sectionHeader, { backgroundColor: theme.cardAlt }]}
                  onPress={() => toggleSection('timeline')}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Clock size={18} color={FIXED_COLORS.warning} />
                    <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
                      Timeline ({selectedCase.timeline.length} eventos)
                    </Text>
                  </View>
                  {expandedSections.timeline ? <ChevronUp size={20} color={theme.textSecondary} /> : <ChevronDown size={20} color={theme.textSecondary} />}
                </TouchableOpacity>
                {expandedSections.timeline && (
                  <View style={styles.sectionContent}>
                    {selectedCase.timeline.length === 0 ? (
                      <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin eventos registrados</Text>
                    ) : (
                      selectedCase.timeline.map((event, idx) => (
                        <View key={event.id} style={styles.timelineItem}>
                          <View style={[styles.timelineDot, { backgroundColor: FIXED_COLORS.primary }]} />
                          <View style={styles.timelineContent}>
                            <Text style={[styles.timelineDescription, { color: theme.text }]}>{event.description}</Text>
                            <Text style={[styles.timelineTime, { color: theme.textMuted }]}>{formatTime(event.createdAt)}</Text>
                            {event.location && (
                              <View style={styles.timelineLocation}>
                                <MapPin size={12} color={theme.textMuted} />
                                <Text style={[styles.timelineLocationText, { color: theme.textMuted }]}>
                                  {event.location.address || `${event.location.lat}, ${event.location.lng}`}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Chat Transcript */}
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                  style={[styles.sectionHeader, { backgroundColor: theme.cardAlt }]}
                  onPress={() => toggleSection('chat')}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <MessageSquare size={18} color={FIXED_COLORS.primary} />
                    <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
                      Chat ({selectedCase.messages.length} mensajes)
                    </Text>
                  </View>
                  {expandedSections.chat ? <ChevronUp size={20} color={theme.textSecondary} /> : <ChevronDown size={20} color={theme.textSecondary} />}
                </TouchableOpacity>
                {expandedSections.chat && (
                  <View style={styles.sectionContent}>
                    {selectedCase.messages.length === 0 ? (
                      <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin mensajes</Text>
                    ) : (
                      selectedCase.messages.map((msg) => (
                        <View key={msg.id} style={[styles.chatMessage, { backgroundColor: theme.cardAlt }]}>
                          <View style={styles.chatMessageHeader}>
                            <Text style={[styles.chatMessageSender, { color: theme.text }]}>{msg.senderName}</Text>
                            <Text style={[styles.chatMessageTime, { color: theme.textMuted }]}>{formatTime(msg.createdAt)}</Text>
                          </View>
                          <Text style={[styles.chatMessageContent, { color: theme.textSecondary }]}>{msg.content}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Actions Taken */}
              {selectedCase.actions.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[styles.sectionHeader, { backgroundColor: theme.cardAlt }]}
                    onPress={() => toggleSection('actions')}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <CheckCircle size={18} color={FIXED_COLORS.success} />
                      <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
                        Acciones Tomadas ({selectedCase.actions.length})
                      </Text>
                    </View>
                    {expandedSections.actions ? <ChevronUp size={20} color={theme.textSecondary} /> : <ChevronDown size={20} color={theme.textSecondary} />}
                  </TouchableOpacity>
                  {expandedSections.actions && (
                    <View style={styles.sectionContent}>
                      {selectedCase.actions.map((action) => (
                        <View key={action.id} style={[styles.actionTakenCard, { backgroundColor: FIXED_COLORS.success + '10', borderLeftColor: FIXED_COLORS.success }]}>
                          <Text style={[styles.actionTakenTitle, { color: theme.text }]}>{action.title}</Text>
                          <Text style={[styles.actionTakenMessage, { color: theme.textSecondary }]}>{action.message}</Text>
                          <Text style={[styles.actionTakenMeta, { color: theme.textMuted }]}>
                            Por: {action.executedBy} - {formatTime(action.executedAt)}
                            {action.pushSent && ' - Enviado'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Support Actions */}
              <View style={[styles.actionsSection, { backgroundColor: theme.card }]}>
                <Text style={[styles.actionsSectionTitle, { color: theme.text }]}>Acciones de Soporte</Text>
                <Text style={[styles.actionsSectionSubtitle, { color: theme.textSecondary }]}>
                  Selecciona una opcion para notificar a los usuarios
                </Text>

                {/* Resolution Actions */}
                <Text style={[styles.actionCategoryTitle, { color: theme.textSecondary }]}>Resoluciones</Text>
                <View style={styles.actionsGrid}>
                  {actionTemplates.filter(t => t.category === 'resolution').map((template) => (
                    <TouchableOpacity
                      key={template.code}
                      style={[styles.actionCard, { backgroundColor: theme.cardAlt }]}
                      onPress={() => handleExecuteAction(template)}
                    >
                      {getActionIcon(template.icon)}
                      <Text style={[styles.actionCardTitle, { color: theme.textSecondary }]}>{template.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Information Actions */}
                <Text style={[styles.actionCategoryTitle, { color: theme.textSecondary }]}>Informacion</Text>
                <View style={styles.actionsGrid}>
                  {actionTemplates.filter(t => t.category === 'information').map((template) => (
                    <TouchableOpacity
                      key={template.code}
                      style={[styles.actionCard, { backgroundColor: theme.cardAlt }]}
                      onPress={() => handleExecuteAction(template)}
                    >
                      {getActionIcon(template.icon)}
                      <Text style={[styles.actionCardTitle, { color: theme.textSecondary }]}>{template.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Escalation Actions */}
                <Text style={[styles.actionCategoryTitle, { color: theme.textSecondary }]}>Escalaciones</Text>
                <View style={styles.actionsGrid}>
                  {actionTemplates.filter(t => t.category === 'escalation').map((template) => (
                    <TouchableOpacity
                      key={template.code}
                      style={[styles.actionCard, styles.actionCardDanger, { backgroundColor: FIXED_COLORS.error + '10' }]}
                      onPress={() => handleExecuteAction(template)}
                    >
                      {getActionIcon(template.icon)}
                      <Text style={[styles.actionCardTitle, styles.actionCardTitleDanger, { color: FIXED_COLORS.error }]}>
                        {template.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Generate Report Button */}
              <TouchableOpacity style={[styles.reportButton, { backgroundColor: theme.text }]} onPress={handleGenerateReport}>
                <FileText size={20} color={isDark ? COLORS.dark.cardAlt : COLORS.light.card} />
                <Text style={[styles.reportButtonText, { color: isDark ? COLORS.dark.cardAlt : COLORS.light.card }]}>Generar Expediente del Caso</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>No se encontro el caso</Text>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  // Search
  searchSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchHint: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  // Results
  resultsSection: {
    marginBottom: 20,
  },
  resultCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultCaseNumber: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  resultStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  resultParticipants: {
    fontSize: 14,
  },
  resultDate: {
    fontSize: 12,
    marginTop: 4,
  },
  // Help
  helpSection: {
    marginBottom: 20,
  },
  helpCard: {
    borderRadius: 12,
    padding: 16,
  },
  helpStep: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
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
  modalTitleContainer: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {},
  modalContent: {
    flex: 1,
    padding: 16,
  },
  // Participants
  participantsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  participant: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  participantInfoModal: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  participantType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
  },
  participantDivider: {
    paddingHorizontal: 10,
  },
  // Sections
  section: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 14,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Order
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
  },
  orderValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  orderValueBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  orderItems: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  orderItemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  orderItem: {
    fontSize: 13,
    marginBottom: 2,
  },
  // Timeline
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDescription: {
    fontSize: 14,
  },
  timelineTime: {
    fontSize: 12,
    marginTop: 2,
  },
  timelineLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timelineLocationText: {
    fontSize: 11,
  },
  // Chat
  chatMessage: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  chatMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatMessageSender: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatMessageTime: {
    fontSize: 10,
  },
  chatMessageContent: {
    fontSize: 14,
  },
  // Actions Taken
  actionTakenCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  actionTakenTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionTakenMessage: {
    fontSize: 13,
    marginBottom: 4,
  },
  actionTakenMeta: {
    fontSize: 11,
  },
  // Actions Section
  actionsSection: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  actionsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionsSectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  actionCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '31%',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionCardDanger: {},
  actionCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionCardTitleDanger: {},
  // Report Button
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
