// Script para crear miembros de ejemplo y asignarlos al coach matias
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fenwlslpsfyvplrbafqb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbndsc2xwc2Z5dnBscmJhZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjYwMTMsImV4cCI6MjA4MzQwMjAxM30.qJHoxBMWhLeS9vTxSs4vbtpTK7Xwi55SDSZZDHx4nkU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createMembersForCoach() {
  console.log('👥 === CREANDO MIEMBROS PARA COACH MATIAS ===');

  try {
    // 1. Buscar el coach matias
    const { data: coachData, error: coachError } = await supabase
      .from('gym_members')
      .select('*')
      .eq('email', 'matias@gmail.com')
      .eq('role', 'coach')
      .single();

    if (coachError || !coachData) {
      console.error('❌ Coach matias no encontrado:', coachError);
      return;
    }

    console.log('✅ Coach encontrado:', coachData.first_name, coachData.last_name);
    console.log('🏢 Gym ID:', coachData.gym_id);

    // 2. Miembros de ejemplo para crear
    const membersToCreate = [
      {
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan.perez@email.com',
        phone: '555-0101',
        membership_type: 'Premium'
      },
      {
        first_name: 'María',
        last_name: 'García',
        email: 'maria.garcia@email.com', 
        phone: '555-0102',
        membership_type: 'Básica'
      },
      {
        first_name: 'Carlos',
        last_name: 'Rodríguez',
        email: 'carlos.rodriguez@email.com',
        phone: '555-0103',
        membership_type: 'Premium'
      },
      {
        first_name: 'Ana',
        last_name: 'Martínez',
        email: 'ana.martinez@email.com',
        phone: '555-0104',
        membership_type: 'VIP'
      },
      {
        first_name: 'Luis',
        last_name: 'González',
        email: 'luis.gonzalez@email.com',
        phone: '555-0105',
        membership_type: 'Básica'
      }
    ];

    console.log('👤 Creando miembros...');

    for (const memberData of membersToCreate) {
      // Verificar si el miembro ya existe
      const { data: existingMember } = await supabase
        .from('gym_members')
        .select('id')
        .eq('email', memberData.email)
        .single();

      if (existingMember) {
        console.log(`   ⚠️ ${memberData.first_name} ${memberData.last_name} ya existe`);
        continue;
      }

      // Crear el miembro
      const { data: newMember, error: memberError } = await supabase
        .from('gym_members')
        .insert({
          gym_id: coachData.gym_id,
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          phone: memberData.phone,
          email: memberData.email,
          role: 'member',
          membership_type: memberData.membership_type,
          status: 'Activo',
          assigned_coach_id: coachData.id // Asignar directamente al coach matias
        })
        .select()
        .single();

      if (memberError) {
        console.error(`   ❌ Error creando ${memberData.first_name}:`, memberError);
      } else {
        console.log(`   ✅ ${newMember.first_name} ${newMember.last_name} creado y asignado al coach`);
      }
    }

    // 3. Verificar miembros asignados
    const { data: assignedMembers } = await supabase
      .from('gym_members')
      .select('*')
      .eq('assigned_coach_id', coachData.id)
      .eq('role', 'member');

    console.log('\\n📊 RESUMEN:');
    console.log(`👨‍🏫 Coach: ${coachData.first_name} ${coachData.last_name}`);
    console.log(`👥 Miembros asignados: ${assignedMembers?.length || 0}`);
    
    if (assignedMembers && assignedMembers.length > 0) {
      assignedMembers.forEach(member => {
        console.log(`   - ${member.first_name} ${member.last_name} (${member.membership_type})`);
      });
    }

    console.log('🎉 Miembros creados exitosamente!');

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar el script
createMembersForCoach()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });

export { createMembersForCoach };