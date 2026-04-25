// ============================================================================
// YESSWERA: BUSINESS PROFILE — Info, schedule, pause toggle
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  Pause,
  Play,
  User,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';

interface BusinessData {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  is_open: boolean;
  schedule_json?: any;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miercoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sabado',
  sunday: 'Domingo',
};

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// Group consecutive days with same schedule
function groupSchedule(schedule: any): { label: string; time: string; closed: boolean }[] {
  if (!schedule) {
    return [
      { label: 'Lun - Vie', time: '8:00 - 23:00', closed: false },
      { label: 'Sabado', time: '8:00 - 23:00', closed: false },
      { label: 'Domingo', time: 'Cerrado', closed: true },
    ];
  }

  const rows: { label: string; time: string; closed: boolean }[] = [];
  let i = 0;

  while (i < DAY_ORDER.length) {
    const dayKey = DAY_ORDER[i];
    const dayData = schedule[dayKey];
    const isClosed = !dayData?.isOpen;
    const timeStr = isClosed
      ? 'Cerrado'
      : `${dayData?.openTime || '8:00'} - ${dayData?.closeTime || '23:00'}`;

    // Find consecutive days with same time
    let j = i + 1;
    while (j < DAY_ORDER.length) {
      const nextKey = DAY_ORDER[j];
      const nextData = schedule[nextKey];
      const nextClosed = !nextData?.isOpen;
      const nextTime = nextClosed
        ? 'Cerrado'
        : `${nextData?.openTime || '8:00'} - ${nextData?.closeTime || '23:00'}`;

      if (nextTime !== timeStr) break;
      j++;
    }

    // Build label
    const startLabel = DAY_LABELS[DAY_ORDER[i]];
    const endLabel = DAY_LABELS[DAY_ORDER[j - 1]];
    const label =
      j - i === 1
        ? startLabel
        : `${startLabel} - ${endLabel}`;

    rows.push({ label, time: timeStr, closed: isClosed });
    i = j;
  }

  return rows;
}

export default function BusinessProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadBusiness();
  }, [user]);

  async function loadBusiness() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, business_name, address, phone, is_open, schedule_json')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setBusiness(data);
        setIsPaused(!data.is_open);
      }
    } catch (e) {
      console.error('loadBusiness error:', e);
    }
  }

  async function togglePause() {
    if (!business) return;
    const next = !isPaused;
    try {
      await supabase
        .from('businesses')
        .update({ is_open: !next })
        .eq('id', business.id);
      setIsPaused(next);
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  }

  const schedule = groupSchedule(business?.schedule_json);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Perfil del Negocio</Text>

        {/* Info card */}
        <YCard>
          <View style={styles.infoRow}>
            <Store size={20} color={DS.colors.orange} />
            <Text style={styles.infoText}>
              {business?.business_name || 'Mi Negocio'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MapPin size={20} color={DS.colors.blue} />
            <Text style={styles.infoText}>
              {business?.address || 'Sin direccion'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Phone size={20} color={DS.colors.green} />
            <Text style={styles.infoText}>
              {business?.phone || 'Sin telefono'}
            </Text>
          </View>
        </YCard>

        {/* Schedule card */}
        <YCard>
          <View style={styles.scheduleHeader}>
            <Clock size={20} color={DS.colors.body} />
            <Text style={styles.scheduleTitle}>Horario</Text>
          </View>
          <View style={styles.divider} />
          {schedule.map((row, idx) => (
            <View key={idx}>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleDay}>{row.label}</Text>
                <Text
                  style={[
                    styles.scheduleTime,
                    row.closed && { color: DS.colors.red },
                  ]}
                >
                  {row.time}
                </Text>
              </View>
              {idx < schedule.length - 1 && (
                <View style={styles.scheduleDivider} />
              )}
            </View>
          ))}
        </YCard>

        {/* Pause button */}
        <TouchableOpacity
          onPress={togglePause}
          activeOpacity={0.8}
          style={[
            styles.pauseBtn,
            {
              backgroundColor: isPaused ? DS.colors.green : DS.colors.red,
            },
          ]}
        >
          {isPaused ? (
            <Play size={22} color="#FFF" />
          ) : (
            <Pause size={22} color="#FFF" />
          )}
          <Text style={styles.pauseText}>
            {isPaused ? 'Reanudar Negocio' : 'Pausar Negocio'}
          </Text>
        </TouchableOpacity>

        {/* My Account link */}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
          style={styles.accountBtn}
        >
          <User size={20} color={DS.colors.blue} />
          <Text style={styles.accountText}>Mi Cuenta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: DS.space.lg,
    gap: DS.space.lg,
    paddingBottom: 40,
  },
  screenTitle: {
    ...DS.fonts.hero,
    color: DS.colors.dark,
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.sm,
  },
  infoText: {
    ...DS.fonts.body,
    color: DS.colors.dark,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginVertical: DS.space.xs,
  },

  // Schedule
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingBottom: DS.space.xs,
  },
  scheduleTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DS.space.sm,
  },
  scheduleDay: {
    ...DS.fonts.body,
    color: DS.colors.body,
  },
  scheduleTime: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
  },

  // Pause
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    height: DS.touch.button,
    borderRadius: DS.radius.xl,
  },
  pauseText: {
    ...DS.fonts.button,
    color: '#FFFFFF',
  },

  // Account
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.lg,
  },
  accountText: {
    ...DS.fonts.bodyMed,
    color: DS.colors.blue,
  },
});
