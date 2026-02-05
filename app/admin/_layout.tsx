import { Tabs, useRouter } from 'expo-router';
import { BarChart3, Users, ShoppingBag, MessageSquare, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.userType !== 'admin') {
      Alert.alert('Acceso Denegado', 'No tienes permisos de administrador');
      router.replace('/');
    }
  }, [user]);

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
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          headerTitle: 'Panel Administrativo',
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
        name="surveys"
        options={{
          title: 'Encuestas',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
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
