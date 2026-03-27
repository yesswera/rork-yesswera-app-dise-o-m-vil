import TouchableSound from '@/components/TouchableSound';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Plus, Home, Briefcase, MapPinned, Star, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { SavedAddress } from '@/constants/types';
import { getUserAddresses, deleteAddress, setDefaultAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { Toast } from '@/utils/toast';
import * as Haptics from 'expo-haptics';
import ScreenContainer from '@/components/ScreenContainer';

// Explicit colors for dark mode
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

export default function AddressListScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAddresses = async () => {
    if (!user || !token) {
      router.replace('/login' as any);
      return;
    }

    setIsLoading(true);
    try {
      const userAddresses = await getUserAddresses(user.id);
      setAddresses(Array.isArray(userAddresses) ? userAddresses : []);
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      Toast.error('No se pudieron cargar las direcciones');
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!token) return;

    Alert.alert(
      'Eliminar Direccion',
      'Estas seguro de que quieres eliminar esta direccion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(addressId);
            try {
              await deleteAddress(addressId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Toast.success('Direccion eliminada');
              await loadAddresses();
            } catch (error) {
              console.error('Error eliminando direccion:', error);
              Toast.error('No se pudo eliminar la direccion');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    if (!token) return;

    try {
      await setDefaultAddress(addressId, user?.id || '');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.success('Direccion predeterminada actualizada');
      await loadAddresses();
    } catch (error) {
      console.error('Error estableciendo direccion predeterminada:', error);
      Toast.error('No se pudo actualizar la direccion predeterminada');
    }
  };

  const getIconForLabel = (label: 'Casa' | 'Trabajo' | 'Otro') => {
    switch (label) {
      case 'Casa':
        return Home;
      case 'Trabajo':
        return Briefcase;
      default:
        return MapPinned;
    }
  };

  const getColorForLabel = (label: 'Casa' | 'Trabajo' | 'Otro') => {
    switch (label) {
      case 'Casa':
        return Colors.primary;
      case 'Trabajo':
        return Colors.secondary;
      default:
        return Colors.accent;
    }
  };

  // Footer component
  const FooterComponent = (
    <TouchableSound
      style={styles.addButton}
      onPress={() => router.push('/addresses/add' as any)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.addButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Plus size={24} color={Colors.white} strokeWidth={3} />
        <Text style={styles.addButtonText}>Agregar Nueva Direccion</Text>
      </LinearGradient>
    </TouchableSound>
  );

  if (isLoading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={MapPin}
        headerTitle="Mis Direcciones"
        headerSubtitle="Cargando tus direcciones guardadas..."
        scrollEnabled={false}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando direcciones...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={MapPin}
      headerTitle="Mis Direcciones"
      headerSubtitle="Gestiona tus direcciones de entrega"
      scrollEnabled={true}
      footer={FooterComponent}
      footerPadding={100}
      onRefresh={loadAddresses}
      refreshing={isLoading}
    >
      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.cardAlt }]}>
            <MapPin size={64} color={theme.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No tienes direcciones guardadas</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Agrega tu primera direccion para hacer tus pedidos mas rapido
          </Text>
        </View>
      ) : (
        <View style={styles.addressesList}>
          {addresses.map((address) => {
            const Icon = getIconForLabel(address.label);
            const iconColor = getColorForLabel(address.label);
            const isDeleting = deletingId === address.id;

            return (
              <View key={address.id} style={[styles.addressCard, { shadowColor: isDark ? '#000' : Colors.shadow?.medium || '#000' }]}>
                <LinearGradient
                  colors={isDark ? [theme.card, theme.cardAlt] : [Colors.white, `${iconColor}05`]}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.addressHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                      <Icon size={24} color={iconColor} />
                    </View>
                    <View style={styles.addressInfo}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.addressLabel, { color: theme.text }]}>{address.label}</Text>
                        {address.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Star size={12} color={Colors.gold} fill={Colors.gold} />
                            <Text style={styles.defaultText}>Predeterminada</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
                        {address.address}
                      </Text>
                      {address.instructions && (
                        <Text style={[styles.instructionsText, { color: theme.textMuted }]} numberOfLines={1}>
                          {address.instructions}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    {!address.isDefault && (
                      <TouchableSound
                        style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => handleSetDefault(address.id)}
                      >
                        <Star size={18} color={Colors.gold} />
                        <Text style={[styles.actionText, { color: theme.text }]}>Predeterminada</Text>
                      </TouchableSound>
                    )}

                    <TouchableSound
                      style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.card }]}
                      onPress={() => handleDelete(address.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={Colors.error} />
                      ) : (
                        <>
                          <Trash2 size={18} color={Colors.error} />
                          <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
                        </>
                      )}
                    </TouchableSound>
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  addressesList: {
    gap: 16,
  },
  addressCard: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  addressLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  defaultBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  addressText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  deleteButton: {
    borderColor: `${Colors.error}30`,
  },
  deleteText: {
    color: Colors.error,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    paddingVertical: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
