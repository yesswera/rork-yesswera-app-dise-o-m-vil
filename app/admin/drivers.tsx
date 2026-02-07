// ============================================================================
// YESSWERA ADMIN: CONTROL DE REPARTIDORES
// Sistema de gestión de capacidad de drivers
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Switch,
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
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { getDriverCapacityStats, updateDriverCapacitySettings, DriverCapacityStats } from '@/services/driver-capacity';

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

export default function DriversControlScreen() {
  const { isDark, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [stats, setStats] = useState<DriverCapacityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Configuración editable
  const [maxDrivers, setMaxDrivers] = useState('10');
  const [targetRatio, setTargetRatio] = useState('10');
  const [registrationOpen, setRegistrationOpen] = useState(true);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

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
  }, [loadStats]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
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
        <TouchableOpacity
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
        </TouchableOpacity>
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
});
