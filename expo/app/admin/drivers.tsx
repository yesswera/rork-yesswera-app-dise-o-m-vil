import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA ADMIN: CONTROL DE REPARTIDORES
// Sistema de gestión de capacidad + verificación de documentos
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Switch,
  Image,
  Modal,
} from 'react-native';
import {
  Users,
  Truck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserPlus,
  UserMinus,
  Settings,
  RefreshCw,
  ChevronRight,
  Zap,
  Target,
  BarChart3,
  FileText,
  Shield,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { getDriverCapacityStats, updateDriverCapacitySettings, DriverCapacityStats } from '@/services/driver-capacity';
import {
  getDriversPendingVerification,
  getDriverDocuments,
  approveDriver,
  rejectDriver,
  DriverDocument,
  DocType,
} from '@/services/driver-documents';
import { useAuth } from '@/contexts/auth';

// ============================================================================
// COLORES
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

const FIXED = {
  primary: '#22C55E',
  accent: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#22C55E',
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

// Doc type labels
const DOC_LABELS: Record<DocType, string> = {
  ine_front: 'INE (Frente)',
  ine_back: 'INE (Reverso)',
  selfie: 'Selfie con INE',
  proof_of_address: 'Comprobante de Domicilio',
  license_front: 'Licencia (Frente)',
  license_back: 'Licencia (Reverso)',
};

export default function DriversControlScreen() {
  const { isDark, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const { user } = useAuth();

  const [stats, setStats] = useState<DriverCapacityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Configuración editable
  const [maxDrivers, setMaxDrivers] = useState('10');
  const [targetRatio, setTargetRatio] = useState('10');
  const [registrationOpen, setRegistrationOpen] = useState(true);

  // Verificación de documentos
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverDocs, setDriverDocs] = useState<Record<string, DriverDocument[]>>({});
  const [loadingDocs, setLoadingDocs] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectDriverId, setRejectDriverId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  const loadPendingDrivers = useCallback(async () => {
    try {
      const drivers = await getDriversPendingVerification();
      setPendingDrivers(drivers);
    } catch (error) {
      console.error('Error loading pending drivers:', error);
    }
  }, []);

  const loadDriverDocuments = async (driverId: string) => {
    if (driverDocs[driverId]) return; // Already loaded
    setLoadingDocs(driverId);
    try {
      const docs = await getDriverDocuments(driverId);
      setDriverDocs(prev => ({ ...prev, [driverId]: docs }));
    } catch (error) {
      console.error('Error loading driver docs:', error);
    } finally {
      setLoadingDocs(null);
    }
  };

  const handleExpandDriver = (driverId: string) => {
    if (expandedDriver === driverId) {
      setExpandedDriver(null);
    } else {
      setExpandedDriver(driverId);
      loadDriverDocuments(driverId);
    }
  };

  const handleApproveDriver = async (driverId: string) => {
    Alert.alert(
      'Aprobar Repartidor',
      '¿Confirmas que todos los documentos son válidos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await approveDriver(driverId, user?.id || '');
              Alert.alert('Aprobado', 'El repartidor ha sido verificado');
              setPendingDrivers(prev => prev.filter(d => d.id !== driverId));
              setExpandedDriver(null);
            } catch (error) {
              Alert.alert('Error', 'No se pudo aprobar al repartidor');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleRejectDriver = (driverId: string) => {
    setRejectDriverId(driverId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectDriverId || !rejectReason.trim()) {
      Alert.alert('Error', 'Debes especificar una razón para el rechazo');
      return;
    }
    setActionLoading(true);
    try {
      await rejectDriver(rejectDriverId, user?.id || '', rejectReason.trim());
      Alert.alert('Rechazado', 'El repartidor ha sido notificado');
      setPendingDrivers(prev => prev.filter(d => d.id !== rejectDriverId));
      setExpandedDriver(null);
      setRejectModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo rechazar al repartidor');
    } finally {
      setActionLoading(false);
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const data = await getDriverCapacityStats();
      setStats(data);
      setMaxDrivers(data.settings.maxDrivers.toString());
      setTargetRatio(data.settings.targetOrdersPerDriver.toString());
      setRegistrationOpen(data.settings.registrationOpen);
    } catch (error) {
      console.error('Error loading driver stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadPendingDrivers();
  }, [loadStats, loadPendingDrivers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
    loadPendingDrivers();
  };

  // ============================================================================
  // GUARDAR CONFIGURACIÓN
  // ============================================================================

  const handleSaveSettings = async () => {
    const max = parseInt(maxDrivers);
    const ratio = parseInt(targetRatio);

    if (isNaN(max) || max < 1 || max > 100) {
      Alert.alert('Error', 'Máximo de drivers debe ser entre 1 y 100');
      return;
    }

    if (isNaN(ratio) || ratio < 5 || ratio > 20) {
      Alert.alert('Error', 'Ratio objetivo debe ser entre 5 y 20 órdenes/driver');
      return;
    }

    setIsSaving(true);
    try {
      await updateDriverCapacitySettings({
        maxDrivers: max,
        targetOrdersPerDriver: ratio,
        registrationOpen,
      });
      Alert.alert('Guardado', 'Configuración actualizada correctamente');
      loadStats();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // CALCULAR ESTADO DEL SISTEMA
  // ============================================================================

  const getSystemStatus = () => {
    if (!stats) return { status: 'unknown', color: FIXED.warning, message: 'Cargando...' };

    const ratio = stats.currentRatio;

    if (ratio < 6) {
      return {
        status: 'oversupply',
        color: FIXED.error,
        icon: TrendingDown,
        message: 'Exceso de repartidores',
        recommendation: 'Cerrar registro. Muy pocas órdenes por driver.',
      };
    } else if (ratio < 8) {
      return {
        status: 'caution',
        color: FIXED.warning,
        icon: AlertTriangle,
        message: 'Capacidad alta',
        recommendation: 'Pausar registro. Drivers reciben pocas órdenes.',
      };
    } else if (ratio <= 12) {
      return {
        status: 'optimal',
        color: FIXED.success,
        icon: CheckCircle,
        message: 'Equilibrio óptimo',
        recommendation: 'Mantener. Ratio ideal de órdenes por driver.',
      };
    } else if (ratio <= 15) {
      return {
        status: 'demand',
        color: FIXED.accent,
        icon: TrendingUp,
        message: 'Alta demanda',
        recommendation: 'Abrir registro. Se necesitan más drivers.',
      };
    } else {
      return {
        status: 'critical',
        color: FIXED.error,
        icon: Zap,
        message: 'Demanda crítica',
        recommendation: 'Urgente: Reclutar activamente. Clientes esperan mucho.',
      };
    }
  };

  const systemStatus = getSystemStatus();

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <ScreenContainer headerGradient="primary" headerIcon={Truck} headerTitle="Control de Repartidores">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={FIXED.primary} />
          <ThemedText variant="body" color="secondary" style={{ marginTop: 16 }}>
            Cargando estadísticas...
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Truck}
      headerTitle="Control de Repartidores"
      headerSubtitle="Gestión de capacidad"
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      {/* Estado del Sistema */}
      <View style={[styles.statusCard, {
        backgroundColor: systemStatus.color + '15',
        borderColor: systemStatus.color,
        borderRadius: radius.lg,
      }]}>
        <View style={styles.statusHeader}>
          {systemStatus.icon && <systemStatus.icon size={28} color={systemStatus.color} />}
          <View style={{ marginLeft: space.md, flex: 1 }}>
            <ThemedText variant="h3" style={{ color: systemStatus.color }}>
              {systemStatus.message}
            </ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
              {systemStatus.recommendation}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Métricas Principales */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.md }]}>
          <Users size={24} color={FIXED.primary} />
          <ThemedText variant="h2" style={{ marginTop: 8 }}>
            {stats?.totalDrivers || 0}
          </ThemedText>
          <ThemedText variant="caption" color="muted">Drivers Totales</ThemedText>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.md }]}>
          <Zap size={24} color={FIXED.success} />
          <ThemedText variant="h2" style={{ marginTop: 8 }}>
            {stats?.onlineDrivers || 0}
          </ThemedText>
          <ThemedText variant="caption" color="muted">En Línea Ahora</ThemedText>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.md }]}>
          <BarChart3 size={24} color={FIXED.accent} />
          <ThemedText variant="h2" style={{ marginTop: 8 }}>
            {stats?.ordersToday || 0}
          </ThemedText>
          <ThemedText variant="caption" color="muted">Órdenes Hoy</ThemedText>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.md }]}>
          <Target size={24} color={stats && stats.currentRatio >= 8 && stats.currentRatio <= 12 ? FIXED.success : FIXED.warning} />
          <ThemedText variant="h2" style={{ marginTop: 8, color: stats && stats.currentRatio >= 8 && stats.currentRatio <= 12 ? FIXED.success : FIXED.warning }}>
            {stats?.currentRatio.toFixed(1) || '0'}
          </ThemedText>
          <ThemedText variant="caption" color="muted">Órdenes/Driver</ThemedText>
        </View>
      </View>

      {/* Barra de Ratio */}
      <View style={[styles.ratioCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.lg }]}>
        <ThemedText variant="subtitle" bold style={{ marginBottom: space.md }}>
          Ratio de Órdenes por Repartidor
        </ThemedText>

        <View style={styles.ratioBar}>
          <View style={[styles.ratioSegment, { backgroundColor: FIXED.error, flex: 1 }]}>
            <ThemedText variant="caption" style={{ color: '#FFF' }}>{'<6'}</ThemedText>
          </View>
          <View style={[styles.ratioSegment, { backgroundColor: FIXED.warning, flex: 1 }]}>
            <ThemedText variant="caption" style={{ color: '#FFF' }}>6-8</ThemedText>
          </View>
          <View style={[styles.ratioSegment, { backgroundColor: FIXED.success, flex: 2 }]}>
            <ThemedText variant="caption" style={{ color: '#FFF' }}>8-12 ✓</ThemedText>
          </View>
          <View style={[styles.ratioSegment, { backgroundColor: FIXED.accent, flex: 1 }]}>
            <ThemedText variant="caption" style={{ color: '#FFF' }}>12-15</ThemedText>
          </View>
          <View style={[styles.ratioSegment, { backgroundColor: FIXED.error, flex: 1 }]}>
            <ThemedText variant="caption" style={{ color: '#FFF' }}>{'>15'}</ThemedText>
          </View>
        </View>

        {/* Indicador de posición actual */}
        <View style={styles.ratioIndicator}>
          <View style={[styles.ratioPointer, {
            left: `${Math.min(Math.max((stats?.currentRatio || 0) / 20 * 100, 5), 95)}%`,
            backgroundColor: theme.text,
          }]} />
        </View>

        <View style={styles.ratioLegend}>
          <ThemedText variant="caption" color="error">Exceso drivers</ThemedText>
          <ThemedText variant="caption" color="success">Óptimo</ThemedText>
          <ThemedText variant="caption" color="error">Falta drivers</ThemedText>
        </View>
      </View>

      {/* Configuración */}
      <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.lg }]}>
        <View style={styles.configHeader}>
          <Settings size={20} color={FIXED.primary} />
          <ThemedText variant="subtitle" bold style={{ marginLeft: space.sm }}>
            Configuración
          </ThemedText>
        </View>

        {/* Registro abierto/cerrado */}
        <View style={[styles.configRow, { borderBottomColor: theme.border }]}>
          <View style={styles.configLeft}>
            {registrationOpen ? (
              <UserPlus size={20} color={FIXED.success} />
            ) : (
              <UserMinus size={20} color={FIXED.error} />
            )}
            <View style={{ marginLeft: space.sm }}>
              <ThemedText variant="body" bold>Registro de Drivers</ThemedText>
              <ThemedText variant="caption" color="muted">
                {registrationOpen ? 'Aceptando nuevos repartidores' : 'Registro cerrado (lista de espera)'}
              </ThemedText>
            </View>
          </View>
          <Switch
            value={registrationOpen}
            onValueChange={setRegistrationOpen}
            trackColor={{ false: FIXED.error + '50', true: FIXED.success + '50' }}
            thumbColor={registrationOpen ? FIXED.success : FIXED.error}
          />
        </View>

        {/* Máximo de drivers */}
        <View style={[styles.configRow, { borderBottomColor: theme.border }]}>
          <View style={styles.configLeft}>
            <Users size={20} color={FIXED.accent} />
            <View style={{ marginLeft: space.sm }}>
              <ThemedText variant="body" bold>Máximo de Drivers</ThemedText>
              <ThemedText variant="caption" color="muted">Límite de repartidores activos</ThemedText>
            </View>
          </View>
          <TextInput
            style={[styles.configInput, {
              backgroundColor: theme.cardAlt,
              borderColor: theme.border,
              color: theme.text,
              borderRadius: radius.sm,
            }]}
            value={maxDrivers}
            onChangeText={setMaxDrivers}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* Ratio objetivo */}
        <View style={styles.configRow}>
          <View style={styles.configLeft}>
            <Target size={20} color={FIXED.warning} />
            <View style={{ marginLeft: space.sm }}>
              <ThemedText variant="body" bold>Ratio Objetivo</ThemedText>
              <ThemedText variant="caption" color="muted">Órdenes por driver/día ideal</ThemedText>
            </View>
          </View>
          <TextInput
            style={[styles.configInput, {
              backgroundColor: theme.cardAlt,
              borderColor: theme.border,
              color: theme.text,
              borderRadius: radius.sm,
            }]}
            value={targetRatio}
            onChangeText={setTargetRatio}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        {/* Botón Guardar */}
        <TouchableSound
          style={[styles.saveButton, {
            backgroundColor: FIXED.primary,
            borderRadius: radius.md,
            opacity: isSaving ? 0.7 : 1,
          }]}
          onPress={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <RefreshCw size={18} color="#FFF" />
              <ThemedText variant="body" bold style={{ color: '#FFF', marginLeft: 8 }}>
                Guardar Cambios
              </ThemedText>
            </>
          )}
        </TouchableSound>
      </View>

      {/* Lista de Espera */}
      {stats && stats.waitlistCount > 0 && (
        <View style={[styles.waitlistCard, { backgroundColor: FIXED.warning + '15', borderColor: FIXED.warning, borderRadius: radius.lg }]}>
          <View style={styles.waitlistHeader}>
            <Clock size={24} color={FIXED.warning} />
            <View style={{ marginLeft: space.md }}>
              <ThemedText variant="subtitle" bold>Lista de Espera</ThemedText>
              <ThemedText variant="body" color="secondary">
                {stats.waitlistCount} repartidores esperando activación
              </ThemedText>
            </View>
            <ChevronRight size={24} color={FIXED.warning} />
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* VERIFICACIÓN DE DOCUMENTOS */}
      {/* ============================================================ */}

      <View style={[styles.verificationCard, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.lg }]}>
        <View style={styles.configHeader}>
          <Shield size={20} color={FIXED.accent} />
          <ThemedText variant="subtitle" bold style={{ marginLeft: space.sm }}>
            Verificación de Documentos
          </ThemedText>
          {pendingDrivers.length > 0 && (
            <View style={[styles.badge, { backgroundColor: FIXED.warning }]}>
              <ThemedText variant="caption" style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>
                {pendingDrivers.length}
              </ThemedText>
            </View>
          )}
        </View>

        {pendingDrivers.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ShieldCheck size={40} color={FIXED.success} />
            <ThemedText variant="body" color="secondary" style={{ marginTop: 12 }}>
              No hay verificaciones pendientes
            </ThemedText>
          </View>
        ) : (
          pendingDrivers.map((driver) => {
            const isExpanded = expandedDriver === driver.id;
            const docs = driverDocs[driver.id] || [];
            const userName = driver.users?.full_name || 'Sin nombre';
            const userEmail = driver.users?.email || '';
            const userPhone = driver.users?.phone || '';
            const vehicleType = driver.vehicle_type || 'N/A';
            const verStatus = driver.verification_status;

            return (
              <View key={driver.id} style={[styles.driverItem, { borderColor: theme.border }]}>
                {/* Driver header - tappable */}
                <TouchableSound
                  style={styles.driverHeader}
                  onPress={() => handleExpandDriver(driver.id)}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" bold>{userName}</ThemedText>
                    <ThemedText variant="caption" color="muted">
                      {vehicleType.toUpperCase()} • {userPhone || userEmail}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBadge, {
                    backgroundColor: verStatus === 'documents_submitted' ? FIXED.accent + '20' : FIXED.warning + '20',
                  }]}>
                    <ThemedText variant="caption" style={{
                      color: verStatus === 'documents_submitted' ? FIXED.accent : FIXED.warning,
                      fontWeight: '600',
                      fontSize: 11,
                    }}>
                      {verStatus === 'documents_submitted' ? 'Docs enviados' : 'Pendiente'}
                    </ThemedText>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={theme.textMuted} style={{ marginLeft: 8 }} />
                  ) : (
                    <ChevronDown size={20} color={theme.textMuted} style={{ marginLeft: 8 }} />
                  )}
                </TouchableSound>

                {/* Expanded: show documents */}
                {isExpanded && (
                  <View style={styles.docsContainer}>
                    {loadingDocs === driver.id ? (
                      <ActivityIndicator size="small" color={FIXED.accent} style={{ padding: 20 }} />
                    ) : docs.length === 0 ? (
                      <ThemedText variant="caption" color="muted" style={{ padding: 16, textAlign: 'center' }}>
                        No ha subido documentos aún
                      </ThemedText>
                    ) : (
                      <>
                        {/* Document grid */}
                        <View style={styles.docsGrid}>
                          {docs.map((doc) => (
                            <TouchableSound
                              key={doc.id}
                              style={[styles.docThumb, { borderColor: theme.border, borderRadius: radius.sm }]}
                              onPress={() => setPreviewImage(doc.imageUrl)}
                            >
                              <Image
                                source={{ uri: doc.imageUrl }}
                                style={[styles.docImage, { borderRadius: radius.sm }]}
                                resizeMode="cover"
                              />
                              <View style={styles.docLabelRow}>
                                <Eye size={12} color={theme.textMuted} />
                                <ThemedText variant="caption" color="muted" style={{ marginLeft: 4, fontSize: 10 }} numberOfLines={1}>
                                  {DOC_LABELS[doc.docType] || doc.docType}
                                </ThemedText>
                              </View>
                              {doc.status === 'approved' && (
                                <View style={[styles.docStatusIcon, { backgroundColor: FIXED.success }]}>
                                  <CheckCircle size={12} color="#FFF" />
                                </View>
                              )}
                              {(doc.status as string) === 'rejected' && (
                                <View style={[styles.docStatusIcon, { backgroundColor: FIXED.error }]}>
                                  <X size={12} color="#FFF" />
                                </View>
                              )}
                            </TouchableSound>
                          ))}
                        </View>

                        {/* Action buttons */}
                        <View style={styles.actionRow}>
                          <TouchableSound
                            style={[styles.rejectBtn, { borderColor: FIXED.error, borderRadius: radius.md }]}
                            onPress={() => handleRejectDriver(driver.id)}
                            disabled={actionLoading}
                          >
                            <ShieldX size={16} color={FIXED.error} />
                            <ThemedText variant="body" bold style={{ color: FIXED.error, marginLeft: 6 }}>
                              Rechazar
                            </ThemedText>
                          </TouchableSound>

                          <TouchableSound
                            style={[styles.approveBtn, { backgroundColor: FIXED.success, borderRadius: radius.md }]}
                            onPress={() => handleApproveDriver(driver.id)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <ShieldCheck size={16} color="#FFF" />
                                <ThemedText variant="body" bold style={{ color: '#FFF', marginLeft: 6 }}>
                                  Aprobar
                                </ThemedText>
                              </>
                            )}
                          </TouchableSound>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Información */}
      <View style={[styles.infoCard, { backgroundColor: theme.cardAlt, borderRadius: radius.lg }]}>
        <ThemedText variant="label" bold style={{ marginBottom: space.sm }}>
          ¿Cómo funciona?
        </ThemedText>
        <ThemedText variant="caption" color="secondary" style={{ lineHeight: 20 }}>
          • El sistema monitorea las órdenes diarias y la cantidad de drivers{'\n'}
          • Si hay menos de 8 órdenes/driver, se recomienda cerrar registro{'\n'}
          • Si hay más de 12 órdenes/driver, se recomienda abrir registro{'\n'}
          • Los drivers en lista de espera se activan cuando hay demanda{'\n'}
          • El ratio óptimo es 8-12 órdenes por driver al día
        </ThemedText>
      </View>

      <View style={{ height: 40 }} />

      {/* Modal: Preview de imagen */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <TouchableSound style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <X size={28} color="#FFF" />
          </TouchableSound>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Modal: Razón de rechazo */}
      <Modal visible={rejectModalVisible} transparent animationType="slide" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderRadius: radius.lg }]}>
            <ThemedText variant="h3" bold style={{ marginBottom: 16 }}>
              Rechazar Repartidor
            </ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginBottom: 12 }}>
              Explica la razón del rechazo. El repartidor verá este mensaje.
            </ThemedText>
            <TextInput
              style={[styles.rejectInput, {
                backgroundColor: theme.cardAlt,
                borderColor: theme.border,
                color: theme.text,
                borderRadius: radius.md,
              }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ej: La foto de la INE está borrosa..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableSound
                style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1, borderRadius: radius.md }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <ThemedText variant="body">Cancelar</ThemedText>
              </TouchableSound>
              <TouchableSound
                style={[styles.modalBtn, { backgroundColor: FIXED.error, borderRadius: radius.md }]}
                onPress={confirmReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <ThemedText variant="body" bold style={{ color: '#FFF' }}>Rechazar</ThemedText>
                )}
              </TouchableSound>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusCard: {
    padding: 20,
    borderWidth: 2,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  ratioCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  ratioBar: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ratioSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratioIndicator: {
    height: 20,
    position: 'relative',
    marginTop: 4,
  },
  ratioPointer: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: 16,
    marginLeft: -1.5,
    borderRadius: 2,
  },
  ratioLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  configCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  waitlistCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  waitlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCard: {
    padding: 16,
  },
  // Verification styles
  verificationCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center' as const,
  },
  driverItem: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  driverHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  docsContainer: {
    marginTop: 12,
  },
  docsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  docThumb: {
    width: '31%' as any,
    borderWidth: 1,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  docImage: {
    width: '100%' as any,
    aspectRatio: 3 / 4,
  },
  docLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 4,
  },
  docStatusIcon: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 16,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
  },
  approveBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  // Preview modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  previewClose: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  previewImg: {
    width: '90%' as any,
    height: '80%' as any,
  },
  // Reject modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    padding: 24,
  },
  modalContent: {
    padding: 24,
  },
  rejectInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
});
