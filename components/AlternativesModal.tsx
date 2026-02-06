/**
 * Modal de Alternativas - Yesswera
 * Muestra negocios alternativos cuando el original no responde o cancela
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Star, MapPin, ArrowRight, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { buscarAlternativas, getMensajeAlternativas } from '@/services/alternatives';

interface Business {
  id: string;
  business_name: string;
  type: string;
  rating_average: number;
  logo_url?: string;
  address: string;
  distance_km?: number;
}

interface AlternativesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBusiness: (businessId: string) => void;
  tipoNegocio: string;
  ubicacionCliente: {
    latitude: number;
    longitude: number;
  };
  excluirNegocioId?: string;
  razon: 'timeout' | 'rejected' | 'cancelled';
}

export default function AlternativesModal({
  visible,
  onClose,
  onSelectBusiness,
  tipoNegocio,
  ubicacionCliente,
  excluirNegocioId,
  razon,
}: AlternativesModalProps) {
  const [loading, setLoading] = useState(true);
  const [alternativas, setAlternativas] = useState<Business[]>([]);
  const mensaje = getMensajeAlternativas(razon);

  useEffect(() => {
    if (visible) {
      cargarAlternativas();
    }
  }, [visible]);

  const cargarAlternativas = async () => {
    setLoading(true);
    try {
      const resultado = await buscarAlternativas({
        tipoNegocio,
        ubicacionCliente,
        excluirNegocioId,
        ratingMinimo: 3.5,
        distanciaMaximaKm: 8,
        limite: 6,
      });
      setAlternativas(resultado);
    } catch (error) {
      console.error('Error cargando alternativas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = (businessId: string) => {
    onSelectBusiness(businessId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{mensaje.titulo}</Text>
              <Text style={styles.subtitle}>{mensaje.mensaje}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Buscando alternativas...</Text>
            </View>
          ) : alternativas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No encontramos alternativas disponibles en este momento.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={cargarAlternativas}>
                <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {alternativas.map((negocio) => (
                <TouchableOpacity
                  key={negocio.id}
                  style={styles.businessCard}
                  onPress={() => handleSelectBusiness(negocio.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.businessInfo}>
                    {negocio.logo_url ? (
                      <Image
                        source={{ uri: negocio.logo_url }}
                        style={styles.businessLogo}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.businessLogoPlaceholder}>
                        <Text style={styles.logoPlaceholderText}>
                          {negocio.business_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.businessDetails}>
                      <Text style={styles.businessName} numberOfLines={1}>
                        {negocio.business_name}
                      </Text>
                      <View style={styles.businessMeta}>
                        <View style={styles.ratingContainer}>
                          <Star size={14} color={Colors.warning} fill={Colors.warning} />
                          <Text style={styles.ratingText}>
                            {negocio.rating_average?.toFixed(1) || 'Nuevo'}
                          </Text>
                        </View>
                        {negocio.distance_km && (
                          <View style={styles.distanceContainer}>
                            <MapPin size={14} color={Colors.text.light} />
                            <Text style={styles.distanceText}>
                              {negocio.distance_km} km
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.businessAddress} numberOfLines={1}>
                        {negocio.address}
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={20} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar pedido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  businessInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.background.tertiary,
  },
  businessLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  businessDetails: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 4,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: Colors.text.light,
    marginLeft: 4,
  },
  businessAddress: {
    fontSize: 12,
    color: Colors.text.light,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
});
