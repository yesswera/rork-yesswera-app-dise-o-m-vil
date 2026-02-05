import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Edit2, Phone, Mail, FileText, Car, CreditCard, UserPlus, Award, CheckCircle, Clock, TrendingUp, Package, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        .single();

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

  const handleEditPhoto = () => {
    Alert.alert('Cambiar Foto', '¿Qué deseas hacer?', [
      { text: 'Tomar Foto', onPress: () => Alert.alert('Cámara', 'Disponible próximamente') },
      { text: 'Elegir de Galería', onPress: () => Alert.alert('Galería', 'Disponible próximamente') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleEditPersonalInfo = () => {
    Alert.alert('Editar Datos', 'Disponible próximamente');
  };

  const handleEditVehicle = () => {
    Alert.alert('Editar Vehículo', 'Disponible próximamente');
  };

  const handleUpdateDocuments = () => {
    Alert.alert('Actualizar Documentos', 'Disponible próximamente');
  };

  const handleEditBankAccount = () => {
    Alert.alert('Editar Cuenta Bancaria', 'Disponible próximamente');
  };

  const handleEditEmergencyContact = () => {
    Alert.alert('Cambiar Contacto', 'Disponible próximamente');
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
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <View style={styles.editButton} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 12, color: Colors.text.secondary, fontSize: 14 }}>Cargando perfil...</Text>
        </View>
      </View>
    );
  }

  const displayName = user?.name || 'Repartidor';
  const displayEmail = user?.email || 'Sin email';
  const displayPhone = user?.phone || 'Sin teléfono';
  const displayAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00C896&color=fff&size=150`;
  const displayRating = driverData?.rating_average ?? 0;
  const displayRatingCount = driverData?.rating_count ?? 0;
  const displayMemberSince = formatMemberSince(driverData?.created_at);
  const displayVehicleType = formatVehicleType(driverData?.vehicle_type);
  const totalDeliveries = driverData?.totalDeliveries ?? 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={handleEditPersonalInfo} style={styles.editButton}>
            <Edit2 size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} onPress={handleEditPhoto}>
              <Camera size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {displayRating.toFixed(1)}</Text>
            <Text style={styles.ratingsCount}>({displayRatingCount} calificaciones)</Text>
          </View>
          <Text style={styles.memberSince}>🟢 Activo desde {displayMemberSince}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Datos Personales</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{displayPhone}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{displayEmail}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CURP:</Text>
              <Text style={styles.infoValue}>No registrado</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Mi Vehículo</Text>
          </View>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {displayVehicleType}
              </Text>
              <Text style={styles.vehicleDetails}>
                Marca y modelo: No registrado
              </Text>
              <Text style={styles.vehiclePlate}>Placas: No registrado</Text>
            </View>
            <TouchableOpacity style={styles.updateButton} onPress={handleEditVehicle}>
              <Text style={styles.updateButtonText}>Registrar vehículo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Mis Documentos</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.documentRow}>
              <Text style={styles.documentLabel}>INE:</Text>
              <View style={styles.documentStatus}>
                <Clock size={16} color={Colors.warning} />
                <Text style={styles.documentText}>
                  Pendiente
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.documentRow}>
              <Text style={styles.documentLabel}>Licencia:</Text>
              <View style={styles.documentStatus}>
                <Clock size={16} color={Colors.warning} />
                <Text style={styles.documentText}>
                  Pendiente
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.documentRow}>
              <Text style={styles.documentLabel}>Comprobante:</Text>
              <View style={styles.documentStatus}>
                <Clock size={16} color={Colors.warning} />
                <Text style={styles.documentText}>
                  Pendiente
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={handleUpdateDocuments}>
              <Text style={styles.linkButtonText}>Subir documentos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Datos Bancarios</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={styles.infoValue}>No configurada</Text>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={handleEditBankAccount}>
              <Text style={styles.linkButtonText}>Configurar cuenta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserPlus size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={styles.infoValue}>No configurado</Text>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={handleEditEmergencyContact}>
              <Text style={styles.linkButtonText}>Agregar contacto</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Mis Estadísticas</Text>
          </View>
          <View style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Package size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{totalDeliveries}</Text>
                <Text style={styles.statLabel}>Entregas totales</Text>
              </View>
              <View style={styles.statItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>Aceptación</Text>
              </View>
              <View style={styles.statItem}>
                <Clock size={20} color={Colors.accent} />
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>A tiempo</Text>
              </View>
              <View style={styles.statItem}>
                <MapPin size={20} color={Colors.warning} />
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>Km recorridos</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    flex: 1,
    textAlign: 'center' as const,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: Colors.white,
    alignItems: 'center' as const,
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  cameraButton: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  ratingsCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  memberSince: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  infoCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 4,
  },
  vehicleCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  vehiclePhoto: {
    width: '100%' as const,
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  vehicleInfo: {
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  updateButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  documentRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  documentStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  documentText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  documentVerified: {
    color: Colors.success,
    fontWeight: '600' as const,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  statsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 20,
  },
  statItem: {
    flex: 1,
    minWidth: '42%' as const,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  achievementsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    paddingHorizontal: 16,
  },
  achievementCard: {
    width: '30%' as const,
    aspectRatio: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementLocked: {
    opacity: 0.4,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
  },
  achievementNameLocked: {
    color: Colors.text.light,
  },
  bottomPadding: {
    height: 32,
  },
});
