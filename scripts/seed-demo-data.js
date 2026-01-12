import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env') });

// Configurar Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createDemoData() {
  try {
    console.log("🚀 Creando datos de demostración...");

    // 1. CREAR GIMNASIO Y ADMIN
    console.log("👤 Creando administrador del gimnasio...");
    
    const { data: authAdmin, error: authAdminError } = await supabase.auth.signUp({
      email: 'admin@powergym.co',
      password: 'PowerGym2024!',
      options: {
        data: {
          first_name: 'Laura',
          last_name: 'Hernández'
        }
      }
    });

    if (authAdminError) {
      console.error("❌ Error creando admin:", authAdminError.message);
      return;
    }

    console.log("✅ Usuario admin creado:", authAdmin.user.id);

    // 2. Crear gimnasio
    console.log("🏢 Creando gimnasio...");
    
    const { data: gym, error: gymError } = await supabase
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

    console.log("✅ Gimnasio creado:", gym.id);

    // 3. Crear perfil del admin
    const { data: profileAdmin, error: profileAdminError } = await supabase
      .from('profiles')
      .insert([{
        id: authAdmin.user.id,
        gym_id: gym.id,
        role: 'gym_admin',
        first_name: 'Laura',
        last_name: 'Hernández',
        phone: '+57 1 234 5678'
      }])
      .select()
      .single();

    if (profileAdminError) {
      console.error("❌ Error creando perfil admin:", profileAdminError.message);
      return;
    }

    console.log("✅ Perfil admin creado");

    // 4. CREAR ENTRENADORES
    console.log("👨‍🏋️ Creando entrenadores...");
    
    const coaches = [
      { email: 'david.coach@powergym.co', firstName: 'David', lastName: 'Pérez' },
      { email: 'sofia.coach@powergym.co', firstName: 'Sofía', lastName: 'López' }
    ];

    for (const coach of coaches) {
      const { data: authCoach, error: authCoachError } = await supabase.auth.signUp({
        email: coach.email,
        password: 'Coach123!',
        options: {
          data: {
            first_name: coach.firstName,
            last_name: coach.lastName
          }
        }
      });

      if (authCoachError) {
        console.error(`❌ Error creando coach ${coach.email}:`, authCoachError.message);
        continue;
      }

      await supabase.from('profiles').insert([{
        id: authCoach.user.id,
        gym_id: gym.id,
        role: 'coach',
        first_name: coach.firstName,
        last_name: coach.lastName,
        phone: '+57 315 000 0000'
      }]);

      console.log(`✅ Coach creado: ${coach.email}`);
    }

    // 5. CREAR MIEMBROS
    console.log("🏃‍♀️ Creando miembros...");
    
    const members = [
      { email: 'juan.client@email.com', firstName: 'Juan', lastName: 'Torres' },
      { email: 'maria.client@email.com', firstName: 'María', lastName: 'García' },
      { email: 'carlos.client@email.com', firstName: 'Carlos', lastName: 'Ruiz' }
    ];

    for (const member of members) {
      const { data: authMember, error: authMemberError } = await supabase.auth.signUp({
        email: member.email,
        password: 'Member123!',
        options: {
          data: {
            first_name: member.firstName,
            last_name: member.lastName
          }
        }
      });

      if (authMemberError) {
        console.error(`❌ Error creando member ${member.email}:`, authMemberError.message);
        continue;
      }

      await supabase.from('profiles').insert([{
        id: authMember.user.id,
        gym_id: gym.id,
        role: 'member',
        first_name: member.firstName,
        last_name: member.lastName,
        phone: '+57 320 000 0000'
      }]);

      // Crear plan básico
      const { data: plan } = await supabase.from('plans').insert([{
        gym_id: gym.id,
        name: 'Plan Mensual',
        description: 'Acceso completo al gimnasio por 30 días',
        price: 80000,
        duration_days: 30,
        allows_personal_routine: true,
        allows_nutrition_plan: false,
        active: true
      }]).select().single();

      if (plan) {
        // Crear membresía
        await supabase.from('memberships').insert([{
          user_id: authMember.user.id,
          plan_id: plan.id,
          gym_id: gym.id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active'
        }]);
      }

      console.log(`✅ Miembro creado: ${member.email}`);
    }

    console.log(`
🎉 ¡DATOS DE DEMOSTRACIÓN CREADOS EXITOSAMENTE!

🏢 GIMNASIO: PowerGym Colombia
   ID: ${gym.id}

📧 CREDENCIALES DE ACCESO:

🔧 ADMINISTRADOR:
   Email: admin@powergym.co
   Password: PowerGym2024!
   Rol: gym_admin

👨‍🏋️ ENTRENADORES:
   Email: david.coach@powergym.co | Password: Coach123!
   Email: sofia.coach@powergym.co | Password: Coach123!
   Rol: coach

🏃‍♀️ MIEMBROS:
   Email: juan.client@email.com | Password: Member123!
   Email: maria.client@email.com | Password: Member123!
   Email: carlos.client@email.com | Password: Member123!
   Rol: member

🔗 ACCESO AL SISTEMA:
   http://localhost:5174/login

💡 PRUEBAS SUGERIDAS:
   1. Inicia con el admin para ver el panel completo
   2. Prueba un coach para gestionar clientes
   3. Entra como miembro para ver su dashboard

¡Tu sistema multi-tenant está listo! 🚀
    `);

  } catch (error) {
    console.error("❌ Error general:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Ejecutar script
createDemoData();