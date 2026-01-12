const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fenwlslpsfyvplrbafqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbndsc2xwc2Z5dnBscmJhZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzE4MTMsImV4cCI6MjA1MTUwNzgxM30.tq0L9TL4f8qK7-qj1Ol9VFfvlvAmEiJVL8kKP7OQgf0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCoachAssignmentColumn() {
    try {
        // Verificar si la columna ya existe
        const { data: columns } = await supabase
            .rpc('get_table_columns', { table_name: 'gym_members' })
            .single();

        console.log('Columnas actuales:', columns);

        // Ejecutar el SQL para agregar la columna
        const { data, error } = await supabase
            .rpc('exec_sql', { 
                sql_query: `
                    ALTER TABLE gym_members 
                    ADD COLUMN IF NOT EXISTS assigned_coach_id uuid;
                    
                    CREATE INDEX IF NOT EXISTS idx_gym_members_assigned_coach ON gym_members(assigned_coach_id);
                `
            });

        if (error) {
            console.error('Error agregando columna:', error);
        } else {
            console.log('Columna assigned_coach_id agregada exitosamente:', data);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

addCoachAssignmentColumn();