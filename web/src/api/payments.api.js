import { supabase } from '../supabaseClient';

// Utilidad para obtener pagos de un miembro desde Supabase
export async function getPaymentsByMember(memberId, gymId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('member_id', memberId)
    .eq('gym_id', gymId)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return data;
}
