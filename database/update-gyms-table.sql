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

-- ===== CONFIGURACIÓN ADICIONAL PARA DESARROLLO =====

-- Habilitar Row Level Security (RLS) si no está habilitado
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas para permitir operaciones
CREATE POLICY IF NOT EXISTS "Permitir insertar gyms" ON gyms FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Permitir leer gyms" ON gyms FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Permitir actualizar gyms" ON gyms FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Permitir insertar profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Permitir leer profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Permitir actualizar profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Permitir insertar plans" ON plans FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Permitir leer plans" ON plans FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Permitir actualizar plans" ON plans FOR UPDATE USING (true);

-- ===== SOLUCIÓN PARA EMAIL RATE LIMIT =====
-- PASO A PASO PARA DESACTIVAR CONFIRMACIÓN DE EMAIL:

-- 1. Ve a tu Dashboard de Supabase: https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Ve a Authentication > Settings
-- 4. Busca la sección "User Signups"
-- 5. DESACTIVA "Enable email confirmations" 
-- 6. Guarda los cambios

-- Alternativamente, también puedes:
-- 7. Ve a Authentication > Email Templates 
-- 8. Cambia "Confirm signup" por un template que auto-confirme

-- O aumentar límites:
-- 9. Ve a Authentication > Rate limiting
-- 10. Aumenta los límites de "Email sending"

-- Una vez hecho esto, el registro funcionará sin problemas