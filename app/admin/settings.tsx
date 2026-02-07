// ============================================================================
// YESSWERA: ADMIN SETTINGS
// Configuracion del sistema para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  TextInput,
  Platform,
  Alert,
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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/auth';
import { Toast } from '@/utils/toast';

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
});
