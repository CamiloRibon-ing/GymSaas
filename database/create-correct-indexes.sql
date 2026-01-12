-- Script para crear índices correctos basado en la estructura real de las tablas
-- Ejecutar en Supabase SQL Editor

-- Índices para nutrition_plans (tabla existente con user_id y coach_id)
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach_id ON nutrition_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_created_at ON nutrition_plans(created_at);

-- Índices para routines (tabla nueva con created_by y assigned_to)
CREATE INDEX IF NOT EXISTS idx_routines_created_by ON routines(created_by);
CREATE INDEX IF NOT EXISTS idx_routines_assigned_to ON routines(assigned_to);
CREATE INDEX IF NOT EXISTS idx_routines_status ON routines(status);

-- Índices para routine_days
CREATE INDEX IF NOT EXISTS idx_routine_days_routine_id ON routine_days(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_days_day_order ON routine_days(day_order);

-- Índices para routine_exercises  
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_day_id ON routine_exercises(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise_order ON routine_exercises(exercise_order);

-- Índices para weekly_routines
CREATE INDEX IF NOT EXISTS idx_weekly_routines_coach_id ON weekly_routines(coach_id);

-- Verificar que se crearon correctamente
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('nutrition_plans', 'routines', 'routine_days', 'routine_exercises', 'weekly_routines')
AND schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;