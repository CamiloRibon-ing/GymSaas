import { supabase } from '../src/supabaseClient.js';

// Script para probar login directamente
async function testLogin() {
  console.log("🧪 Testing login credentials...");
  
  const testUsers = [
    { email: 'admin@powergym.co', password: 'PowerGym2024!', role: 'admin' },
    { email: 'david.coach@powergym.co', password: 'Coach123!', role: 'coach' },
    { email: 'juan.torres@gmail.com', password: 'Member123!', role: 'member' }
  ];

  for (const testUser of testUsers) {
    try {
      console.log(`\n🔍 Probando ${testUser.role}: ${testUser.email}`);
      
      // 1. Intentar login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      if (authError) {
        console.error(`❌ Error de auth para ${testUser.email}:`, authError.message);
        continue;
      }

      console.log(`✅ Auth exitoso para ${testUser.email}`);

      // 2. Obtener perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          gyms (
            id,
            name
          )
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error(`❌ Error de perfil para ${testUser.email}:`, profileError.message);
      } else {
        console.log(`✅ Perfil obtenido:`, {
          name: `${profile.first_name} ${profile.last_name}`,
          role: profile.role,
          gym: profile.gyms?.name
        });
      }

      // 3. Cerrar sesión para la siguiente prueba
      await supabase.auth.signOut();

    } catch (error) {
      console.error(`❌ Error general para ${testUser.email}:`, error.message);
    }
  }

  console.log("\n🎯 Prueba de credenciales completada");
}

// Ejecutar si estamos en el navegador
if (typeof window !== 'undefined') {
  window.testLogin = testLogin;
  console.log("💡 Para probar las credenciales, ejecuta: testLogin() en la consola");
}

export default testLogin;