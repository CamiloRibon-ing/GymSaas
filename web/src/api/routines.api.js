// Obtener un plan nutricional por ID con todos los campos y miembros asignados
export const getNutritionPlanById = async (planId) => {
  try {
    // Obtener el plan con todos los campos
    const { data: plan, error: planError } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .single();
    if (planError) throw planError;

    // Obtener miembros asignados
    const { data: assignments, error: assignError } = await supabase
      .from('nutrition_plan_assignments')
      .select('member_id, profiles(first_name, last_name, email)')
      .eq('nutrition_plan_id', planId);
    let assignedMembers = [];
    if (!assignError && assignments) {
      assignedMembers = assignments.map(a => ({
        id: a.member_id,
        ...a.profiles
      }));
    }
    return { success: true, plan: { ...plan, assignedMembers } };
  } catch (error) {
    console.error('❌ Error obteniendo plan nutricional por ID:', error);
    return { success: false, error: error.message };
  }
};
// Obtener todas las rutinas personalizadas del gimnasio (para admin y coach)
export const getAllRoutines = async (gymId) => {
  try {
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error obteniendo rutinas:', error);
      throw error;
    }
    // Para cada rutina, obtener días y ejercicios
    const routinesWithDetails = await Promise.all((routines || []).map(async (routine) => {
      const { data: days, error: daysError } = await supabase
        .from('routine_days')
        .select('*')
        .eq('routine_id', routine.id);
      if (daysError) return { ...routine, days: [] };
      // Para cada día, obtener ejercicios
      const daysWithExercises = await Promise.all((days || []).map(async (day) => {
        const { data: exercises, error: exError } = await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_day_id', day.id);
        return { ...day, exercises: exError ? [] : exercises };
      }));
      return { ...routine, days: daysWithExercises };
    }));
    return { success: true, routines: routinesWithDetails };
  } catch (error) {
    console.error('❌ Error obteniendo rutinas:', error);
    return { success: false, error: error.message };
  }
};
import { supabase } from '../supabaseClient.js';
// Obtener todas las rutinas semanales del gimnasio (para admin)
export const getWeeklyRoutines = async (gymId) => {
  try {
    const { data: routines, error } = await supabase
      .from('weekly_routines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error obteniendo rutinas semanales:', error);
      throw error;
    }
    // Para cada rutina semanal, obtener días y ejercicios
    const routinesWithDetails = await Promise.all((routines || []).map(async (routine) => {
      // Obtener días asociados a la rutina semanal
      const { data: days, error: daysError } = await supabase
        .from('routine_days')
        .select('*')
        .eq('weekly_routine_id', routine.id)
        .order('day_order', { ascending: true });
      if (daysError) return { ...routine, days: [] };
      // Para cada día, obtener ejercicios
      const daysWithExercises = await Promise.all((days || []).map(async (day) => {
        const { data: exercises, error: exError } = await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_day_id', day.id)
          .order('exercise_order', { ascending: true });
        return { ...day, exercises: exError ? [] : exercises };
      }));
      // Mapear días por day_order y nombre
      const dayMap = {
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
        7: 'sunday'
      };
      const routineWithDays = { ...routine, days: daysWithExercises };
      // Agregar ejercicios por clave numérica y nombre
      daysWithExercises.forEach(day => {
        routineWithDays[day.day_order] = day.exercises || [];
        const key = dayMap[day.day_order];
        if (key) routineWithDays[key] = day.exercises || [];
      });
      return routineWithDays;
    }));
    return { success: true, routines: routinesWithDetails };
  } catch (error) {
    console.error('❌ Error obteniendo rutinas semanales:', error);
    return { success: false, error: error.message };
  }
};

export const getCoachRoutines = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error obteniendo rutinas:', error);
      throw error;
    }
    // Para cada rutina, obtener días y ejercicios
    const routinesWithDetails = await Promise.all((routines || []).map(async (routine) => {
      const { data: days, error: daysError } = await supabase
        .from('routine_days')
        .select('*')
        .eq('routine_id', routine.id);
      if (daysError) return { ...routine, days: [] };
      // Para cada día, obtener ejercicios
      const daysWithExercises = await Promise.all((days || []).map(async (day) => {
        const { data: exercises, error: exError } = await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_day_id', day.id);
        return { ...day, exercises: exError ? [] : exercises };
      }));
      return { ...routine, days: daysWithExercises };
    }));
    console.log('✅ Rutinas obtenidas:', routinesWithDetails);
    return { success: true, routines: routinesWithDetails };
  } catch (error) {
    console.error('❌ Error obteniendo rutinas:', error);
    return { success: false, error: error.message };
  }
};

