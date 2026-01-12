-- Crear tabla separada para miembros y coaches que no requieren autenticación
-- Esta tabla almacenará información de miembros y entrenadores creados por el admin

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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_gym_members_gym_id_role ON gym_members(gym_id, role);
CREATE INDEX IF NOT EXISTS idx_gym_members_status ON gym_members(status);

-- Habilitar RLS
ALTER TABLE gym_members ENABLE ROW LEVEL SECURITY;

-- Política para que los admins puedan gestionar miembros y entrenadores de su gym
CREATE POLICY IF NOT EXISTS "Admin can manage gym members" ON gym_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('gym_admin', 'super_admin') 
            AND admin_profile.gym_id = gym_members.gym_id
        )
    );

-- Política para permitir lectura de miembros por coaches del mismo gym
CREATE POLICY IF NOT EXISTS "Coaches can view gym members" ON gym_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles coach_profile 
            WHERE coach_profile.id = auth.uid() 
            AND coach_profile.role = 'coach' 
            AND coach_profile.gym_id = gym_members.gym_id
        )
    );

COMMENT ON TABLE gym_members IS 'Tabla para almacenar información de miembros y coaches creados por admin sin requerir autenticación';
COMMENT ON COLUMN gym_members.role IS 'Rol: coach o member';
COMMENT ON COLUMN gym_members.membership_type IS 'Tipo de membresía para miembros';
COMMENT ON COLUMN gym_members.speciality IS 'Especialidad del entrenador';
COMMENT ON COLUMN gym_members.experience IS 'Años de experiencia del entrenador';