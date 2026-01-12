import { supabase } from '../supabaseClient';

// ===== RUTINAS Y EJERCICIOS =====

export const saveWorkoutToDB = async (workout, coachId, gymId) => {
  try {
    // Guardar workout principal
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        gym_id: gymId,
        coach_id: coachId,
        title: workout.title || 'Rutina Semanal',
        description: workout.description || 'Rutina creada por el coach'
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Guardar ejercicios
    const exercises = [];
    Object.entries(workout).forEach(([day, dayExercises]) => {
      if (day !== 'title' && day !== 'description' && Array.isArray(dayExercises)) {
        dayExercises.forEach(exercise => {
          exercises.push({
            workout_id: workoutData.id,
            exercise_name: `${day}: ${exercise.name}`,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: exercise.weight
          });
        });
      }
    });

    if (exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercises);

      if (exercisesError) throw exercisesError;
    }

    return workoutData;
  } catch (error) {
    console.error('Error guardando workout en BD:', error);
    throw error;
  }
};

export const getWorkoutsFromDB = async (coachId, gymId) => {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (*)
      `)
      .eq('coach_id', coachId)
      .eq('gym_id', gymId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo workouts de BD:', error);
    return [];
  }
};

export const assignWorkoutToUser = async (userId, workoutId) => {
  try {
    const { data, error } = await supabase
      .from('user_workouts')
      .insert({
        user_id: userId,
        workout_id: workoutId,
        assigned_date: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error asignando workout al usuario:', error);
    throw error;
  }
};

// ===== PLANES NUTRICIONALES =====

export const saveNutritionPlanToDB = async (plan, userId, coachId) => {
  try {
    // Guardar plan principal
    const { data: planData, error: planError } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: userId,
        coach_id: coachId,
        title: plan.title,
        notes: plan.notes,
        start_date: plan.startDate,
        end_date: plan.endDate
      })
      .select()
      .single();

    if (planError) throw planError;

    // Guardar comidas
    if (plan.meals && plan.meals.length > 0) {
      const mealsData = plan.meals.map(meal => ({
        nutrition_plan_id: planData.id,
        meal_type: meal.type,
        description: meal.description,
        calories: meal.calories,
        protein_g: meal.protein,
        carbs_g: meal.carbs,
        fats_g: meal.fats
      }));

      const { error: mealsError } = await supabase
        .from('nutrition_meals')
        .insert(mealsData);

      if (mealsError) throw mealsError;
    }

    return planData;
  } catch (error) {
    console.error('Error guardando plan nutricional en BD:', error);
    throw error;
  }
};

export const getNutritionPlansFromDB = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select(`
        *,
        nutrition_meals (*)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo planes nutricionales de BD:', error);
    return [];
  }
};

// ===== MÉTRICAS CORPORALES =====

export const saveBodyMetricsToDB = async (userId, metrics) => {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .insert({
        user_id: userId,
        weight_kg: metrics.weight,
        height_cm: metrics.height,
        body_fat_percent: metrics.bodyFat,
        muscle_mass_kg: metrics.muscleMass,
        recorded_at: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error guardando métricas en BD:', error);
    throw error;
  }
};

export const getBodyMetricsFromDB = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo métricas de BD:', error);
    return [];
  }
};

// ===== USUARIOS Y PERFILES =====

export const getUsersFromDB = async (gymId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('gym_id', gymId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo usuarios de BD:', error);
    return [];
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error actualizando perfil de usuario:', error);
    throw error;
  }
};

// ===== UTILIDADES =====

export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session?.user) {
      // Obtener perfil completo
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      return { user: session.user, profile };
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
};