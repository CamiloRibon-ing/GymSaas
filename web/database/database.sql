create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text default 'active',
  created_at timestamp with time zone default now()
);

select * from gyms;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid references gyms(id),
  role text not null check (role in ('super_admin','gym_admin','coach','member')),
  first_name text,
  last_name text,
  phone text,
  birth_date date,
  gender text,
  created_at timestamp with time zone default now()
);

select * from profiles;
-- Solo actualizar email_confirmed_at (confirmed_at es generada automáticamente)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email IN (
    'admin@powergym.co',
    'david.coach@powergym.co', 
    'sofia.coach@powergym.co',
    'juan.torres@gmail.com',
    'maria.garcia@hotmail.com',
    'carlos.ruiz@outlook.com',
    'ana.martinez@gmail.com',
    'luis.perez@yahoo.com'
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id),
  name text not null,
  description text,
  price numeric(10,2),
  duration_days int not null,
  allows_personal_routine boolean default false,
  allows_nutrition_plan boolean default false,
  active boolean default true
);




create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  plan_id uuid references plans(id),
  gym_id uuid references gyms(id),
  start_date date,
  end_date date,
  status text default 'active'
);

select * from memberships;



create table health_conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  condition_type text check (condition_type in ('injury','disease','limitation')),
  description text,
  is_active boolean default true,
  created_at timestamp default now()
);



create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  body_fat_percent numeric(4,2),
  muscle_mass_kg numeric(5,2),
  recorded_at date not null
);



create table fitness_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  goal_type text check (goal_type in ('lose_weight','gain_weight','maintain','recomposition')),
  target_weight numeric(5,2),
  notes text,
  start_date date,
  active boolean default true
);



create table workouts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id),
  coach_id uuid references profiles(id),
  title text,
  description text,
  created_at timestamp default now()
);


create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_name text,
  sets int,
  reps int,
  rest_seconds int,
  notes text
);


create table user_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  workout_id uuid references workouts(id),
  assigned_date date
);



create table nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  coach_id uuid references profiles(id),
  title text,
  notes text,
  start_date date,
  end_date date,
  created_at timestamp default now()
);

create table nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  nutrition_plan_id uuid references nutrition_plans(id) on delete cascade,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  description text,
  calories int,
  protein_g numeric(5,2),
  carbs_g numeric(5,2),
  fats_g numeric(5,2)
);




-- Script para actualizar la tabla gyms en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Agregar nuevos campos a la tabla gyms
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS description TEXT;

-- Actualizar comentarios para documentar los nuevos campos
COMMENT ON COLUMN gyms.address IS 'Dirección física del gimnasio';
COMMENT ON COLUMN gyms.city IS 'Ciudad donde se ubica el gimnasio';
COMMENT ON COLUMN gyms.phone IS 'Teléfono de contacto del gimnasio';
COMMENT ON COLUMN gyms.description IS 'Descripción opcional del gimnasio';

-- Verificar la estructura actualizada
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'gyms';










-- Actualización de la tabla profiles para incluir campos adicionales de entrenadores y miembros

-- Agregar campos para entrenadores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS speciality TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Activo';

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





-- Agregar columna assigned_coach_id a gym_members
ALTER TABLE gym_members 
ADD COLUMN IF NOT EXISTS assigned_coach_id uuid;

-- Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_gym_members_assigned_coach ON gym_members(assigned_coach_id);

-- Agregar foreign key constraint (opcional, pero recomendado)
ALTER TABLE gym_members 
ADD CONSTRAINT fk_assigned_coach 
FOREIGN KEY (assigned_coach_id) 
REFERENCES gym_members(id) 
ON DELETE SET NULL;

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gym_members' 
AND column_name = 'assigned_coach_id';





















-- Tabla para rutinas personalizadas
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT CHECK (goal IN ('fuerza', 'musculo', 'perdida', 'resistencia', 'tonificacion', 'rehabilitacion')),
  duration_weeks INTEGER DEFAULT 4,
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES gym_members(id),
  gym_id UUID REFERENCES gyms(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para días de rutina
CREATE TABLE IF NOT EXISTS routine_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ej: "Día 1 - Tren Superior", "Lunes", etc.
  day_order INTEGER NOT NULL, -- para mantener orden
  rest_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para ejercicios de cada día
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id UUID REFERENCES routine_days(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER DEFAULT 3,
  reps INTEGER DEFAULT 12,
  weight TEXT, -- puede ser "60kg", "corporal", "banda elástica", etc.
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT,
  exercise_order INTEGER NOT NULL, -- para mantener orden dentro del día
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para rutina semanal general (del coach)
CREATE TABLE IF NOT EXISTS weekly_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id),
  gym_id UUID REFERENCES gyms(id),
  monday JSONB DEFAULT '[]',
  tuesday JSONB DEFAULT '[]',
  wednesday JSONB DEFAULT '[]',
  thursday JSONB DEFAULT '[]',
  friday JSONB DEFAULT '[]',
  saturday JSONB DEFAULT '[]',
  sunday JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para planes nutricionales
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT CHECK (goal IN ('perdida_peso', 'ganancia_masa', 'mantenimiento', 'deportivo')),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES gym_members(id),
  gym_id UUID REFERENCES gyms(id),
  calories_target INTEGER,
  proteins_grams INTEGER,
  carbs_grams INTEGER,
  fats_grams INTEGER,
  meals_data JSONB DEFAULT '{}', -- estructura de comidas del día
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);




CREATE INDEX IF NOT EXISTS idx_routines_created_by ON routines(created_by);
CREATE INDEX IF NOT EXISTS idx_routines_assigned_to ON routines(assigned_to);
CREATE INDEX IF NOT EXISTS idx_routine_days_routine_id ON routine_days(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_day_id ON routine_exercises(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_weekly_routines_coach_id ON weekly_routines(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_created_by ON nutrition_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_assigned_to ON nutrition_plans(assigned_to);