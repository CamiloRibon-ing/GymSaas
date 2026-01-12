import React, { createContext, useContext, useState, useEffect } from 'react';
import * as dbAPI from '../services/database.api.js';
import { supabase } from '../supabaseClient.js';

const GymDataContext = createContext();

export const useGymData = () => {
  const context = useContext(GymDataContext);
  if (!context) {
    throw new Error('useGymData debe usarse dentro de GymDataProvider');
  }
  return context;
};

export const GymDataProvider = ({ children }) => {
  // Estados globales con persistencia
  const [weeklyRoutine, setWeeklyRoutine] = useState(() => {
    const saved = localStorage.getItem('gym_weekly_routine');
    return saved ? JSON.parse(saved) : {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
      sabado: []
    };
  });

  const [nutritionPlans, setNutritionPlans] = useState(() => {
    const saved = localStorage.getItem('gym_nutrition_plans');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar datos al cargar la aplicación
  useEffect(() => {
    initializeData();
  }, []);

  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('gym_members');
    return saved ? JSON.parse(saved) : [
      { 
        id: 'M001', 
        name: 'Juan Carlos Pérez',
        email: 'juan.perez@email.com',
        phone: '+57 300 123 4567',
        plan: 'premium',
        assignedCoach: 'Coach María',
        personalRoutine: null,
        nutritionPlan: null
      },
      { 
        id: 'M002', 
        name: 'María López Gómez',
        email: 'maria.lopez@email.com',
        phone: '+57 301 987 6543',
        plan: 'básico',
        assignedCoach: 'Coach Carlos',
        personalRoutine: null,
        nutritionPlan: null
      },
      { 
        id: 'M003', 
        name: 'Carlos Rodríguez Silva',
        email: 'carlos.rodriguez@email.com',
        phone: '+57 302 456 7890',
        plan: 'vip',
        assignedCoach: 'Coach Ana',
        personalRoutine: null,
        nutritionPlan: null
      },
      { 
        id: 'M004', 
        name: 'Ana Martínez Torres',
        email: 'ana.martinez@email.com',
        phone: '+57 303 654 3210',
        plan: 'premium',
        assignedCoach: 'Coach María',
        personalRoutine: null,
        nutritionPlan: null
      },
      { 
        id: 'M005', 
        name: 'Luis Fernando Castro',
        email: 'luis.castro@email.com',
        phone: '+57 304 789 0123',
        plan: 'básico',
        assignedCoach: 'Coach Carlos',
        personalRoutine: null,
        nutritionPlan: null
      },
      { 
        id: 'M006', 
        name: 'Sofia Herrera Díaz',
        email: 'sofia.herrera@email.com',
        phone: '+57 305 321 6547',
        plan: 'vip',
        assignedCoach: 'Coach Ana',
        personalRoutine: null,
        nutritionPlan: null
      }
    ];
  });

  const [coaches, setCoaches] = useState(() => {
    const saved = localStorage.getItem('gym_coaches');
    return saved ? JSON.parse(saved) : [
      {
        id: 'C001',
        name: 'María Rodríguez',
        email: 'maria.rodriguez@gym.com',
        speciality: 'Fitness y Cardio',
        assignedMembers: ['M001', 'M004']
      },
      {
        id: 'C002',
        name: 'Carlos Mendoza',
        email: 'carlos.mendoza@gym.com',
        speciality: 'Musculación',
        assignedMembers: ['M002', 'M005']
      },
      {
        id: 'C003',
        name: 'Ana García',
        email: 'ana.garcia@gym.com',
        speciality: 'Yoga y Pilates',
        assignedMembers: ['M003', 'M006']
      }
    ];
  });

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    localStorage.setItem('gym_weekly_routine', JSON.stringify(weeklyRoutine));
  }, [weeklyRoutine]);

  useEffect(() => {
    localStorage.setItem('gym_nutrition_plans', JSON.stringify(nutritionPlans));
  }, [nutritionPlans]);

  useEffect(() => {
    localStorage.setItem('gym_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('gym_coaches', JSON.stringify(coaches));
  }, [coaches]);

  // Funciones para manejar rutina semanal
  const updateWeeklyRoutine = (newRoutine) => {
    setWeeklyRoutine(newRoutine);
  };

  const addExerciseToDay = (day, exercise) => {
    setWeeklyRoutine(prev => ({
      ...prev,
      [day]: [...prev[day], exercise]
    }));
  };

  const removeExerciseFromDay = (day, exerciseIndex) => {
    setWeeklyRoutine(prev => ({
      ...prev,
      [day]: prev[day].filter((_, index) => index !== exerciseIndex)
    }));
  };

  // Funciones para manejar planes nutricionales
  const addNutritionPlan = (plan) => {
    const newPlan = {
      ...plan,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      assignedMembers: []
    };
    setNutritionPlans(prev => [...prev, newPlan]);
    return newPlan.id;
  };

  const assignNutritionPlan = (planId, memberIds) => {
    // Actualizar plan con miembros asignados
    setNutritionPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? { ...plan, assignedMembers: [...new Set([...plan.assignedMembers, ...memberIds])] }
        : plan
    ));

    // Actualizar miembros con plan asignado
    setMembers(prev => prev.map(member => 
      memberIds.includes(member.id)
        ? { ...member, nutritionPlan: planId }
        : member
    ));
  };

  // Funciones para manejar rutinas personales
  const assignPersonalRoutine = (memberId, routine) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId
        ? { ...member, personalRoutine: routine }
        : member
    ));
  };

  const updateMemberPersonalRoutine = (memberId, routine) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId
        ? { ...member, personalRoutine: routine }
        : member
    ));
  };

  // Funciones para obtener datos específicos
  const getMemberById = (memberId) => {
    return members.find(member => member.id === memberId);
  };

  const getCoachById = (coachId) => {
    return coaches.find(coach => coach.id === coachId);
  };

  const getMembersByCoach = (coachId) => {
    const coach = getCoachById(coachId);
    return coach ? members.filter(member => coach.assignedMembers.includes(member.id)) : [];
  };

  const getNutritionPlanById = (planId) => {
    return nutritionPlans.find(plan => plan.id === planId);
  };

  const value = {
    // Estados
    weeklyRoutine,
    nutritionPlans,
    members,
    coaches,
    
    // Funciones de rutina semanal
    updateWeeklyRoutine,
    addExerciseToDay,
    removeExerciseFromDay,
    
    // Funciones de nutrición
    addNutritionPlan,
    assignNutritionPlan,
    
    // Funciones de rutinas personales
    assignPersonalRoutine,
    updateMemberPersonalRoutine,
    
    // Funciones de consulta
    getMemberById,
    getCoachById,
    getMembersByCoach,
    getNutritionPlanById
  };

  return (
    <GymDataContext.Provider value={value}>
      {children}
    </GymDataContext.Provider>
  );
};