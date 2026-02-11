import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: PERFIL Y CONFIGURACION DEL NEGOCIO
// Usa ScreenContainer para diseño unificado
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Store, Star, Package, AlertTriangle, Clock, MapPin, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import {
  PauseReason,
  PAUSE_REASONS,
  getBusinessPauseStatus,
  pauseBusiness,
  resumeBusiness,
  BusinessPauseStatus,
} from '@/services/business-management';
import { Toast } from '@/utils/toast';
import { SoundFeedback } from '@/services/sounds';

// ============================================================================
// COLORES EXPLICITOS PARA MODO OSCURO
// ============================================================================

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    inputBg: '#F5F5F4',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
    inputBg: '#44403C',
  },
};

// ============================================================================
// DURACIONES DE PAUSA
// ============================================================================

const PAUSE_DURATIONS = [15, 30, 60] as const;

// ============================================================================
// INTERFAZ DE NEGOCIO
// ============================================================================

interface BusinessData {
  id: string;
  business_name: string;
  description: string | null;
  phone: string | null;
  address: string;
  category: string | null;
  is_open: boolean;
  delivery_radius_km: number | null;
  preparation_time_minutes: number | null;
  rating_average: number;
  rating_count: number;
  strike_count: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function BusinessProfileScreen() {
  const { user } = useAuth();
  const { isDark, colors, space, radius } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  // Estado de carga
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Datos del negocio
  const [businessId, setBusinessId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [prepTime, setPrepTime] = useState('');

  // Stats
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [strikeCount, setStrikeCount] = useState(0);

  // Estado de pausa
  const [pauseStatus, setPauseStatus] = useState<BusinessPauseStatus>({
    isPaused: false,
    strikeCount: 0,
  });
  const [selectedPauseDuration, setSelectedPauseDuration] = useState<number>(15);
  const [selectedPauseReason, setSelectedPauseReason] = useState<PauseReason>('manual');
  const [showPauseOptions, setShowPauseOptions] = useState(false);

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  const loadBusinessData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Cargar datos del negocio
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!business) return;

      setBusinessId(business.id);
      setName(business.business_name || '');
      setDescription(business.description || '');
      setPhone(business.phone || '');
      setAddress(business.address || '');
      setCategory(business.category || '');
      setIsOpen(business.is_open || false);
      setDeliveryRadius(business.delivery_radius_km?.toString() || '');
      setPrepTime(business.preparation_time_minutes?.toString() || '');
      setRatingAverage(business.rating_average || 0);
      setRatingCount(business.rating_count || 0);
      setStrikeCount(business.strike_count || 0);

      // Cargar conteo de productos
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id);

      setTotalProducts(count || 0);

