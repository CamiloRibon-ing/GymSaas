import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fenwlslpsfyvplrbafqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbndsc2xwc2Z5dnBscmJhZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzE4MTMsImV4cCI6MjA1MTUwNzgxM30.tq0L9TL4f8qK7-qj1Ol9VFfvlvAmEiJVL8kKP7OQgf0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoachAssignments() {
    try {
        console.log('=== VERIFICANDO DATOS DE COACHES Y MIEMBROS ===');
        
        // Obtener todos los miembros con sus asignaciones de coach
        const { data: members, error: membersError } = await supabase
            .from('gym_members')
            .select('id, first_name, last_name, role, assigned_coach_id, gym_id')
            .eq('role', 'member')
            .order('first_name');

        if (membersError) {
            console.error('Error obteniendo miembros:', membersError);
            return;
        }

        console.log('\n📋 MIEMBROS EN LA BASE DE DATOS:');
        members.forEach(member => {
            console.log(`- ${member.first_name} ${member.last_name} (ID: ${member.id})`);
            console.log(`  Gym ID: ${member.gym_id}`);
            console.log(`  Coach asignado: ${member.assigned_coach_id || 'Sin asignar'}`);
            console.log('');
        });

        // Obtener todos los coaches
        const { data: coaches, error: coachesError } = await supabase
            .from('gym_members')
            .select('id, first_name, last_name, role, gym_id')
            .eq('role', 'coach')
            .order('first_name');

        if (coachesError) {
            console.error('Error obteniendo coaches:', coachesError);
            return;
        }

        console.log('\n👨‍💼 COACHES EN LA BASE DE DATOS:');
        coaches.forEach(coach => {
            console.log(`- ${coach.first_name} ${coach.last_name} (ID: ${coach.id})`);
            console.log(`  Gym ID: ${coach.gym_id}`);
            
            // Contar miembros asignados a este coach
            const assignedMembers = members.filter(member => member.assigned_coach_id === coach.id);
            console.log(`  Miembros asignados: ${assignedMembers.length}`);
            
            if (assignedMembers.length > 0) {
                console.log(`  -> ${assignedMembers.map(m => m.first_name + ' ' + m.last_name).join(', ')}`);
            }
            console.log('');
        });

        console.log('\n🔗 RESUMEN DE ASIGNACIONES:');
        const assignedMembers = members.filter(m => m.assigned_coach_id);
        const unassignedMembers = members.filter(m => !m.assigned_coach_id);
        
        console.log(`- Miembros con coach asignado: ${assignedMembers.length}`);
        console.log(`- Miembros sin coach asignado: ${unassignedMembers.length}`);
        console.log(`- Total de coaches: ${coaches.length}`);

    } catch (error) {
        console.error('Error general:', error);
    }
}

checkCoachAssignments();