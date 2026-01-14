import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import type { User } from '@/constants/types';
import storage from '@/utils/storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string, userType: string) => Promise<void>;
  logout: () => Promise<void>;
}

const API_BASE = 'http://192.168.100.3:3000/api';

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) {
        await loadStoredAuth();
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getItem('auth_token');
      const storedUser = await storage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Ensure userType is set (in case of old cached data)
          if (parsedUser.tipo && !parsedUser.userType) {
            parsedUser.userType = parsedUser.tipo;
          }
          setToken(storedToken);
          setUser(parsedUser);
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          await storage.removeItem('auth_token');
          await storage.removeItem('auth_user');
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Map backend fields to app User type
      const mappedUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.nombre || data.user.name,
        phone: data.user.telefono || data.user.phone,
        userType: data.user.tipo || data.user.userType,
        rating: data.user.rating,
        avatar: data.user.avatar,
      };

      setToken(data.token);
      setUser(mappedUser);

      await storage.setItem('auth_token', data.token);
      await storage.setItem('auth_user', JSON.stringify(mappedUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string, userType: string) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone, user_type: userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Map backend fields to app User type
      const mappedUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.nombre || data.user.name,
        phone: data.user.telefono || data.user.phone,
        userType: data.user.tipo || data.user.userType,
        rating: data.user.rating,
        avatar: data.user.avatar,
      };

      setToken(data.token);
      setUser(mappedUser);

      await storage.setItem('auth_token', data.token);
      await storage.setItem('auth_user', JSON.stringify(mappedUser));
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await storage.removeItem('auth_token');
    await storage.removeItem('auth_user');
  };

  return {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
  };
});
