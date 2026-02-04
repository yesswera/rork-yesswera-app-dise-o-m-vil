// SUPABASE CONFIGURATION - YESSWERA
// Conexion a la base de datos en la nube

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://jdvundwewwobkznxwkvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdnVuZHdld3dvYmt6bnh3a3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODgwMzcsImV4cCI6MjA4NTc2NDAzN30.e3zJpuiJmeMAb5XkqcznHbA9Lg0lVZlOa1hkMSumZa8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// URL base para referencia
export const SUPABASE_API_URL = SUPABASE_URL;
