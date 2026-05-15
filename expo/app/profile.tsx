// ============================================================================
// YESSWERA: PERFIL — Vecino Amigo DS
// Avatar + name/email + menu cards + logout
// ============================================================================

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  MapPin,
  Clock,
  ChevronRight,
  LogOut,
  Wallet,
  Star,
} from 'lucide-react-native';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import YAvatar from '@/components/ui/YAvatar';
import BigButton from '@/components/ui/BigButton';
import { useAuth } from '@/contexts/auth';

// -- Menu item ----------------------------------------------------------------
function MenuItem({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ElementType;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Icon size={22} color={DS.colors.green} />
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={18} color={DS.colors.placeholder} />
    </TouchableOpacity>
  );
}

// -- Screen -------------------------------------------------------------------
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const handleLogout = () => {
    Alert.alert('Cerrar Sesion', 'Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* -- Avatar + info -- */}
        <View style={styles.avatarSection}>
          <YAvatar name={user.name} size={80} color={DS.colors.green} />
          <Text style={styles.userName}>{user.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* -- Navigation menu -- */}
        <YCard style={styles.card}>
          <MenuItem
            icon={User}
            label="Editar Perfil"
            onPress={() => router.push('/profile/edit' as any)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Clock}
            label="Historial de Ordenes"
            onPress={() => router.push('/orders/history' as any)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={MapPin}
            label="Mis Direcciones"
            onPress={() => router.push('/addresses/list' as any)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Wallet}
            label="Mi Billetera"
            onPress={() => router.push('/wallet' as any)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Star}
            label="Mis Puntos"
            onPress={() => router.push('/loyalty' as any)}
          />
        </YCard>

        {/* -- Logout -- */}
        <View style={styles.logoutWrap}>
          <BigButton
            label="Cerrar Sesion"
            onPress={handleLogout}
            color={DS.colors.red}
            icon="log-out-outline"
            height={DS.touch.min}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// -- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.xxxl,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    marginBottom: DS.space.xxl,
  },
  userName: {
    ...DS.fonts.title,
    color: DS.colors.dark,
    marginTop: DS.space.lg,
  },
  userEmail: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    marginTop: DS.space.xs,
  },

  // Card
  card: {
    marginBottom: DS.space.lg,
  },

  // Menu item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DS.touch.min,
    gap: DS.space.md,
  },
  menuLabel: {
    ...DS.fonts.body,
    color: DS.colors.dark,
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginVertical: 2,
  },

  // Logout
  logoutWrap: {
    marginTop: DS.space.md,
  },
});
