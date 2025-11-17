import { createClient } from '@supabase/supabase-js';

// NOTA: Substitua pelas suas variáveis de ambiente REAIS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uljakqvlrtajbpislunr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsamFrcXZscnRhamJwaXNsdW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTg0NDIsImV4cCI6MjA3ODA3NDQ0Mn0.pARpx76EyUoj69G2dbVDGlgeW3XTO2viMRnbReyGkeU';

// Service Role Key para operações de Admin (NUNCA exponha em produção!)
// Para obter: Supabase Dashboard → Project Settings → API → service_role key
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Variáveis de ambiente do Supabase não configuradas!");
}

// Cliente normal (para usuários) com configurações otimizadas
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            'x-client-info': 'supabase-js-web'
        }
    },
    db: {
        schema: 'public'
    },
    // Timeout global para queries
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Cliente Admin (para operações administrativas)
// ATENÇÃO: Use apenas no lado do servidor ou em desenvolvimento local
// Em produção, use Edge Functions para proteger a Service Role Key
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            storageKey: 'supabase-admin-auth', // Storage key único para evitar conflitos
            storage: {
                // Storage vazio para garantir que não persista nada
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { }
            }
        },
        global: {
            headers: {
                'x-client-info': 'supabase-admin-js'
            }
        }
    })
    : null;