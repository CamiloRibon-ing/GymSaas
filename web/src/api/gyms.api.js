import { supabase } from '../supabaseClient';

// Obtener todos los gimnasios
export async function getGyms() {
  const { data, error } = await supabase
    .from('gyms')
    .select('*');
  if (error) throw error;
  return data;
}

// Obtener un gimnasio por ID
export async function getGymById(gymId) {
  const { data, error } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymId)
    .single();
  if (error) throw error;
  return data;
}

// Crear un gimnasio
export async function createGym(gymData) {
  const { data, error } = await supabase
    .from('gyms')
    .insert([gymData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Actualizar el status de un gimnasio (activar/desactivar)
export async function updateGymStatus(gymId, newStatus) {
  const { data, error } = await supabase
    .from('gyms')
    .update({ status: newStatus })
    .eq('id', gymId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
