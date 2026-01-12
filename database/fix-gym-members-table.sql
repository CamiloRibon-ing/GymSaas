-- Script de verificación y corrección para la base de datos

-- 1. Verificar si la tabla gym_members existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'gym_members'
) as table_exists;

-- 2. Si no existe, crearla
CREATE TABLE IF NOT EXISTS gym_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  role text not null check (role in ('coach','member')),
  membership_type text,
  speciality text, -- Para coaches
  experience text, -- Para coaches
  bio text, -- Para coaches
  schedule text, -- Para coaches
  status text default 'Activo',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_gym_members_gym_id_role ON gym_members(gym_id, role);
CREATE INDEX IF NOT EXISTS idx_gym_members_status ON gym_members(status);

-- 4. Habilitar RLS
ALTER TABLE gym_members ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas existentes que puedan estar causando problemas
DROP POLICY IF EXISTS "Admin can manage gym members" ON gym_members;
DROP POLICY IF EXISTS "Coaches can view gym members" ON gym_members;

-- 6. Crear políticas más permisivas para testing
CREATE POLICY "Admin can manage gym members" ON gym_members
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('gym_admin', 'super_admin', 'admin') 
            AND admin_profile.gym_id = gym_members.gym_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('gym_admin', 'super_admin', 'admin') 
            AND admin_profile.gym_id = gym_members.gym_id
        )
    );

-- 7. Política para coaches ver miembros de su gym
CREATE POLICY "Coaches can view gym members" ON gym_members
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles coach_profile 
            WHERE coach_profile.id = auth.uid() 
            AND coach_profile.role IN ('coach', 'gym_admin', 'super_admin', 'admin')
            AND coach_profile.gym_id = gym_members.gym_id
        )
    );

-- 8. Verificar que las políticas están activas
SELECT * FROM pg_policies WHERE tablename = 'gym_members';