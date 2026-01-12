// Migrar coach pendiente a perfil y usuario
export async function migratePendingCoach(pendingId, password) {
  // 1. Obtener datos del coach pendiente
  const { data: pending, error: getError } = await supabase
    .from('pending_coaches')
    .select('*')
    .eq('temp_id', pendingId)
    .single();
  if (getError || !pending) return { success: false, error: 'Coach pendiente no encontrado' };

  // 2. Crear usuario en Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: pending.email,
    password,
    options: { emailRedirectTo: window.location.origin + '/login' }
  });
  if (signUpError) return { success: false, error: signUpError.message };
  const userId = signUpData?.user?.id;
  if (!userId) return { success: false, error: 'No se pudo obtener el ID del usuario.' };

  // 3. Crear perfil en profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    first_name: pending.first_name,
    last_name: pending.last_name,
    phone: pending.phone,
    email: pending.email,
    role: 'coach',
    gym_id: pending.gym_id,
    speciality: pending.speciality,
    experience: pending.experience,
    bio: pending.bio,
    status: 'Activo'
  });
  if (profileError) return { success: false, error: profileError.message };

  // 4. Eliminar de pending_coaches
  const { error: delError } = await supabase.from('pending_coaches').delete().eq('temp_id', pendingId);
  if (delError) return { success: false, error: delError.message };

  return { success: true, userId };
}
// Funciones para crear miembros/coaches y migrar pendientes desde el frontend usando Supabase
import { supabase } from '../supabaseClient';

// Crear usuario y perfil (miembro o coach)
export async function createUserAndProfile({ email, password, first_name, last_name, phone, gym_id, membership_type, status = 'Activo', role = 'member', speciality, experience, bio }) {
  // 1. Crear usuario en Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + '/login' }
  });
  if (signUpError) return { success: false, error: signUpError.message };
  const userId = signUpData?.user?.id;
  if (!userId) return { success: false, error: 'No se pudo obtener el ID del usuario.' };

  // 2. Crear perfil en profiles
  const profilePayload = {
    id: userId,
    first_name,
    last_name,
    phone,
    email,
    role,
    gym_id,
    status,
  };
  if (role === 'member') {
    profilePayload.membership_type = membership_type;
  } else if (role === 'coach') {
    profilePayload.speciality = speciality;
    profilePayload.experience = experience;
    profilePayload.bio = bio;
  }
  const { error: profileError } = await supabase.from('profiles').insert(profilePayload);
  if (profileError) return { success: false, error: profileError.message };

  return { success: true, userId };
}

// Migrar miembro pendiente a perfil y usuario
export async function migratePendingMember(pendingId, password) {
  // 1. Obtener datos del miembro pendiente
  const { data: pending, error: getError } = await supabase
    .from('pending_members')
    .select('*')
    .eq('id', pendingId)
    .single();
  if (getError || !pending) return { success: false, error: 'Miembro pendiente no encontrado' };

  // 2. Crear usuario en Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: pending.email,
    password,
    options: { emailRedirectTo: window.location.origin + '/login' }
  });
  if (signUpError) return { success: false, error: signUpError.message };
  const userId = signUpData?.user?.id;
  if (!userId) return { success: false, error: 'No se pudo obtener el ID del usuario.' };

  // 3. Crear perfil en profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    first_name: pending.first_name,
    last_name: pending.last_name,
    phone: pending.phone,
    email: pending.email,
    role: 'member',
    gym_id: pending.gym_id,
    membership_type: pending.membership_type,
    status: 'Activo'
  });
  if (profileError) return { success: false, error: profileError.message };

  // 4. Eliminar de pending_members
  const { error: delError } = await supabase.from('pending_members').delete().eq('id', pendingId);
  if (delError) return { success: false, error: delError.message };

  return { success: true, userId };
}
