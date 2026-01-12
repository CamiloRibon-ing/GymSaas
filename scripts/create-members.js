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

async function createMembers() {
  try {
    console.log("🏃‍♀️ Creando miembros adicionales...");
    
    // Obtener el ID del gimnasio PowerGym
    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('name', 'PowerGym Colombia')
      .single();

    if (!gym) {
      console.error("❌ Gimnasio PowerGym no encontrado");
      return;
    }

    // Crear miembros con emails válidos
    const members = [
      { email: 'juan.torres@gmail.com', firstName: 'Juan', lastName: 'Torres' },
      { email: 'maria.garcia@hotmail.com', firstName: 'María', lastName: 'García' },
      { email: 'carlos.ruiz@outlook.com', firstName: 'Carlos', lastName: 'Ruiz' },
      { email: 'ana.martinez@gmail.com', firstName: 'Ana', lastName: 'Martínez' },
      { email: 'luis.perez@yahoo.com', firstName: 'Luis', lastName: 'Pérez' }
    ];

    for (const member of members) {
      try {
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

        // Crear perfil
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authMember.user.id,
          gym_id: gym.id,
          role: 'member',
          first_name: member.firstName,
          last_name: member.lastName,
          phone: '+57 320 000 0000',
          birth_date: '1990-01-15',
          gender: 'other'
        }]);

        if (profileError) {
          console.error(`❌ Error creando perfil para ${member.email}:`, profileError.message);
          continue;
        }

        // Crear o obtener plan
        let { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('gym_id', gym.id)
          .eq('name', 'Plan Mensual')
          .single();

        if (!plan) {
          const { data: newPlan } = await supabase.from('plans').insert([{
            gym_id: gym.id,
            name: 'Plan Mensual',
            description: 'Acceso completo al gimnasio por 30 días',
            price: 80000,
            duration_days: 30,
            allows_personal_routine: true,
            allows_nutrition_plan: false,
            active: true
          }]).select().single();
          plan = newPlan;
        }

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

          // Crear métricas corporales iniciales
          await supabase.from('body_metrics').insert([{
            user_id: authMember.user.id,
            weight_kg: Math.round((60 + Math.random() * 40) * 100) / 100,
            height_cm: Math.round((160 + Math.random() * 30) * 100) / 100,
            body_fat_percent: Math.round((15 + Math.random() * 15) * 100) / 100,
            muscle_mass_kg: Math.round((40 + Math.random() * 20) * 100) / 100,
            recorded_at: new Date().toISOString().split('T')[0]
          }]);

          // Crear objetivo fitness
          await supabase.from('fitness_goals').insert([{
            user_id: authMember.user.id,
            goal_type: ['lose_weight', 'gain_weight', 'maintain', 'recomposition'][Math.floor(Math.random() * 4)],
            target_weight: Math.round((65 + Math.random() * 20) * 100) / 100,
            notes: 'Objetivo inicial del usuario',
            start_date: new Date().toISOString().split('T')[0],
            active: true
          }]);
        }

        console.log(`✅ Miembro completo creado: ${member.email}`);

      } catch (memberError) {
        console.error(`❌ Error procesando ${member.email}:`, memberError.message);
      }
    }

    console.log(`
🎉 ¡MIEMBROS ADICIONALES CREADOS!

🏃‍♀️ NUEVOS MIEMBROS:
   • juan.torres@gmail.com | Password: Member123!
   • maria.garcia@hotmail.com | Password: Member123!
   • carlos.ruiz@outlook.com | Password: Member123!
   • ana.martinez@gmail.com | Password: Member123!
   • luis.perez@yahoo.com | Password: Member123!

📊 Cada miembro incluye:
   ✓ Perfil completo
   ✓ Membresía activa (Plan Mensual)
   ✓ Métricas corporales iniciales
   ✓ Objetivo fitness

🔗 Prueba el login: http://localhost:5174/login
    `);

  } catch (error) {
    console.error("❌ Error general:", error.message);
  }
}

createMembers();