import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Edit2, LogOut, Mail, Phone, User as UserIcon, Star, History, Moon, Sun, Smartphone } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { HapticFeedback } from '@/utils/haptics';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, isDark, setMode, colors } = useTheme();

  const getThemeModeLabel = () => {
    switch (mode) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return 'Sistema';
    }
  };

  const getThemeIcon = () => {
    if (mode === 'light') return <Sun size={20} color={Colors.warning} />;
    if (mode === 'dark') return <Moon size={20} color={Colors.accent} />;
    return <Smartphone size={20} color={Colors.primary} />;
  };

  const cycleTheme = () => {
    HapticFeedback.light();
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  };

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const getUserTypeLabel = () => {
    switch (user.userType) {
      case 'client':
        return 'Cliente';
      case 'driver':
        return 'Repartidor';
      case 'business':
        return 'Negocio';
      default:
        return user.userType;
    }
  };

  const handleLogout = () => {
    HapticFeedback.warning();
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres salir de tu cuenta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
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
    <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Avatar name={user.name} imageUri={user.avatar} size="xlarge" />
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Badge 
            label={getUserTypeLabel()} 
            variant={user.userType === 'client' ? 'primary' : user.userType === 'driver' ? 'accent' : 'secondary'}
            size="medium"
          />
          {user.userType === 'driver' && user.rating && (
            <View style={styles.ratingContainer}>
              <Star size={18} color={Colors.gold} fill={Colors.gold} />
              <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Mail size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Phone size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <UserIcon size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tipo de Usuario</Text>
                <Text style={styles.infoValue}>{getUserTypeLabel()}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              HapticFeedback.light();
              router.push('/profile/edit' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Edit2 size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionButtonText}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              HapticFeedback.light();
              router.push('/orders/history' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <History size={20} color={Colors.accent} />
            </View>
            <Text style={styles.actionButtonText}>Historial de Órdenes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={cycleTheme}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              {getThemeIcon()}
            </View>
            <View style={styles.themeContent}>
              <Text style={styles.actionButtonText}>Tema</Text>
              <Text style={styles.themeValue}>{getThemeModeLabel()}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, styles.logoutIconContainer]}>
              <LogOut size={20} color={Colors.error} />
            </View>
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
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
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ratingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutIconContainer: {
    backgroundColor: `${Colors.error}10`,
  },
  logoutButtonText: {
    color: Colors.error,
  },
  themeContent: {
    flex: 1,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  themeValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
  },
});
