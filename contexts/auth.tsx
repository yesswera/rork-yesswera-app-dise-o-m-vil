import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import type { User } from '@/constants/types';
import { supabase } from '@/constants/supabase';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone: string, userType: string) => Promise<void>;
  updateProfile: (updates: { name?: string; phone?: string; avatar?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check current session on mount
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
          setToken(session.access_token);
        } else {
          setUser(null);
          setToken(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
        setToken(session.access_token);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const mappedUser: User = {
          id: data.id,
          email: data.email,
          name: data.full_name,
          phone: data.phone,
          userType: data.user_type,
          avatar: data.avatar_url,
        };
        setUser(mappedUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) throw new Error('No user returned');

      // Load user profile from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) throw userError;

      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        phone: userData.phone,
        userType: userData.user_type,
        avatar: userData.avatar_url,
      };

      setToken(data.session?.access_token || null);
      setUser(mappedUser);

      return mappedUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string, userType: string) => {
    try {
      // 1. Create auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('No user returned from signup');

      // 2. Create user profile in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: name,
          phone: phone,
          user_type: userType,
          is_verified: false,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 3. If driver, create driver record
      if (userType === 'driver') {
        await supabase.from('drivers').insert({
          user_id: authData.user.id,
          is_online: false,
          is_available: true,
        });
      }

      // 4. If business, create business record
      if (userType === 'business') {
        await supabase.from('businesses').insert({
          user_id: authData.user.id,
          business_name: name,
          address: 'Por configurar',
          is_open: false,
        });
      }

      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        phone: userData.phone,
        userType: userData.user_type,
        avatar: userData.avatar_url,
      };

      setToken(authData.session?.access_token || null);
      setUser(mappedUser);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: { name?: string; phone?: string; avatar?: string }) => {
    if (!user) throw new Error('No autenticado');

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.full_name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) throw error;

    setUser({
      ...user,
      name: updates.name ?? user.name,
      phone: updates.phone ?? user.phone,
      avatar: updates.avatar ?? user.avatar,
    });
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return {
    user,
    token,
    isLoading,
    login,
    register,
    updateProfile,
    logout,
  };
});
