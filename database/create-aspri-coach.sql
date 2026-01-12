-- Script para verificar el coach matias@gmail.com en gym_members
-- Ejecutar en Supabase SQL Editor

-- Primero verificar si el coach ya existe
SELECT * FROM gym_members WHERE email = 'matias@gmail.com' AND role = 'coach';

-- Si no existe, crearlo
INSERT INTO gym_members (
  gym_id,
  first_name,
  last_name,
  phone,
  email,
  role,
  speciality,
  experience,
  bio,
  status
) 
SELECT 
  g.id as gym_id,
  'Matias' as first_name,
  'Coach' as last_name,
  '123-456-7890' as phone,
  'matias@gmail.com' as email,
  'coach' as role,
  'Entrenamiento Personal' as speciality,
  '3 años' as experience,
  'Coach especializado en rutinas personalizadas y nutrición' as bio,
  'Activo' as status
FROM gyms g
WHERE g.slug = 'smart-fit'
AND NOT EXISTS (
  SELECT 1 FROM gym_members 
  WHERE email = 'matias@gmail.com' AND role = 'coach'
);

-- Verificar que se creó correctamente
SELECT id, first_name, last_name, email, role, gym_id 
FROM gym_members 
WHERE email = 'matias@gmail.com' AND role = 'coach';

-- Opcional: Asignar algunos miembros existentes a este coach
UPDATE gym_members 
SET assigned_coach_id = (
  SELECT id FROM gym_members WHERE email = 'matias@gmail.com' AND role = 'coach'
)
WHERE id IN (
  SELECT id FROM gym_members 
  WHERE role = 'member' 
  AND gym_id = (SELECT id FROM gyms WHERE slug = 'power-gym')
  AND assigned_coach_id IS NULL
  LIMIT 3
);