      // Cargar estado de pausa
      const status = await getBusinessPauseStatus(business.id);
      setPauseStatus(status);
    } catch (error) {
      console.error('Error loading business data:', error);
      Toast.error('Error al cargar datos del negocio');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBusinessData();
    }, [loadBusinessData])
  );

  // ============================================================================
  // GUARDAR CAMBIOS
  // ============================================================================

  const handleSave = async () => {
    if (!businessId) return;

    // Validaciones basicas
    if (!name.trim()) {
      Toast.error('El nombre del negocio es requerido');
      return;
    }
    if (!address.trim()) {
      Toast.error('La direccion es requerida');
      return;
    }

    const radiusNum = deliveryRadius ? parseFloat(deliveryRadius) : null;
    const prepTimeNum = prepTime ? parseInt(prepTime, 10) : null;

    if (radiusNum !== null && (isNaN(radiusNum) || radiusNum <= 0)) {
      Toast.error('El radio de entrega debe ser un numero positivo');
      return;
    }
    if (prepTimeNum !== null && (isNaN(prepTimeNum) || prepTimeNum <= 0)) {
      Toast.error('El tiempo de preparacion debe ser un numero positivo');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          business_name: name.trim(),
          description: description.trim() || null,
          phone: phone.trim() || null,
          address: address.trim(),
          is_open: isOpen,
          delivery_radius_km: radiusNum,
          preparation_time_minutes: prepTimeNum,
        })
        .eq('id', businessId);

      if (error) throw error;

      SoundFeedback.success();
      Toast.success('Perfil del negocio actualizado');
    } catch (error) {
      console.error('Error saving business:', error);
      SoundFeedback.error();
      Toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // PAUSAR / REANUDAR
  // ============================================================================

  const handlePause = async () => {
    if (!businessId) return;

    Alert.alert(
      'Pausar Negocio',
      `Se pausaran las nuevas ordenes por ${selectedPauseDuration} minutos.\nMotivo: ${PAUSE_REASONS[selectedPauseReason]}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pausar',
          style: 'destructive',
          onPress: async () => {
            const result = await pauseBusiness(businessId, selectedPauseReason, selectedPauseDuration);
            if (result.success) {
              Toast.success(result.message);
              const status = await getBusinessPauseStatus(businessId);
              setPauseStatus(status);
              setShowPauseOptions(false);
            } else {
              Toast.error(result.message);
            }
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    if (!businessId) return;

    const result = await resumeBusiness(businessId);
    if (result.success) {
      Toast.success(result.message);
      const status = await getBusinessPauseStatus(businessId);
      setPauseStatus(status);
    } else {
      Toast.error(result.message);
    }
  };

  // ============================================================================
  // TOGGLE ABIERTO/CERRADO
  // ============================================================================

  const handleToggleOpen = async (value: boolean) => {
    setIsOpen(value);

    // Guardar inmediatamente el cambio de estado
    if (businessId) {
      try {
        await supabase
          .from('businesses')
          .update({ is_open: value })
          .eq('id', businessId);

        Toast.info(value ? 'Negocio abierto' : 'Negocio cerrado');
      } catch (error) {
        console.error('Error toggling open:', error);
        setIsOpen(!value); // Revertir
        Toast.error('Error al cambiar estado');
      }
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSectionTitle = (title: string) => (
    <ThemedText
      variant="subtitle"
      bold
      style={{ marginBottom: space.sm, marginTop: space.lg }}
    >
      {title}
    </ThemedText>
  );

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      multiline?: boolean;
      numeric?: boolean;
      placeholder?: string;
      editable?: boolean;
    }
  ) => (
    <View style={{ marginBottom: space.md }}>
      <ThemedText variant="label" color="secondary" style={{ marginBottom: space.xs }}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            color: theme.text,
            borderColor: theme.border,
            borderRadius: radius.md,
          },
          options?.multiline && styles.inputMultiline,
          options?.editable === false && { opacity: 0.6 },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder || ''}
        placeholderTextColor={theme.textMuted}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
        keyboardType={options?.numeric ? 'numeric' : 'default'}
        editable={options?.editable !== false}
      />
    </View>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="secondary"
        headerIcon={Store}
        headerTitle="Perfil del Negocio"
        headerSubtitle="Configuracion y datos"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <ThemedText variant="body" color="secondary" style={{ marginTop: space.md }}>
            Cargando datos del negocio...
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={Store}
      headerTitle="Perfil del Negocio"
      headerSubtitle={name || 'Configura tu negocio'}
    >
      {/* ================================================================== */}
      {/* SECCION: INFORMACION DEL NEGOCIO */}
      {/* ================================================================== */}
      {renderSectionTitle('Informacion del Negocio')}

      <View style={[styles.card, { backgroundColor: theme.card, borderRadius: radius.md }]}>
        {renderInputField('Nombre del negocio', name, setName, {
          placeholder: 'Ej: La Tiendita de Juan',
        })}

        {renderInputField('Descripcion', description, setDescription, {
          multiline: true,
          placeholder: 'Describe tu negocio...',
        })}

        {renderInputField('Telefono', phone, setPhone, {
          numeric: true,
          placeholder: 'Ej: 3171234567',
        })}

        {renderInputField('Direccion', address, setAddress, {
          placeholder: 'Ej: Av. Principal #123',
        })}

        {/* Categoria (solo lectura) */}
        {category ? (
          <View style={{ marginBottom: space.md }}>
            <ThemedText variant="label" color="secondary" style={{ marginBottom: space.xs }}>
              Categoria
            </ThemedText>
            <View
              style={[
                styles.readOnlyField,
                {
                  backgroundColor: theme.cardAlt,
                  borderColor: theme.border,
                  borderRadius: radius.md,
                },
              ]}
            >
              <ThemedText variant="body" color="secondary">
                {category}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>

      {/* ================================================================== */}
      {/* SECCION: ESTADO OPERATIVO */}
      {/* ================================================================== */}
      {renderSectionTitle('Estado Operativo')}

      <View style={[styles.card, { backgroundColor: theme.card, borderRadius: radius.md }]}>
        {/* Toggle Abierto/Cerrado */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOpen ? colors.success : colors.error },
              ]}
            />
            <ThemedText variant="subtitle" bold>
              {isOpen ? 'Negocio Abierto' : 'Negocio Cerrado'}
            </ThemedText>
          </View>
          <Switch
            value={isOpen}
            onValueChange={handleToggleOpen}
            trackColor={{ false: theme.border, true: colors.success + '80' }}
            thumbColor={isOpen ? colors.success : theme.textMuted}
          />
        </View>

        {/* Estado de pausa */}
        {pauseStatus.isPaused && (
          <View
            style={[
              styles.pauseBanner,
              {
                backgroundColor: colors.warning + '15',
                borderColor: colors.warning + '40',
                borderRadius: radius.md,
              },
            ]}
          >
            <View style={styles.pauseBannerHeader}>
              <Clock size={18} color={colors.warning} />
              <ThemedText variant="body" bold style={{ color: colors.warning, marginLeft: space.xs }}>
                Negocio en Pausa
              </ThemedText>
            </View>
            {pauseStatus.pauseReason && (
              <ThemedText variant="caption" color="secondary" style={{ marginTop: space.xs }}>
                Motivo: {PAUSE_REASONS[pauseStatus.pauseReason]}
              </ThemedText>
            )}
            {pauseStatus.resumeAt && (
              <ThemedText variant="caption" color="muted" style={{ marginTop: 2 }}>
                Reanuda: {new Date(pauseStatus.resumeAt).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </ThemedText>
            )}

            <TouchableSound
              style={[
                styles.resumeButton,
                {
                  backgroundColor: colors.success,
                  borderRadius: radius.sm,
                  marginTop: space.sm,
                },
              ]}
              onPress={handleResume}
            >
              <ThemedText variant="button" color="white" bold>
                Reanudar Ahora
              </ThemedText>
            </TouchableSound>
          </View>
        )}

        {/* Boton Pausar (si no esta pausado) */}
        {!pauseStatus.isPaused && (
          <View style={{ marginTop: space.md }}>
            <TouchableSound
              style={[
                styles.pauseToggleButton,
                {
                  borderColor: colors.warning,
                  borderRadius: radius.md,
                },
              ]}
              onPress={() => setShowPauseOptions(!showPauseOptions)}
            >
              <Clock size={18} color={colors.warning} />
              <ThemedText variant="body" style={{ color: colors.warning, fontWeight: '600', marginLeft: space.xs }}>
                {showPauseOptions ? 'Cancelar Pausa' : 'Pausar Temporalmente'}
              </ThemedText>
            </TouchableSound>

            {/* Opciones de pausa */}
            {showPauseOptions && (
              <View
                style={[
                  styles.pauseOptionsContainer,
                  {
                    backgroundColor: theme.cardAlt,
                    borderRadius: radius.md,
                    marginTop: space.sm,
                  },
                ]}
              >
                {/* Duracion */}
                <ThemedText variant="label" color="secondary" style={{ marginBottom: space.xs }}>
                  Duracion
                </ThemedText>
                <View style={styles.durationRow}>
                  {PAUSE_DURATIONS.map((duration) => (
                    <TouchableSound
                      key={duration}
                      style={[
                        styles.durationChip,
                        {
                          borderRadius: radius.sm,
                          borderColor:
                            selectedPauseDuration === duration
                              ? colors.warning
                              : theme.border,
                          backgroundColor:
                            selectedPauseDuration === duration
                              ? colors.warning + '20'
                              : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedPauseDuration(duration)}
                    >
                      <ThemedText
                        variant="label"
                        bold={selectedPauseDuration === duration}
                        style={{
                          color:
                            selectedPauseDuration === duration
                              ? colors.warning
                              : theme.textSecondary,
                        }}
                      >
                        {duration} min
                      </ThemedText>
                    </TouchableSound>
                  ))}
                </View>

                {/* Motivo */}
                <ThemedText
                  variant="label"
                  color="secondary"
                  style={{ marginBottom: space.xs, marginTop: space.md }}
                >
                  Motivo
                </ThemedText>
                <View style={styles.reasonList}>
                  {(Object.keys(PAUSE_REASONS) as PauseReason[]).map((reason) => (
                    <TouchableSound
                      key={reason}
                      style={[
                        styles.reasonItem,
                        {
                          borderRadius: radius.sm,
                          borderColor:
                            selectedPauseReason === reason
                              ? colors.warning
                              : theme.border,
                          backgroundColor:
                            selectedPauseReason === reason
                              ? colors.warning + '20'
                              : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedPauseReason(reason)}
                    >
                      <ThemedText
                        variant="caption"
                        style={{
                          color:
                            selectedPauseReason === reason
                              ? colors.warning
                              : theme.textSecondary,
                        }}
                      >
                        {PAUSE_REASONS[reason]}
                      </ThemedText>
                    </TouchableSound>
                  ))}
                </View>

                {/* Confirmar pausa */}
                <TouchableSound
                  style={[
                    styles.confirmPauseButton,
                    {
                      backgroundColor: colors.warning,
                      borderRadius: radius.md,
                      marginTop: space.md,
                    },
                  ]}
                  onPress={handlePause}
                >
                  <Clock size={18} color="#FFFFFF" />
                  <ThemedText variant="button" color="white" bold style={{ marginLeft: space.xs }}>
                    Pausar por {selectedPauseDuration} min
                  </ThemedText>
                </TouchableSound>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ================================================================== */}
      {/* SECCION: CONFIGURACION DE ENTREGAS */}
      {/* ================================================================== */}
      {renderSectionTitle('Configuracion de Entregas')}

      <View style={[styles.card, { backgroundColor: theme.card, borderRadius: radius.md }]}>
        <View style={styles.deliveryRow}>
          <MapPin size={20} color={colors.secondary} />
          <View style={styles.deliveryInputContainer}>
            {renderInputField(
              'Radio de entrega (km)',
              deliveryRadius,
              setDeliveryRadius,
              {
                numeric: true,
                placeholder: 'Ej: 5',
              }
            )}
          </View>
        </View>

        <View style={styles.deliveryRow}>
          <Clock size={20} color={colors.secondary} />
          <View style={styles.deliveryInputContainer}>
            {renderInputField(
              'Tiempo de preparacion (minutos)',
              prepTime,
              setPrepTime,
              {
                numeric: true,
                placeholder: 'Ej: 20',
              }
            )}
          </View>
        </View>
      </View>

      {/* ================================================================== */}
      {/* SECCION: ESTADISTICAS */}
      {/* ================================================================== */}
      {renderSectionTitle('Estadisticas')}

      <View style={[styles.card, { backgroundColor: theme.card, borderRadius: radius.md }]}>
        {/* Rating */}
        <View style={styles.statRow}>
          <View style={styles.statInfo}>
            <Star size={20} color={colors.warning} />
            <ThemedText variant="body" style={{ marginLeft: space.sm }}>
              Calificacion promedio
            </ThemedText>
          </View>
          <View style={styles.statValue}>
            <ThemedText variant="subtitle" bold style={{ color: colors.warning }}>
              {ratingAverage.toFixed(1)}
            </ThemedText>
            <ThemedText variant="caption" color="muted" style={{ marginLeft: 4 }}>
              ({ratingCount} resenas)
            </ThemedText>
          </View>
        </View>

        {/* Productos */}
        <View style={[styles.statRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
          <View style={styles.statInfo}>
            <Package size={20} color={colors.secondary} />
            <ThemedText variant="body" style={{ marginLeft: space.sm }}>
              Total de productos
            </ThemedText>
          </View>
          <ThemedText variant="subtitle" bold>
            {totalProducts}
          </ThemedText>
        </View>

        {/* Strikes (solo si > 0) */}
        {strikeCount > 0 && (
          <View
            style={[
              styles.strikeWarning,
              {
                backgroundColor: colors.error + '15',
                borderColor: colors.error + '40',
                borderRadius: radius.md,
                marginTop: space.md,
              },
            ]}
          >
            <View style={styles.strikeHeader}>
              <AlertTriangle size={20} color={colors.error} />
              <ThemedText variant="body" bold style={{ color: colors.error, marginLeft: space.xs }}>
                {strikeCount} {strikeCount === 1 ? 'Strike' : 'Strikes'}
              </ThemedText>
            </View>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              Los strikes se acumulan cuando se rechazan ordenes sin pausar el negocio.
              Acumular varios puede resultar en pausa forzada.
            </ThemedText>
          </View>
        )}
      </View>

      {/* ================================================================== */}
      {/* BOTON GUARDAR */}
      {/* ================================================================== */}
      <TouchableSound
        style={[
          styles.saveButton,
          {
            backgroundColor: colors.secondary,
            borderRadius: radius.md,
            marginTop: space.xl,
            marginBottom: 40,
            opacity: saving ? 0.7 : 1,
          },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Save size={22} color="#FFFFFF" />
        )}
        <ThemedText variant="subtitle" color="white" bold style={{ marginLeft: space.sm }}>
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </ThemedText>
      </TouchableSound>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cards
  card: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  // Inputs
  input: {
    height: 48,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inputMultiline: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Pause banner
  pauseBanner: {
    padding: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  pauseBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pause toggle button
  pauseToggleButton: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },

  // Pause options
  pauseOptionsContainer: {
    padding: 14,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  reasonList: {
    gap: 6,
  },
  reasonItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  confirmPauseButton: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Delivery settings
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 4,
  },
  deliveryInputContainer: {
    flex: 1,
  },

  // Stats
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Strike warning
  strikeWarning: {
    padding: 14,
    borderWidth: 1,
  },
  strikeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Save button
  saveButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
