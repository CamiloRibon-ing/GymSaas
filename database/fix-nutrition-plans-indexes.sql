-- Script para verificar y corregir la estructura de nutrition_plans
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar la estructura actual de la tabla nutrition_plans
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'nutrition_plans' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si las columnas problemáticas existen
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_plans' AND column_name = 'assigned_to') as has_assigned_to,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_plans' AND column_name = 'created_by') as has_created_by,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_plans' AND column_name = 'user_id') as has_user_id,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_plans' AND column_name = 'coach_id') as has_coach_id;

-- 3. Si la tabla tiene user_id y coach_id (en lugar de assigned_to y created_by), crear índices correctos
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach_id ON nutrition_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);

-- 4. Si la tabla NO tiene las columnas created_by y assigned_to, agregarlas
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES gym_members(id);

-- 5. Ahora crear los índices originales si las columnas existen
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_created_by ON nutrition_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_assigned_to ON nutrition_plans(assigned_to);

-- 6. Crear los demás índices que no deberían dar problema
CREATE INDEX IF NOT EXISTS idx_routines_created_by ON routines(created_by);
CREATE INDEX IF NOT EXISTS idx_routines_assigned_to ON routines(assigned_to);
CREATE INDEX IF NOT EXISTS idx_routine_days_routine_id ON routine_days(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_day_id ON routine_exercises(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_weekly_routines_coach_id ON weekly_routines(coach_id);

-- 7. Verificar los índices creados
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('nutrition_plans', 'routines', 'routine_days', 'routine_exercises', 'weekly_routines')
AND schemaname = 'public'
ORDER BY tablename, indexname;