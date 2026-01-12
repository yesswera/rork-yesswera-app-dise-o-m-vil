import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Plus, Home, Briefcase, MapPinned, Star, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { SavedAddress } from '@/constants/types';
import { getUserAddresses, deleteAddress, setDefaultAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';
import { Toast } from '@/utils/toast';
import * as Haptics from 'expo-haptics';

export default function AddressListScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
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
      const userAddresses = await getUserAddresses(user.id, token);
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
      'Eliminar Dirección',
      '¿Estás seguro de que quieres eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(addressId);
            try {
              await deleteAddress(addressId, token);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Toast.success('Dirección eliminada');
              await loadAddresses();
            } catch (error) {
              console.error('Error eliminando dirección:', error);
              Toast.error('No se pudo eliminar la dirección');
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
      await setDefaultAddress(addressId, token);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.success('Dirección predeterminada actualizada');
      await loadAddresses();
    } catch (error) {
      console.error('Error estableciendo dirección predeterminada:', error);
      Toast.error('No se pudo actualizar la dirección predeterminada');
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando direcciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={styles.gradient}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MapPin size={64} color={Colors.text.disabled} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No tienes direcciones guardadas</Text>
            <Text style={styles.emptyText}>
              Agrega tu primera dirección para hacer tus pedidos más rápido
            </Text>
          </View>
        ) : (
          <View style={styles.addressesList}>
            {addresses.map((address) => {
              const Icon = getIconForLabel(address.label);
              const iconColor = getColorForLabel(address.label);
              const isDeleting = deletingId === address.id;

              return (
                <View key={address.id} style={styles.addressCard}>
                  <LinearGradient
                    colors={[Colors.white, `${iconColor}05`]}
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
                          <Text style={styles.addressLabel}>{address.label}</Text>
                          {address.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Star size={12} color={Colors.gold} fill={Colors.gold} />
                              <Text style={styles.defaultText}>Predeterminada</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.addressText} numberOfLines={2}>
                          {address.address}
                        </Text>
                        {address.instructions && (
                          <Text style={styles.instructionsText} numberOfLines={1}>
                            💬 {address.instructions}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.actionsRow}>
                      {!address.isDefault && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleSetDefault(address.id)}
                        >
                          <Star size={18} color={Colors.gold} />
                          <Text style={styles.actionText}>Predeterminada</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
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
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
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
            <Text style={styles.addButtonText}>Agregar Nueva Dirección</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  gradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  centerContent: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  addressesList: {
    gap: 16,
  },
  addressCard: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.medium,
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
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: Colors.text.muted,
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
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  deleteButton: {
    borderColor: `${Colors.error}30`,
  },
  deleteText: {
    color: Colors.error,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
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
