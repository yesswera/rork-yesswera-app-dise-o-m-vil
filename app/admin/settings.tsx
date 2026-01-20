import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { Toast } from '@/utils/toast';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
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
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir del panel administrativo?',
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
    Toast.success('Exportando datos... Se enviará por email');
  };

  const handleBackupDatabase = () => {
    Toast.success('Creando backup de base de datos...');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar Caché',
      '¿Estás seguro? Esto eliminará datos temporales del sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => Toast.success('Caché limpiado'),
        },
      ]
    );
  };

  const handleSaveSettings = () => {
    Toast.success('Configuración guardada exitosamente');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Notificaciones</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Notificaciones Push</Text>
                <Switch
                  value={settings.notificacionesPush}
                  onValueChange={(value) =>
                    setSettings({ ...settings, notificacionesPush: value })
                  }
                  trackColor={{ false: Colors.border.light, true: Colors.primary + '60' }}
                  thumbColor={settings.notificacionesPush ? Colors.primary : Colors.text.light}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Notificaciones por Email</Text>
                <Switch
                  value={settings.notificacionesEmail}
                  onValueChange={(value) =>
                    setSettings({ ...settings, notificacionesEmail: value })
                  }
                  trackColor={{ false: Colors.border.light, true: Colors.primary + '60' }}
                  thumbColor={settings.notificacionesEmail ? Colors.primary : Colors.text.light}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={24} color={Colors.success} />
              <Text style={styles.sectionTitle}>Tarifas y Comisiones</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Comisión Plataforma (%)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.comisionPlataforma}
                  onChangeText={(text) =>
                    setSettings({ ...settings, comisionPlataforma: text })
                  }
                  keyboardType="numeric"
                  placeholder="15"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Tarifa Base ($)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.tarifaBase}
                  onChangeText={(text) => setSettings({ ...settings, tarifaBase: text })}
                  keyboardType="numeric"
                  placeholder="35"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Tarifa por Km ($)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.tarifaPorKm}
                  onChangeText={(text) => setSettings({ ...settings, tarifaPorKm: text })}
                  keyboardType="numeric"
                  placeholder="8"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={24} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Asignación de Órdenes</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Auto-asignación</Text>
                <Switch
                  value={settings.autoAsignacion}
                  onValueChange={(value) => setSettings({ ...settings, autoAsignacion: value })}
                  trackColor={{ false: Colors.border.light, true: Colors.primary + '60' }}
                  thumbColor={settings.autoAsignacion ? Colors.primary : Colors.text.light}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Radio de Asignación (km)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.radioAsignacion}
                  onChangeText={(text) => setSettings({ ...settings, radioAsignacion: text })}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Tiempo Aceptación (seg)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.tiempoAceptacion}
                  onChangeText={(text) => setSettings({ ...settings, tiempoAceptacion: text })}
                  keyboardType="numeric"
                  placeholder="45"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={24} color={Colors.error} />
              <Text style={styles.sectionTitle}>Sistema</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Modo Prueba</Text>
                  <Text style={styles.settingDescription}>
                    Desactiva pagos reales y órdenes
                  </Text>
                </View>
                <Switch
                  value={settings.modoPrueba}
                  onValueChange={(value) => setSettings({ ...settings, modoPrueba: value })}
                  trackColor={{ false: Colors.border.light, true: Colors.warning + '60' }}
                  thumbColor={settings.modoPrueba ? Colors.warning : Colors.text.light}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Modo Mantenimiento</Text>
                  <Text style={styles.settingDescription}>
                    Bloquea acceso a usuarios
                  </Text>
                </View>
                <Switch
                  value={settings.mantenimiento}
                  onValueChange={(value) => setSettings({ ...settings, mantenimiento: value })}
                  trackColor={{ false: Colors.border.light, true: Colors.error + '60' }}
                  thumbColor={settings.mantenimiento ? Colors.error : Colors.text.light}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Database size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Base de Datos</Text>
            </View>
            <View style={styles.card}>
              <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
                <Download size={20} color={Colors.primary} />
                <Text style={styles.actionText}>Exportar Datos</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.actionRow} onPress={handleBackupDatabase}>
                <Upload size={20} color={Colors.accent} />
                <Text style={styles.actionText}>Backup Base de Datos</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
                <Trash2 size={20} color={Colors.error} />
                <Text style={[styles.actionText, { color: Colors.error }]}>Limpiar Caché</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <RefreshCw size={20} color={Colors.white} />
            <Text style={styles.saveButtonText}>Guardar Configuración</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.error} />
            <Text style={styles.logoutButtonText}>Cerrar Sesión Admin</Text>
          </TouchableOpacity>

          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Yesswera Admin Panel v1.0.0</Text>
            <Text style={styles.versionSubtext}>© 2024 Yesswera. Todos los derechos reservados.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
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
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow.light,
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
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  inputRow: {
    paddingVertical: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.error,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  versionSubtext: {
    fontSize: 11,
    color: Colors.text.light,
    marginTop: 4,
  },
});
