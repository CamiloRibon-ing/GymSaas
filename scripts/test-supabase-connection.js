// Script de prueba para verificar conexión con Supabase
// Ejecutar este script en la consola del navegador para diagnosticar problemas

console.log('=== DIAGNÓSTICO DE CONEXIÓN SUPABASE ===');

// 1. Verificar que supabase esté disponible
if (typeof supabase === 'undefined') {
    console.error('❌ Supabase no está disponible');
} else {
    console.log('✅ Supabase está disponible');
}

// 2. Verificar usuario autenticado
const checkAuth = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('❌ Error obteniendo usuario:', error);
        } else if (user) {
            console.log('✅ Usuario autenticado:', user.email);
            console.log('User ID:', user.id);
        } else {
            console.error('❌ No hay usuario autenticado');
        }
    } catch (error) {
        console.error('❌ Error en auth:', error);
    }
};

// 3. Verificar perfil del usuario
const checkProfile = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) {
                console.error('❌ Error obteniendo perfil:', error);
            } else {
                console.log('✅ Perfil del usuario:', profile);
                return profile;
            }
        }
    } catch (error) {
        console.error('❌ Error consultando perfil:', error);
    }
    return null;
};

// 4. Verificar tabla gym_members
const checkGymMembers = async () => {
    try {
        const profile = await checkProfile();
        if (profile && profile.gym_id) {
            console.log('🔍 Consultando gym_members para gym_id:', profile.gym_id);
            
            const { data: members, error } = await supabase
                .from('gym_members')
                .select('*')
                .eq('gym_id', profile.gym_id);
            
            if (error) {
                console.error('❌ Error consultando gym_members:', error);
                console.log('💡 Posibles causas:');
                console.log('   - La tabla gym_members no existe');
                console.log('   - Problemas con RLS (Row Level Security)');
                console.log('   - Permisos incorrectos');
            } else {
                console.log('✅ Datos de gym_members:', members);
                console.log('📊 Total miembros/coaches:', members.length);
                
                const memberCount = members.filter(m => m.role === 'member').length;
                const coachCount = members.filter(m => m.role === 'coach').length;
                console.log('👥 Miembros:', memberCount);
                console.log('👨‍🏫 Coaches:', coachCount);
            }
        } else {
            console.error('❌ No se pudo obtener gym_id del perfil');
        }
    } catch (error) {
        console.error('❌ Error general:', error);
    }
};

// 5. Ejecutar todas las verificaciones
const runDiagnostics = async () => {
    console.log('🔍 Iniciando diagnóstico...');
    await checkAuth();
    await checkProfile();
    await checkGymMembers();
    console.log('✅ Diagnóstico completado');
};

// Ejecutar automáticamente
runDiagnostics();

// También exportar funciones para uso manual
window.gymDiagnostics = {
    checkAuth,
    checkProfile,
    checkGymMembers,
    runDiagnostics
};