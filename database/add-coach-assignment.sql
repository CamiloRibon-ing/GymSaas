-- Script para agregar la relación coach-miembro

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