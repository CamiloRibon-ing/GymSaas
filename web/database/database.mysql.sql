-- Script para crear la base de datos MySQL normalizada para GymMVP
-- Incluye todas las tablas principales y relaciones

CREATE DATABASE IF NOT EXISTS gymmvp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gymmvp;

-- Tabla de gimnasios
CREATE TABLE gyms (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  address VARCHAR(255),
  city VARCHAR(100),
  phone VARCHAR(30),
  description TEXT
);

-- Tabla de perfiles de usuario
CREATE TABLE profiles (
  id CHAR(36) PRIMARY KEY,
  gym_id CHAR(36),
  role ENUM('super_admin','gym_admin','coach','member') NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(30),
  birth_date DATE,
  gender VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  speciality VARCHAR(100),
  experience TEXT,
  bio TEXT,
  schedule TEXT,
  membership_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Activo',
  email VARCHAR(150),
  assigned_coach_id CHAR(36),
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (assigned_coach_id) REFERENCES profiles(id)
);

-- Tabla de planes
CREATE TABLE plans (
  id CHAR(36) PRIMARY KEY,
  gym_id CHAR(36),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  duration_days INT NOT NULL,
  allows_personal_routine BOOLEAN DEFAULT FALSE,
  allows_nutrition_plan BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- Membresías
CREATE TABLE memberships (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  plan_id CHAR(36),
  gym_id CHAR(36),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- Condiciones de salud
CREATE TABLE health_conditions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  condition_type ENUM('injury','disease','limitation'),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Métricas corporales
CREATE TABLE body_metrics (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  body_fat_percent DECIMAL(4,2),
  muscle_mass_kg DECIMAL(5,2),
  recorded_at DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Objetivos fitness
CREATE TABLE fitness_goals (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  goal_type ENUM('lose_weight','gain_weight','maintain','recomposition'),
  target_weight DECIMAL(5,2),
  notes TEXT,
  start_date DATE,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Rutinas
CREATE TABLE workouts (
  id CHAR(36) PRIMARY KEY,
  gym_id CHAR(36),
  coach_id CHAR(36),
  title VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (coach_id) REFERENCES profiles(id)
);

CREATE TABLE workout_exercises (
  id CHAR(36) PRIMARY KEY,
  workout_id CHAR(36),
  exercise_name VARCHAR(100),
  sets INT,
  reps INT,
  rest_seconds INT,
  notes TEXT,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

CREATE TABLE user_workouts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  workout_id CHAR(36),
  assigned_date DATE,
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

-- Planes nutricionales
CREATE TABLE nutrition_plans (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  coach_id CHAR(36),
  title VARCHAR(100),
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (coach_id) REFERENCES profiles(id)
);

CREATE TABLE nutrition_meals (
  id CHAR(36) PRIMARY KEY,
  nutrition_plan_id CHAR(36),
  meal_type ENUM('breakfast','lunch','dinner','snack'),
  description TEXT,
  calories INT,
  protein_g DECIMAL(5,2),
  carbs_g DECIMAL(5,2),
  fats_g DECIMAL(5,2),
  FOREIGN KEY (nutrition_plan_id) REFERENCES nutrition_plans(id) ON DELETE CASCADE
);

-- Tabla de miembros y coaches (si se requiere separada)
CREATE TABLE gym_members (
  id CHAR(36) PRIMARY KEY,
  gym_id CHAR(36),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  role ENUM('coach','member') NOT NULL,
  membership_type VARCHAR(50),
  speciality VARCHAR(100),
  experience TEXT,
  bio TEXT,
  schedule TEXT,
  status VARCHAR(20) DEFAULT 'Activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- Índices sugeridos
CREATE INDEX idx_profiles_gym_id ON profiles(gym_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_workouts_gym_id ON workouts(gym_id);
CREATE INDEX idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX idx_gym_members_gym_id_role ON gym_members(gym_id, role);
CREATE INDEX idx_gym_members_status ON gym_members(status);
