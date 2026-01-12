import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Supabase
const supabaseUrl = 'https://gnnqwojnblmqvvsgozlh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdublF3b2puYmxtcXZ2c2dvemxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1OTYzNTEsImV4cCI6MjA1MDE3MjM1MX0.xDnZiZj82PWr7JQCKxZlr8pGiCG-nh4qBrU-KlbXOJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createRoutinesTables() {
  try {
    console.log('🏋️ Creando tablas de rutinas...');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '..', 'database', 'create-routines-tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Dividir por declaraciones SQL individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);

    // Ejecutar cada declaración
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Ejecutando declaración ${i + 1}...`);
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement 
          });
          
          if (error) {
            // Si el error es que la función no existe, usar una alternativa
            console.log(`⚠️ Intentando método alternativo para declaración ${i + 1}...`);
            
            // Para CREATE TABLE, usar el cliente directamente
            if (statement.toUpperCase().includes('CREATE TABLE')) {
              const { error: directError } = await supabase
                .from('_supabase_admin')
                .select('*')
                .limit(0);
              
              console.log(`ℹ️ Declaración ${i + 1} puede requerir ejecución manual en Supabase Dashboard`);
            }
          } else {
            console.log(`✅ Declaración ${i + 1} ejecutada correctamente`);
          }
        } catch (err) {
          console.error(`❌ Error en declaración ${i + 1}:`, err.message);
          console.log(`📄 Declaración: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log('🎉 Proceso de creación de tablas completado');
    console.log('⚠️  Si hay errores, ejecuta manualmente el SQL en Supabase Dashboard:');
    console.log('   1. Ve a https://supabase.com/dashboard/project/gnnqwojnblmqvvsgozlh/sql');
    console.log('   2. Copia el contenido de database/create-routines-tables.sql');
    console.log('   3. Pégalo y ejecuta');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Función alternativa: mostrar las declaraciones para ejecución manual
function showSQLForManualExecution() {
  const sqlFile = path.join(__dirname, '..', 'database', 'create-routines-tables.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  console.log('\n📋 SQL para ejecutar manualmente en Supabase Dashboard:');
  console.log('=' .repeat(80));
  console.log(sqlContent);
  console.log('=' .repeat(80));
  console.log('\nEjecuta este SQL en: https://supabase.com/dashboard/project/gnnqwojnblmqvvsgozlh/sql');
}

// Ejecutar ambas funciones
createRoutinesTables();
showSQLForManualExecution();