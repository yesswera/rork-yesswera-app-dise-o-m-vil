// ============================================================================
// YESSWERA: ADMIN SETTINGS
// Configuracion del sistema para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  DollarSign,
  MapPin,
  Shield,
  Database,
  RefreshCw,
  LogOut,
  Download,
  Upload,
  Trash2,
  Settings,
  Brain,
  Zap,
  History,
  Eye,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/auth';
import { Toast } from '@/utils/toast';
import {
  getAISupervisorConfig,
  updateAISupervisorConfig,
  getAIDecisionHistory,
  runSupervisionCheck,
  AISupervisorConfig,
  AIDecision,
} from '@/services/ai-supervisor';

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
  tertiary: '#FBBF24',
};

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [settings, setSettings] = useState({
    notificacionesPush: true,
    notificacionesEmail: true,
    autoAsignacion: true,
    comisionPlataforma: '15',
    tarifaBase: '35',
    tarifaPorKm: '8',
    radioAsignacion: '5',
    tiempoAceptacion: '45',
    modoPrueba: false,
    mantenimiento: false,
  });

  // IA Supervisor State
  const [aiConfig, setAiConfig] = useState<AISupervisorConfig | null>(null);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);

  const loadAIConfig = useCallback(async () => {
    try {
      const [config, decisions] = await Promise.all([
        getAISupervisorConfig(),
        getAIDecisionHistory(5),
      ]);
      setAiConfig(config);
      setAiDecisions(decisions);
    } catch (error) {
      console.error('Error loading AI config:', error);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAIConfig();
  }, [loadAIConfig]);

  const handleAIConfigUpdate = async (updates: Partial<AISupervisorConfig>) => {
    if (!aiConfig) return;
    try {
      await updateAISupervisorConfig(updates);
      setAiConfig({ ...aiConfig, ...updates });
      Toast.success('Configuracion de IA actualizada');
    } catch (error) {
      Toast.error('Error al actualizar configuracion');
    }
  };

  const handleRunSupervision = async () => {
    setAiRunning(true);
    try {
      const report = await runSupervisionCheck();
      Toast.success(`Revision completada: ${report.overallStatus}`);
      await loadAIConfig(); // Recargar decisiones
    } catch (error) {
      Toast.error('Error al ejecutar revision');
    } finally {
      setAiRunning(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesion',
      '¿Estas seguro de que quieres salir del panel administrativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Toast.success('Exportando datos... Se enviara por email');
  };

  const handleBackupDatabase = () => {
    Toast.success('Creando backup de base de datos...');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar Cache',
      '¿Estas seguro? Esto eliminara datos temporales del sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => Toast.success('Cache limpiado'),
        },
      ]
    );
  };

  const handleSaveSettings = () => {
    Toast.success('Configuracion guardada exitosamente');
  };

  return (
    <ScreenContainer
      headerGradient="tertiary"
      headerIcon={Settings}
      headerTitle="Configuracion"
      headerSubtitle="Ajustes del sistema"
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bell size={24} color={FIXED_COLORS.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notificaciones</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Notificaciones Push</Text>
            <Switch
              value={settings.notificacionesPush}
              onValueChange={(value) =>
                setSettings({ ...settings, notificacionesPush: value })
              }
              trackColor={{ false: theme.border, true: FIXED_COLORS.primary + '60' }}
              thumbColor={settings.notificacionesPush ? FIXED_COLORS.primary : theme.textMuted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Notificaciones por Email</Text>
            <Switch
              value={settings.notificacionesEmail}
              onValueChange={(value) =>
                setSettings({ ...settings, notificacionesEmail: value })
              }
              trackColor={{ false: theme.border, true: FIXED_COLORS.primary + '60' }}
              thumbColor={settings.notificacionesEmail ? FIXED_COLORS.primary : theme.textMuted}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DollarSign size={24} color={FIXED_COLORS.success} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarifas y Comisiones</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Comision Plataforma (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
              value={settings.comisionPlataforma}
              onChangeText={(text) =>
                setSettings({ ...settings, comisionPlataforma: text })
              }
              keyboardType="numeric"
              placeholder="15"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Tarifa Base ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
              value={settings.tarifaBase}
              onChangeText={(text) => setSettings({ ...settings, tarifaBase: text })}
              keyboardType="numeric"
              placeholder="35"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Tarifa por Km ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
              value={settings.tarifaPorKm}
              onChangeText={(text) => setSettings({ ...settings, tarifaPorKm: text })}
              keyboardType="numeric"
              placeholder="8"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MapPin size={24} color={FIXED_COLORS.accent} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Asignacion de Ordenes</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Auto-asignacion</Text>
            <Switch
              value={settings.autoAsignacion}
              onValueChange={(value) => setSettings({ ...settings, autoAsignacion: value })}
              trackColor={{ false: theme.border, true: FIXED_COLORS.primary + '60' }}
              thumbColor={settings.autoAsignacion ? FIXED_COLORS.primary : theme.textMuted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Radio de Asignacion (km)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
              value={settings.radioAsignacion}
              onChangeText={(text) => setSettings({ ...settings, radioAsignacion: text })}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Tiempo Aceptacion (seg)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
              value={settings.tiempoAceptacion}
              onChangeText={(text) => setSettings({ ...settings, tiempoAceptacion: text })}
              keyboardType="numeric"
              placeholder="45"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={24} color={FIXED_COLORS.error} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sistema</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Modo Prueba</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Desactiva pagos reales y ordenes
              </Text>
            </View>
            <Switch
              value={settings.modoPrueba}
              onValueChange={(value) => setSettings({ ...settings, modoPrueba: value })}
              trackColor={{ false: theme.border, true: FIXED_COLORS.warning + '60' }}
              thumbColor={settings.modoPrueba ? FIXED_COLORS.warning : theme.textMuted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Modo Mantenimiento</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Bloquea acceso a usuarios
              </Text>
            </View>
            <Switch
              value={settings.mantenimiento}
              onValueChange={(value) => setSettings({ ...settings, mantenimiento: value })}
              trackColor={{ false: theme.border, true: FIXED_COLORS.error + '60' }}
              thumbColor={settings.mantenimiento ? FIXED_COLORS.error : theme.textMuted}
            />
          </View>
        </View>
      </View>

      {/* IA Supervisor Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Brain size={24} color={FIXED_COLORS.accent} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>IA Supervisor</Text>
        </View>
        {aiLoading ? (
          <View style={[styles.card, { backgroundColor: theme.card, alignItems: 'center', padding: 24 }]}>
            <ActivityIndicator size="small" color={FIXED_COLORS.accent} />
          </View>
        ) : aiConfig && (
          <>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>IA Habilitada</Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Supervisa automaticamente el sistema
                  </Text>
                </View>
                <Switch
                  value={aiConfig.enabled}
                  onValueChange={(value) => handleAIConfigUpdate({ enabled: value })}
                  trackColor={{ false: theme.border, true: FIXED_COLORS.accent + '60' }}
                  thumbColor={aiConfig.enabled ? FIXED_COLORS.accent : theme.textMuted}
                />
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Auto-ajuste de Drivers</Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Abre/cierra registro segun demanda
                  </Text>
                </View>
                <Switch
                  value={aiConfig.autoDriverCapacity}
                  onValueChange={(value) => handleAIConfigUpdate({ autoDriverCapacity: value })}
                  trackColor={{ false: theme.border, true: FIXED_COLORS.primary + '60' }}
                  thumbColor={aiConfig.autoDriverCapacity ? FIXED_COLORS.primary : theme.textMuted}
                />
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Intervalo de Revision (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
                  value={String(aiConfig.checkIntervalMinutes)}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 30;
                    handleAIConfigUpdate({ checkIntervalMinutes: Math.max(5, Math.min(120, val)) });
                  }}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Confianza Minima para Actuar (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text, borderColor: theme.border }]}
                  value={String(Math.round(aiConfig.minConfidenceToAct * 100))}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 75;
                    handleAIConfigUpdate({ minConfidenceToAct: Math.max(50, Math.min(100, val)) / 100 });
                  }}
                  keyboardType="numeric"
                  placeholder="75"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionButtonSmall, { backgroundColor: FIXED_COLORS.accent, marginTop: 12 }]}
              onPress={handleRunSupervision}
              disabled={aiRunning}
            >
              {aiRunning ? (
                <ActivityIndicator size="small" color={FIXED_COLORS.white} />
              ) : (
                <Zap size={18} color={FIXED_COLORS.white} />
              )}
              <Text style={styles.actionButtonText}>
                {aiRunning ? 'Ejecutando...' : 'Ejecutar Revision Ahora'}
              </Text>
            </TouchableOpacity>

            {/* Recent AI Decisions */}
            {aiDecisions.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                  <History size={18} color={theme.textSecondary} />
                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                    Ultimas Decisiones
                  </Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  {aiDecisions.map((decision, index) => (
                    <View key={decision.id}>
                      {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                      <View style={styles.decisionRow}>
                        <View style={[
                          styles.decisionIcon,
                          { backgroundColor: decision.wasApplied ? FIXED_COLORS.success + '20' : theme.cardAlt }
                        ]}>
                          {decision.wasApplied ? (
                            <Zap size={14} color={FIXED_COLORS.success} />
                          ) : (
                            <Eye size={14} color={theme.textMuted} />
                          )}
                        </View>
                        <View style={styles.decisionInfo}>
                          <Text style={[styles.decisionAction, { color: theme.text }]}>
                            {decision.action.replace(/_/g, ' ')}
                          </Text>
                          <Text style={[styles.decisionReason, { color: theme.textSecondary }]} numberOfLines={2}>
                            {decision.reason}
                          </Text>
                          <Text style={[styles.decisionTime, { color: theme.textMuted }]}>
                            {new Date(decision.timestamp).toLocaleString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <Text style={[
                          styles.decisionConfidence,
                          { color: decision.confidence >= 0.75 ? FIXED_COLORS.success : FIXED_COLORS.warning }
                        ]}>
                          {Math.round(decision.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Database size={24} color={FIXED_COLORS.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Base de Datos</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
            <Download size={20} color={FIXED_COLORS.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Exportar Datos</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={handleBackupDatabase}>
            <Upload size={20} color={FIXED_COLORS.accent} />
            <Text style={[styles.actionText, { color: theme.text }]}>Backup Base de Datos</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Trash2 size={20} color={FIXED_COLORS.error} />
            <Text style={[styles.actionText, { color: FIXED_COLORS.error }]}>Limpiar Cache</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.saveButton, { backgroundColor: FIXED_COLORS.primary }]} onPress={handleSaveSettings}>
        <RefreshCw size={20} color={FIXED_COLORS.white} />
        <Text style={styles.saveButtonText}>Guardar Configuracion</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.card, borderColor: FIXED_COLORS.error }]} onPress={handleLogout}>
        <LogOut size={20} color={FIXED_COLORS.error} />
        <Text style={[styles.logoutButtonText, { color: FIXED_COLORS.error }]}>Cerrar Sesion Admin</Text>
      </TouchableOpacity>

      <View style={styles.versionInfo}>
        <Text style={[styles.versionText, { color: theme.textSecondary }]}>Yesswera Admin Panel v1.0.0</Text>
        <Text style={[styles.versionSubtext, { color: theme.textMuted }]}>2024 Yesswera. Todos los derechos reservados.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  inputRow: {
    paddingVertical: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionSubtext: {
    fontSize: 11,
    marginTop: 4,
  },
  actionButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  decisionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decisionInfo: {
    flex: 1,
  },
  decisionAction: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  decisionReason: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  decisionTime: {
    fontSize: 11,
    marginTop: 4,
  },
  decisionConfidence: {
    fontSize: 12,
    fontWeight: '700',
  },
});
