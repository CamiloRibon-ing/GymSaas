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

-- RLS (Row Level Security) policies
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Política para rutinas: coaches pueden ver las que crearon y las asignadas a sus clientes
CREATE POLICY "Coaches can view their routines" ON routines
  FOR SELECT USING (
    created_by = auth.uid() OR
    assigned_to IN (
      SELECT id FROM gym_members WHERE assigned_coach_id IN (
        SELECT id FROM gym_members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND role = 'coach'
      )
    )
  );

CREATE POLICY "Coaches can create routines" ON routines
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Coaches can update their routines" ON routines
  FOR UPDATE USING (created_by = auth.uid());

-- Políticas para días de rutina
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

-- Políticas para ejercicios de rutina
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

-- Política para rutinas semanales
CREATE POLICY "Coaches can manage their weekly routines" ON weekly_routines
  FOR ALL USING (coach_id = auth.uid());

-- Política para planes nutricionales
CREATE POLICY "Coaches can view their nutrition plans" ON nutrition_plans
  FOR SELECT USING (
    created_by = auth.uid() OR
    assigned_to IN (
      SELECT id FROM gym_members WHERE assigned_coach_id IN (
        SELECT id FROM gym_members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND role = 'coach'
      )
    )
  );

CREATE POLICY "Coaches can create nutrition plans" ON nutrition_plans
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Coaches can update their nutrition plans" ON nutrition_plans
  FOR UPDATE USING (created_by = auth.uid());

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_routines_created_by ON routines(created_by);
CREATE INDEX IF NOT EXISTS idx_routines_assigned_to ON routines(assigned_to);
CREATE INDEX IF NOT EXISTS idx_routine_days_routine_id ON routine_days(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_day_id ON routine_exercises(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_weekly_routines_coach_id ON weekly_routines(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_created_by ON nutrition_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_assigned_to ON nutrition_plans(assigned_to);