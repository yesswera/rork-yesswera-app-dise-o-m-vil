import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ADMIN USERS
// Gestion de usuarios para administradores - Actualizado con ScreenContainer
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Users,
  UserCheck,
  Store,
  Truck,
  Shield,
  Edit3,
  Trash2,
  X,
  Save,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Power,
  PowerOff,
  Calendar,
  Star,
  ShoppingBag,
  Key,
  Info,
  CheckCircle,
  XCircle,
  Copy,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { UserType } from '@/constants/types';
import {
  getAllUsers,
  getAdminStats,
  AdminUser,
  AdminStats,
  getUserAddresses,
  updateUser,
  deleteUser,
  resetUserPassword,
  activateUser,
  updateUserType,
  hardDeleteUser,
  AdminAddress,
} from '@/services/admin';

// ============================================================================
// COLORES EXPLICITOS (modo oscuro)
// ============================================================================

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

const FIXED_COLORS = {
  primary: '#22C55E',
  accent: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | UserType>('all');

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userAddresses, setUserAddresses] = useState<AdminAddress[]>([]);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
    userType: 'client' as UserType,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        getAllUsers(selectedFilter === 'all' ? undefined : selectedFilter, searchQuery || undefined),
        getAdminStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterChange = (filter: 'all' | UserType) => {
    setSelectedFilter(filter);
  };

  const handleEditUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      newPassword: '',
      userType: user.userType,
    });

    const addresses = await getUserAddresses(user.id);
    setUserAddresses(addresses);
    setEditModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await updateUser(selectedUser.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
      });

      if (editForm.userType !== selectedUser.userType) {
        await updateUserType(selectedUser.id, editForm.userType);
      }

      if (editForm.newPassword.trim()) {
        if (editForm.newPassword.length < 6) {
          Alert.alert('Error', 'La contrasena debe tener al menos 6 caracteres');
          setSaving(false);
          return;
        }
        await resetUserPassword(selectedUser.id, editForm.newPassword);
      }

      Alert.alert('Exito', 'Usuario actualizado correctamente');
      setEditModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'No se pudo actualizar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: AdminUser) => {
    if (user.userType === 'admin') {
      Alert.alert('Accion no permitida', 'No se puede modificar una cuenta de administrador.');
      return;
    }
    const action = user.isActive ? 'pausar' : 'reactivar';
    const actionPast = user.isActive ? 'pausado' : 'reactivado';

    Alert.alert(
      `${user.isActive ? 'Pausar' : 'Reactivar'} Usuario`,
      `¿Estas seguro de que deseas ${action} a ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: user.isActive ? 'Pausar' : 'Reactivar',
          style: user.isActive ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(user.id);
            try {
              if (user.isActive) {
                await deleteUser(user.id);
              } else {
                await activateUser(user.id);
              }
              Alert.alert('Exito', `Usuario ${actionPast}`);
              loadData();
            } catch (error) {
              console.error('Error toggling user status:', error);
              Alert.alert('Error', `No se pudo ${action} el usuario`);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleHardDeleteUser = (user: AdminUser) => {
    if (user.userType === 'admin') {
      Alert.alert('Accion no permitida', 'No se puede eliminar una cuenta de administrador. Es una cuenta maestra protegida.');
      return;
    }
    Alert.alert(
      'ELIMINAR PERMANENTEMENTE',
      `ATENCION: Esta accion NO se puede deshacer.\n\n¿Estas seguro de que deseas ELIMINAR PERMANENTEMENTE a ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'ELIMINAR',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(user.id);
            try {
              await hardDeleteUser(user.id);
              Alert.alert('Exito', 'Usuario eliminado permanentemente');
              loadData();
            } catch (error) {
              console.error('Error hard deleting user:', error);
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text: string) => {
    Alert.alert('ID de Usuario', text, [{ text: 'OK' }]);
  };

  const getUserIcon = (tipo: UserType) => {
    switch (tipo) {
      case 'client': return <Users size={20} color={FIXED_COLORS.primary} />;
      case 'driver': return <Truck size={20} color={FIXED_COLORS.accent} />;
      case 'business': return <Store size={20} color={FIXED_COLORS.success} />;
      case 'admin': return <Shield size={20} color={FIXED_COLORS.error} />;
    }
  };

  const getUserTypeLabel = (tipo: UserType) => {
    switch (tipo) {
      case 'client': return 'Cliente';
      case 'driver': return 'Repartidor';
      case 'business': return 'Negocio';
      case 'admin': return 'Admin';
    }
  };

  const getUserTypeColor = (tipo: UserType) => {
    switch (tipo) {
      case 'client': return FIXED_COLORS.primary;
      case 'driver': return FIXED_COLORS.accent;
      case 'business': return FIXED_COLORS.success;
      case 'admin': return FIXED_COLORS.error;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredUsers = users.filter((user) => {
    // Ocultar cuentas admin de la lista - son cuentas maestras protegidas
    if (user.userType === 'admin') return false;

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone.includes(searchQuery);
      if (!matchesSearch) return false;
    }
    return true;
  });

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color={FIXED_COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={Users}
      headerTitle="Usuarios"
      headerSubtitle="Gestion de cuentas"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Users size={24} color={FIXED_COLORS.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalClients || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Clientes</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Truck size={24} color={FIXED_COLORS.accent} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalDrivers || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Repartidores</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Store size={24} color={FIXED_COLORS.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalBusinesses || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Negocios</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <UserCheck size={24} color={FIXED_COLORS.warning} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats?.newUsersToday || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Nuevos Hoy</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Search size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar por nombre, email o telefono..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableSound onPress={() => setSearchQuery('')}>
            <X size={18} color={theme.textSecondary} />
          </TouchableSound>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableSound
          style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterText, { color: theme.textSecondary }, selectedFilter === 'all' && styles.filterTextActive]}>
            Todos ({stats?.totalUsers || 0})
          </Text>
        </TouchableSound>

        <TouchableSound
          style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }, selectedFilter === 'client' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('client')}
        >
          <Text style={[styles.filterText, { color: theme.textSecondary }, selectedFilter === 'client' && styles.filterTextActive]}>
            Clientes
          </Text>
        </TouchableSound>

        <TouchableSound
          style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }, selectedFilter === 'driver' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('driver')}
        >
          <Text style={[styles.filterText, { color: theme.textSecondary }, selectedFilter === 'driver' && styles.filterTextActive]}>
            Repartidores
          </Text>
        </TouchableSound>

        <TouchableSound
          style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.border }, selectedFilter === 'business' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('business')}
        >
          <Text style={[styles.filterText, { color: theme.textSecondary }, selectedFilter === 'business' && styles.filterTextActive]}>
            Negocios
          </Text>
        </TouchableSound>

