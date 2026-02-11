const BACKEND_URL = 'http://localhost:4001';

// Actualizar miembro pendiente
export async function updatePendingMember(pendingId, updates) {
  const { data, error } = await supabase
    .from('pending_members')
    .update(updates)
    .eq('id', pendingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
import { supabase } from '../supabaseClient';

// Obtener todos los usuarios (miembros, coaches, admins) de un gimnasio
export async function getUsersByGym(gymId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('gym_id', gymId);
  if (error) throw error;
  return data;
}

// Obtener usuario por ID
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Crear usuario (solo para admins)
// Crear usuario y perfil usando el endpoint backend
// Crear miembro solo en profiles (sin Auth)
// Crear miembro pendiente (solo datos personales, sin Auth)
export async function createUser(profileData) {
  const { data, error } = await supabase
    .from('pending_members')
    .insert([profileData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Obtener todos los miembros pendientes de un gimnasio
export async function getPendingMembers(gymId) {
  const { data, error } = await supabase
    .from('pending_members')
    .select('*')
    .eq('gym_id', gymId);
  if (error) throw error;
  return data;
}

// Eliminar miembro pendiente
export async function deletePendingMember(id) {
  const { error } = await supabase
    .from('pending_members')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { success: true };
}

// Crear usuario en Auth y asociar el id a un miembro existente
// Migrar miembro pendiente: crear usuario en Auth, pasar a profiles y eliminar de pending_members
export async function createAuthForMember({ pendingId, password }) {
  const response = await fetch('http://localhost:4001/api/migrate-pending-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingId, password })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Error creando acceso');
  return result;
}

// Actualizar usuario
export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Eliminar usuario (solo para admins, elimina solo el perfil, no el auth)
export async function deleteUser(userId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  if (error) throw error;
  return { success: true };
}

// Crear usuario admin en Supabase (backend)
export async function createAdmin({ email, password, user_metadata }) {
  const res = await fetch(`${BACKEND_URL}/api/create-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, user_metadata })
  });
  if (!res.ok) throw new Error('Error creando usuario admin');
  return await res.json();
}

// Enviar correo de aprobación/rechazo profesional
export async function sendGymApprovalEmail({ to, gymName, approved }) {
  console.log('[FRONTEND][EMAIL] Datos enviados:', { to, gymName, approved });
  const res = await fetch(`${BACKEND_URL}/api/send-gym-approval-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, gymName, approved })
  });
  if (!res.ok) throw new Error('Error enviando correo de aprobación');
  return await res.json();
}

// Enviar correo de notificación genérico
export async function sendNotificationEmail({ to, subject, html }) {
  const res = await fetch(`${BACKEND_URL}/api/send-notification-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html })
  });
  if (!res.ok) throw new Error('Error enviando correo de notificación');
  return await res.json();
}
