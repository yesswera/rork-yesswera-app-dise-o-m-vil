import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Edit2, Phone, Mail, FileText, Car, CreditCard, UserPlus, Award, CheckCircle, Clock, TrendingUp, Package, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

const MOCK_DRIVER_PROFILE = {
  name: 'Carlos Mendoza',
  email: 'carlos@email.com',
  phone: '33-1234-5678',
  curp: 'MERC901215HJCLRD09',
  rating: 4.8,
  totalRatings: 256,
  memberSince: 'Ene 2024',
  avatar: 'https://i.pravatar.cc/150?u=carlos',
  vehicle: {
    type: 'Moto',
    brand: 'Yamaha',
    model: 'FZ 150',
    year: 2022,
    color: 'Roja',
    licensePlate: 'ABC-123-D',
    photo: 'https://images.unsplash.com/photo-1558981852-426c6c22a060?w=400&h=300&fit=crop',
  },
  documents: {
    ine: { verified: true, status: 'Verificado' },
    license: { verified: true, status: 'Vigente', expiryDate: 'Dic 2026' },
    proofOfAddress: { verified: true, status: 'Verificado' },
  },
  bankAccount: {
    bank: 'BBVA',
    clabe: '****5678',
    accountHolder: 'Carlos Mendoza',
  },
  emergencyContact: {
    name: 'María García',
    relationship: 'Esposa',
    phone: '33-9876-5432',
  },
  stats: {
    totalDeliveries: 1245,
    acceptanceRate: 94,
    onTimeRate: 97,
    totalKm: 8450,
    activeHours: 487,
    completionRate: 98,
  },
  achievements: [
    { id: 1, icon: '🥇', name: '100 Entregas', unlocked: true },
    { id: 2, icon: '⭐', name: 'Top Repartidor', unlocked: true },
    { id: 3, icon: '🚀', name: 'Entrega Veloz', unlocked: true },
    { id: 4, icon: '💎', name: 'Cliente VIP', unlocked: false },
    { id: 5, icon: '🔥', name: 'Racha 30 Días', unlocked: true },
    { id: 6, icon: '🎯', name: '1000 Entregas', unlocked: true },
  ],
};

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile] = useState(MOCK_DRIVER_PROFILE);

  const handleEditPhoto = () => {
    Alert.alert('Cambiar Foto', '¿Qué deseas hacer?', [
      { text: 'Tomar Foto', onPress: () => Alert.alert('Cámara', 'Abrir cámara...') },
      { text: 'Elegir de Galería', onPress: () => Alert.alert('Galería', 'Abrir galería...') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleEditPersonalInfo = () => {
    Alert.alert('Editar Datos', 'Función disponible próximamente');
  };

  const handleEditVehicle = () => {
    Alert.alert('Editar Vehículo', 'Función disponible próximamente');
  };

  const handleUpdateDocuments = () => {
    Alert.alert('Actualizar Documentos', 'Función disponible próximamente');
  };

  const handleEditBankAccount = () => {
    Alert.alert('Editar Cuenta Bancaria', 'Función disponible próximamente');
  };

  const handleEditEmergencyContact = () => {
    Alert.alert('Cambiar Contacto', 'Función disponible próximamente');
  };

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
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} onPress={handleEditPhoto}>
              <Camera size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {profile.rating}</Text>
            <Text style={styles.ratingsCount}>({profile.totalRatings} calificaciones)</Text>
          </View>
          <Text style={styles.memberSince}>🟢 Activo desde {profile.memberSince}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Datos Personales</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CURP:</Text>
              <Text style={styles.infoValue}>{profile.curp}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Mi Vehículo</Text>
          </View>
          <View style={styles.vehicleCard}>
            {profile.vehicle.photo && (
              <Image source={{ uri: profile.vehicle.photo }} style={styles.vehiclePhoto} />
            )}
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {profile.vehicle.brand} {profile.vehicle.model} {profile.vehicle.year}
              </Text>
              <Text style={styles.vehicleDetails}>
                {profile.vehicle.type} - {profile.vehicle.color}
              </Text>
              <Text style={styles.vehiclePlate}>Placas: {profile.vehicle.licensePlate}</Text>
            </View>
            <TouchableOpacity style={styles.updateButton} onPress={handleEditVehicle}>
              <Text style={styles.updateButtonText}>Actualizar foto</Text>
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
                {profile.documents.ine.verified ? (
                  <CheckCircle size={16} color={Colors.success} />
                ) : (
                  <Clock size={16} color={Colors.warning} />
                )}
                <Text style={[styles.documentText, profile.documents.ine.verified && styles.documentVerified]}>
                  {profile.documents.ine.status}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.documentRow}>
              <Text style={styles.documentLabel}>Licencia:</Text>
              <View style={styles.documentStatus}>
                {profile.documents.license.verified ? (
                  <CheckCircle size={16} color={Colors.success} />
                ) : (
                  <Clock size={16} color={Colors.warning} />
                )}
                <Text style={[styles.documentText, profile.documents.license.verified && styles.documentVerified]}>
                  {profile.documents.license.status} ({profile.documents.license.expiryDate})
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.documentRow}>
              <Text style={styles.documentLabel}>Comprobante:</Text>
              <View style={styles.documentStatus}>
                {profile.documents.proofOfAddress.verified ? (
                  <CheckCircle size={16} color={Colors.success} />
                ) : (
                  <Clock size={16} color={Colors.warning} />
                )}
                <Text style={[styles.documentText, profile.documents.proofOfAddress.verified && styles.documentVerified]}>
                  {profile.documents.proofOfAddress.status}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={handleUpdateDocuments}>
              <Text style={styles.linkButtonText}>Actualizar documentos</Text>
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
              <Text style={styles.infoLabel}>Banco:</Text>
              <Text style={styles.infoValue}>{profile.bankAccount.bank}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CLABE:</Text>
              <Text style={styles.infoValue}>{profile.bankAccount.clabe}</Text>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={handleEditBankAccount}>
              <Text style={styles.linkButtonText}>Actualizar cuenta</Text>
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
              <Text style={styles.infoLabel}>{profile.emergencyContact.name}</Text>
              <Text style={styles.infoValue}>({profile.emergencyContact.relationship})</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tel:</Text>
              <Text style={styles.infoValue}>{profile.emergencyContact.phone}</Text>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={handleEditEmergencyContact}>
              <Text style={styles.linkButtonText}>Cambiar contacto</Text>
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
                <Text style={styles.statValue}>{profile.stats.totalDeliveries}</Text>
                <Text style={styles.statLabel}>Entregas totales</Text>
              </View>
              <View style={styles.statItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.statValue}>{profile.stats.acceptanceRate}%</Text>
                <Text style={styles.statLabel}>Aceptación</Text>
              </View>
              <View style={styles.statItem}>
                <Clock size={20} color={Colors.accent} />
                <Text style={styles.statValue}>{profile.stats.onTimeRate}%</Text>
                <Text style={styles.statLabel}>A tiempo</Text>
              </View>
              <View style={styles.statItem}>
                <MapPin size={20} color={Colors.warning} />
                <Text style={styles.statValue}>{profile.stats.totalKm}</Text>
                <Text style={styles.statLabel}>Km recorridos</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Mis Logros</Text>
          </View>
          <View style={styles.achievementsGrid}>
            {profile.achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementLocked,
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={[styles.achievementName, !achievement.unlocked && styles.achievementNameLocked]}>
                  {achievement.name}
                </Text>
              </View>
            ))}
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
