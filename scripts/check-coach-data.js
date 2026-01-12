// Script para verificar y crear el coach matias en la BD
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fenwlslpsfyvplrbafqb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbndsc2xwc2Z5dnBscmJhZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjYwMTMsImV4cCI6MjA4MzQwMjAxM30.qJHoxBMWhLeS9vTxSs4vbtpTK7Xwi55SDSZZDHx4nkU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndCreateCoach() {
  console.log('🔍 === VERIFICANDO COACH MATIAS ===');

  try {
    // 1. Verificar si el coach existe
    console.log('1️⃣ Buscando coach matias@gmail.com...');
    const { data: existingCoach, error: searchError } = await supabase
      .from('gym_members')
      .select('*')
      .eq('email', 'matias@gmail.com')
      .eq('role', 'coach');

    if (searchError) {
      console.error('❌ Error buscando coach:', searchError);
      return;
    }

    if (existingCoach && existingCoach.length > 0) {
      console.log('✅ Coach ya existe:', existingCoach[0]);
      
      // Verificar miembros asignados
      const { data: assignedMembers, error: membersError } = await supabase
        .from('gym_members')
        .select('*')
        .eq('assigned_coach_id', existingCoach[0].id)
        .eq('role', 'member');
        
      console.log('👥 Miembros asignados al coach:', assignedMembers?.length || 0);
      if (assignedMembers && assignedMembers.length > 0) {
        assignedMembers.forEach(member => {
          console.log(`   - ${member.first_name} ${member.last_name} (${member.email})`);
        });
      }
      return;
    }

    console.log('⚠️ Coach no encontrado, creándolo...');

    // 2. Buscar el gym smart-fit
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'smart-fit')
      .single();

    if (gymError || !gym) {
      console.error('❌ Gym smart-fit no encontrado:', gymError);
      
      // Buscar cualquier gym disponible
      const { data: anyGym } = await supabase
        .from('gyms')
        .select('*')
        .limit(1);
      
      console.log('🔍 Gyms disponibles:', anyGym);
      return;
    }

    console.log('✅ Gym encontrado:', gym);

    // 3. Crear el coach
    const { data: newCoach, error: createError } = await supabase
      .from('gym_members')
      .insert({
        gym_id: gym.id,
        first_name: 'Matias',
        last_name: 'Coach',
        phone: '123-456-7890',
        email: 'matias@gmail.com',
        role: 'coach',
        speciality: 'Entrenamiento Personal',
        experience: '3 años',
        bio: 'Coach especializado en rutinas personalizadas y nutrición',
        status: 'Activo'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creando coach:', createError);
      return;
    }

    console.log('✅ Coach creado exitosamente:', newCoach);

    // 4. Buscar miembros sin coach para asignar
    const { data: unassignedMembers, error: unassignedError } = await supabase
      .from('gym_members')
      .select('*')
      .eq('gym_id', gym.id)
      .eq('role', 'member')
      .is('assigned_coach_id', null)
      .limit(3);

    if (unassignedMembers && unassignedMembers.length > 0) {
      console.log('👥 Asignando miembros al coach...');
      
      for (const member of unassignedMembers) {
        const { error: assignError } = await supabase
          .from('gym_members')
          .update({ assigned_coach_id: newCoach.id })
          .eq('id', member.id);
          
        if (!assignError) {
          console.log(`   ✅ ${member.first_name} ${member.last_name} asignado al coach`);
        } else {
          console.log(`   ❌ Error asignando ${member.first_name}:`, assignError);
        }
      }
    } else {
      console.log('⚠️ No se encontraron miembros sin asignar');
    }

    console.log('🎉 Proceso completado exitosamente!');

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar si se llama directamente
checkAndCreateCoach()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });

export { checkAndCreateCoach };