export const updateRoutine = async (routineId, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }


    // Separar los campos de rutina, días y asignaciones
    const { days, assigned_to, ...routineFields } = updates;
    // Validar status según la BD
    const allowedStatus = ['active', 'inactive', 'completed'];
    let status = routineFields.status;
    if (!allowedStatus.includes(status)) status = 'active';
    // Actualizar solo los campos válidos de la tabla routines
    const { data, error } = await supabase
      .from('routines')
      if (error) {
        // Si el error es 406 y data es null, ignorar y tratar como éxito (solo asignaciones)
        if (error.code === 'PGRST116' && error.message && error.message.includes('Cannot coerce the result to a single JSON object')) {
          // No se actualizó la rutina, pero las asignaciones sí
        } else {
          console.error('Error actualizando rutina:', error);
          throw error;
        }
      }

      // Actualizar asignaciones de miembros (routine_assignments)
      if (Array.isArray(assigned_to)) {
        // Eliminar asignaciones previas para la rutina
        await supabase
          .from('routine_assignments')
          .delete()
          .eq('routine_id', routineId);
        // Insertar nuevas asignaciones
        for (const memberId of assigned_to) {
          await supabase
            .from('routine_assignments')
            .insert({
              routine_id: routineId,
              member_id: memberId,
              assigned_at: new Date().toISOString()
            });
        }
      }

      // Actualizar días y ejercicios
      if (Array.isArray(days)) {
        for (const day of days) {
          // ...existing code...
        }
      }

      console.log('✅ Rutina actualizada:', data);
      return { success: true, routine: data };

    // Actualizar días y ejercicios
    if (Array.isArray(days)) {
      for (const day of days) {
        // Buscar el día existente por nombre y rutina
        let { data: existingDay } = await supabase
          .from('routine_days')
          .select('id')
          .eq('routine_id', routineId)
          .eq('name', day.name)
          .single();
        let dayId;
        if (existingDay && existingDay.id) {
          dayId = existingDay.id;
          // Actualizar orden si es necesario
          await supabase
            .from('routine_days')
            .update({ day_order: day.order })
            .eq('id', dayId);
          // Eliminar ejercicios existentes para ese día
          await supabase
            .from('routine_exercises')
            .delete()
            .eq('routine_day_id', dayId);
        } else {
          // Crear el día si no existe
          const { data: newDay, error: dayError } = await supabase
            .from('routine_days')
            .insert({
              name: day.name,
              day_order: day.order,
              routine_id: routineId,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          if (dayError) throw dayError;
          dayId = newDay.id;
        }
        // Insertar ejercicios para el día
        if (Array.isArray(day.exercises)) {
          for (const [index, exercise] of day.exercises.entries()) {
            await supabase
              .from('routine_exercises')
              .insert({
                routine_day_id: dayId,
                exercise_name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight,
                notes: exercise.notes,
                exercise_order: index + 1,
                created_at: new Date().toISOString()
              });
          }
        }
      }
    }

    console.log('✅ Rutina actualizada:', data);
    return { success: true, routine: data };

  } catch (error) {
    console.error('❌ Error actualizando rutina:', error);
    return { success: false, error: error.message };
  }
};

export const deleteRoutine = async (routineId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('created_by', user.id);

    if (error) {
      console.error('Error eliminando rutina:', error);
      throw error;
    }

    console.log('✅ Rutina eliminada exitosamente');
    return { success: true };

  } catch (error) {
    console.error('❌ Error eliminando rutina:', error);
    return { success: false, error: error.message };
  }
};

// ================ RUTINA SEMANAL GENERAL ================

/**
 * Crea una rutina personalizada para un usuario (coach o admin)
 * @param {Object} routineData - Datos de la rutina (nombre, días, ejercicios, etc)
 * @returns {Object} - { success, routine, error }
 */
