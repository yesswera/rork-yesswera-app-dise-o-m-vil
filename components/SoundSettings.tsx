import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: CONFIGURACIÓN DE SONIDOS
// Controles de preferencias de sonido
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Volume2, VolumeX, Bell, BellOff, AlertTriangle, MousePointerClick } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import {
  getSoundPreferences,
  updateSoundPreferences,
  setSoundsEnabled,
  setGlobalVolume,
  setAlertsOnly,
  setTapSoundEnabled,
  playSound,
  testSound,
} from '@/services/sounds';

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
  },
};

interface SoundSettingsProps {
  variant?: 'full' | 'compact';
}

export default function SoundSettings({ variant = 'full' }: SoundSettingsProps) {
  const { colors, space, radius, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [alertsOnly, setAlertsOnlyState] = useState(false);
  const [tapEnabled, setTapEnabled] = useState(true);

  useEffect(() => {
    const prefs = getSoundPreferences();
    setEnabled(prefs.enabled);
    setVolume(prefs.volume);
    setAlertsOnlyState(prefs.alertsOnly);
    setTapEnabled(prefs.tapSoundEnabled);
  }, []);

  const handleEnabledChange = async (value: boolean) => {
    setEnabled(value);
    await setSoundsEnabled(value);
    if (value) {
      testSound('info');
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
  };

  const handleVolumeChangeComplete = async (value: number) => {
    await setGlobalVolume(value);
    testSound('info');
  };

  const handleAlertsOnlyChange = async (value: boolean) => {
    setAlertsOnlyState(value);
    await setAlertsOnly(value);
    if (value) {
      testSound('newOrder');
    }
  };

  const handleTapEnabledChange = async (value: boolean) => {
    setTapEnabled(value);
    await setTapSoundEnabled(value);
    if (value) {
      testSound('uiTap');
    }
  };

  // Versión compacta
  if (variant === 'compact') {
    return (
      <TouchableSound
        style={[styles.compactContainer, {
          backgroundColor: theme.cardAlt,
          borderRadius: radius.md,
          padding: space.sm,
        }]}
        onPress={() => handleEnabledChange(!enabled)}
        activeOpacity={0.7}
      >
        {enabled ? (
          <Volume2 size={20} color={colors.primary} />
        ) : (
          <VolumeX size={20} color={colors.text?.muted || '#78716C'} />
        )}
        <ThemedText variant="caption" color={enabled ? 'primary' : 'muted'}>
          {enabled ? 'Sonidos' : 'Silencio'}
        </ThemedText>
      </TouchableSound>
    );
  }

  // Versión completa
  return (
    <View style={[styles.container, {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      padding: space.md,
      borderWidth: 1,
      borderColor: theme.border,
    }]}>
      {/* Header */}
      <View style={styles.header}>
        <Volume2 size={24} color={colors.primary} />
        <ThemedText variant="subtitle" bold style={{ marginLeft: space.sm }}>
          Sonidos
        </ThemedText>
      </View>

      {/* Toggle principal */}
      <View style={[styles.row, { marginTop: space.md }]}>
        <View style={styles.rowLeft}>
          {enabled ? (
            <Bell size={20} color={colors.primary} />
          ) : (
            <BellOff size={20} color={colors.text?.muted || '#78716C'} />
          )}
          <View style={{ marginLeft: space.sm }}>
            <ThemedText variant="body" bold>
              Sonidos habilitados
            </ThemedText>
            <ThemedText variant="caption" color="muted">
              Feedback auditivo en la app
            </ThemedText>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleEnabledChange}
          trackColor={{ false: theme.border, true: colors.primary + '60' }}
          thumbColor={enabled ? colors.primary : '#f4f3f4'}
        />
      </View>

      {enabled && (
        <>
          {/* Control de volumen */}
          <View style={[styles.volumeSection, { marginTop: space.lg }]}>
            <View style={styles.volumeHeader}>
              <ThemedText variant="label" bold>
                Volumen
              </ThemedText>
              <ThemedText variant="caption" color="muted">
                {Math.round(volume * 100)}%
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={handleVolumeChange}
              onSlidingComplete={handleVolumeChangeComplete}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={colors.primary}
            />
          </View>

          {/* Solo alertas importantes */}
          <View style={[styles.row, { marginTop: space.md }]}>
            <View style={styles.rowLeft}>
              <AlertTriangle size={20} color={colors.warning} />
              <View style={{ marginLeft: space.sm }}>
                <ThemedText variant="body">
                  Solo alertas importantes
                </ThemedText>
                <ThemedText variant="caption" color="muted">
                  Nueva orden, llegadas, emergencias
                </ThemedText>
              </View>
            </View>
            <Switch
              value={alertsOnly}
              onValueChange={handleAlertsOnlyChange}
              trackColor={{ false: theme.border, true: colors.warning + '60' }}
              thumbColor={alertsOnly ? colors.warning : '#f4f3f4'}
            />
          </View>

          {/* Sonido de interacción */}
          <View style={[styles.row, { marginTop: space.md }]}>
            <View style={styles.rowLeft}>
              <MousePointerClick size={20} color={colors.primary} />
              <View style={{ marginLeft: space.sm }}>
                <ThemedText variant="body">
                  Sonido de interacción
                </ThemedText>
                <ThemedText variant="caption" color="muted">
                  Clic al tocar botones
                </ThemedText>
              </View>
            </View>
            <Switch
              value={tapEnabled}
              onValueChange={handleTapEnabledChange}
              trackColor={{ false: theme.border, true: colors.primary + '60' }}
              thumbColor={tapEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          {/* Botones de prueba */}
          <View style={[styles.testSection, { marginTop: space.lg }]}>
            <ThemedText variant="label" bold style={{ marginBottom: space.sm }}>
              Probar sonidos
            </ThemedText>
            <View style={styles.testButtons}>
              <TouchableSound
                style={[styles.testButton, {
                  backgroundColor: colors.success + '15',
                  borderRadius: radius.sm,
                }]}
                onPress={() => testSound('success')}
              >
                <ThemedText variant="caption" color="success">Suave</ThemedText>
              </TouchableSound>
              <TouchableSound
                style={[styles.testButton, {
                  backgroundColor: colors.warning + '15',
                  borderRadius: radius.sm,
                }]}
                onPress={() => testSound('newOrder')}
              >
                <ThemedText variant="caption" style={{ color: colors.warning }}>Nueva Orden</ThemedText>
              </TouchableSound>
              <TouchableSound
                style={[styles.testButton, {
                  backgroundColor: colors.error + '15',
                  borderRadius: radius.sm,
                }]}
                onPress={() => testSound('driverArrived')}
              >
                <ThemedText variant="caption" color="error">Llegó</ThemedText>
              </TouchableSound>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  volumeSection: {},
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  testSection: {},
  testButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
