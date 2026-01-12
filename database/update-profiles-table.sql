-- Actualización de la tabla profiles para incluir campos adicionales de entrenadores y miembros

-- Agregar campos básicos que faltan
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Agregar campos para entrenadores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS speciality TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Activo';

-- Actualizar datos existentes para evitar problemas de null
UPDATE profiles SET full_name = CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Actualizar configuración RLS para permitir operaciones CRUD
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para que los admins puedan gestionar miembros y entrenadores de su gym
CREATE POLICY IF NOT EXISTS "Admin can manage gym profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin' 
            AND admin_profile.gym_id = profiles.gym_id
        )
    );

-- Política para que los usuarios puedan ver su propio perfil
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Política para que los usuarios puedan actualizar su propio perfil
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Política para permitir inserción de nuevos perfiles por admins
CREATE POLICY IF NOT EXISTS "Admin can insert gym profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin' 
            AND admin_profile.gym_id = gym_id
        )
    );

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_gym_id_role ON profiles(gym_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

COMMENT ON COLUMN profiles.speciality IS 'Especialidad del entrenador (ej: Musculación, Yoga, Cardio)';
COMMENT ON COLUMN profiles.experience IS 'Años de experiencia del entrenador';
COMMENT ON COLUMN profiles.bio IS 'Biografía del entrenador';
COMMENT ON COLUMN profiles.schedule IS 'Horario de trabajo del entrenador';
COMMENT ON COLUMN profiles.membership_type IS 'Tipo de membresía del miembro (personalizado, mensualidad, etc)';
COMMENT ON COLUMN profiles.status IS 'Estado del perfil (Activo, Inactivo, Vacaciones)';