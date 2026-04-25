// ============================================================================
// YESSWERA: DRIVER PROFILE — Vecino Amigo DS rebuild
// YAvatar + stats row + menu items + cerrar sesion
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { DS } from '@/constants/design';

import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import StatBox from '@/components/ui/StatBox';
import BigButton from '@/components/ui/BigButton';

// ── Types ────────────────────────────────────────────────────────────────────

interface DriverProfile {
  id: string;
  ratingAverage: number;
  ratingCount: number;
  vehicleType: string;
  vehicleBrand: string;
  vehicleColor: string;
  totalDeliveries: number;
  todayEarnings: number;
  weekEarnings: number;
  documents: { name: string; status: 'verified' | 'pending' }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function vehicleIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'moto':
      return 'bicycle-outline'; // closest available
    case 'bicicleta':
      return 'bicycle-outline';
    case 'auto':
      return 'car-outline';
    default:
      return 'walk-outline';
  }
}

function vehicleLabel(type: string): string {
  const map: Record<string, string> = {
    moto: 'Motocicleta',
    bicicleta: 'Bicicleta',
    auto: 'Automovil',
    pie: 'A pie',
  };
  return map[type] || type || 'No registrado';
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Menu item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  sublabel,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.menuIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={s.menuContent}>
        <Text style={s.menuLabel}>{label}</Text>
        {sublabel && <Text style={s.menuSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={DS.colors.muted} />
    </TouchableOpacity>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      // Get driver record
      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!driver) {
        setLoading(false);
        return;
      }

      // Delivery count
      const { count: totalDeliveries } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driver.id)
        .eq('status', 'delivered');

      // Today earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driver.id)
        .eq('status', 'delivered')
        .gte('delivered_at', today.toISOString());

      // Week earnings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const { data: weekOrders } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driver.id)
        .eq('status', 'delivered')
        .gte('delivered_at', weekAgo.toISOString());

      // Documents
      let documents: { name: string; status: 'verified' | 'pending' }[] = [];
      try {
        const { data: docs } = await supabase
          .from('driver_documents')
          .select('document_type, status')
          .eq('driver_id', driver.id);

        const docNameMap: Record<string, string> = {
          ine: 'INE',
          license: 'Licencia',
          vehicle_registration: 'Tarjeta Circulacion',
        };

        documents = (docs || []).map((d: any) => ({
          name: docNameMap[d.document_type] || d.document_type,
          status: d.status === 'approved' ? 'verified' as const : 'pending' as const,
        }));
      } catch {
        // Documents table might not exist yet
        documents = [
          { name: 'INE', status: 'verified' },
          { name: 'Licencia', status: 'verified' },
          { name: 'Tarjeta Circulacion', status: 'pending' },
        ];
      }

      setProfile({
        id: driver.id,
        ratingAverage: driver.rating_average ?? 0,
        ratingCount: driver.rating_count ?? 0,
        vehicleType: driver.vehicle_type || '',
        vehicleBrand: driver.vehicle_brand || '',
        vehicleColor: driver.vehicle_color || '',
        totalDeliveries: totalDeliveries || 0,
        todayEarnings: todayOrders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0,
        weekEarnings: weekOrders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0,
        documents,
      });
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Logout handler ────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('Cerrar sesion', 'Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesion',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/login');
          } catch (err) {
            console.error('Logout error:', err);
          }
        },
      },
    ]);
  };

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={DS.colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.name || 'Repartidor';
  const rating = profile?.ratingAverage ?? 0;
  const deliveries = profile?.totalDeliveries ?? 0;
  const todayEarnings = profile?.todayEarnings ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + name ────────────────────────────────────────────── */}
        <View style={s.avatarSection}>
          <YAvatar
            uri={user?.avatar}
            name={displayName}
            size={96}
            color={DS.colors.blue}
          />
          <Text style={s.name}>{displayName}</Text>

          {/* Vehicle badge */}
          <View style={s.vehicleBadge}>
            <Ionicons
              name={vehicleIcon(profile?.vehicleType || '')}
              size={16}
              color={DS.colors.blue}
            />
            <Text style={s.vehicleBadgeText}>
              {vehicleLabel(profile?.vehicleType || '')}
              {profile?.vehicleColor ? ` - ${profile.vehicleColor}` : ''}
            </Text>
          </View>
        </View>

        {/* ── Stats row: Entregas | Calificacion | Ganancias hoy ───── */}
        <View style={s.statsRow}>
          <StatBox
            value={deliveries.toString()}
            label="Entregas"
            color={DS.colors.green}
          />
          <View style={{ width: DS.space.sm }} />
          <StatBox
            value={rating > 0 ? rating.toFixed(1) : '--'}
            label="Calificacion"
            color="#F59E0B"
          />
          <View style={{ width: DS.space.sm }} />
          <StatBox
            value={formatCurrency(todayEarnings)}
            label="Hoy"
            color={DS.colors.blue}
          />
        </View>

        {/* ── Menu items ───────────────────────────────────────────────── */}
        <YCard style={s.menuCard} padding={0}>
          <MenuItem
            icon="time-outline"
            label="Historial"
            sublabel="Tus entregas anteriores"
            color={DS.colors.green}
            onPress={() => router.push('/driver/history')}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon="cash-outline"
            label="Ganancias"
            sublabel={`Esta semana: ${formatCurrency(profile?.weekEarnings ?? 0)}`}
            color={DS.colors.blue}
            onPress={() => router.push('/driver/history')}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon="document-text-outline"
            label="Documentos"
            sublabel={`${(profile?.documents ?? []).filter(d => d.status === 'verified').length} verificados`}
            color={DS.colors.orange}
            onPress={() => Alert.alert('Documentos', 'Proximamente')}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon="person-outline"
            label="Mi Cuenta"
            sublabel="Editar informacion personal"
            color={DS.colors.blue}
            onPress={() => router.push('/profile')}
          />
        </YCard>

        {/* ── Documents status ─────────────────────────────────────────── */}
        {(profile?.documents ?? []).length > 0 && (
          <YCard style={s.docsCard}>
            <Text style={s.docsTitle}>Estado de documentos</Text>
            {(profile?.documents ?? []).map((doc, i) => (
              <View key={i} style={s.docRow}>
                <Ionicons
                  name={doc.status === 'verified' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={doc.status === 'verified' ? DS.colors.green : DS.colors.orange}
                />
                <Text style={s.docName}>{doc.name}</Text>
                <Text
                  style={[
                    s.docStatus,
                    {
                      color: doc.status === 'verified' ? DS.colors.green : DS.colors.orange,
                      backgroundColor: doc.status === 'verified' ? DS.colors.greenLight : DS.colors.orangeLight,
                    },
                  ]}
                >
                  {doc.status === 'verified' ? 'Verificado' : 'Pendiente'}
                </Text>
              </View>
            ))}
          </YCard>
        )}

        {/* ── Cerrar sesion ────────────────────────────────────────────── */}
        <BigButton
          label="Cerrar sesion"
          icon="log-out-outline"
          color={DS.colors.red}
          height={60}
          onPress={handleLogout}
          style={s.logoutBtn}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: DS.space.lg,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingTop: DS.space.xxl,
    paddingBottom: DS.space.xl,
  },
  name: {
    ...DS.fonts.title,
    color: DS.colors.dark,
    marginTop: DS.space.md,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.xs,
    marginTop: DS.space.sm,
    backgroundColor: DS.colors.blueLight,
    paddingHorizontal: DS.space.md,
    paddingVertical: DS.space.xs,
    borderRadius: DS.radius.full,
  },
  vehicleBadgeText: {
    ...DS.fonts.small,
    color: DS.colors.blue,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginBottom: DS.space.xl,
  },

  // Menu card
  menuCard: {
    marginBottom: DS.space.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.lg,
    gap: DS.space.md,
    minHeight: DS.touch.min,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  menuSublabel: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginHorizontal: DS.space.lg,
  },

  // Documents
  docsCard: {
    marginBottom: DS.space.xl,
  },
  docsTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
    marginBottom: DS.space.md,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.sm,
    gap: DS.space.sm,
  },
  docName: {
    ...DS.fonts.body,
    color: DS.colors.body,
    flex: 1,
  },
  docStatus: {
    ...DS.fonts.tiny,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },

  // Logout
  logoutBtn: {
    marginTop: DS.space.sm,
  },
});
