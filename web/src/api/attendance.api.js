// Registrar salida y duración
export const registerExit = async (attendanceId) => {
  try {
    if (!attendanceId) throw new Error('ID de asistencia requerido');
    const exitTime = new Date().toISOString();
    // Obtener registro de entrada
    const { data: entryData, error: entryError } = await supabase
      .from('attendance')
      .select('timestamp')
      .eq('id', attendanceId)
      .single();
    if (entryError || !entryData) throw new Error('Registro de entrada no encontrado');
    const entryTime = entryData.timestamp;
    // Calcular duración en milisegundos y guardar como INTERVAL
    const durationMs = new Date(exitTime) - new Date(entryTime);
    // INTERVAL en formato Postgres: 'PT1H30M' o '90000 milliseconds'
    const durationInterval = `${durationMs} milliseconds`;
    // Actualizar registro con salida y duración
    const { data, error } = await supabase
      .from('attendance')
      .update({ exit_timestamp: exitTime, duration: durationInterval, action_type: 'salida' })
      .eq('id', attendanceId)
      .select();
    if (error) throw new Error(error.message);
    return { success: true, attendance: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// Obtener historial de asistencias por gimnasio
export const getAttendanceLog = async (gymId) => {
  try {
    if (!gymId) throw new Error('ID de gimnasio requerido');
    // Join con profiles para traer datos del miembro
    const { data, error } = await supabase
      .from('attendance')
      .select('*, member:profiles(id, first_name, last_name, membership_type, email, phone)')
      .eq('gym_id', gymId)
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, attendance: data };
  } catch (error) {
    return { success: false, error: error.message, attendance: [] };
  }
};
import { supabase } from '../supabaseClient';

// ============= API PARA MIEMBROS QR =============

/**
 * Obtener todos los miembros del gimnasio para códigos QR
 * @param {string} gymId - ID del gimnasio (opcional)
 */
export const getGymMembersForQR = async (gymId = null) => {
  try {
    console.log('🔍 Obteniendo miembros reales del gimnasio para QR...');
    console.log('🏋️ Gym ID proporcionado:', gymId);
    let targetGymId = gymId;
    if (!targetGymId) {
      throw new Error('Se requiere gymId');
    }
    console.log('🎯 Buscando miembros para gym:', targetGymId);

    // USAR LA MISMA FUENTE QUE EL ADMIN: tabla 'profiles' en lugar de 'gym_members'
    console.log('📋 Usando tabla PROFILES (igual que el admin) para consistencia...');
    
    const { data: profileMembers, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('gym_id', targetGymId)
      .eq('role', 'member')
      .order('first_name');

    console.log('📊 Consulta a PROFILES - Error:', profileError);
    console.log('📊 Consulta a PROFILES - Datos:', profileMembers);

    let finalMembers = profileMembers;
    
    // Si no hay miembros en profiles, intentar gym_members como fallback
    if (!profileMembers || profileMembers.length === 0) {
      console.log('🔄 No hay miembros en PROFILES, intentando GYM_MEMBERS como fallback...');
      
      const { data: gymMembers, error: gymError } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', targetGymId)
        .eq('role', 'member')
        .in('status', ['Activo', 'activo', 'active', 'ACTIVO', 'Active'])
        .order('first_name');

      console.log('📊 Fallback GYM_MEMBERS - Error:', gymError);
      console.log('📊 Fallback GYM_MEMBERS - Datos:', gymMembers);
      
      if (gymMembers && gymMembers.length > 0) {
        finalMembers = gymMembers;
      }
    }

    if (profileError && gymError) {
      console.error('❌ Error obteniendo miembros de ambas tablas:', profileError, gymError);
      throw new Error(`Error consultando base de datos: ${profileError?.message || gymError?.message}`);
    }

    console.log('✅ Miembros reales obtenidos:', finalMembers?.length || 0);
    
    if (!finalMembers || finalMembers.length === 0) {
      return {
        success: true,
        members: [],
        message: 'No hay miembros registrados'
      };
    }
    
    // Formatear datos para QR (manejar ambas estructuras de tablas)
    const formattedMembers = (finalMembers || []).map((member, index) => ({
      id: member.id,
      shortId: `M${String(index + 1).padStart(3, '0')}`, // M001, M002, etc.
      name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      email: member.email || `${member.first_name?.toLowerCase() || 'member'}@gym.com`,
      phone: member.phone || 'N/A',
      // Manejar membership_type vs membership
      membership: member.membership_type || member.membership || 'mensualidad',
      status: member.status || 'Activo',
      gymId: member.gym_id,
      createdAt: member.created_at
    }));

    return {
      success: true,
      members: formattedMembers,
      total: formattedMembers.length
    };

  } catch (error) {
    console.error('❌ Error en getGymMembersForQR:', error);
    return {
      success: false,
      error: error.message,
      members: []
    };
  }
};

/**
 * Obtener un miembro específico por ID para QR
 */
export const getMemberForQR = async (memberId) => {
  try {
    console.log('🔍 Buscando miembro para QR con ID:', memberId);
    if (!memberId) {
      throw new Error('ID de miembro requerido');
    }
    const { data: member, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .eq('role', 'member')
      .single();
    if (error || !member) {
      throw new Error(`Miembro ${memberId} no encontrado en profiles`);
    }
    const formattedMember = {
      id: member.id,
      name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      email: member.email || `${member.first_name?.toLowerCase() || 'usuario'}@gym.com`,
      phone: member.phone || 'N/A',
      membership: member.membership_type || 'mensualidad',
      status: member.status || 'Activo',
      gymId: member.gym_id,
      createdAt: member.created_at
    };
    return { success: true, member: formattedMember };
  } catch (error) {
    console.error('❌ Error en getMemberForQR:', error);
    return {
      success: false,
      error: error.message,
      member: null
    };
  }
};

// Función para validar QR y obtener miembro
export const validateQRAndGetMember = async (qrData) => {
  try {
    let parsedData;
    if (typeof qrData === 'string') {
      parsedData = JSON.parse(qrData);
    } else {
      parsedData = qrData;
    }
    if (!(parsedData.memberDbId || parsedData.id) || !parsedData.t || parsedData.t !== 'gym') {
      throw new Error('Código QR inválido');
    }
    // Buscar miembro real en la base de datos usando el ID y el gimnasio
    let { data: member, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', parsedData.memberDbId || parsedData.id)
      .eq('role', 'member')
      .eq('gym_id', parsedData.gymId)
      .single();
    if (error || !member) {
      throw new Error('Miembro no encontrado en la base de datos o no pertenece a este gimnasio');
    }
    if (member.status !== 'Activo') {
      throw new Error(`Miembro ${member.first_name} ${member.last_name} no está activo`);
    }
    if (parsedData.exp && parsedData.exp < Date.now()) {
      throw new Error('Código QR expirado');
    }
    return {
      success: true,
      member: {
        id: member.id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        email: member.email,
        phone: member.phone,
        membership: member.membership_type || 'mensualidad',
        status: member.status,
        qrData: parsedData
      }
    };
  } catch (error) {
    console.error('❌ Error validando QR:', error);
    return {
      success: false,
      error: error.message,
      member: null
    };
  }
};

// Registrar asistencia (dummy, solo log)
export const registerAttendance = async (memberId, actionType = 'entrada') => {
  try {
    if (!memberId) throw new Error('ID de miembro requerido');
    // Buscar miembro
    let { data: member, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .eq('role', 'member')
      .single();
    if (error || !member) {
      throw new Error('Miembro no encontrado');
    }
    const attendanceRecord = {
      member_id: memberId,
      gym_id: member.gym_id,
      action_type: actionType,
      timestamp: new Date().toISOString(),
      method: 'qr_code'
    };
    // Insertar asistencia en la tabla 'attendance'
    const { data: insertData, error: insertError } = await supabase
      .from('attendance')
      .insert([attendanceRecord])
      .select();
    if (insertError) {
      throw new Error('Error guardando asistencia en la base de datos: ' + insertError.message);
    }
    return {
      success: true,
      attendance: insertData[0],
      member: {
        name: `${member.first_name} ${member.last_name}`.trim(),
        membership: member.membership_type || 'mensualidad'
      }
    };
  } catch (error) {
    console.error('❌ Error registrando asistencia:', error);
    return {
      success: false,
      error: error.message,
      attendance: null,
      member: null
    };
  }
};