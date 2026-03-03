import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: PERFIL DEL REPARTIDOR
// Usa ScreenContainer para diseño unificado con soporte de tema
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Edit2, Phone, Mail, FileText, Car, CreditCard, UserPlus, CheckCircle, Clock, TrendingUp, Package, MapPin, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';

// Theme colors via useTheme() — no local COLORS needed

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors, radius, space } = useTheme();

  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDriverProfile();
  }, [user]);

  async function loadDriverProfile() {
    try {
      // Get driver record
      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Get delivery stats
      const { count: totalDeliveries } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driver?.id)
        .eq('status', 'delivered');

      setDriverData({
        ...driver,
        totalDeliveries: totalDeliveries || 0,
      });
    } catch (error) {
      console.error('Error loading driver profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDriverProfile();
    setRefreshing(false);
  };

  const handleEditPhoto = () => {
    Alert.alert('Cambiar Foto', 'Que deseas hacer?', [
      { text: 'Tomar Foto', onPress: () => Alert.alert('Camara', 'Disponible proximamente') },
      { text: 'Elegir de Galeria', onPress: () => Alert.alert('Galeria', 'Disponible proximamente') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleEditPersonalInfo = () => {
    Alert.alert('Editar Datos', 'Disponible proximamente');
  };

  const handleEditVehicle = () => {
    Alert.alert('Editar Vehiculo', 'Disponible proximamente');
  };

  const handleUpdateDocuments = () => {
    Alert.alert('Actualizar Documentos', 'Disponible proximamente');
  };

  const handleEditBankAccount = () => {
    Alert.alert('Editar Cuenta Bancaria', 'Disponible proximamente');
  };

  const handleEditEmergencyContact = () => {
    Alert.alert('Cambiar Contacto', 'Disponible proximamente');
  };

  // Format date to readable string
  const formatMemberSince = (dateStr?: string): string => {
    if (!dateStr) return 'Nuevo';
    try {
      const date = new Date(dateStr);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return 'Nuevo';
    }
  };

  // Capitalize vehicle type for display
  const formatVehicleType = (type?: string): string => {
    if (!type) return 'No registrado';
    const map: Record<string, string> = {
      moto: 'Moto',
      bicicleta: 'Bicicleta',
      auto: 'Auto',
      pie: 'A pie',
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <ScreenContainer
        headerGradient="primary"
        headerIcon={User}
        headerTitle="Mi Perfil"
        headerSubtitle="Cargando..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" style={[styles.loadingText, { color: colors.text.secondary }]}>
            Cargando perfil...
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  const displayName = user?.name || 'Repartidor';
  const displayEmail = user?.email || 'Sin email';
  const displayPhone = user?.phone || 'Sin telefono';
  const displayAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00C896&color=fff&size=150`;
  const displayRating = driverData?.rating_average ?? 0;
  const displayRatingCount = driverData?.rating_count ?? 0;
  const displayMemberSince = formatMemberSince(driverData?.created_at);
  const displayVehicleType = formatVehicleType(driverData?.vehicle_type);
  const totalDeliveries = driverData?.totalDeliveries ?? 0;

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={User}
      headerTitle="Mi Perfil"
      headerSubtitle="Gestiona tu informacion"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.background.card }]}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: displayAvatar }} style={[styles.avatar, { borderColor: colors.primary }]} />
          <TouchableSound style={[styles.cameraButton, { backgroundColor: colors.primary }]} onPress={handleEditPhoto}>
            <Camera size={18} color="#FFFFFF" />
          </TouchableSound>
        </View>
        <ThemedText variant="h2" style={{ color: colors.text.primary }}>{displayName}</ThemedText>
        <View style={styles.ratingContainer}>
          <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>{displayRating.toFixed(1)}</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.secondary }}> ({displayRatingCount} calificaciones)</ThemedText>
        </View>
        <ThemedText variant="body" style={{ color: colors.text.secondary }}>Activo desde {displayMemberSince}</ThemedText>
        <TouchableSound onPress={handleEditPersonalInfo} style={[styles.editProfileButton, { backgroundColor: colors.background.secondary }]}>
          <Edit2 size={16} color={colors.primary} />
          <ThemedText variant="label" style={{ color: colors.primary }}>Editar Perfil</ThemedText>
        </TouchableSound>
      </View>

      {/* Personal Info */}
      <View style={styles.sectionHeader}>
        <Phone size={20} color={colors.primary} />
        <ThemedText variant="h3" style={{ color: colors.text.primary }}>Datos Personales</ThemedText>
      </View>
      <ScreenCard>
        <View style={styles.infoRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>Telefono:</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.primary }}>{displayPhone}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
        <View style={styles.infoRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>Email:</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.primary }}>{displayEmail}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
        <View style={styles.infoRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>CURP:</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.primary }}>No registrado</ThemedText>
        </View>
      </ScreenCard>

      {/* Vehicle */}
      <View style={styles.sectionHeader}>
        <Car size={20} color={colors.primary} />
        <ThemedText variant="h3" style={{ color: colors.text.primary }}>Mi Vehiculo</ThemedText>
      </View>
      <ScreenCard>
        <View style={styles.vehicleInfo}>
          <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>{displayVehicleType}</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.secondary }}>Marca y modelo: No registrado</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.secondary }}>Placas: No registrado</ThemedText>
        </View>
        <TouchableSound style={[styles.updateButton, { backgroundColor: colors.background.secondary }]} onPress={handleEditVehicle}>
          <ThemedText variant="label" style={{ color: colors.primary }}>Registrar vehiculo</ThemedText>
        </TouchableSound>
      </ScreenCard>

      {/* Documents */}
      <View style={styles.sectionHeader}>
        <FileText size={20} color={colors.primary} />
        <ThemedText variant="h3" style={{ color: colors.text.primary }}>Mis Documentos</ThemedText>
      </View>
      <ScreenCard>
        <View style={styles.documentRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>INE:</ThemedText>
          <View style={styles.documentStatus}>
            <Clock size={16} color={colors.warning} />
            <ThemedText variant="body" style={{ color: colors.text.secondary }}>Pendiente</ThemedText>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
        <View style={styles.documentRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>Licencia:</ThemedText>
          <View style={styles.documentStatus}>
            <Clock size={16} color={colors.warning} />
            <ThemedText variant="body" style={{ color: colors.text.secondary }}>Pendiente</ThemedText>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
        <View style={styles.documentRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>Comprobante:</ThemedText>
          <View style={styles.documentStatus}>
            <Clock size={16} color={colors.warning} />
            <ThemedText variant="body" style={{ color: colors.text.secondary }}>Pendiente</ThemedText>
          </View>
        </View>
        <TouchableSound style={styles.linkButton} onPress={handleUpdateDocuments}>
          <ThemedText variant="label" style={{ color: colors.primary }}>Subir documentos</ThemedText>
        </TouchableSound>
      </ScreenCard>

      {/* Bank Account */}
      <View style={styles.sectionHeader}>
        <CreditCard size={20} color={colors.primary} />
        <ThemedText variant="h3" style={{ color: colors.text.primary }}>Datos Bancarios</ThemedText>
      </View>
      <ScreenCard>
        <View style={styles.infoRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>Estado:</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.primary }}>No configurada</ThemedText>
        </View>
        <TouchableSound style={styles.linkButton} onPress={handleEditBankAccount}>
          <ThemedText variant="label" style={{ color: colors.primary }}>Configurar cuenta</ThemedText>
        </TouchableSound>
      </ScreenCard>

      {/* Emergency Contact */}
      <View style={styles.sectionHeader}>
        <UserPlus size={20} color={colors.primary} />
        <ThemedText variant="h3" style={{ color: colors.text.primary }}>Contacto de Emergencia</ThemedText>
      </View>
      <ScreenCard>
        <View style={styles.infoRow}>
          <ThemedText variant="label" style={{ color: colors.text.secondary }}>Estado:</ThemedText>
          <ThemedText variant="body" style={{ color: colors.text.primary }}>No configurado</ThemedText>
        </View>
        <TouchableSound style={styles.linkButton} onPress={handleEditEmergencyContact}>
          <ThemedText variant="label" style={{ color: colors.primary }}>Agregar contacto</ThemedText>
        </TouchableSound>
      </ScreenCard>

      {/* Statistics */}
      <View style={styles.sectionHeader}>
        <TrendingUp size={20} color={colors.primary} />
        <ThemedText variant="h3" style={{ color: colors.text.primary }}>Mis Estadisticas</ThemedText>
      </View>
      <ScreenCard>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Package size={20} color={colors.primary} />
            <ThemedText variant="h2" style={{ color: colors.text.primary }}>{totalDeliveries}</ThemedText>
            <ThemedText variant="caption" style={{ color: colors.text.secondary }}>Entregas totales</ThemedText>
          </View>
          <View style={styles.statItem}>
            <CheckCircle size={20} color={colors.success} />
            <ThemedText variant="h2" style={{ color: colors.text.primary }}>--</ThemedText>
            <ThemedText variant="caption" style={{ color: colors.text.secondary }}>Aceptacion</ThemedText>
          </View>
          <View style={styles.statItem}>
            <Clock size={20} color={colors.accent} />
            <ThemedText variant="h2" style={{ color: colors.text.primary }}>--</ThemedText>
            <ThemedText variant="caption" style={{ color: colors.text.secondary }}>A tiempo</ThemedText>
          </View>
          <View style={styles.statItem}>
            <MapPin size={20} color={colors.warning} />
            <ThemedText variant="h2" style={{ color: colors.text.primary }}>--</ThemedText>
            <ThemedText variant="caption" style={{ color: colors.text.secondary }}>Km recorridos</ThemedText>
          </View>
        </View>
      </ScreenCard>

      <View style={styles.bottomPadding} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
    borderRadius: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  vehicleInfo: {
    marginBottom: 12,
  },
  updateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  statItem: {
    flex: 1,
    minWidth: '42%',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 32,
  },
});
