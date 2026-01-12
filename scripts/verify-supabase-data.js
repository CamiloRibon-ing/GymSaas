// Script para verificar que los miembros están en Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fenwlslpsfyvplrbafqb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbndsc2xwc2Z5dnBscmJhZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjYwMTMsImV4cCI6MjA4MzQwMjAxM30.qJHoxBMWhLeS9vTxSs4vbtpTK7Xwi55SDSZZDHx4nkU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMembersInSupabase() {
  console.log('🔍 === VERIFICANDO DATOS EN SUPABASE ===');

  try {
    // 1. Buscar el coach matias
    const { data: coachData, error: coachError } = await supabase
      .from('gym_members')
      .select('*')
      .eq('email', 'matias@gmail.com')
      .eq('role', 'coach')
      .single();

    if (coachError) {
      console.error('❌ Error buscando coach:', coachError);
      return;
    }

    console.log('👨‍🏫 COACH EN SUPABASE:');
    console.log(`   Nombre: ${coachData.first_name} ${coachData.last_name}`);
    console.log(`   Email: ${coachData.email}`);
    console.log(`   ID: ${coachData.id}`);
    console.log(`   Gym ID: ${coachData.gym_id}`);
    console.log(`   Creado: ${coachData.created_at}`);

    // 2. Buscar todos los miembros asignados al coach
    const { data: members, error: membersError } = await supabase
      .from('gym_members')
      .select('*')
      .eq('assigned_coach_id', coachData.id)
      .eq('role', 'member')
      .order('first_name');

    if (membersError) {
      console.error('❌ Error buscando miembros:', membersError);
      return;
    }

    console.log('\\n👥 MIEMBROS EN SUPABASE:');
    console.log(`   Total: ${members?.length || 0} miembros`);
    
    if (members && members.length > 0) {
      members.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.first_name} ${member.last_name}`);
        console.log(`      Email: ${member.email}`);
        console.log(`      Teléfono: ${member.phone}`);
        console.log(`      Membresía: ${member.membership_type}`);
        console.log(`      ID: ${member.id}`);
        console.log(`      Creado: ${member.created_at}`);
        console.log(`      Coach ID: ${member.assigned_coach_id}`);
        console.log('');
      });
    }

    // 3. Buscar también todos los gym_members para ver el panorama completo
    const { data: allMembers, error: allError } = await supabase
      .from('gym_members')
      .select('first_name, last_name, email, role, gym_id')
      .order('created_at');

    console.log('📋 TODOS LOS REGISTROS EN GYM_MEMBERS:');
    if (allMembers && allMembers.length > 0) {
      allMembers.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.first_name} ${member.last_name} (${member.role}) - ${member.email}`);
      });
    }

    console.log('\\n✅ CONFIRMACIÓN: Los datos están realmente en SUPABASE, no son locales.');
    console.log('🌐 Base de datos: https://fenwlslpsfyvplrbafqb.supabase.co');

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar la verificación
verifyMembersInSupabase()
  .then(() => {
    console.log('\\n🎯 Script de verificación completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });