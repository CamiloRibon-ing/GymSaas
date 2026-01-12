// Actualiza un plan nutricional existente
import { supabase } from '../supabaseClient';

export const updateNutritionPlan = async (planId, planData) => {
  try {
    // Actualizar el plan nutricional
    const { data: plan, error: planError } = await supabase
      .from('nutrition_plans')
      .update({
        title: planData.name || planData.title,
        notes: planData.notes || planData.description,
        calories: planData.calories,
        meals: planData.meals,
        type: planData.type,
        start_date: planData.start_date || null,
        end_date: planData.end_date || null,
        protein_grams: planData.protein_grams,
        carbs_grams: planData.carbs_grams,
        fat_grams: planData.fat_grams,
        breakfast: planData.breakfast,
        midmorning: planData.midmorning,
        lunch: planData.lunch,
        snack: planData.snack,
        dinner: planData.dinner
      })
      .eq('id', planId)
      .select()
      .single();
    if (planError) throw planError;

    // Actualizar asignaciones de miembros (opcional, si se edita assigned_to)
    if (Array.isArray(planData.assigned_to)) {
      // Eliminar asignaciones actuales
      await supabase
        .from('nutrition_plan_assignments')
        .delete()
        .eq('nutrition_plan_id', planId);
      // Insertar nuevas asignaciones
      if (planData.assigned_to.length > 0) {
        const assignments = planData.assigned_to.map(memberId => ({
          nutrition_plan_id: planId,
          member_id: memberId,
          start_date: planData.start_date || null,
          end_date: planData.end_date || null,
          status: 'activo'
        }));
        const { error: assignError } = await supabase
          .from('nutrition_plan_assignments')
          .insert(assignments);
        if (assignError) throw assignError;
      }
    }
    return { success: true, nutritionPlan: plan };
  } catch (error) {
    console.error('❌ Error actualizando plan nutricional:', error);
    return { success: false, error: error.message };
  }
};
