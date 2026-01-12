import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Verificar conexión al cargar
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Error inicial de Supabase:', error.message);
  } else {
    console.log('✅ Supabase conectado correctamente');
    if (data.session) {
      console.log('🔐 Sesión existente:', data.session.user.email);
    } else {
      console.log('🔒 No hay sesión activa');
    }
  }
});