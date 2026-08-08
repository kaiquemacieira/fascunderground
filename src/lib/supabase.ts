import { createClient } from '@supabase/supabase-js';

// Mesmas chaves públicas do projeto vanilla (config.js)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bcnbwshwehofncfkdnra.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_k0iCZgl6qweP16tW3uiGYA_HTJYO1iK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { User, Session } from '@supabase/supabase-js';
