// ============================================================================
// YESSWERA: PERSONALIZAR MI APP
// Pantalla para que usuarios configuren su experiencia
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Settings,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Utensils,
  ShoppingCart,
  Package,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Clock,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { Toast } from '@/utils/toast';
import { SoundFeedback } from '@/services/sounds';
import {
  getUserPreferences,
  updateUserPreferences,
  toggleServiceVisibility,
  moveServiceUp,
  moveServiceDown,
  getUserUsageStats,
  getUserInsights,
  resetUserPreferences,
  ServiceType,
  UserPreferences,
  UsageStats,
} from '@/services/user-preferences';

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
  secondary: '#F97316',
  accent: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
};

// ============================================================================
// CONFIGURACIÓN DE SERVICIOS
// ============================================================================

const SERVICE_CONFIG: Record<ServiceType, {
  label: string;
  description: string;
  icon: typeof Utensils;
  color: string;
}> = {
  food: {
    label: 'Alimentos y Bebidas',
    description: 'Restaurantes, taquerías, cafeterías',
    icon: Utensils,
    color: FIXED.secondary,
  },
  shopping: {
    label: 'Lista de Compras',
    description: 'Supermercados, tiendas, farmacias',
    icon: ShoppingCart,
    color: FIXED.accent,
  },
  delivery: {
    label: 'Recoger y Entregar',
    description: 'Paquetes, documentos, mandados',
    icon: Package,
    color: FIXED.primary,
  },
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function PreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [insights, setInsights] = useState<{
    preferredService: ServiceType | null;
    isFrequentUser: boolean;
    suggestedOrder: ServiceType[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [prefsData, statsData, insightsData] = await Promise.all([
        getUserPreferences(user.id),
        getUserUsageStats(user.id),
        getUserInsights(user.id),
      ]);

      setPrefs(prefsData);
      setStats(statsData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Toast.error('Error cargando preferencias');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleService = async (service: ServiceType) => {
    if (!user || !prefs) return;

    try {
      const newDisplay = await toggleServiceVisibility(user.id, service);
      setPrefs({ ...prefs, display: newDisplay });
      SoundFeedback.tap();
    } catch (error: any) {
      Toast.error(error.message || 'Error al cambiar visibilidad');
    }
  };

  const handleMoveUp = async (service: ServiceType) => {
    if (!user || !prefs) return;

    try {
      const newOrder = await moveServiceUp(user.id, service);
      setPrefs({
        ...prefs,
        display: { ...prefs.display, serviceOrder: newOrder },
      });
      SoundFeedback.tap();
    } catch (error) {
      console.error('Error moving service:', error);
    }
  };

  const handleMoveDown = async (service: ServiceType) => {
    if (!user || !prefs) return;

    try {
      const newOrder = await moveServiceDown(user.id, service);
      setPrefs({
        ...prefs,
        display: { ...prefs.display, serviceOrder: newOrder },
      });
      SoundFeedback.tap();
    } catch (error) {
      console.error('Error moving service:', error);
    }
  };

  const handleToggleNotification = async (key: keyof typeof prefs.notifications) => {
    if (!user || !prefs) return;

    setIsSaving(true);
    try {
      const newNotifications = {
        ...prefs.notifications,
        [key]: !prefs.notifications[key],
      };
      await updateUserPreferences(user.id, { notifications: newNotifications });
      setPrefs({ ...prefs, notifications: newNotifications });
      SoundFeedback.tap();
    } catch (error) {
      Toast.error('Error guardando preferencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSound = async (key: keyof typeof prefs.sounds) => {
    if (!user || !prefs) return;

    setIsSaving(true);
    try {
      const newSounds = {
        ...prefs.sounds,
        [key]: !prefs.sounds[key],
      };
      await updateUserPreferences(user.id, { sounds: newSounds });
      setPrefs({ ...prefs, sounds: newSounds });
      SoundFeedback.tap();
    } catch (error) {
      Toast.error('Error guardando preferencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplySuggestion = async () => {
    if (!user || !prefs || !insights) return;

    Alert.alert(
      'Aplicar Sugerencia',
      'Ordenaremos los servicios según tu uso. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            setIsSaving(true);
            try {
              await updateUserPreferences(user.id, {
                display: { ...prefs.display, serviceOrder: insights.suggestedOrder },
              });
              setPrefs({
                ...prefs,
                display: { ...prefs.display, serviceOrder: insights.suggestedOrder },
              });
              SoundFeedback.success();
              Toast.success('Orden aplicado según tu uso');
            } catch (error) {
              Toast.error('Error aplicando sugerencia');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleReset = () => {
    if (!user) return;

    Alert.alert(
      'Restablecer Preferencias',
      '¿Quieres volver a la configuración inicial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await resetUserPreferences(user.id);
              await loadData();
              Toast.success('Preferencias restablecidas');
            } catch (error) {
              Toast.error('Error restableciendo');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading || !prefs) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={Settings}
        headerTitle="Personalizar"
        headerSubtitle="Cargando..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={FIXED.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Settings}
      headerTitle="Personalizar Mi App"
      headerSubtitle="Ajusta la app a tu gusto"
    >
      {/* Insights Section */}
      {stats && stats.totalOrders > 0 && (
        <View style={[styles.insightsCard, { backgroundColor: FIXED.primary + '15', borderRadius: radius.md }]}>
          <View style={styles.insightsHeader}>
            <Sparkles size={20} color={FIXED.primary} />
            <ThemedText variant="subtitle" bold style={{ color: FIXED.primary, marginLeft: 8 }}>
              Tu Actividad
            </ThemedText>
          </View>
          <View style={styles.insightsGrid}>
            <View style={styles.insightItem}>
              <TrendingUp size={16} color={theme.textSecondary} />
              <ThemedText variant="h3" style={{ color: theme.text }}>{stats.totalOrders}</ThemedText>
              <ThemedText variant="caption" color="secondary">Pedidos</ThemedText>
            </View>
            {insights?.preferredService && (
              <View style={styles.insightItem}>
                {(() => {
                  const Icon = SERVICE_CONFIG[insights.preferredService].icon;
                  return <Icon size={16} color={SERVICE_CONFIG[insights.preferredService].color} />;
                })()}
                <ThemedText variant="label" bold style={{ color: theme.text }}>
                  {SERVICE_CONFIG[insights.preferredService].label.split(' ')[0]}
                </ThemedText>
                <ThemedText variant="caption" color="secondary">Favorito</ThemedText>
              </View>
            )}
            {stats.favoriteHours.length > 0 && (
              <View style={styles.insightItem}>
                <Clock size={16} color={FIXED.warning} />
                <ThemedText variant="label" bold style={{ color: theme.text }}>
                  {stats.favoriteHours[stats.favoriteHours.length - 1]}:00
                </ThemedText>
                <ThemedText variant="caption" color="secondary">Hora frecuente</ThemedText>
              </View>
            )}
          </View>

          {insights && insights.suggestedOrder.join() !== prefs.display.serviceOrder.join() && (
            <TouchableOpacity
              style={[styles.suggestionButton, { backgroundColor: FIXED.primary, borderRadius: radius.sm }]}
              onPress={handleApplySuggestion}
            >
              <Sparkles size={16} color="#fff" />
              <ThemedText variant="label" color="white" bold style={{ marginLeft: 6 }}>
                Ordenar según mi uso
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Services Section */}
      <View style={styles.section}>
        <ThemedText variant="title" bold style={{ marginBottom: space.sm }}>
          Servicios en Inicio
        </ThemedText>
        <ThemedText variant="caption" color="secondary" style={{ marginBottom: space.md }}>
          Oculta servicios o cambia su orden
        </ThemedText>

        {prefs.display.serviceOrder.map((service, index) => {
          const config = SERVICE_CONFIG[service];
          const Icon = config.icon;
          const isHidden = prefs.display.hiddenServices.includes(service);

          return (
            <View
              key={service}
              style={[
                styles.serviceCard,
                {
                  backgroundColor: theme.card,
                  borderRadius: radius.md,
                  borderColor: isHidden ? theme.border : config.color + '40',
                  opacity: isHidden ? 0.6 : 1,
                },
              ]}
            >
              <View style={[styles.serviceIcon, { backgroundColor: config.color + '15' }]}>
                <Icon size={24} color={config.color} />
              </View>

              <View style={styles.serviceInfo}>
                <ThemedText variant="subtitle" bold style={{ color: theme.text }}>
                  {config.label}
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {config.description}
                </ThemedText>
              </View>

              <View style={styles.serviceActions}>
                {/* Mover arriba/abajo */}
                <View style={styles.orderButtons}>
                  <TouchableOpacity
                    style={[styles.orderButton, { opacity: index === 0 ? 0.3 : 1 }]}
                    onPress={() => handleMoveUp(service)}
                    disabled={index === 0}
                  >
                    <ChevronUp size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orderButton, { opacity: index === prefs.display.serviceOrder.length - 1 ? 0.3 : 1 }]}
                    onPress={() => handleMoveDown(service)}
                    disabled={index === prefs.display.serviceOrder.length - 1}
                  >
                    <ChevronDown size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Ocultar/Mostrar */}
                <TouchableOpacity
                  style={[
                    styles.visibilityButton,
                    { backgroundColor: isHidden ? theme.cardAlt : config.color + '20' },
                  ]}
                  onPress={() => handleToggleService(service)}
                >
                  {isHidden ? (
                    <EyeOff size={18} color={theme.textMuted} />
                  ) : (
                    <Eye size={18} color={config.color} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bell size={20} color={FIXED.accent} />
          <ThemedText variant="title" bold style={{ marginLeft: 8 }}>
            Notificaciones
          </ThemedText>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: theme.card, borderRadius: radius.md }]}>
          {[
            { key: 'orderUpdates', label: 'Actualizaciones de pedidos', desc: 'Estado de tus órdenes' },
            { key: 'driverArrival', label: 'Llegada del repartidor', desc: 'Cuando llegue a tu ubicación' },
            { key: 'promotions', label: 'Promociones', desc: 'Ofertas y descuentos' },
            { key: 'newBusinesses', label: 'Nuevos negocios', desc: 'Negocios nuevos en tu zona' },
          ].map((item, index) => (
            <View key={item.key}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText variant="body" style={{ color: theme.text }}>{item.label}</ThemedText>
                  <ThemedText variant="caption" color="muted">{item.desc}</ThemedText>
                </View>
                <Switch
                  value={prefs.notifications[item.key as keyof typeof prefs.notifications]}
                  onValueChange={() => handleToggleNotification(item.key as keyof typeof prefs.notifications)}
                  trackColor={{ false: theme.border, true: FIXED.accent + '60' }}
                  thumbColor={prefs.notifications[item.key as keyof typeof prefs.notifications] ? FIXED.accent : theme.textMuted}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Sounds Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Volume2 size={20} color={FIXED.primary} />
          <ThemedText variant="title" bold style={{ marginLeft: 8 }}>
            Sonidos
          </ThemedText>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: theme.card, borderRadius: radius.md }]}>
          {[
            { key: 'enabled', label: 'Sonidos globales', desc: 'Activar/desactivar todos' },
            { key: 'orderSounds', label: 'Sonidos de órdenes', desc: 'Nueva orden, lista, entregada' },
            { key: 'arrivalSounds', label: 'Sonidos de llegada', desc: 'Cuando llegue el repartidor' },
            { key: 'chatSounds', label: 'Sonidos de chat', desc: 'Mensajes nuevos' },
            { key: 'feedbackSounds', label: 'Sonidos de interfaz', desc: 'Clicks, navegación' },
          ].map((item, index) => (
            <View key={item.key}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText variant="body" style={{ color: theme.text }}>{item.label}</ThemedText>
                  <ThemedText variant="caption" color="muted">{item.desc}</ThemedText>
                </View>
                <Switch
                  value={prefs.sounds[item.key as keyof typeof prefs.sounds]}
                  onValueChange={() => handleToggleSound(item.key as keyof typeof prefs.sounds)}
                  trackColor={{ false: theme.border, true: FIXED.primary + '60' }}
                  thumbColor={prefs.sounds[item.key as keyof typeof prefs.sounds] ? FIXED.primary : theme.textMuted}
                  disabled={item.key !== 'enabled' && !prefs.sounds.enabled}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: FIXED.error, borderRadius: radius.md }]}
        onPress={handleReset}
      >
        <RotateCcw size={18} color={FIXED.error} />
        <ThemedText variant="body" style={{ color: FIXED.error, marginLeft: 8 }}>
          Restablecer Preferencias
        </ThemedText>
      </TouchableOpacity>

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
    paddingVertical: 60,
  },
  insightsCard: {
    padding: 16,
    marginBottom: 24,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  insightItem: {
    alignItems: 'center',
    gap: 4,
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderButtons: {
    flexDirection: 'column',
    gap: 2,
  },
  orderButton: {
    padding: 4,
  },
  visibilityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsCard: {
    padding: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1.5,
    marginTop: 8,
  },
});
