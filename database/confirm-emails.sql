-- SCRIPT SQL PARA CONFIRMAR EMAILS EN SUPABASE
-- Ejecutar en el SQL Editor de Supabase

-- 1. Confirmar emails de usuarios existentes (corregido)
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

-- 2. Verificar que se aplicaron los cambios
SELECT 
    email,
    email_confirmed_at,
    confirmed_at,
    created_at
FROM auth.users 
WHERE email IN (
    'admin@powergym.co',
    'david.coach@powergym.co', 
    'sofia.coach@powergym.co',
    'juan.torres@gmail.com',
    'maria.garcia@hotmail.com',
    'carlos.ruiz@outlook.com',
    'ana.martinez@gmail.com',
    'luis.perez@yahoo.com'
)
ORDER BY created_at;