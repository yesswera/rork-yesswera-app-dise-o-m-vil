import { Tabs, useRouter } from 'expo-router';
import { BarChart3, Users, ShoppingBag, TrendingUp, Settings, MessageSquare, MessageCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.userType !== 'admin') {
      Alert.alert('Acceso Denegado', 'No tienes permisos de administrador');
      router.replace('/');
    }
  }, [user]);

  // Manejar botón de retroceso - preguntar si desea cerrar sesión
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Cerrar Sesión',
        '¿Deseas cerrar sesión del panel administrativo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/login' as any);
            },
          },
        ]
      );
      return true; // Prevenir comportamiento por defecto
    });

    return () => backHandler.remove();
  }, [logout, router]);

  if (!user || user.userType !== 'admin') {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.secondary,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border.light,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '700' as const,
        },
        headerLeft: () => null, // Sin botón de retroceso
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          headerTitle: 'Panel Administrativo',
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
          headerTitle: 'Analytics Avanzados',
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Órdenes',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Soporte',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
          headerTitle: 'Centro de Soporte',
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          headerTitle: 'Conversaciones',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
