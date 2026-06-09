import { createClient } from '@supabase/supabase-js';

// Supabase project credentials, injected at build time from .env.local
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). See SETUP.md.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn loudly, but fall back to placeholders so the app still renders (the PIN
  // gate shows) instead of white-screening at import time. Data calls will fail
  // until .env.local is filled in — see SETUP.md.
  console.error(
    'Missing Supabase env vars. Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see SETUP.md).'
  );
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'missing-anon-key'
);
