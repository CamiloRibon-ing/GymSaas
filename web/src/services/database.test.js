import { supabase } from '../supabaseClient';

// Función de prueba para verificar la conexión y datos
export const testDatabaseConnection = async () => {
  console.log('🔍 Probando conexión con la base de datos...');
  
  try {
    // 1. Probar conexión básica
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Error de conexión:', connectionError);
      return false;
    }
    
    console.log('✅ Conexión exitosa a la base de datos');
    
    // 2. Obtener estadísticas de la BD
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Error obteniendo perfiles:', profilesError);
    } else {
      console.log(`📊 Perfiles en BD: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        const roles = profiles.reduce((acc, profile) => {
          acc[profile.role] = (acc[profile.role] || 0) + 1;
          return acc;
        }, {});
        console.log('👥 Distribución de roles:', roles);
      }
    }
    
    // 3. Obtener gimnasios
    const { data: gyms, error: gymsError } = await supabase
      .from('gyms')
      .select('*');
    
    if (gymsError) {
      console.error('❌ Error obteniendo gimnasios:', gymsError);
    } else {
      console.log(`🏢 Gimnasios en BD: ${gyms?.length || 0}`);
      if (gyms && gyms.length > 0) {
        gyms.forEach(gym => {
          console.log(`   - ${gym.name} (${gym.status})`);
        });
      }
    }
    
    // 4. Obtener workouts
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('*, workout_exercises(*)');
    
    if (workoutsError) {
      console.error('❌ Error obteniendo workouts:', workoutsError);
    } else {
      console.log(`💪 Workouts en BD: ${workouts?.length || 0}`);
    }
    
    // 5. Obtener planes nutricionales
    const { data: nutritionPlans, error: nutritionError } = await supabase
      .from('nutrition_plans')
      .select('*, nutrition_meals(*)');
    
    if (nutritionError) {
      console.error('❌ Error obteniendo planes nutricionales:', nutritionError);
    } else {
      console.log(`🥗 Planes nutricionales en BD: ${nutritionPlans?.length || 0}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error general en prueba de BD:', error);
    return false;
  }
};

// Función para insertar datos de prueba
export const insertTestData = async () => {
  console.log('📝 Insertando datos de prueba...');
  
  try {
    // Crear un gym de prueba si no existe
    const { data: existingGym } = await supabase
      .from('gyms')
      .select('*')
      .eq('slug', 'gym-test')
      .single();
    
    let gymId;
    if (!existingGym) {
      const { data: newGym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: 'Gym Test MVP',
          slug: 'gym-test',
          status: 'active'
        })
        .select()
        .single();
      
      if (gymError) throw gymError;
      gymId = newGym.id;
      console.log('✅ Gimnasio de prueba creado:', newGym.name);
    } else {
      gymId = existingGym.id;
      console.log('✅ Usando gimnasio existente:', existingGym.name);
    }
    
    console.log('🏢 Gym ID:', gymId);
    return gymId;
    
  } catch (error) {
    console.error('❌ Error insertando datos de prueba:', error);
    throw error;
  }
};

// Función para migrar datos locales a BD
export const migrateLocalDataToDB = async (localData) => {
  console.log('🔄 Migrando datos locales a BD...');
  
  try {
    const gymId = await insertTestData();
    
    // Migrar planes nutricionales
    if (localData.nutritionPlans && localData.nutritionPlans.length > 0) {
      console.log(`📋 Migrando ${localData.nutritionPlans.length} planes nutricionales...`);
      
      for (const plan of localData.nutritionPlans) {
        const { error } = await supabase
          .from('nutrition_plans')
          .insert({
            user_id: plan.assignedTo || 'test-user',
            coach_id: 'test-coach',
            title: plan.title,
            notes: plan.notes,
            start_date: plan.startDate,
            end_date: plan.endDate
          });
        
        if (error) {
          console.error('❌ Error migrando plan:', plan.title, error);
        } else {
          console.log('✅ Plan migrado:', plan.title);
        }
      }
    }
    
    // Migrar rutina semanal
    if (localData.weeklyRoutine) {
      console.log('💪 Migrando rutina semanal...');
      
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          gym_id: gymId,
          coach_id: 'test-coach',
          title: 'Rutina Semanal Migrada',
          description: 'Rutina migrada desde datos locales'
        })
        .select()
        .single();
      
      if (workoutError) {
        console.error('❌ Error creando workout:', workoutError);
      } else {
        console.log('✅ Workout creado para rutina semanal');
        
        // Migrar ejercicios
        const exercises = [];
        Object.entries(localData.weeklyRoutine).forEach(([day, dayExercises]) => {
          if (Array.isArray(dayExercises)) {
            dayExercises.forEach(exercise => {
              exercises.push({
                workout_id: workout.id,
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
          
          if (exercisesError) {
            console.error('❌ Error insertando ejercicios:', exercisesError);
          } else {
            console.log(`✅ ${exercises.length} ejercicios migrados`);
          }
        }
      }
    }
    
    console.log('✅ Migración completada');
    return true;
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    return false;
  }
};