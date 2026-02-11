import React, { createContext, useContext, useState, useEffect } from 'react';
import * as dbAPI from '../services/database.api';

const GymDataContext = createContext();

export const useGymData = () => {
  const context = useContext(GymDataContext);
  if (!context) {
    throw new Error('useGymData debe ser usado dentro de un GymDataProvider');
  }
  return context;
};

export const GymDataProvider = ({ children }) => {
  // Estado local con datos iniciales
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

  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('gym_members');
    return saved ? JSON.parse(saved) : [];
  });

  const [coaches, setCoaches] = useState(() => {
    const saved = localStorage.getItem('gym_coaches');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar datos al cargar la aplicación
  useEffect(() => {
    initializeData();
  }, []);

  // === FUNCIONES DE PERSISTENCIA EN BD ===
  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      // Obtener usuario actual
      const userData = await dbAPI.getCurrentUser();
      setCurrentUser(userData);

      // Si hay usuario, cargar datos desde BD
      if (userData?.profile?.gym_id) {
        await loadFromDatabase(userData.profile.gym_id, userData.profile.id);
      } else {
        // Cargar datos por defecto si no hay BD
        loadDefaultData();
      }

    } catch (error) {
      console.error('Error inicializando datos:', error);
      loadDefaultData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultData = () => {
    // Datos por defecto para desarrollo/demo
    if (members.length === 0) {
      const defaultMembers = [
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
          phone: '+57 301 234 5678',
          plan: 'vip',
          assignedCoach: 'Coach Ana',
          personalRoutine: null,
          nutritionPlan: null
        },
        { 
          id: 'M003', 
          name: 'Carlos Rodríguez Silva',
          email: 'carlos.rodriguez@email.com',
          phone: '+57 302 345 6789',
          plan: 'básico',
          assignedCoach: 'Coach María',
          personalRoutine: null,
          nutritionPlan: null
        }
      ];
      setMembers(defaultMembers);
      localStorage.setItem('gym_members', JSON.stringify(defaultMembers));
    }

    if (coaches.length === 0) {
      const defaultCoaches = [
        {
          id: 'C001',
          name: 'María González',
          email: 'maria.coach@gym.com',
          specialties: ['Fitness', 'Nutrición'],
          clients: ['M001', 'M002', 'M003']
        },
        {
          id: 'C002', 
          name: 'Carlos Ruiz',
          email: 'carlos.coach@gym.com',
          specialties: ['Fuerza', 'Rehabilitación'],
          clients: ['M004', 'M005', 'M006']
        }
      ];
      setCoaches(defaultCoaches);
      localStorage.setItem('gym_coaches', JSON.stringify(defaultCoaches));
    }
  };

  const loadFromDatabase = async (gymId, userId) => {
    try {
      console.log('🔄 Cargando datos desde BD...');
      
      // Cargar usuarios de la BD
      const dbUsers = await dbAPI.getUsersFromDB(gymId);
      if (dbUsers && dbUsers.length > 0) {
        
        const dbMembers = dbUsers.filter(user => user.role === 'member');
        const dbCoaches = dbUsers.filter(user => user.role === 'coach');
        
        // Actualizar miembros con datos de BD
        if (dbMembers.length > 0) {
          const formattedMembers = dbMembers.map(dbMember => ({
            id: dbMember.id,
            name: `${dbMember.first_name || 'Sin'} ${dbMember.last_name || 'Nombre'}`,
            email: dbMember.email || 'Sin email',
            phone: dbMember.phone || 'Sin teléfono',
            plan: 'premium',
            assignedCoach: 'Coach María',
            personalRoutine: null,
            nutritionPlan: null,
            // Datos adicionales de BD
            role: dbMember.role,
            gym_id: dbMember.gym_id,
            birth_date: dbMember.birth_date,
            gender: dbMember.gender
          }));
          
          setMembers(formattedMembers);
          localStorage.setItem('gym_members', JSON.stringify(formattedMembers));
        }

        // Actualizar coaches con datos de BD
        if (dbCoaches.length > 0) {
          const formattedCoaches = dbCoaches.map(dbCoach => ({
            id: dbCoach.id,
            name: `${dbCoach.first_name || 'Sin'} ${dbCoach.last_name || 'Nombre'}`,
            email: dbCoach.email || 'Sin email',
            specialties: ['Fitness'],
            clients: [],
            // Datos adicionales de BD
            role: dbCoach.role,
            gym_id: dbCoach.gym_id,
            phone: dbCoach.phone
          }));
          
          setCoaches(formattedCoaches);
          localStorage.setItem('gym_coaches', JSON.stringify(formattedCoaches));
        }
      } else {
        console.log('⚠️ No hay usuarios en BD, usando datos por defecto');
        loadDefaultData();
      }

      // Cargar planes nutricionales del usuario actual
      if (userId) {
        const dbNutritionPlans = await dbAPI.getNutritionPlansFromDB(userId);
        if (dbNutritionPlans && dbNutritionPlans.length > 0) {
          console.log(`✅ ${dbNutritionPlans.length} planes nutricionales cargados desde BD`);
          setNutritionPlans(dbNutritionPlans);
          localStorage.setItem('gym_nutrition_plans', JSON.stringify(dbNutritionPlans));
        }
      }

    } catch (error) {
      console.error('❌ Error cargando desde base de datos:', error);
      loadDefaultData();
    }
  };

  // === FUNCIONES DE PERSISTENCIA LOCALSTORAGE + BD ===
  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error guardando ${key} en localStorage:`, error);
    }
  };

  // === FUNCIONES DE RUTINAS SEMANALES ===
  const updateWeeklyRoutine = async (newRoutine) => {
    setWeeklyRoutine(newRoutine);
    saveToStorage('gym_weekly_routine', newRoutine);
    
    // Intentar guardar en BD si hay usuario
    if (currentUser?.profile?.role === 'coach') {
      try {
        await dbAPI.saveWorkoutToDB(
          { ...newRoutine, title: 'Rutina Semanal General' }, 
          currentUser.profile.id, 
          currentUser.profile.gym_id
        );
        console.log('✅ Rutina guardada en BD');
      } catch (error) {
        console.error('❌ Error guardando rutina en BD:', error);
      }
    }
  };

  const addExerciseToDay = (day, exercise) => {
    setWeeklyRoutine(prev => {
      const updated = {
        ...prev,
        [day]: [...prev[day], { id: Date.now(), ...exercise }]
      };
      saveToStorage('gym_weekly_routine', updated);
      return updated;
    });
  };

  const removeExerciseFromDay = (day, exerciseId) => {
    setWeeklyRoutine(prev => {
      const updated = {
        ...prev,
        [day]: prev[day].filter(ex => ex.id !== exerciseId)
      };
      saveToStorage('gym_weekly_routine', updated);
      return updated;
    });
  };

  // === FUNCIONES DE NUTRICIÓN ===
  const addNutritionPlan = async (plan) => {
    const newPlan = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...plan
    };
    
    const updated = [...nutritionPlans, newPlan];
    setNutritionPlans(updated);
    saveToStorage('gym_nutrition_plans', updated);
    
    // Intentar guardar en BD
    if (currentUser?.profile?.id) {
      try {
        await dbAPI.saveNutritionPlanToDB(newPlan, plan.assignedTo, currentUser.profile.id);
        console.log('✅ Plan nutricional guardado en BD');
      } catch (error) {
        console.error('❌ Error guardando plan nutricional en BD:', error);
      }
    }
  };

  const updateNutritionPlan = (planId, updates) => {
    const updated = nutritionPlans.map(plan => 
      plan.id === planId ? { ...plan, ...updates } : plan
    );
    setNutritionPlans(updated);
    saveToStorage('gym_nutrition_plans', updated);
  };

  const deleteNutritionPlan = (planId) => {
    const updated = nutritionPlans.filter(plan => plan.id !== planId);
    setNutritionPlans(updated);
    saveToStorage('gym_nutrition_plans', updated);
  };

  // === FUNCIONES DE MIEMBROS ===
  const getMembersByCoach = (coachId) => {
    return members.filter(member => 
      coaches.find(coach => coach.id === coachId)?.clients?.includes(member.id)
    );
  };

  const assignPersonalRoutine = (memberId, routine) => {
    const updated = members.map(member => 
      member.id === memberId ? { ...member, personalRoutine: routine } : member
    );
    setMembers(updated);
    saveToStorage('gym_members', updated);
  };

  const updateMemberPersonalRoutine = (memberId, day, exercises) => {
    const updated = members.map(member => {
      if (member.id === memberId) {
        const updatedRoutine = {
          ...member.personalRoutine,
          [day]: exercises
        };
        return { ...member, personalRoutine: updatedRoutine };
      }
      return member;
    });
    setMembers(updated);
    saveToStorage('gym_members', updated);
  };

  const value = {
    // Estados
    weeklyRoutine,
    nutritionPlans,
    members,
    coaches,
    currentUser,
    isLoading,
    
    // Funciones de rutinas
    updateWeeklyRoutine,
    addExerciseToDay,
    removeExerciseFromDay,
    
    // Funciones de nutrición
    addNutritionPlan,
    updateNutritionPlan,
    deleteNutritionPlan,
    
    // Funciones de miembros
    getMembersByCoach,
    assignPersonalRoutine,
    updateMemberPersonalRoutine,
    
    // Funciones utilitarias
    initializeData,
    loadFromDatabase
  };

  return (
    <GymDataContext.Provider value={value}>
      {children}
    </GymDataContext.Provider>
  );
};