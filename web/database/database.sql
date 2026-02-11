-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  gym_id uuid NOT NULL,
  action_type character varying NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  method character varying DEFAULT 'qr_code'::character varying,
  exit_timestamp timestamp with time zone,
  duration interval,
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id),
  CONSTRAINT attendance_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id)
);
CREATE TABLE public.body_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  weight_kg numeric,
  height_cm numeric,
  body_fat_percent numeric,
  muscle_mass_kg numeric,
  recorded_at date NOT NULL,
  CONSTRAINT body_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT body_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.fitness_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  goal_type text CHECK (goal_type = ANY (ARRAY['lose_weight'::text, 'gain_weight'::text, 'maintain'::text, 'recomposition'::text])),
  target_weight numeric,
  notes text,
  start_date date,
  active boolean DEFAULT true,
  CONSTRAINT fitness_goals_pkey PRIMARY KEY (id),
  CONSTRAINT fitness_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.gyms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  address text,
  city text,
  phone text,
  description text,
  CONSTRAINT gyms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.health_conditions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  condition_type text CHECK (condition_type = ANY (ARRAY['injury'::text, 'disease'::text, 'limitation'::text])),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_conditions_pkey PRIMARY KEY (id),
  CONSTRAINT health_conditions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  plan_id uuid,
  gym_id uuid,
  start_date date,
  end_date date,
  status text DEFAULT 'active'::text,
  CONSTRAINT memberships_pkey PRIMARY KEY (id),
  CONSTRAINT memberships_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id),
  CONSTRAINT memberships_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.nutrition_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nutrition_plan_id uuid,
  meal_type text CHECK (meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])),
  description text,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  CONSTRAINT nutrition_meals_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_meals_nutrition_plan_id_fkey FOREIGN KEY (nutrition_plan_id) REFERENCES public.nutrition_plans(id)
);
CREATE TABLE public.nutrition_plan_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nutrition_plan_id uuid NOT NULL,
  member_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  start_date date,
  end_date date,
  status character varying DEFAULT 'activo'::character varying,
  CONSTRAINT nutrition_plan_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_plan_assignments_nutrition_plan_id_fkey FOREIGN KEY (nutrition_plan_id) REFERENCES public.nutrition_plans(id),
  CONSTRAINT nutrition_plan_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.nutrition_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  coach_id uuid,
  title text,
  notes text,
  start_date date,
  end_date date,
  created_at timestamp without time zone DEFAULT now(),
  protein_grams integer,
  carbs_grams integer,
  fat_grams integer,
  breakfast text,
  midmorning text,
  lunch text,
  snack text,
  dinner text,
  calories integer,
  meals integer,
  type text,
  gym_id uuid,
  CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT nutrition_plans_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  gym_id uuid NOT NULL,
  plan_id uuid,
  membership_id uuid,
  amount numeric NOT NULL,
  payment_type text NOT NULL CHECK (payment_type = ANY (ARRAY['mensualidad'::text, 'rutina_normal'::text])),
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  valid_until date,
  notes text,
  status text DEFAULT 'completed'::text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id),
  CONSTRAINT payments_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id),
  CONSTRAINT payments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id),
  CONSTRAINT payments_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id)
);
CREATE TABLE public.pending_coaches (
  temp_id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  phone text,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'coach'::text,
  gym_id uuid NOT NULL,
  speciality text,
  experience text,
  bio text,
  status text DEFAULT 'Pendiente'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT pending_coaches_pkey PRIMARY KEY (temp_id)
);
CREATE TABLE public.pending_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gym_id uuid,
  first_name text NOT NULL,
  last_name text,
  phone text,
  email text NOT NULL,
  membership_type text,
  status text DEFAULT 'Pendiente'::text,
  created_at timestamp without time zone DEFAULT now(),
  notes text,
  role text,
  CONSTRAINT pending_members_pkey PRIMARY KEY (id),
  CONSTRAINT pending_members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id)
);
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gym_id uuid,
  name text NOT NULL,
  description text,
  price numeric,
  duration_days integer NOT NULL,
  allows_personal_routine boolean DEFAULT false,
  allows_nutrition_plan boolean DEFAULT false,
  active boolean DEFAULT true,
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  gym_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['super_admin'::text, 'gym_admin'::text, 'coach'::text, 'member'::text])),
  first_name text,
  last_name text,
  phone text,
  birth_date date,
  gender text,
  created_at timestamp with time zone DEFAULT now(),
  speciality text,
  experience text,
  bio text,
  schedule text,
  membership_type text,
  status text DEFAULT 'Activo'::text,
  email text,
  assigned_coach_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id),
  CONSTRAINT profiles_assigned_coach_id_fkey FOREIGN KEY (assigned_coach_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.routine_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL,
  member_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT routine_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT routine_assignments_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.routines(id),
  CONSTRAINT routine_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.routine_days (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  routine_id uuid,
  name text NOT NULL,
  day_order integer NOT NULL,
  rest_day boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  weekly_routine_id uuid,
  CONSTRAINT routine_days_pkey PRIMARY KEY (id),
  CONSTRAINT routine_days_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.routines(id),
  CONSTRAINT fk_weekly_routine FOREIGN KEY (weekly_routine_id) REFERENCES public.weekly_routines(id)
);
CREATE TABLE public.routine_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  routine_day_id uuid,
  exercise_name text NOT NULL,
  sets integer DEFAULT 3,
  reps integer DEFAULT 12,
  weight text,
  rest_seconds integer DEFAULT 60,
  notes text,
  exercise_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT routine_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT routine_exercises_routine_day_id_fkey FOREIGN KEY (routine_day_id) REFERENCES public.routine_days(id)
);
CREATE TABLE public.routines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  goal text CHECK (goal = ANY (ARRAY['fuerza'::text, 'musculo'::text, 'perdida'::text, 'resistencia'::text, 'tonificacion'::text, 'rehabilitacion'::text])),
  duration_weeks integer DEFAULT 4,
  created_by uuid,
  assigned_to ARRAY,
  gym_id uuid,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'completed'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT routines_pkey PRIMARY KEY (id),
  CONSTRAINT routines_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT routines_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id)
);
CREATE TABLE public.user_workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  workout_id uuid,
  assigned_date date,
  CONSTRAINT user_workouts_pkey PRIMARY KEY (id),
  CONSTRAINT user_workouts_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id),
  CONSTRAINT user_workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.weekly_routines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid,
  gym_id uuid,
  monday jsonb DEFAULT '[]'::jsonb,
  tuesday jsonb DEFAULT '[]'::jsonb,
  wednesday jsonb DEFAULT '[]'::jsonb,
  thursday jsonb DEFAULT '[]'::jsonb,
  friday jsonb DEFAULT '[]'::jsonb,
  saturday jsonb DEFAULT '[]'::jsonb,
  sunday jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  name text,
  CONSTRAINT weekly_routines_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_routines_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES auth.users(id),
  CONSTRAINT weekly_routines_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id)
);
CREATE TABLE public.workout_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_id uuid,
  exercise_name text,
  sets integer,
  reps integer,
  rest_seconds integer,
  notes text,
  CONSTRAINT workout_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id)
);
CREATE TABLE public.workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gym_id uuid,
  coach_id uuid,
  title text,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT workouts_pkey PRIMARY KEY (id),
  CONSTRAINT workouts_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id),
  CONSTRAINT workouts_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
);