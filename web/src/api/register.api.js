import { supabase } from "../supabaseClient";

// Registrar un nuevo gimnasio y usuario admin
export async function registerGymAndAdmin(form) {
  try {
    console.log('🚀 Iniciando registro real del gimnasio...');
    
    // 1️⃣ Crear usuario auth con configuración especial para desarrollo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          role: 'gym_admin'
        }
      }
    });

    console.log('📧 Resultado de auth.signUp:', { authData, authError });

    if (authError) {
      console.error('❌ Error en signUp:', authError);
      
      // Si es error de rate limit, intentar crear directamente en la BD
      if (authError.message?.includes('rate limit') || authError.message?.includes('email')) {
        console.log('⚠️ Error de rate limit, intentando registro alternativo...');
        throw new Error('Límite de registros por email excedido. Por favor, usa un email diferente o inténtalo más tarde.');
      }
      
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('No se pudo obtener el ID del usuario');
    }

    console.log('✅ Usuario creado con ID:', userId);

    // 2️⃣ Crear gimnasio
    const gymSlug = form.gymName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .insert({
        name: form.gymName,
        slug: gymSlug,
        address: form.gymAddress,
        city: form.gymCity,
        phone: form.gymPhone,
        status: 'active'
      })
      .select()
      .single();

    console.log('🏢 Resultado de crear gym:', { gym, gymError });

    if (gymError) {
      console.error('❌ Error creando gym:', gymError);
      throw new Error(`Error creando gimnasio: ${gymError.message}`);
    }

    console.log('✅ Gimnasio creado:', gym);

    // 3️⃣ Crear perfil admin
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        gym_id: gym.id,
        role: "gym_admin",
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        status: 'Activo'
      });

    console.log('👤 Resultado de crear profile:', { profileError });

    if (profileError) {
      console.error('❌ Error creando profile:', profileError);
      throw new Error(`Error creando perfil: ${profileError.message}`);
    }

    console.log('✅ Perfil admin creado');

    // 4️⃣ Crear planes básicos para el gimnasio
    const basicPlans = [
      {
        gym_id: gym.id,
        name: 'Plan Básico',
        description: 'Acceso básico al gimnasio',
        price: 50000,
        duration_days: 30,
        allows_personal_routine: false,
        allows_nutrition_plan: false,
        active: true
      },
      {
        gym_id: gym.id,
        name: 'Plan Premium',
        description: 'Acceso completo + rutinas personalizadas',
        price: 80000,
        duration_days: 30,
        allows_personal_routine: true,
        allows_nutrition_plan: false,
        active: true
      },
      {
        gym_id: gym.id,
        name: 'Plan VIP',
        description: 'Acceso completo + rutinas + nutrición',
        price: 120000,
        duration_days: 30,
        allows_personal_routine: true,
        allows_nutrition_plan: true,
        active: true
      }
    ];

    const { error: plansError } = await supabase
      .from("plans")
      .insert(basicPlans);

    if (plansError) {
      console.warn('⚠️ Error creando planes básicos:', plansError);
      // No lanzar error, los planes se pueden crear después
    } else {
      console.log('✅ Planes básicos creados');
    }

    console.log('🎉 Registro completado exitosamente');
    return { gym, userId, authData };

  } catch (error) {
    console.error('💥 Error en registerGymAndAdmin:', error);
    
    // Limpiar datos parciales si hubo error
    // (En un escenario real, aquí implementarías rollback)
    
    throw error;
  }
}

// Función alternativa para desarrollo sin confirmación de email
export async function registerGymDirectly(form) {
  try {
    console.log('🛠️ Registro directo sin confirmación de email...');
    
    // Generar UUID simulado para desarrollo
    const userId = 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    
    // Crear gimnasio directamente
    const gymSlug = form.gymName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .insert({
        name: form.gymName,
        slug: gymSlug + '-dev',
        address: form.gymAddress,
        city: form.gymCity,
        phone: form.gymPhone,
        status: 'active'
      })
      .select()
      .single();

    if (gymError) throw gymError;

    return { gym, userId, message: 'Gimnasio registrado en modo desarrollo' };
    
  } catch (error) {
    console.error('Error en registro directo:', error);
    throw error;
  }
}
