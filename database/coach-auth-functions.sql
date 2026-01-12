-- Script para promocionar coaches de gym_members a usuarios autenticados
-- Este script ayuda a crear las funciones necesarias para invitar coaches

-- Función para invitar coach (se ejecuta desde el admin)
CREATE OR REPLACE FUNCTION invite_coach_to_auth(
    coach_id uuid,
    coach_email text,
    temp_password text DEFAULT 'TempPassword123!'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    coach_record gym_members%ROWTYPE;
    new_user_id uuid;
    result json;
BEGIN
    -- Verificar que el coach existe en gym_members
    SELECT * INTO coach_record 
    FROM gym_members 
    WHERE id = coach_id AND role = 'coach';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Coach no encontrado');
    END IF;
    
    -- Verificar permisos del admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('gym_admin', 'super_admin') 
        AND gym_id = coach_record.gym_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos');
    END IF;
    
    -- Crear usuario en auth.users (esto requiere configuración adicional)
    -- Por ahora devolvemos instrucciones
    RETURN json_build_object(
        'success', true, 
        'message', 'Use Supabase Dashboard para crear usuario',
        'coach_data', row_to_json(coach_record),
        'instructions', 'Crear usuario con email: ' || coach_email || ' y luego ejecutar create_coach_profile'
    );
END;
$$;

-- Función para crear perfil de coach después de crear usuario auth
CREATE OR REPLACE FUNCTION create_coach_profile(
    coach_email text,
    gym_members_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    coach_record gym_members%ROWTYPE;
    auth_user_id uuid;
    result json;
BEGIN
    -- Obtener datos del coach desde gym_members
    SELECT * INTO coach_record 
    FROM gym_members 
    WHERE id = gym_members_id AND role = 'coach';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Coach no encontrado en gym_members');
    END IF;
    
    -- Buscar el usuario auth por email
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = coach_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Usuario auth no encontrado');
    END IF;
    
    -- Crear perfil en profiles
    INSERT INTO profiles (
        id,
        gym_id,
        role,
        first_name,
        last_name,
        phone,
        created_at
    ) VALUES (
        auth_user_id,
        coach_record.gym_id,
        'coach',
        coach_record.first_name,
        coach_record.last_name,
        coach_record.phone,
        now()
    );
    
    -- Actualizar gym_members para marcar como autenticado
    UPDATE gym_members 
    SET 
        email = coach_email,
        status = 'Autenticado'
    WHERE id = gym_members_id;
    
    RETURN json_build_object('success', true, 'message', 'Perfil de coach creado exitosamente');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;