-- Script para aplicar Row Level Security (RLS) a las tablas de rutinas
-- Ejecutar en Supabase SQL Editor

-- Habilitar RLS en todas las tablas de rutinas
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Coaches can view their routines" ON routines;
DROP POLICY IF EXISTS "Coaches can create routines" ON routines;
DROP POLICY IF EXISTS "Coaches can update their routines" ON routines;
DROP POLICY IF EXISTS "Access routine_days based on routine access" ON routine_days;
DROP POLICY IF EXISTS "Access routine_exercises based on routine access" ON routine_exercises;
DROP POLICY IF EXISTS "Coaches can manage their weekly routines" ON weekly_routines;
DROP POLICY IF EXISTS "Coaches can view their nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Coaches can create nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Coaches can update their nutrition plans" ON nutrition_plans;

-- POLÍTICAS PARA RUTINAS
-- Los coaches pueden ver las rutinas que crearon y las asignadas a sus clientes
CREATE POLICY "Coaches can view their routines" ON routines
  FOR SELECT USING (
    created_by = auth.uid() OR
    assigned_to IN (
      SELECT id FROM gym_members WHERE assigned_coach_id IN (
        SELECT id FROM gym_members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND role = 'coach'
      )
    )
  );

-- Los coaches pueden crear rutinas
CREATE POLICY "Coaches can create routines" ON routines
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Los coaches pueden actualizar sus rutinas
CREATE POLICY "Coaches can update their routines" ON routines
  FOR UPDATE USING (created_by = auth.uid());

-- Los coaches pueden eliminar sus rutinas
CREATE POLICY "Coaches can delete their routines" ON routines
  FOR DELETE USING (created_by = auth.uid());

-- POLÍTICAS PARA DÍAS DE RUTINA
CREATE POLICY "Access routine_days based on routine access" ON routine_days
  FOR ALL USING (
    routine_id IN (
      SELECT id FROM routines WHERE 
        created_by = auth.uid() OR
        assigned_to IN (
          SELECT id FROM gym_members WHERE assigned_coach_id IN (
            SELECT id FROM gym_members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND role = 'coach'
          )
        )
    )
  );

-- POLÍTICAS PARA EJERCICIOS DE RUTINA
CREATE POLICY "Access routine_exercises based on routine access" ON routine_exercises
  FOR ALL USING (
    routine_day_id IN (
      SELECT rd.id FROM routine_days rd
      JOIN routines r ON rd.routine_id = r.id
      WHERE r.created_by = auth.uid() OR
        r.assigned_to IN (
          SELECT id FROM gym_members WHERE assigned_coach_id IN (
            SELECT id FROM gym_members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND role = 'coach'
          )
        )
    )
  );

-- POLÍTICAS PARA RUTINAS SEMANALES
CREATE POLICY "Coaches can manage their weekly routines" ON weekly_routines
  FOR ALL USING (coach_id = auth.uid());

-- POLÍTICAS PARA PLANES NUTRICIONALES
-- Los coaches pueden ver los planes que crearon y los asignados a sus clientes
CREATE POLICY "Coaches can view their nutrition plans" ON nutrition_plans
  FOR SELECT USING (
    created_by = auth.uid() OR
    assigned_to IN (
      SELECT id FROM gym_members WHERE assigned_coach_id IN (
        SELECT id FROM gym_members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND role = 'coach'
      )
    )
  );

-- Los coaches pueden crear planes nutricionales
CREATE POLICY "Coaches can create nutrition plans" ON nutrition_plans
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Los coaches pueden actualizar sus planes nutricionales
CREATE POLICY "Coaches can update their nutrition plans" ON nutrition_plans
  FOR UPDATE USING (created_by = auth.uid());

-- Los coaches pueden eliminar sus planes nutricionales
CREATE POLICY "Coaches can delete their nutrition plans" ON nutrition_plans
  FOR DELETE USING (created_by = auth.uid());

-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('routines', 'routine_days', 'routine_exercises', 'weekly_routines', 'nutrition_plans');

-- Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('routines', 'routine_days', 'routine_exercises', 'weekly_routines', 'nutrition_plans');