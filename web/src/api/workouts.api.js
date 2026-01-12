import { supabase } from '../supabaseClient';

// Obtener todas las rutinas (workouts) de un gimnasio
export async function getWorkoutsByGym(gymId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('gym_id', gymId);
  if (error) throw error;
  return data;
}

// Obtener rutina por ID (incluye ejercicios)
export async function getWorkoutById(workoutId) {
  const { data, error } = await supabase
    .from('workouts')
    .select(`*, workout_exercises(*)`)
    .eq('id', workoutId)
    .single();
  if (error) throw error;
  return data;
}

// Crear rutina (workout) y ejercicios
export async function createWorkout(workoutData, exercises = []) {
  // Crear workout
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      gym_id: workoutData.gym_id,
      coach_id: workoutData.coach_id,
      title: workoutData.title,
      description: workoutData.description
    })
    .select()
    .single();
  if (workoutError) throw workoutError;

  // Crear ejercicios asociados
  if (exercises.length > 0) {
    const exercisesToInsert = exercises.map(ex => ({
      workout_id: workout.id,
      exercise_name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds || 60,
      notes: ex.notes
    }));
    const { error: exError } = await supabase
      .from('workout_exercises')
      .insert(exercisesToInsert);
    if (exError) throw exError;
  }
  return workout;
}

// Actualizar rutina
export async function updateWorkout(workoutId, updates) {
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Eliminar rutina
export async function deleteWorkout(workoutId) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId);
  if (error) throw error;
  return { success: true };
}
