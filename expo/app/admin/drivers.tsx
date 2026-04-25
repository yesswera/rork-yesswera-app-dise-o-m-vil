import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { Truck, CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react-native';
import { DS } from '@/constants/design';
import StatBox from '@/components/ui/StatBox';
import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import Pill from '@/components/ui/Pill';
import SectionHeader from '@/components/ui/SectionHeader';
import BigButton from '@/components/ui/BigButton';
import { useAuth } from '@/contexts/auth';
import { getDriverCapacityStats, updateDriverCapacitySettings, DriverCapacityStats } from '@/services/driver-capacity';
import {
  getDriversPendingVerification,
  approveDriver,
  rejectDriver,
} from '@/services/driver-documents';

interface PendingDriver {
  id: string;
  name: string;
  email: string;
  vehicle_type?: string;
}

export default function AdminDriversScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DriverCapacityStats | null>(null);
  const [pending, setPending] = useState<PendingDriver[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        getDriverCapacityStats(),
        getDriversPendingVerification(),
      ]);
      setStats(s);
      setPending(p || []);
    } catch (err) {
      console.error('Load drivers error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = (driver: PendingDriver) => {
    Alert.alert('Aprobar Repartidor', `Aprobar a ${driver.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: async () => {
          try {
            await approveDriver(driver.id, user?.id || '');
            Alert.alert('Aprobado', `${driver.name} ha sido aprobado`);
            loadData();
          } catch {
            Alert.alert('Error', 'No se pudo aprobar');
          }
        },
      },
    ]);
  };

  const handleReject = (driver: PendingDriver) => {
    Alert.alert('Rechazar Repartidor', `Rechazar a ${driver.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectDriver(driver.id, user?.id || '', 'Documentos insuficientes');
            loadData();
          } catch {
            Alert.alert('Error', 'No se pudo rechazar');
          }
        },
      },
    ]);
  };

  const toggleRegistration = async () => {
    if (!stats) return;
    try {
      await updateDriverCapacitySettings({
        registrationOpen: !stats.settings.registrationOpen,
      });
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={DS.colors.green} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox value={String(stats?.totalDrivers || 0)} label="Total" color={DS.colors.blue} />
          <StatBox value={String(stats?.onlineDrivers || 0)} label="En linea" color={DS.colors.green} />
          <StatBox value={String(pending.length)} label="Pendientes" color={DS.colors.orange} />
        </View>

        {/* Registration toggle */}
        <YCard>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Truck size={20} color={DS.colors.blue} />
              <Text style={styles.toggleLabel}>Registro abierto</Text>
            </View>
            <Switch
              value={stats?.settings.registrationOpen || false}
              onValueChange={toggleRegistration}
              trackColor={{ false: DS.colors.hairline, true: DS.colors.greenLight }}
              thumbColor={stats?.settings.registrationOpen ? DS.colors.green : DS.colors.muted}
            />
          </View>
          <Text style={styles.toggleHint}>
            Max: {stats?.settings.maxDrivers || 0} repartidores | Waitlist: {stats?.waitlistCount || 0}
          </Text>
        </YCard>

        {/* Pending verification */}
        <SectionHeader title="Pendientes de Verificacion" subtitle={`${pending.length} repartidores`} />
        {pending.length === 0 ? (
          <YCard>
            <View style={styles.emptyRow}>
              <CheckCircle size={24} color={DS.colors.green} />
              <Text style={styles.emptyText}>Todos verificados</Text>
            </View>
          </YCard>
        ) : (
          pending.map((driver) => (
            <YCard key={driver.id}>
              <View style={styles.driverRow}>
                <YAvatar name={driver.name} size={44} color={DS.colors.orange} />
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverEmail}>{driver.email}</Text>
                  {driver.vehicle_type && (
                    <Pill text={driver.vehicle_type} color={DS.colors.blue} style={{ marginTop: 4 }} />
                  )}
                </View>
              </View>
              <View style={styles.driverActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: DS.colors.redLight }]}
                  onPress={() => handleReject(driver)}
                >
                  <Text style={[styles.actionBtnText, { color: DS.colors.red }]}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: DS.colors.greenLight }]}
                  onPress={() => handleApprove(driver)}
                >
                  <Text style={[styles.actionBtnText, { color: DS.colors.green }]}>Aprobar</Text>
                </TouchableOpacity>
              </View>
            </YCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.xl, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: DS.space.sm, marginBottom: DS.space.xl },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm },
  toggleLabel: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  toggleHint: { ...DS.fonts.small, color: DS.colors.muted, marginTop: DS.space.sm },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, justifyContent: 'center', paddingVertical: DS.space.md },
  emptyText: { ...DS.fonts.body, color: DS.colors.muted },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  driverInfo: { flex: 1 },
  driverName: { ...DS.fonts.bodyMed, color: DS.colors.dark },
  driverEmail: { ...DS.fonts.small, color: DS.colors.muted },
  driverActions: { flexDirection: 'row', gap: DS.space.sm, marginTop: DS.space.md },
  actionBtn: { flex: 1, paddingVertical: DS.space.md, borderRadius: DS.radius.md, alignItems: 'center' },
  actionBtnText: { ...DS.fonts.label },
});
