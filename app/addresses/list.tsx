import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, MapPin, Home, Briefcase, MapPinned, Trash2, Star } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { SavedAddress } from '@/constants/types';
import { getUserAddresses, deleteAddress, setDefaultAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';

export default function AddressListScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!user || !token) return;
    
    try {
      const userAddresses = await getUserAddresses(user.id, token);
      setAddresses(userAddresses);
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las direcciones');
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = async (addressId: string) => {
    Alert.alert(
      'Eliminar Dirección',
      '¿Estás seguro de que quieres eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            
            setDeletingId(addressId);
            try {
              await deleteAddress(addressId, token);
              await loadAddresses();
              Alert.alert('Éxito', 'Dirección eliminada');
            } catch (error) {
              console.error('Error eliminando dirección:', error);
              Alert.alert('Error', 'No se pudo eliminar la dirección');
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
      await loadAddresses();
      Alert.alert('Éxito', 'Dirección predeterminada actualizada');
    } catch (error) {
      console.error('Error estableciendo dirección predeterminada:', error);
      Alert.alert('Error', 'No se pudo actualizar la dirección predeterminada');
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando direcciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={64} color={Colors.text.disabled} />
            <Text style={styles.emptyTitle}>Sin Direcciones</Text>
            <Text style={styles.emptyText}>
              Agrega tu primera dirección para hacer pedidos más rápido
            </Text>
          </View>
        ) : (
          addresses.map((address) => {
            const Icon = getIconForLabel(address.label);
            const isDeleting = deletingId === address.id;

            return (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Icon size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>{address.label}</Text>
                      {address.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Star size={12} color={Colors.gold} fill={Colors.gold} />
                          <Text style={styles.defaultText}>Predeterminada</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.address} numberOfLines={2}>
                      {address.address}
                    </Text>
                    {address.instructions && (
                      <Text style={styles.instructions} numberOfLines={1}>
                        {address.instructions}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(address.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={Colors.error} />
                    ) : (
                      <Trash2 size={20} color={Colors.error} />
                    )}
                  </TouchableOpacity>
                </View>

                {!address.isDefault && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Text style={styles.setDefaultText}>Marcar como predeterminada</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/addresses/add' as any)}
          activeOpacity={0.8}
        >
          <Plus size={24} color={Colors.white} />
          <Text style={styles.addButtonText}>Agregar Dirección</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  addressCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  defaultBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  address: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  instructions: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic' as const,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  setDefaultButton: {
    marginTop: 12,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
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
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