{/* Admin filter oculto - cuenta maestra protegida */}
      </ScrollView>

      {/* Users List */}
      <View style={styles.usersList}>
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No se encontraron usuarios</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Intenta con otro filtro o busqueda</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} style={[styles.userCard, { backgroundColor: theme.card }, !user.isActive && styles.userCardInactive]}>
              <View style={styles.userMain}>
                <View style={[styles.userIcon, { backgroundColor: getUserTypeColor(user.userType) + '20' }]}>
                  {getUserIcon(user.userType)}
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
                    {user.isActive ? (
                      <View style={[styles.activeBadge, { backgroundColor: FIXED_COLORS.success + '20' }]}>
                        <CheckCircle size={10} color={FIXED_COLORS.success} />
                        <Text style={[styles.activeBadgeText, { color: FIXED_COLORS.success }]}>Activo</Text>
                      </View>
                    ) : (
                      <View style={[styles.inactiveBadge, { backgroundColor: FIXED_COLORS.error + '20' }]}>
                        <XCircle size={10} color={FIXED_COLORS.error} />
                        <Text style={[styles.inactiveBadgeText, { color: FIXED_COLORS.error }]}>Pausado</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: getUserTypeColor(user.userType) + '20' }]}>
                    <Text style={[styles.typeText, { color: getUserTypeColor(user.userType) }]}>
                      {getUserTypeLabel(user.userType)}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Mail size={12} color={theme.textSecondary} />
                      <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Phone size={12} color={theme.textSecondary} />
                      <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>{user.phone || 'Sin telefono'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Star size={12} color={FIXED_COLORS.warning} />
                      <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>Rating: {user.rating?.toFixed(1) || '0.0'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Calendar size={12} color={theme.textSecondary} />
                      <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>Registrado: {formatDate(user.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={[styles.userActions, { borderTopColor: theme.border }]}>
                <TouchableSound
                  style={[styles.actionButtonWide, user.isActive ? styles.pauseButton : styles.activateButton]}
                  onPress={() => handleToggleUserStatus(user)}
                  disabled={actionLoading === user.id}
                >
                  {user.isActive ? (
                    <>
                      <PowerOff size={16} color={FIXED_COLORS.white} />
                      <Text style={styles.actionButtonText}>Pausar</Text>
                    </>
                  ) : (
                    <>
                      <Power size={16} color={FIXED_COLORS.white} />
                      <Text style={styles.actionButtonText}>Activar</Text>
                    </>
                  )}
                </TouchableSound>

                <TouchableSound
                  style={[styles.actionButtonWide, styles.editButton]}
                  onPress={() => handleEditUser(user)}
                >
                  <Edit3 size={16} color={FIXED_COLORS.white} />
                  <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableSound>

                <TouchableSound
                  style={[styles.actionButtonSmall, { backgroundColor: FIXED_COLORS.error + '15' }]}
                  onPress={() => handleHardDeleteUser(user)}
                >
                  <Trash2 size={16} color={FIXED_COLORS.error} />
                </TouchableSound>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Edit User Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? COLORS.dark.cardAlt : '#F5F5F4' }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableSound onPress={() => setEditModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableSound>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Usuario</Text>
            <TouchableSound onPress={handleSaveUser} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={FIXED_COLORS.primary} />
              ) : (
                <Save size={24} color={FIXED_COLORS.primary} />
              )}
            </TouchableSound>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedUser && (
              <>
                {/* Status Banner */}
                <View style={[styles.statusBanner, selectedUser.isActive ? { backgroundColor: FIXED_COLORS.success + '15' } : { backgroundColor: FIXED_COLORS.error + '15' }]}>
                  {selectedUser.isActive ? (
                    <>
                      <CheckCircle size={20} color={FIXED_COLORS.success} />
                      <Text style={[styles.statusBannerText, { color: theme.text }]}>Usuario Activo</Text>
                    </>
                  ) : (
                    <>
                      <XCircle size={20} color={FIXED_COLORS.error} />
                      <Text style={[styles.statusBannerText, { color: theme.text }]}>Usuario Pausado</Text>
                    </>
                  )}
                </View>

                {/* User Type Selector */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Tipo de Usuario</Text>
                  <View style={styles.userTypeSelector}>
                    {(['client', 'driver', 'business', 'admin'] as UserType[]).map((type) => (
                      <TouchableSound
                        key={type}
                        style={[
                          styles.userTypeOption,
                          { borderColor: theme.border, backgroundColor: theme.card },
                          editForm.userType === type && { borderColor: getUserTypeColor(type), backgroundColor: theme.cardAlt },
                        ]}
                        onPress={() => setEditForm({ ...editForm, userType: type })}
                      >
                        <View style={[styles.userTypeOptionIcon, { backgroundColor: getUserTypeColor(type) + '20' }]}>
                          {type === 'client' && <Users size={16} color={getUserTypeColor(type)} />}
                          {type === 'driver' && <Truck size={16} color={getUserTypeColor(type)} />}
                          {type === 'business' && <Store size={16} color={getUserTypeColor(type)} />}
                          {type === 'admin' && <Shield size={16} color={getUserTypeColor(type)} />}
                        </View>
                        <Text style={[
                          styles.userTypeOptionText,
                          { color: theme.textSecondary },
                          editForm.userType === type && { color: getUserTypeColor(type), fontWeight: '700' },
                        ]}>
                          {getUserTypeLabel(type)}
                        </Text>
                      </TouchableSound>
                    ))}
                  </View>
                  {editForm.userType !== selectedUser.userType && (
                    <View style={[styles.warningBox, { backgroundColor: FIXED_COLORS.warning + '15' }]}>
                      <AlertCircle size={16} color={FIXED_COLORS.warning} />
                      <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                        Cambiar el tipo de usuario de "{getUserTypeLabel(selectedUser.userType)}" a "{getUserTypeLabel(editForm.userType)}"
                      </Text>
                    </View>
                  )}
                </View>

                {/* Basic Info */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Informacion Basica</Text>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nombre</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                      value={editForm.name}
                      onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                      placeholder="Nombre completo"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                      value={editForm.email}
                      onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Telefono</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                      value={editForm.phone}
                      onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                      placeholder="33-1234-5678"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Password Reset Section */}
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Key size={18} color={FIXED_COLORS.primary} />
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Cambiar Contrasena</Text>
                  </View>

                  <View style={[styles.infoBox, { backgroundColor: FIXED_COLORS.primary + '10' }]}>
                    <Info size={16} color={FIXED_COLORS.primary} />
                    <Text style={[styles.infoBoxText, { color: FIXED_COLORS.primary }]}>
                      Por seguridad, las contrasenas estan encriptadas y NO se pueden ver.
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nueva Contrasena (minimo 6 caracteres)</Text>
                    <View style={[styles.passwordContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Lock size={18} color={theme.textSecondary} />
                      <TextInput
                        style={[styles.passwordInput, { color: theme.text }]}
                        value={editForm.newPassword}
                        onChangeText={(text) => setEditForm({ ...editForm, newPassword: text })}
                        placeholder="Dejar vacio para no cambiar"
                        placeholderTextColor={theme.textMuted}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableSound onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff size={18} color={theme.textSecondary} />
                        ) : (
                          <Eye size={18} color={theme.textSecondary} />
                        )}
                      </TouchableSound>
                    </View>
                  </View>
                  {editForm.newPassword.length > 0 && editForm.newPassword.length < 6 && (
                    <View style={[styles.errorBox, { backgroundColor: FIXED_COLORS.error + '15' }]}>
                      <AlertCircle size={16} color={FIXED_COLORS.error} />
                      <Text style={[styles.errorBoxText, { color: FIXED_COLORS.error }]}>
                        La contrasena debe tener al menos 6 caracteres
                      </Text>
                    </View>
                  )}
                  {editForm.newPassword.length >= 6 && (
                    <View style={[styles.successBox, { backgroundColor: FIXED_COLORS.success + '15' }]}>
                      <CheckCircle size={16} color={FIXED_COLORS.success} />
                      <Text style={[styles.successBoxText, { color: FIXED_COLORS.success }]}>
                        Se cambiara la contrasena al guardar
                      </Text>
                    </View>
                  )}
                </View>

                {/* Stats */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Estadisticas</Text>
                  <View style={styles.statsRow}>
                    <View style={[styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Star size={20} color={FIXED_COLORS.warning} />
                      <Text style={[styles.statItemValue, { color: theme.text }]}>{selectedUser.rating?.toFixed(1) || '0.0'}</Text>
                      <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Rating</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ShoppingBag size={20} color={FIXED_COLORS.primary} />
                      <Text style={[styles.statItemValue, { color: theme.text }]}>{selectedUser.totalOrders || 0}</Text>
                      <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Ordenes</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Calendar size={20} color={FIXED_COLORS.accent} />
                      <Text style={[styles.statItemValue, { color: theme.text }]}>{formatDate(selectedUser.createdAt)}</Text>
                      <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Registro</Text>
                    </View>
                  </View>
                </View>

                {/* Addresses */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Direcciones ({userAddresses.length})</Text>
                  {userAddresses.length === 0 ? (
                    <Text style={[styles.noAddresses, { color: theme.textMuted }]}>Sin direcciones guardadas</Text>
                  ) : (
                    userAddresses.map((address) => (
                      <View key={address.id} style={[styles.addressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <MapPin size={16} color={FIXED_COLORS.accent} />
                        <View style={styles.addressInfo}>
                          <Text style={[styles.addressLabel, { color: theme.text }]}>{address.label}</Text>
                          <Text style={[styles.addressText, { color: theme.textSecondary }]}>{address.address}</Text>
                          {address.latitude && address.longitude && (
                            <Text style={[styles.addressCoords, { color: theme.textMuted }]}>
                              GPS: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                            </Text>
                          )}
                          {address.isDefault && (
                            <View style={[styles.defaultBadge, { backgroundColor: FIXED_COLORS.success + '20' }]}>
                              <Text style={[styles.defaultBadgeText, { color: FIXED_COLORS.success }]}>Principal</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* User ID */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ID de Usuario (UUID)</Text>
                  <TouchableSound
                    style={[styles.userIdContainer, { backgroundColor: theme.cardAlt }]}
                    onPress={() => copyToClipboard(selectedUser.id)}
                  >
                    <Text style={[styles.userId, { color: theme.textMuted }]}>{selectedUser.id}</Text>
                    <Copy size={16} color={theme.textSecondary} />
                  </TouchableSound>
                </View>

                {/* Save Button */}
                <TouchableSound
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveUser}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={FIXED_COLORS.white} />
                  ) : (
                    <>
                      <Save size={20} color={FIXED_COLORS.white} />
                      <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                    </>
                  )}
                </TouchableSound>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  userCardInactive: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  userMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userDetails: {
    gap: 4,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userDetailText: {
    fontSize: 13,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButtonWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  activateButton: {
    backgroundColor: '#22C55E',
  },
  editButton: {
    backgroundColor: '#22C55E',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  userTypeOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  userTypeOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTypeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  successBoxText: {
    flex: 1,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  statItemLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  noAddresses: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  addressCoords: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  userId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
