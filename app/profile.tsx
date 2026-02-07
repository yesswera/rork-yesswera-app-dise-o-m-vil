// ============================================================================
// YESSWERA: PANTALLA DE PERFIL
// Usa ScreenContainer para diseño unificado
// ============================================================================

import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Edit2,
  LogOut,
  Mail,
  Phone,
  User as UserIcon,
  Star,
  History,
  Moon,
  Sun,
  Smartphone,
  Type,
  Volume2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import { HapticFeedback } from '@/utils/haptics';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import ScreenContainer from '@/components/ScreenContainer';
import SoundSettings from '@/components/SoundSettings';

// Colores explícitos para modo oscuro
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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, isDark, setMode, cycleSizeLevel, sizeLevelLabel, colors } = useTheme();

  const theme = isDark ? COLORS.dark : COLORS.light;

  const getThemeModeLabel = () => {
    switch (mode) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return 'Sistema';
    }
  };

  const getThemeIcon = () => {
    if (mode === 'light') return <Sun size={20} color={colors.warning} />;
    if (mode === 'dark') return <Moon size={20} color={colors.accent} />;
    return <Smartphone size={20} color={colors.primary} />;
  };

  const cycleTheme = () => {
    HapticFeedback.light();
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  };

  const handleSizeChange = () => {
    HapticFeedback.light();
    cycleSizeLevel();
  };

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const getUserTypeLabel = () => {
    switch (user.userType) {
      case 'client': return 'Cliente';
      case 'driver': return 'Repartidor';
      case 'business': return 'Negocio';
      default: return user.userType;
    }
  };

  const handleLogout = () => {
    HapticFeedback.warning();
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            HapticFeedback.success();
            logout();
            router.replace('/' as any);
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={UserIcon}
      headerTitle="Mi Perfil"
      headerSubtitle="Gestiona tu información personal"
    >
      {/* Avatar Section */}
      <View style={[styles.avatarSection, { backgroundColor: theme.card }]}>
        <View style={styles.avatarWrapper}>
          <Avatar name={user.name} imageUri={user.avatar} size="xlarge" />
        </View>
        <ThemedText variant="h3" style={styles.userName}>{user.name}</ThemedText>
        <Badge
          label={getUserTypeLabel()}
          variant={user.userType === 'client' ? 'primary' : user.userType === 'driver' ? 'accent' : 'secondary'}
          size="medium"
        />
        {user.userType === 'driver' && user.rating && (
          <View style={styles.ratingContainer}>
            <Star size={18} color={colors.accent} fill={colors.accent} />
            <ThemedText variant="subtitle" bold>{user.rating.toFixed(1)}</ThemedText>
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <ThemedText variant="subtitle" bold style={styles.sectionTitle}>
          Información Personal
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Email */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
              <Mail size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText variant="caption" color="secondary">Email</ThemedText>
              <ThemedText variant="body">{user.email}</ThemedText>
            </View>
          </View>

          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />

          {/* Phone */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
              <Phone size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText variant="caption" color="secondary">Teléfono</ThemedText>
              <ThemedText variant="body">{user.phone}</ThemedText>
            </View>
          </View>

          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />

          {/* User Type */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
              <UserIcon size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText variant="caption" color="secondary">Tipo de Usuario</ThemedText>
              <ThemedText variant="body">{getUserTypeLabel()}</ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <ThemedText variant="subtitle" bold style={styles.sectionTitle}>
          Acciones
        </ThemedText>

        {/* Edit Profile */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            HapticFeedback.light();
            router.push('/profile/edit' as any);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
            <Edit2 size={20} color={colors.primary} />
          </View>
          <ThemedText variant="body" bold>Editar Perfil</ThemedText>
        </TouchableOpacity>

        {/* Order History */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            HapticFeedback.light();
            router.push('/orders/history' as any);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.accent + '15' }]}>
            <History size={20} color={colors.accent} />
          </View>
          <ThemedText variant="body" bold>Historial de Órdenes</ThemedText>
        </TouchableOpacity>

        {/* Theme Toggle */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={cycleTheme}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.warning + '15' }]}>
            {getThemeIcon()}
          </View>
          <View style={styles.themeContent}>
            <ThemedText variant="body" bold>Tema</ThemedText>
            <ThemedText variant="label" color="secondary">{getThemeModeLabel()}</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Size Toggle */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={handleSizeChange}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '15' }]}>
            <Type size={20} color={colors.secondary} />
          </View>
          <View style={styles.themeContent}>
            <ThemedText variant="body" bold>Tamaño de Texto</ThemedText>
            <ThemedText variant="label" color="secondary">{sizeLevelLabel}</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Sound Settings */}
        <SoundSettings />

        {/* Logout */}
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton, { backgroundColor: theme.card, borderColor: colors.error }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.error + '15' }]}>
            <LogOut size={20} color={colors.error} />
          </View>
          <ThemedText variant="body" color="error" bold>Cerrar Sesión</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: -16,
    marginTop: -16,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  userName: {
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  dividerLine: {
    height: 1,
    marginVertical: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  logoutButton: {
    marginTop: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
