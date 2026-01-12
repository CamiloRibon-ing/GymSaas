import { supabase } from '../supabaseClient';

// Obtener todos los planes nutricionales asignados a un miembro
export const getNutritionPlansForMember = async (memberId) => {
  try {
    // Buscar asignaciones de planes para el miembro
    const { data: assignments, error: assignError } = await supabase
      .from('nutrition_plan_assignments')
      .select('nutrition_plan_id')
      .eq('member_id', memberId);
    if (assignError) throw assignError;
    const planIds = assignments.map(a => a.nutrition_plan_id);
    if (!planIds.length) return { success: true, plans: [] };
    // Buscar los planes nutricionales completos
    const { data: plans, error: planError } = await supabase
      .from('nutrition_plans')
      .select('*')
      .in('id', planIds);
    if (planError) throw planError;
    return { success: true, plans };
  } catch (error) {
    console.error('❌ Error obteniendo planes nutricionales del miembro:', error);
    return { success: false, error: error.message };
  }
};
