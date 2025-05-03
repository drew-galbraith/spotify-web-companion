
// hooks/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface ExpoExtra {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

// Extract Supabase credentials from Expo config extra
const {
  SUPABASE_URL = '',
  SUPABASE_ANON_KEY = '',
} = (Constants.expoConfig?.extra as ExpoExtra) || {};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] Missing environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY',
  );
}

// Create a single Supabase client for use in the app
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Persist sessions with AsyncStorage in React Native
      storage: AsyncStorage,
      // Automatically refresh the token before expiry
      autoRefreshToken: true,
      // Persist session across reloads
      persistSession: true,
    },
  },
);
