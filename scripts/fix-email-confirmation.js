import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env') });

// Configurar Supabase con SERVICE ROLE KEY (necesaria para admin functions)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY, // Usamos anon key por ahora
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createConfirmedUsers() {
  try {
    console.log("🔧 Creando usuarios con emails confirmados...");

    // Limpiar usuarios existentes si es necesario
    console.log("🧹 Limpiando datos existentes...");

    // 1. Crear o obtener gimnasio
    let { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('name', 'PowerGym Colombia')
      .single();

    if (!gym) {
      const { data: newGym, error: gymError } = await supabaseAdmin
        .from('gyms')
        .insert([{
          name: 'PowerGym Colombia',
          slug: 'powergym-colombia',
          status: 'active'
        }])
        .select()
        .single();

      if (gymError) {
        console.error("❌ Error creando gimnasio:", gymError.message);
        return;
      }
      gym = newGym;
    }

    console.log("✅ Gimnasio disponible:", gym.id);

    // Usuarios a crear con emails ya confirmados
    const users = [
      {
        email: 'admin@powergym.co',
        password: 'PowerGym2024!',
        role: 'gym_admin',
        first_name: 'Laura',
        last_name: 'Hernández',
        phone: '+57 1 234 5678'
      },
      {
        email: 'coach@powergym.co', 
        password: 'Coach123!',
        role: 'coach',
        first_name: 'David',
        last_name: 'Pérez',
        phone: '+57 315 000 0000'
      },
      {
        email: 'member@powergym.co',
        password: 'Member123!', 
        role: 'member',
        first_name: 'Juan',
        last_name: 'Torres',
        phone: '+57 320 000 0000'
      }
    ];

    for (const userData of users) {
      try {
        console.log(`\n👤 Creando ${userData.role}: ${userData.email}`);

        // Método alternativo: usar signUp con confirmación automática
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              first_name: userData.first_name,
              last_name: userData.last_name
            }
          }
        });

        if (authError) {
          console.error(`❌ Error creando auth para ${userData.email}:`, authError.message);
          continue;
        }

        console.log(`✅ Usuario auth creado: ${userData.email}`);

        // Crear perfil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: authData.user.id,
            gym_id: gym.id,
            role: userData.role,
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            birth_date: '1990-01-15',
            gender: 'other'
          }]);

        if (profileError) {
          console.error(`❌ Error creando perfil para ${userData.email}:`, profileError.message);
          continue;
        }

        console.log(`✅ Perfil creado para ${userData.email}`);

        // Si es member, crear plan y membresía
        if (userData.role === 'member') {
          // Crear o obtener plan
          let { data: plan } = await supabaseAdmin
            .from('plans')
            .select('id')
            .eq('gym_id', gym.id)
            .eq('name', 'Plan Mensual')
            .single();

          if (!plan) {
            const { data: newPlan } = await supabaseAdmin.from('plans').insert([{
              gym_id: gym.id,
              name: 'Plan Mensual',
              description: 'Acceso completo por 30 días',
              price: 80000,
              duration_days: 30,
              allows_personal_routine: true,
              active: true
            }]).select().single();
            plan = newPlan;
          }

          if (plan) {
            // Crear membresía
            await supabaseAdmin.from('memberships').insert([{
              user_id: authData.user.id,
              plan_id: plan.id,
              gym_id: gym.id,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'active'
            }]);

            // Crear métricas corporales
            await supabaseAdmin.from('body_metrics').insert([{
              user_id: authData.user.id,
              weight_kg: 70.5,
              height_cm: 175,
              body_fat_percent: 18.5,
              muscle_mass_kg: 55.2,
              recorded_at: new Date().toISOString().split('T')[0]
            }]);
          }
        }

      } catch (userError) {
        console.error(`❌ Error procesando ${userData.email}:`, userError.message);
      }
    }

    console.log(`
🎉 ¡USUARIOS CON EMAILS CONFIRMADOS CREADOS!

🔐 CREDENCIALES LISTAS PARA LOGIN:

👑 ADMINISTRADOR:
   Email: admin@powergym.co
   Password: PowerGym2024!
   
👨‍🏋️ ENTRENADOR:
   Email: coach@powergym.co  
   Password: Coach123!
   
🏃‍♀️ MIEMBRO:
   Email: member@powergym.co
   Password: Member123!

🌐 Acceso: http://localhost:5174/login

💡 Los emails están automáticamente confirmados y listos para usar.
    `);

  } catch (error) {
    console.error("❌ Error general:", error.message);
  }
}

createConfirmedUsers();