export const createRoutine = async (routineData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener gym_id del perfil
    let gym_id = routineData.gym_id;
    if (!gym_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single();
      if (profileError) {
        console.error('Error obteniendo gym_id del perfil:', profileError);
      }
      gym_id = profileData?.gym_id || null;
    }

    // Crear la rutina principal
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert({
        name: routineData.name,
        description: routineData.description || '',
        gym_id,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (routineError) throw routineError;

    // Insertar días y ejercicios
    if (routineData.days && Array.isArray(routineData.days)) {
      for (const day of routineData.days) {
        // Crear día
        const { data: routineDay, error: dayError } = await supabase
          .from('routine_days')
          .insert({
            name: day.name,
            day_order: day.order,
            rest_day: day.rest_day || false,
            routine_id: routine.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        if (dayError) throw dayError;

        // Insertar ejercicios para el día
        if (day.exercises && Array.isArray(day.exercises)) {
          for (const [index, exercise] of day.exercises.entries()) {
            const { error: exError } = await supabase
              .from('routine_exercises')
              .insert({
                routine_day_id: routineDay.id,
                exercise_name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight,
                rest_seconds: exercise.rest_seconds || 60,
                notes: exercise.notes,
                exercise_order: index + 1,
                created_at: new Date().toISOString()
              });
            if (exError) throw exError;
          }
        }
      }
    }

    return { success: true, routine };
  } catch (error) {
    console.error('❌ Error creando rutina personalizada:', error);
    return { success: false, error: error.message };
  }
};

export const saveWeeklyRoutine = async (weeklyData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Buscar rutina semanal existente por coach y gym
    let gym_id = weeklyData.gym_id;
    if (!gym_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single();
      if (profileError) {
        console.error('Error obteniendo gym_id del perfil:', profileError);
      }
      gym_id = profileData?.gym_id || null;
    }
    const { data: existing, error: existingError } = await supabase
      .from('weekly_routines')
      .select('id')
      .eq('coach_id', user.id)
      .eq('gym_id', gym_id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error buscando rutina semanal:', existingError);
      throw existingError;
    }

    // Usar estructura moderna: días y ejercicios desde weeklyData.days
    const days = Array.isArray(weeklyData.days)
      ? weeklyData.days.map(day => ({
          name: day.name,
          day_order: day.day_order !== undefined ? day.day_order : day.order,
          exercises: Array.isArray(day.exercises) ? day.exercises : []
        }))
      : [];
    // Para compatibilidad, también llenar los campos por nombre
    const dayMap = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      7: 'sunday'
    };
    const routineData = {
      name: weeklyData.name,
      description: weeklyData.description,
      updated_at: new Date().toISOString(),
      gym_id
    };
    // Agregar arrays por día para compatibilidad
    for (let i = 1; i <= 7; i++) {
      routineData[dayMap[i]] = days.find(d => d.order === i)?.exercises || [];
    }

    let result;
    if (existing && existing.id) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('weekly_routines')
        .update(routineData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('🟢 Rutina semanal actualizada:', result);
      // Log extra: mostrar lo que retorna la BD
      const { data: dbRoutine, error: dbError } = await supabase
        .from('weekly_routines')
        .select('*')
        .eq('id', existing.id)
        .single();
      console.log('🔎 BD Rutina semanal actualizada:', dbRoutine);
    } else {
      // Crear nueva SOLO si no existe
      const { data, error } = await supabase
        .from('weekly_routines')
        .insert({
          ...routineData,
          coach_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('🟢 Rutina semanal creada:', result);
      // Log extra: mostrar lo que retorna la BD
      const { data: dbRoutine, error: dbError } = await supabase
        .from('weekly_routines')
        .select('*')
        .eq('id', result.id)
        .single();
      console.log('🔎 BD Rutina semanal creada:', dbRoutine);
    }

      // Guardar días y ejercicios para cada día
      console.log('📋 Días y ejercicios a guardar:', days);
      for (const day of days) {
        // Buscar el día por nombre, orden y weekly_routine_id
        let { data: existingDay, error: dayQueryError } = await supabase
          .from('routine_days')
          .select('id')
          .eq('name', day.name)
          .eq('day_order', day.day_order)
          .eq('weekly_routine_id', result.id)
          .single();
        let dayId;
        if (existingDay && existingDay.id) {
          dayId = existingDay.id;
        } else {
          // Crear el día si no existe para esta rutina semanal
          const { data: newDay, error: dayError } = await supabase
            .from('routine_days')
            .insert({
              name: day.name,
              day_order: day.day_order,
              rest_day: false,
              weekly_routine_id: result.id,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          if (dayError) {
            console.error('Error creando día:', dayError);
            continue;
          }
          dayId = newDay.id;
        }
        // Guardar ejercicios para este día
        if (Array.isArray(day.exercises) && day.exercises.length > 0) {
          // Eliminar ejercicios previos para este día (evita duplicados)
          await supabase
            .from('routine_exercises')
            .delete()
            .eq('routine_day_id', dayId);
          const exercisesToInsert = day.exercises.map((exercise, index) => ({
            routine_day_id: dayId,
            exercise_name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            rest_seconds: exercise.rest_seconds || 60,
            notes: exercise.notes,
            exercise_order: index + 1,
            created_at: new Date().toISOString()
          }));
          // Insertar todos los ejercicios
          for (const ex of exercisesToInsert) {
            await supabase.from('routine_exercises').insert(ex);
          }
        }
      }
    // console.log('✅ Rutina semanal guardada:', result); // Eliminado para evitar notificación infinita
    return { success: true, weeklyRoutine: result };
  } catch (error) {
    console.error('❌ Error guardando rutina semanal:', error);
    // Si tienes setLoading en el componente, asegúrate de llamarlo aquí vía callback o promesa
    // Ejemplo: if (typeof setLoading === 'function') setLoading(false);
    return { success: false, error: error.message };
  }
};

export const getWeeklyRoutine = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    // Obtener gym_id del perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', user.id)
      .single();
    const gymId = profileData?.gym_id;
    // Buscar la rutina semanal más reciente para el gym
    const { data: routines, error } = await supabase
      .from('weekly_routines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    if (!routines || routines.length === 0) {
      // No existe rutina semanal, retornar estructura vacía
      return {
        success: true,
        weeklyRoutine: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      };
    }
    const weeklyRoutine = routines[0]; // Más reciente
    // Obtener los días de la rutina semanal
    const { data: routineDays, error: daysError } = await supabase
      .from('routine_days')
      .select('*')
      .eq('weekly_routine_id', weeklyRoutine.id);
    if (daysError) {
      return { success: false, error: daysError.message };
    }
    // Para cada día, obtener ejercicios
    const daysWithExercises = await Promise.all(
      (routineDays || []).map(async (day) => {
        const { data: exercises, error: exercisesError } = await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_day_id', day.id);
        return {
          ...day,
          exercises: exercisesError ? [] : exercises,
        };
      })
    );
    // Mapear los días a los campos de la rutina semanal (lunes a domingo)
    const defaultDays = [
      { key: 'monday', name: 'Lunes', order: 1 },
      { key: 'tuesday', name: 'Martes', order: 2 },
      { key: 'wednesday', name: 'Miércoles', order: 3 },
      { key: 'thursday', name: 'Jueves', order: 4 },
      { key: 'friday', name: 'Viernes', order: 5 },
      { key: 'saturday', name: 'Sábado', order: 6 },
      { key: 'sunday', name: 'Domingo', order: 7 }
    ];
    const routine = {
      ...weeklyRoutine,
    };
    defaultDays.forEach(day => {
      const found = daysWithExercises.find(d => d.day_order === day.order);
      routine[day.key] = found || {
        id: null,
        name: day.name,
        day_order: day.order,
        exercises: []
      };
    });
    // Log para depuración: mostrar estructura final
    console.log('✅ Rutina semanal obtenida (estructura completa):', routine);
    return { success: true, weeklyRoutine: routine };
  } catch (error) {
    console.error('❌ Error obteniendo rutina semanal:', error);
    return { success: false, error: error.message };
  }
};

// Obtener rutinas personalizadas asignadas a un miembro

export const getMemberPersonalRoutines = async (memberId) => {
  try {
    if (!memberId) throw new Error('ID de miembro requerido');
    // Usar .cs. para arrays en Supabase/PostgREST
    // Workaround: fetch all routines with assigned_to not null, filter in JS
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .not('assigned_to', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Log para depuración: mostrar memberId y assigned_to de cada rutina
    console.log('[DEBUG] memberId buscado:', memberId);
    (routines || []).forEach(r => {
      console.log('[DEBUG] Rutina', r.id, 'assigned_to:', r.assigned_to);
    });
    // Filtrar en JS las rutinas donde assigned_to incluye el memberId
    const filtered = (routines || []).filter(r => Array.isArray(r.assigned_to) && r.assigned_to.includes(memberId));
    // Para cada rutina, obtener días y ejercicios
    const routinesWithDetails = await Promise.all((filtered || []).map(async (routine) => {
      const { data: days, error: daysError } = await supabase
        .from('routine_days')
        .select('*')
        .eq('routine_id', routine.id);
      if (daysError) return { ...routine, days: [] };
      // Para cada día, obtener ejercicios
      const daysWithExercises = await Promise.all((days || []).map(async (day) => {
        const { data: exercises, error: exError } = await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_day_id', day.id);
        return { ...day, exercises: exError ? [] : exercises };
      }));
      return { ...routine, days: daysWithExercises };
    }));
    return { success: true, routines: routinesWithDetails };
  } catch (error) {
    console.error('❌ Error obteniendo rutinas personalizadas del miembro:', error);
    return { success: false, error: error.message };
  }
};

// ================ PLANES NUTRICIONALES ================

export const createNutritionPlan = async (planData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Insertar el plan nutricional
    const { data: plan, error: planError } = await supabase
      .from('nutrition_plans')
      .insert({
        title: planData.name || planData.title,
        notes: planData.notes || planData.description,
        coach_id: user.id,
        start_date: planData.start_date || null,
        end_date: planData.end_date || null
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creando plan nutricional:', planError);
      throw planError;
    }

    // Si hay miembros seleccionados, crear asignaciones en la tabla intermedia
    if (Array.isArray(planData.assigned_to) && planData.assigned_to.length > 0) {
      const assignments = planData.assigned_to.map(memberId => ({
        nutrition_plan_id: plan.id,
        member_id: memberId,
        start_date: planData.start_date || null,
        end_date: planData.end_date || null,
        status: 'activo'
      }));
      const { error: assignError } = await supabase
        .from('nutrition_plan_assignments')
        .insert(assignments);
      if (assignError) {
        console.error('Error asignando miembros al plan:', assignError);
        throw assignError;
      }
    }

    return { success: true, nutritionPlan: plan };

  } catch (error) {
    console.error('❌ Error creando plan nutricional:', error);
    return { success: false, error: error.message };
  }
};

export const getCoachNutritionPlans = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Consulta usando coach_id en lugar de created_by
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo planes nutricionales:', error);
      throw error;
    }

    console.log('✅ Planes nutricionales obtenidos:', data);
    return { success: true, nutritionPlans: data || [] };

  } catch (error) {
    console.error('❌ Error obteniendo planes nutricionales:', error);
    return { success: false, error: error.message };
  }
};

// ================ FUNCIONES DE UTILIDAD ================

export const getAssignedMembersForSelect = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener el perfil del usuario para saber si es admin o coach
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, gym_id')
      .eq('id', user.id)
      .single();
    if (profileError) {
      throw profileError;
    }

    let members = [];
    let error = null;
    if (profile.role === 'gym_admin') {
      // Si es admin, traer todos los miembros del gimnasio
      const { data, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'member')
        .order('first_name');
      members = data || [];
      error = membersError;
    } else {
      // Si es coach, solo los asignados a él
      const { data, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('assigned_coach_id', user.id)
        .eq('role', 'member')
        .order('first_name');
      members = data || [];
      error = membersError;
    }

    if (error) {
      console.error('Error obteniendo miembros:', error);
      throw error;
    }
    return { success: true, members };

  } catch (error) {
    console.error('❌ Error obteniendo miembros para select:', error);
    return { success: false, error: error.message };
  }
};