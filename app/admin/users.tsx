import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Search, Users, UserCheck, Store, Truck, Shield, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { API_BASE } from '@/constants/api';
import { useAuth } from '@/contexts/auth';
import type { UserType } from '@/constants/types';

interface AdminUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  tipo: UserType;
  rating: number;
  createdAt: string;
  activo: boolean;
  totalOrdenes?: number;
}

interface UserStats {
  totalClientes: number;
  totalRepartidores: number;
  totalNegocios: number;
  totalAdmins: number;
  nuevosHoy: number;
}

export default function AdminUsersScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalClientes: 0,
    totalRepartidores: 0,
    totalNegocios: 0,
    totalAdmins: 0,
    nuevosHoy: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | UserType>('all');

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Password': 'TESTTEST123',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || stats);
      } else {
        loadMockUsers();
      }
    } catch (error) {
      console.error('Error loading users:', error);
      loadMockUsers();
    } finally {
      setLoading(false);
    }
  };

  const loadMockUsers = () => {
    setUsers([
      {
        id: '1',
        nombre: 'Juan Pérez',
        email: 'juan@email.com',
        telefono: '33-1234-5678',
        tipo: 'cliente',
        rating: 4.8,
        createdAt: '2024-01-15',
        activo: true,
        totalOrdenes: 45,
      },
      {
        id: '2',
        nombre: 'Carlos Mendoza',
        email: 'carlos@email.com',
        telefono: '33-9876-5432',
        tipo: 'repartidor',
        rating: 4.9,
        createdAt: '2024-01-10',
        activo: true,
        totalOrdenes: 234,
      },
      {
        id: '3',
        nombre: 'Tacos El Güero',
        email: 'tacos@guero.com',
        telefono: '33-5555-1234',
        tipo: 'negocio',
        rating: 4.7,
        createdAt: '2024-01-05',
        activo: true,
        totalOrdenes: 156,
      },
      {
        id: '4',
        nombre: 'María García',
        email: 'maria@email.com',
        telefono: '33-4444-5678',
        tipo: 'cliente',
        rating: 5.0,
        createdAt: '2024-01-20',
        activo: true,
        totalOrdenes: 12,
      },
      {
        id: '5',
        nombre: 'Luis Ramírez',
        email: 'luis@email.com',
        telefono: '33-3333-9999',
        tipo: 'repartidor',
        rating: 4.5,
        createdAt: '2024-01-18',
        activo: false,
        totalOrdenes: 89,
      },
    ]);

    setStats({
      totalClientes: 847,
      totalRepartidores: 156,
      totalNegocios: 89,
      totalAdmins: 3,
      nuevosHoy: 12,
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.telefono.includes(searchQuery);

    const matchesFilter = selectedFilter === 'all' || user.tipo === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const getUserIcon = (tipo: UserType) => {
    switch (tipo) {
      case 'cliente':
        return <Users size={20} color={Colors.primary} />;
      case 'repartidor':
        return <Truck size={20} color={Colors.accent} />;
      case 'negocio':
        return <Store size={20} color={Colors.success} />;
      case 'admin':
        return <Shield size={20} color={Colors.error} />;
    }
  };

  const getUserTypeLabel = (tipo: UserType) => {
    switch (tipo) {
      case 'cliente':
        return 'Cliente';
      case 'repartidor':
        return 'Repartidor';
      case 'negocio':
        return 'Negocio';
      case 'admin':
        return 'Admin';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{stats.totalClientes}</Text>
              <Text style={styles.statLabel}>Clientes</Text>
            </View>

            <View style={styles.statCard}>
              <Truck size={24} color={Colors.accent} />
              <Text style={styles.statValue}>{stats.totalRepartidores}</Text>
              <Text style={styles.statLabel}>Repartidores</Text>
            </View>

            <View style={styles.statCard}>
              <Store size={24} color={Colors.success} />
              <Text style={styles.statValue}>{stats.totalNegocios}</Text>
              <Text style={styles.statLabel}>Negocios</Text>
            </View>

            <View style={styles.statCard}>
              <UserCheck size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{stats.nuevosHoy}</Text>
              <Text style={styles.statLabel}>Nuevos Hoy</Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, email o teléfono..."
              placeholderTextColor={Colors.text.light}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                Todos ({users.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'cliente' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('cliente')}
            >
              <Text style={[styles.filterText, selectedFilter === 'cliente' && styles.filterTextActive]}>
                Clientes ({stats.totalClientes})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'repartidor' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('repartidor')}
            >
              <Text style={[styles.filterText, selectedFilter === 'repartidor' && styles.filterTextActive]}>
                Repartidores ({stats.totalRepartidores})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'negocio' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('negocio')}
            >
              <Text style={[styles.filterText, selectedFilter === 'negocio' && styles.filterTextActive]}>
                Negocios ({stats.totalNegocios})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.usersList}>
            {filteredUsers.map((user) => (
              <TouchableOpacity key={user.id} style={styles.userCard}>
                <View style={styles.userIcon}>{getUserIcon(user.tipo)}</View>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.userName}>{user.nombre}</Text>
                    {!user.activo && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactivo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userType}>{getUserTypeLabel(user.tipo)}</Text>
                  <View style={styles.userDetails}>
                    <Text style={styles.userDetailText}>📧 {user.email}</Text>
                    <Text style={styles.userDetailText}>📱 {user.telefono}</Text>
                    {user.totalOrdenes !== undefined && (
                      <Text style={styles.userDetailText}>📦 {user.totalOrdenes} órdenes</Text>
                    )}
                    <Text style={styles.userDetailText}>⭐ {user.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.userDate}>Registrado: {user.createdAt}</Text>
                </View>
                <ChevronRight size={20} color={Colors.text.light} />
              </TouchableOpacity>
            ))}

            {filteredUsers.length === 0 && (
              <View style={styles.emptyState}>
                <Users size={48} color={Colors.text.light} />
                <Text style={styles.emptyText}>No se encontraron usuarios</Text>
                <Text style={styles.emptySubtext}>Intenta con otro filtro o búsqueda</Text>
              </View>
            )}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    marginBottom: 16,
    shadowColor: Colors.shadow.light,
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
    color: Colors.text.primary,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  userIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.tertiary,
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
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.error + '20',
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  userType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 6,
  },
  userDetails: {
    gap: 2,
    marginBottom: 4,
  },
  userDetailText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  userDate: {
    fontSize: 11,
    color: Colors.text.light,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.light,
    marginTop: 4,
  },
});
