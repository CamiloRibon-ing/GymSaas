import { supabase } from "../supabaseClient";

export async function login(email, password) {
  console.log("🔐 Llamando auth.api login con:", email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    console.error("❌ Error en auth.api login:", error.message);
    throw error;
  }

  console.log("✅ Login exitoso en auth.api:", data.user.email);
  return data;
}

// Login seguro: bloquea acceso si el gimnasio está inactivo
export async function secureLogin(email, password) {
  // 1. Login normal
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw error;
  }
  // 2. Obtener perfil del usuario
  const userId = data.user.id;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, gym:gyms(status)')
    .eq('id', userId)
    .single();
  if (profileError) {
    throw profileError;
  }
  // 3. Validar estado del gimnasio
  if (profile.gym && profile.gym.status !== 'active') {
    // Cerrar sesión inmediata
    await supabase.auth.signOut();
    throw new Error('Acceso restringido: el gimnasio está inactivo o bloqueado. Contacta al administrador.');
  }
  return data;
}

export async function getProfile(userId) {
  console.log("👤 Obteniendo perfil para usuario:", userId);
  
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      gyms (
        id,
        name,
        slug
      )
    `)
    .eq("id", userId)
    .single();

  if (error) {
    console.error("❌ Error obteniendo perfil:", error.message);
    throw error;
  }

  console.log("✅ Perfil obtenido:", data);
  return data;
}

export async function logout() {
  console.log("🚪 Cerrando sesión...");
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("❌ Error cerrando sesión:", error.message);
    throw error;
  }
  
  console.log("✅ Sesión cerrada exitosamente");
}
