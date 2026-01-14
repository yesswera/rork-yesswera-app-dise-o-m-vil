import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Storage wrapper que funciona tanto en web como en móvil
 * En web usa localStorage, en móvil usa AsyncStorage
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // En web, usar localStorage
        return localStorage.getItem(key);
      } else {
        // En móvil, usar AsyncStorage
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // En web, usar localStorage
        localStorage.setItem(key, value);
      } else {
        // En móvil, usar AsyncStorage
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // En web, usar localStorage
        localStorage.removeItem(key);
      } else {
        // En móvil, usar AsyncStorage
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // En web, usar localStorage
        localStorage.clear();
      } else {
        // En móvil, usar AsyncStorage
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

export default storage;
