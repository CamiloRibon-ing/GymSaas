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
