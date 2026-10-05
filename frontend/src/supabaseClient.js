import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zerotrustnet.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy_anon_key';

// Check if credentials are placeholders or active
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseUrl !== 'https://xyzcompany.supabase.co' &&
    supabaseUrl !== 'https://zerotrustnet.supabase.co' &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('placeholder') &&
    !supabaseAnonKey.includes('sample_anon_key')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
