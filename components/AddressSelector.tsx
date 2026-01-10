import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MapPin, Plus, X, Home, Briefcase, MapPinned, Star } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { SavedAddress } from '@/constants/types';
import { getUserAddresses, setDefaultAddress } from '@/services/addresses';
import { useAuth } from '@/contexts/auth';
import { useRouter } from 'expo-router';

interface AddressSelectorProps {
  selectedAddress: SavedAddress | null;
  onAddressSelect: (address: SavedAddress) => void;
  onAddNewAddress?: () => void;
}

export default function AddressSelector({ selectedAddress, onAddressSelect, onAddNewAddress }: AddressSelectorProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadAddresses = useCallback(async () => {
    if (!user || !token) return;

    setIsLoading(true);
    try {
      const userAddresses = await getUserAddresses(user.id, token);
      // Ensure we always have an array
      const addressArray = Array.isArray(userAddresses) ? userAddresses : [];
      setAddresses(addressArray);

      if (!selectedAddress && addressArray.length > 0) {
        const defaultAddr = addressArray.find(a => a.isDefault) || addressArray[0];
        onAddressSelect(defaultAddr);
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      setAddresses([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [user, token, selectedAddress, onAddressSelect]);

  useEffect(() => {
    if (modalVisible) {
      loadAddresses();
    }
  }, [modalVisible, loadAddresses]);

  const handleSelectAddress = async (address: SavedAddress) => {
    onAddressSelect(address);
    setModalVisible(false);
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

  const handleAddNewAddress = () => {
    setModalVisible(false);
    if (onAddNewAddress) {
      onAddNewAddress();
    } else {
      router.push('/addresses/add' as any);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dirección de Entrega</Text>
      
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <MapPin size={20} color={Colors.primary} />
        <View style={styles.addressInfo}>
          {selectedAddress ? (
            <>
              <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress.address}
              </Text>
            </>
          ) : (
            <Text style={styles.placeholderText}>Seleccionar dirección de entrega</Text>
          )}
        </View>
        <Text style={styles.changeText}>Cambiar</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mis Direcciones</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.addressesList} showsVerticalScrollIndicator={false}>
                {addresses && addresses.length > 0 ? addresses.map((address) => {
                  const Icon = getIconForLabel(address.label);
                  const isSelected = selectedAddress?.id === address.id;

                  return (
                    <TouchableOpacity
                      key={address.id}
                      style={[
                        styles.addressCard,
                        isSelected && styles.addressCardSelected,
                      ]}
                      onPress={() => handleSelectAddress(address)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addressCardHeader}>
                        <View style={styles.addressIconContainer}>
                          <Icon size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.addressCardInfo}>
                          <View style={styles.labelRow}>
                            <Text style={styles.addressCardLabel}>{address.label}</Text>
                            {address.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Star size={12} color={Colors.gold} fill={Colors.gold} />
                                <Text style={styles.defaultText}>Predeterminada</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressCardText} numberOfLines={2}>
                            {address.address}
                          </Text>
                          {address.instructions && (
                            <Text style={styles.instructionsText} numberOfLines={1}>
                              {address.instructions}
                            </Text>
                          )}
                        </View>
                      </View>

                      {!address.isDefault && (
                        <TouchableOpacity
                          style={styles.setDefaultButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSetDefault(address.id);
                          }}
                        >
                          <Text style={styles.setDefaultText}>Predeterminada</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                }) : (
                  <View style={styles.emptyContainer}>
                    <MapPin size={48} color={Colors.text.disabled} />
                    <Text style={styles.emptyText}>No tienes direcciones guardadas</Text>
                    <Text style={styles.emptySubtext}>Agrega tu primera dirección para comenzar</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addNewButton}
                  onPress={handleAddNewAddress}
                  activeOpacity={0.7}
                >
                  <Plus size={24} color={Colors.primary} />
                  <Text style={styles.addNewText}>Agregar Nueva Dirección</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  selectorButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.text.disabled,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  addressesList: {
    marginBottom: 20,
  },
  addressCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  addressCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  addressCardInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  addressCardLabel: {
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
  addressCardText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic' as const,
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
  addNewButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed' as const,
    marginBottom: 20,
  },
  addNewText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
