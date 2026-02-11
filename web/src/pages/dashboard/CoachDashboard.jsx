
import Loader from '../../components/ui/Loader';
import { useState, useEffect } from "react";
import { useProfile } from "../../hooks/useProfile";
import DashboardNav from "../../components/layout/DashboardNav";
import ManageRoutines from "../workouts/ManageRoutines";
import ManageNutrition from "../nutrition/ManageNutrition";
import { toast } from 'react-hot-toast';
import { useGymData } from '../../context/GymDataContextDB';
import { testDatabaseConnection, migrateLocalDataToDB } from '../../services/database.test';
import { supabase } from '../../supabaseClient';
import {
  createRoutine,
  getCoachRoutines,
  saveWeeklyRoutine as saveWeeklyRoutineToDB,
  getWeeklyRoutine,
  getWeeklyRoutines,
  createNutritionPlan,
  getAllNutritionPlans,
  getAssignedMembersForSelect
} from '../../api/routines.api';
import "../../styles/dashboard.css";

export default function CoachDashboard() {
    // Stub for missing function to prevent crash
    const loadAssignedMembers = async () => {
      // You can implement logic here if needed
      return;
    };
  const { profile } = useProfile();
  const { 
    weeklyRoutine, 
    updateWeeklyRoutine, 
    removeExerciseFromDay,
    members,
    getMembersByCoach,
    assignPersonalRoutine,
    updateMemberPersonalRoutine 
  } = useGymData();
  
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showClients, setShowClients] = useState(false);
  const [showCreateRoutine, setShowCreateRoutine] = useState(false);

  const [showEditRoutine, setShowEditRoutine] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [routineType, setRoutineType] = useState('');

  const [assignedMembers, setAssignedMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [coachRoutines, setCoachRoutines] = useState([]);
  // Declarar estado para mostrar progreso
  const [showProgress, setShowProgress] = useState(false);
  // Declarar estado para planes nutricionales
  const [nutritionPlans, setNutritionPlans] = useState([]);
  // Declarar estado para mostrar rutina semanal
  const [showWeeklyRoutine, setShowWeeklyRoutine] = useState(false);
  // Declarar estado para nueva rutina personalizada
  const [newRoutineData, setNewRoutineData] = useState({
    name: '',
    description: '',
    goal: '',
    duration_weeks: 4,
    assigned_to: '',
    notes: '',
    days: [
      {
        name: 'Día 1 - Tren Superior',
        order: 1,
        exercises: [{
          name: '',
          sets: 3,
          reps: 12,
          weight: '',
          rest_seconds: 60,
          notes: ''
        }]
      },
      {
        name: 'Día 2 - Tren Inferior',
        order: 2,
        exercises: [{
          name: '',
          sets: 3,
          reps: 12,
          weight: '',
          rest_seconds: 60,
          notes: ''
        }]
      }
    ]
  });

  // Estado para mostrar el modal de historial de rutinas semanales generales
  const [showWeeklyHistoryModal, setShowWeeklyHistoryModal] = useState(false);
  // Estado para guardar el historial de rutinas semanales generales
  const [weeklyRoutinesHistory, setWeeklyRoutinesHistory] = useState([]);

  // Efecto para cargar el historial de rutinas semanales generales cuando se abre el modal
  useEffect(() => {
    if (showWeeklyHistoryModal) {
      const fetchWeeklyRoutinesHistory = async () => {
        if (!profile?.gym_id) return;
        const res = await getWeeklyRoutines(profile.gym_id);
        if (!res.success) {
          toast.error('Error al cargar el historial de rutinas semanales');
        } else {
          setWeeklyRoutinesHistory(res.routines || []);
        }
      };
      fetchWeeklyRoutinesHistory();
    }
  }, [showWeeklyHistoryModal]);


  
  const loadCoachRoutines = async () => {
    try {
      const result = await getCoachRoutines();
      if (result.success) {
        setCoachRoutines(result.routines);
        console.log('✅ Rutinas del coach cargadas:', result.routines.length);
      } else {
        setCoachRoutines([]);
        console.error('❌ Error cargando rutinas:', result.error);
      }
    } catch (error) {
      setCoachRoutines([]);
      console.error('❌ Error cargando rutinas:', error);
    }
    setLoading(false);
  };
  
  const loadNutritionPlans = async () => {
    try {
      if (!profile?.gym_id) return;
      const result = await getAllNutritionPlans(profile.gym_id);
      if (result.success) {
        setNutritionPlans(result.nutritionPlans);
        console.log('✅ Planes alimenticios cargados:', result.nutritionPlans.length);
      } else {
        console.error('❌ Error cargando planes alimenticios:', result.error);
      }
    } catch (error) {
      console.error('❌ Error cargando planes alimenticios:', error);
    }
  };
  
  const loadAvailableMembers = async () => {
    try {
      const result = await getAssignedMembersForSelect();
      if (result.success) {
        setAvailableMembers(result.members);
        console.log('✅ Miembros disponibles cargados:', result.members.length);
      } else {
        console.error('❌ Error cargando miembros disponibles:', result.error);
        // Fallback: usar miembros asignados como disponibles
        setAvailableMembers(assignedMembers);
      }
    } catch (error) {
      console.error('❌ Error cargando miembros disponibles:', error);
      // Fallback: usar miembros asignados como disponibles
      setAvailableMembers(assignedMembers);
    }
  };
  
  // Cargar datos cuando el profile esté disponible
  useEffect(() => {
    if (profile?.id) {
      loadAllCoachData();
    }
  }, [profile?.id]);
  
  const loadAllCoachData = async () => {
    setLoading(true);
    // Cargar miembros asignados primero
    await loadAssignedMembers();
    // Luego cargar los otros datos que pueden depender de assignedMembers
    await Promise.all([
      loadCoachRoutines(),
      loadNutritionPlans(),
      loadAvailableMembers()
    ]);
    setLoading(false);
  };
  
  const [routineDays, setRoutineDays] = useState([
    {
      id: 1,
      name: 'Lunes - Tren Superior',
      exercises: [
        { id: 1, name: 'Press de Banca', sets: 4, reps: 12, weight: '60kg' },
        { id: 2, name: 'Dominadas', sets: 3, reps: 8, weight: 'Corporal' }
      ]
    },
    {
      id: 2,
      name: 'Miércoles - Tren Inferior',
      exercises: [
        { id: 3, name: 'Sentadillas', sets: 4, reps: 15, weight: '80kg' },
        { id: 4, name: 'Peso Muerto', sets: 3, reps: 8, weight: '90kg' }
      ]
    }
  ]);

  const handleNavigation = (page) => {
    setCurrentPage(page);
  };

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard');
  };

  const handleShowClients = () => {
    setShowClients(true);
  };

  const handleCreateRoutine = () => {
    setShowCreateRoutine(true);
    // Reset form
    setNewRoutineData({
      name: '',
      description: '',
      goal: '',
      duration_weeks: 4,
      assigned_to: '',
      notes: '',
      days: [
        { 
          name: 'Día 1 - Tren Superior', 
          order: 1, 
          exercises: [{
            name: '',
            sets: 3,
            reps: 12,
            weight: '',
            rest_seconds: 60,
            notes: ''
          }] 
        },
        { 
          name: 'Día 2 - Tren Inferior', 
          order: 2, 
          exercises: [{
            name: '',
            sets: 3,
            reps: 12,
            weight: '',
            rest_seconds: 60,
            notes: ''
          }] 
        }
      ]
    });
  };

  const handleShowProgress = () => {
    setShowProgress(true);
  };

  const handleEditRoutine = (clientName) => {
    setSelectedClient(clientName);
    setShowEditRoutine(true);
  };

  const confirmEditRoutine = () => {
    toast.success(`✅ Rutina de ${selectedClient} actualizada exitosamente`);
    setShowEditRoutine(false);
    setSelectedClient(null);
  };

  const addExerciseToRoutineDay = (dayId) => {
    setRoutineDays(prevDays => 
      prevDays.map(day => 
        day.id === dayId 
          ? {
              ...day,
              exercises: [...day.exercises, {
                id: Date.now(),
                name: '',
                sets: 3,
                reps: 12,
                weight: ''
              }]
            }
          : day
      )
    );
  };

  const removeExercise = (dayId, exerciseId) => {
    setRoutineDays(prevDays => 
      prevDays.map(day => 
        day.id === dayId 
          ? {
              ...day,
              exercises: day.exercises.filter(ex => ex.id !== exerciseId)
            }
          : day
      )
    );
  };

  const updateExercise = (dayId, exerciseId, field, value) => {
    setRoutineDays(prevDays => 
      prevDays.map(day => 
        day.id === dayId 
          ? {
              ...day,
              exercises: day.exercises.map(ex => 
                ex.id === exerciseId 
                  ? { ...ex, [field]: value }
                  : ex
              )
            }
          : day
      )
    );
  };

  const addNewDay = () => {
    const newDay = {
      id: Date.now(),
      name: `Día ${routineDays.length + 1}`,
      exercises: [
        {
          id: Date.now() + 1,
          name: '',
          sets: 3,
          reps: 12,
          weight: ''
        }
      ]
    };
    setRoutineDays([...routineDays, newDay]);
    toast.success('📅 Nuevo día agregado a la rutina');
  };

  const removeDay = (dayId) => {
    if (routineDays.length > 1) {
      setRoutineDays(routineDays.filter(day => day.id !== dayId));
      toast.info('🗑️ Día eliminado de la rutina');
    } else {
      toast.error('⚠️ Debe haber al menos un día en la rutina');
    }
  };

  // Abrir modal de rutina semanal y sincronizar estado
  const handleWeeklyRoutine = () => {
    if (weeklyRoutine && weeklyRoutine.days) {
      setWeeklyRoutineLocal(weeklyRoutine);
    } else {
      setWeeklyRoutineLocal({
        days: [
          { name: 'Lunes', order: 1, exercises: [] },
          { name: 'Martes', order: 2, exercises: [] },
          { name: 'Miércoles', order: 3, exercises: [] },
          { name: 'Jueves', order: 4, exercises: [] },
          { name: 'Viernes', order: 5, exercises: [] },
          { name: 'Sábado', order: 6, exercises: [] }
        ],
        status: 'inactive',
        id: null
      });
    }
    setShowWeeklyRoutine(true);
  };

  // Agregar ejercicio a un día de la rutina semanal
  const addExerciseToWeekDay = (dayName) => {
    setWeeklyRoutineLocal(prev => ({
      ...prev,
      days: prev.days.map(d =>
        d.name === dayName
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  id: Date.now(),
                  name: '',
                  sets: 3,
                  reps: 12,
                  weight: ''
                }
              ]
            }
          : d
      )
    }));
  };

  // Eliminar ejercicio de un día de la rutina semanal
  const removeExerciseFromWeekDay = (dayName, exerciseId) => {
    setWeeklyRoutineLocal(prev => ({
      ...prev,
      days: prev.days.map(d =>
        d.name === dayName
          ? {
              ...d,
              exercises: d.exercises.filter(ex => ex.id !== exerciseId)
            }
          : d
      )
    }));
  };

  // Actualizar campo de ejercicio en rutina semanal
  const updateWeeklyExercise = (dayName, exerciseId, field, value) => {
    setWeeklyRoutineLocal(prev => ({
      ...prev,
      days: prev.days.map(d =>
        d.name === dayName
          ? {
              ...d,
              exercises: d.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, [field]: value }
                  : ex
              )
            }
          : d
      )
    }));
  };


  // Guardar rutina semanal con estructura correcta
  const saveWeeklyRoutine = async () => {
    try {
      toast.loading('Guardando rutina semanal...');
      const result = await saveWeeklyRoutineToDB({
        ...weeklyRoutineLocal,
        status: 'active' // Se activa automáticamente al crear
      });
      toast.dismiss();
      if (result.success) {
        // Actualiza el id y el estado en el local si fue creado
        if (!weeklyRoutineLocal.id && result.routine?.id) {
          setWeeklyRoutineLocal(prev => ({ ...prev, id: result.routine.id, status: 'active' }));
        }
        updateWeeklyRoutine({ ...weeklyRoutineLocal, id: result.routine?.id || weeklyRoutineLocal.id, status: 'active' });
        toast.success('✅ Rutina semanal guardada y activada en BD exitosamente');
        setShowWeeklyRoutine(false);
      } else {
        toast.error('❌ Error guardando rutina: ' + result.error);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error guardando rutina semanal: ' + error.message);
      console.error('Error:', error);
    }
  };

  // === FUNCIONES DE PRUEBA DE BD ===
  
  // === FUNCIONES DE MANEJO DE RUTINAS ===
  const handleRoutineInputChange = (field, value) => {
    setNewRoutineData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDayNameChange = (dayIndex, newName) => {
    setNewRoutineData(prev => ({
      ...prev,
      days: prev.days.map((day, index) => 
        index === dayIndex ? { ...day, name: newName } : day
      )
    }));
  };
  
  const handleExerciseChange = (dayIndex, exerciseIndex, field, value) => {
    setNewRoutineData(prev => ({
      ...prev,
      days: prev.days.map((day, dIndex) => 
        dIndex === dayIndex 
          ? {
              ...day,
              exercises: day.exercises.map((exercise, eIndex) =>
                eIndex === exerciseIndex ? { ...exercise, [field]: value } : exercise
              )
            }
          : day
      )
    }));
  };
  
  const addExerciseToDay = (dayIndex) => {
    setNewRoutineData(prev => ({
      ...prev,
      days: prev.days.map((day, index) => 
        index === dayIndex 
          ? {
              ...day,
              exercises: [...day.exercises, {
                name: '',
                sets: 3,
                reps: 12,
                weight: '',
                rest_seconds: 60,
                notes: ''
              }]
            }
          : day
      )
    }));
  };
  
  const removeExerciseFromNewRoutine = (dayIndex, exerciseIndex) => {
    setNewRoutineData(prev => ({
      ...prev,
      days: prev.days.map((day, index) => 
        index === dayIndex 
          ? {
              ...day,
              exercises: day.exercises.filter((_, eIndex) => eIndex !== exerciseIndex)
            }
          : day
      )
    }));
  };
  
  const addNewDayToRoutine = () => {
    setNewRoutineData(prev => ({
      ...prev,
      days: [...prev.days, {
        name: `Día ${prev.days.length + 1}`,
        order: prev.days.length + 1,
        exercises: [{
          name: '',
          sets: 3,
          reps: 12,
          weight: '',
          rest_seconds: 60,
          notes: ''
        }]
      }]
    }));
  };
  
  const removeDayFromRoutine = (dayIndex) => {
    if (newRoutineData.days.length > 1) {
      setNewRoutineData(prev => ({
        ...prev,
        days: prev.days.filter((_, index) => index !== dayIndex)
      }));
    } else {
      toast.error('⚠️ Debe haber al menos un día en la rutina');
    }
  };
  
  const handleSaveNewRoutine = async () => {
    try {
      // Validar campos obligatorios
      if (!newRoutineData.name.trim()) {
        toast.error('❌ El nombre de la rutina es obligatorio');
        return;
      }
      
      if (!newRoutineData.goal) {
        toast.error('❌ Debes seleccionar un objetivo');
        return;
      }
      
      // Validar que al menos un ejercicio tenga nombre
      const hasValidExercise = newRoutineData.days.some(day =>
        day.exercises.some(exercise => exercise.name.trim())
      );
      
      if (!hasValidExercise) {
        toast.error('❌ Debes agregar al menos un ejercicio');
        return;
      }
      
      toast.loading('Creando rutina...');
      
      // Preparar datos para BD
      const routineForDB = {
        ...newRoutineData,
        assigned_to: newRoutineData.assigned_to || null,
        gym_id: profile.gym_id, // Asegura que el gym_id se envía correctamente
        days: newRoutineData.days.map(day => ({
          ...day,
          exercises: day.exercises.filter(exercise => exercise.name.trim())
        })).filter(day => day.exercises.length > 0)
      };
      
      const result = await createRoutine(routineForDB);
      toast.dismiss();
      if (result.success) {
        toast.success('✅ Rutina creada y guardada en BD exitosamente');
        setShowCreateRoutine(false);
        // Recargar las rutinas
        await loadCoachRoutines();
      } else {
        toast.error('❌ Error creando rutina: ' + result.error);
      }
    } catch (error) {
      toast.error('❌ Error creando rutina: ' + error.message);
      console.error('Error:', error);
    }
  };
  
  // === FUNCIONES DE PRUEBA DE BD ===
  const handleTestDatabase = async () => {
    toast.loading('Probando conexión con BD...');
    try {
      const result = await testDatabaseConnection();
      toast.dismiss();
      if (result) {
        toast.success('✅ Conexión con BD exitosa! Revisar consola para detalles.');
      } else {
        toast.error('❌ Error en conexión con BD. Revisar consola.');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error probando BD: ' + error.message);
    }
  };

  const handleMigrateData = async () => {
    toast.loading('Migrando datos locales a BD...');
    try {
      const localData = {
        weeklyRoutine,
        nutritionPlans,
        members,
        coaches
      };
      const result = await migrateLocalDataToDB(localData);
      toast.dismiss();
      if (result) {
        toast.success('✅ Datos migrados exitosamente! Revisar consola para detalles.');
      } else {
        toast.error('❌ Error en migración. Revisar consola.');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error migrando datos: ' + error.message);
    }
  };

  // Estado para la rutina semanal local (edición/creación)
  const [weeklyRoutineLocal, setWeeklyRoutineLocal] = useState({
    name: '',
    description: '',
    days: [
      {
        name: 'Lunes',
        order: 1,
        exercises: []
      },
      {
        name: 'Martes',
        order: 2,
        exercises: []
      },
      {
        name: 'Miércoles',
        order: 3,
        exercises: []
      },
      {
        name: 'Jueves',
        order: 4,
        exercises: []
      },
      {
        name: 'Viernes',
        order: 5,
        exercises: []
      },
      {
        name: 'Sábado',
        order: 6,
        exercises: []
      }
    ]
  });

  // Activar rutina semanal
  const activateWeeklyRoutine = async () => {
    try {
      if (!weeklyRoutineLocal.id) {
        toast.error('No se puede activar: la rutina semanal no tiene un ID válido. Guarda la rutina primero.');
        return;
      }
      toast.loading('Activando rutina semanal...');
      const { data, error } = await supabase
        .from('weekly_routines')
        .update({ status: 'active' })
        .eq('id', weeklyRoutineLocal.id)
        .select();
      toast.dismiss();
      if (error) {
        toast.error('❌ Error activando rutina: ' + error.message);
      } else {
        toast.success('✅ Rutina semanal activada correctamente');
        setWeeklyRoutineLocal(prev => ({ ...prev, status: 'active' }));
      }
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error activando rutina semanal: ' + error.message);
      console.error('Error:', error);
    }
  };

  // Renderizar la página actual
  if (currentPage === 'routines') {
    return <ManageRoutines onBack={handleBackToDashboard} />;
  }
  
  if (currentPage === 'nutrition') {
    return <ManageNutrition onBack={handleBackToDashboard} nutritionPlans={nutritionPlans} />;
  }

  return (
    <div className="dashboard">
      <DashboardNav 
        currentPage={currentPage}
        onNavigate={handleNavigation}
      />
      
      <header className="dashboard-header">
        <h1>Panel de Entrenador</h1>
        <p>Bienvenido/a, {profile?.first_name || "Coach"} - Transforma vidas hoy</p>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Mis Clientes</h3>
          <div className="stat-number">{assignedMembers.length}</div>
          <p>Miembros asignados</p>
        </div>
        
        <div className="stat-card">
          <h3>Rutinas Creadas</h3>
          <div className="stat-number">{coachRoutines.length}</div>
          <p>Entrenamientos diseñados</p>
        </div>
        
        <div className="stat-card">
          <h3>Rutinas Activas</h3>
          <div className="stat-number">{coachRoutines.filter(r => r.status === 'active').length}</div>
          <p>En progreso</p>
        </div>

        <div className="stat-card">
          <h3>Planes Nutricionales</h3>
          <div className="stat-number">{Array.isArray(nutritionPlans) ? nutritionPlans.length : 0}</div>
          <p>Planes activos</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Acciones Rápidas</h2>
          <div className="quick-actions">
            <div className="action-btn" onClick={() => handleNavigation('routines')}>
              <span>💪</span>
              <div>Mis Rutinas</div>
            </div>
            <div className="action-btn" onClick={handleShowClients}>
              <span>👥</span>
              <div>Ver Mis Clientes</div>
            </div>
            <div className="action-btn" onClick={handleCreateRoutine}>
              <span>📋</span>
              <div>Crear Nueva Rutina</div>
            </div>
            <div className="action-btn" onClick={handleWeeklyRoutine}>
              <span>📅</span>
              <div>Rutina Semanal General</div>
            </div>
            <div className="action-btn" onClick={() => handleNavigation('nutrition')}>
              <span>🍎</span>
              <div>Planes Alimenticios</div>
            </div>
            <div className="action-btn" onClick={handleShowProgress}>
              <span>📊</span>
              <div>Progreso de Clientes</div>
            </div>
            
            {/* ...otros botones de acción rápida... */}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Clientes de Hoy</h2>
          <div className="today-clients">
            <div className="client-item">
              <div className="client-info">
                <strong>Juan Torres</strong>
                <span className="client-plan">Rutina de Fuerza</span>
              </div>
              <span className="client-time">10:00 AM</span>
            </div>
            <div className="client-item">
              <div className="client-info">
                <strong>María García</strong>
                <span className="client-plan">Cardio Intensivo</span>
              </div>
              <span className="client-time">2:00 PM</span>
            </div>
            <div className="client-item">
              <div className="client-info">
                <strong>Carlos Ruiz</strong>
                <span className="client-plan">Entrenamiento Funcional</span>
              </div>
              <span className="client-time">4:30 PM</span>
            </div>
            <div className="client-item">
              <div className="client-info">
                <strong>Ana Martínez</strong>
                <span className="client-plan">Yoga y Flexibilidad</span>
              </div>
              <span className="client-time">6:00 PM</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Mi Rendimiento</h2>
          {/* Botón eliminado para evitar superposición */}
          <div className="progress-section">
            <div className="progress-item">
              <span className="progress-label">Clientes Satisfechos</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '95%'}}></div>
              </div>
              <span className="progress-value">95%</span>
            </div>
            
            <div className="progress-item">
              <span className="progress-label">Sesiones Completadas</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '88%'}}></div>
              </div>
              <span className="progress-value">156/178</span>
            </div>

            <div className="progress-item">
              <span className="progress-label">Rutinas Activas</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '72%'}}></div>
              </div>
              <span className="progress-value">18/25</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Próximas Citas</h2>
          <div className="upcoming-sessions">
            <div className="session-item">
              <div className="session-time">
                <span className="time">3:00 PM</span>
                <span className="date">Hoy</span>
              </div>
              <div className="session-info">
                <strong>Pedro Sánchez</strong>
                <p>Entrenamiento Personalizado - Fuerza</p>
              </div>
              <div className="session-status pending">
                Pendiente
              </div>
            </div>
            
            <div className="session-item">
              <div className="session-time">
                <span className="time">9:00 AM</span>
                <span className="date">Mañana</span>
              </div>
              <div className="session-info">
                <strong>Carmen López</strong>
                <p>Evaluación Inicial - Cardio</p>
              </div>
              <div className="session-status confirmed">
                Confirmada
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Notas Rápidas</h2>
          <div className="coach-notes">
            <div className="note-item">
              <p><strong>Recordatorio:</strong> Actualizar rutina de Juan Torres para la próxima semana</p>
              <span className="note-time">Hace 2 horas</span>
            </div>
            <div className="note-item">
              <p><strong>Seguimiento:</strong> María García necesita ajuste en la intensidad del cardio</p>
              <span className="note-time">Ayer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Ver Mis Clientes */}
      {showClients && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>👥 Mis Clientes Asignados</h3>
              <button 
                onClick={() => setShowClients(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            
            <div className="clients-grid">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="loader">Cargando clientes asignados...</div>
                </div>
              ) : availableMembers.length > 0 ? (
                availableMembers.map(member => (
                  <div key={member.id} className="client-card">
                    <div className="client-avatar">
                      {(member.first_name?.charAt(0) || '') + (member.last_name?.charAt(0) || '')}
                    </div>
                    <div className="client-details">
                      <h4>{`${member.first_name || ''} ${member.last_name || ''}`.trim()}</h4>
                      <p>📧 {member.email || 'Sin email'}</p>
                      <p>📞 {member.phone || 'Sin teléfono'}</p>
                      <p>🎯 <strong>Objetivo:</strong> {member.membership_type || 'General'}</p>
                      <p>📅 <strong>Miembro desde:</strong> {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'No disponible'}</p>
                      <div className={`client-status ${member.status?.toLowerCase() || 'activo'}`}>
                        {member.status || 'Activo'}
                      </div>
                    </div>
                    <div className="client-actions">
                      <button 
                        className="btn-mini" 
                        onClick={() => handleEditRoutine(`${member.first_name} ${member.last_name}`)}
                      >
                        Editar Rutina
                      </button>
                      <button 
                        className="btn-mini" 
                        onClick={() => toast.info(`📧 Contactando a ${member.first_name}`)}
                      >
                        Contactar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px dashed #dee2e6'
                }}>
                  <h4>👥 Sin Clientes Asignados</h4>
                  <p>Aún no tienes miembros asignados. Contacta al administrador para que te asigne clientes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Rutina */}
      {showCreateRoutine && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📋 Crear Nueva Rutina</h3>
              <button 
                onClick={() => setShowCreateRoutine(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            
            <div className="create-routine-form">
              <div className="form-section">
                <h4>ℹ️ Información General</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre de la Rutina:</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Rutina Fuerza Básica" 
                      className="form-input"
                      value={newRoutineData.name}
                      onChange={(e) => handleRoutineInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cliente Asignado:</label>
                    <select 
                      className="form-input"
                      value={newRoutineData.assigned_to}
                      onChange={(e) => handleRoutineInputChange('assigned_to', e.target.value)}
                    >
                      <option value="">Sin asignar (rutina general)</option>
                      {availableMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Objetivo:</label>
                    <select 
                      className="form-input"
                      value={newRoutineData.goal}
                      onChange={(e) => handleRoutineInputChange('goal', e.target.value)}
                    >
                      <option value="">Seleccionar objetivo...</option>
                      <option value="fuerza">Ganancia de Fuerza</option>
                      <option value="musculo">Ganancia Muscular</option>
                      <option value="perdida">Pérdida de Peso</option>
                      <option value="resistencia">Resistencia</option>
                      <option value="tonificacion">Tonificación</option>
                      <option value="rehabilitacion">Rehabilitación</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duración (semanas):</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="52" 
                      className="form-input"
                      value={newRoutineData.duration_weeks}
                      onChange={(e) => handleRoutineInputChange('duration_weeks', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h4>🏋️ Ejercicios</h4>
                <div className="exercises-builder">
                  {newRoutineData.days.map((day, dayIndex) => (
                    <div key={dayIndex} className="exercise-day">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={day.name}
                          onChange={(e) => handleDayNameChange(dayIndex, e.target.value)}
                          className="form-input"
                          style={{ flex: 1, fontWeight: 'bold' }}
                        />
                        {newRoutineData.days.length > 1 && (
                          <button 
                            className="btn-remove"
                            onClick={() => removeDayFromRoutine(dayIndex)}
                            title="Eliminar día"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div className="exercise-list">
                        {day.exercises.map((exercise, exerciseIndex) => (
                          <div key={exerciseIndex} className="exercise-item-form">
                            <input 
                              type="text" 
                              placeholder="Nombre del ejercicio" 
                              className="exercise-name"
                              value={exercise.name}
                              onChange={(e) => handleExerciseChange(dayIndex, exerciseIndex, 'name', e.target.value)}
                            />
                            <input 
                              type="number" 
                              placeholder="Series" 
                              className="exercise-sets"
                              value={exercise.sets}
                              onChange={(e) => handleExerciseChange(dayIndex, exerciseIndex, 'sets', parseInt(e.target.value) || 0)}
                            />
                            <input 
                              type="number" 
                              placeholder="Reps" 
                              className="exercise-reps"
                              value={exercise.reps}
                              onChange={(e) => handleExerciseChange(dayIndex, exerciseIndex, 'reps', parseInt(e.target.value) || 0)}
                            />
                            <input 
                              type="text" 
                              placeholder="Peso/Intensidad" 
                              className="exercise-weight"
                              value={exercise.weight}
                              onChange={(e) => handleExerciseChange(dayIndex, exerciseIndex, 'weight', e.target.value)}
                            />
                            {day.exercises.length > 1 && (
                              <button 
                                className="btn-remove"
                                onClick={() => removeExerciseFromNewRoutine(dayIndex, exerciseIndex)}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        ))}
                        <button 
                          className="btn-add-exercise" 
                          onClick={() => addExerciseToDay(dayIndex)}
                        >
                          + Agregar Ejercicio
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    className="btn-add-day" 
                    onClick={addNewDayToRoutine}
                  >
                    + Agregar Día
                  </button>
                </div>
              </div>
              
              <div className="form-section">
                <h4>📝 Notas Adicionales</h4>
                <textarea 
                  placeholder="Instrucciones especiales, progresión, observaciones..."
                  className="form-textarea"
                  rows="4"
                  value={newRoutineData.notes}
                  onChange={(e) => handleRoutineInputChange('notes', e.target.value)}
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-primary"
                  onClick={handleSaveNewRoutine}
                >
                  💾 Guardar Rutina
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowCreateRoutine(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Progreso de Clientes */}
      {showProgress && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📊 Progreso de Mis Clientes</h3>
              <button 
                onClick={() => setShowProgress(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            
            <div className="progress-dashboard">
              <div className="progress-summary">
                <div className="summary-card">
                  <h4>📈 Resumen General</h4>
                  <div className="summary-stats">
                    <div className="stat-item">
                      <span className="stat-label">Clientes Activos:</span>
                      <span className="stat-value">24</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Promedio Asistencia:</span>
                      <span className="stat-value">87%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Objetivos Cumplidos:</span>
                      <span className="stat-value">19/24</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="clients-progress">
                <div className="progress-client">
                  <div className="client-header">
                    <div className="client-avatar-mini">JT</div>
                    <div>
                      <h5>Juan Torres</h5>
                      <p>Objetivo: Ganancia muscular</p>
                    </div>
                  </div>
                  <div className="progress-metrics">
                    <div className="metric">
                      <span>Peso:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '85%', backgroundColor: '#38a169'}}></div>
                      </div>
                      <span>75kg → 82kg</span>
                    </div>
                    <div className="metric">
                      <span>Asistencia:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '92%', backgroundColor: '#667eea'}}></div>
                      </div>
                      <span>92%</span>
                    </div>
                  </div>
                </div>
                
                <div className="progress-client">
                  <div className="client-header">
                    <div className="client-avatar-mini">MG</div>
                    <div>
                      <h5>María García</h5>
                      <p>Objetivo: Pérdida de peso</p>
                    </div>
                  </div>
                  <div className="progress-metrics">
                    <div className="metric">
                      <span>Peso:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '70%', backgroundColor: '#38a169'}}></div>
                      </div>
                      <span>68kg → 61kg</span>
                    </div>
                    <div className="metric">
                      <span>Asistencia:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '88%', backgroundColor: '#667eea'}}></div>
                      </div>
                      <span>88%</span>
                    </div>
                  </div>
                </div>
                
                <div className="progress-client">
                  <div className="client-header">
                    <div className="client-avatar-mini">CR</div>
                    <div>
                      <h5>Carlos Ruiz</h5>
                      <p>Objetivo: Fuerza y resistencia</p>
                    </div>
                  </div>
                  <div className="progress-metrics">
                    <div className="metric">
                      <span>Fuerza:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '95%', backgroundColor: '#38a169'}}></div>
                      </div>
                      <span>+45% desde inicio</span>
                    </div>
                    <div className="metric">
                      <span>Asistencia:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '85%', backgroundColor: '#667eea'}}></div>
                      </div>
                      <span>85%</span>
                    </div>
                  </div>
                </div>
                
                <div className="progress-client">
                  <div className="client-header">
                    <div className="client-avatar-mini">AM</div>
                    <div>
                      <h5>Ana Martínez</h5>
                      <p>Objetivo: Tonificación</p>
                    </div>
                  </div>
                  <div className="progress-metrics">
                    <div className="metric">
                      <span>Progreso:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '78%', backgroundColor: '#38a169'}}></div>
                      </div>
                      <span>Muy bueno</span>
                    </div>
                    <div className="metric">
                      <span>Asistencia:</span>
                      <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: '91%', backgroundColor: '#667eea'}}></div>
                      </div>
                      <span>91%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="progress-actions">
                <button className="btn-primary" onClick={() => {
                  toast.loading('Generando reporte de progreso...', { duration: 2000 });
                  setTimeout(() => {
                    toast.success('📊 Reporte de progreso generado exitosamente');
                  }, 2000);
                }}>Generar Reporte Completo</button>
                <button className="btn-secondary" onClick={() => {
                  toast.loading('Enviando resúmenes por email...', { duration: 2000 });
                  setTimeout(() => {
                    toast.success('📧 Resúmenes enviados exitosamente');
                  }, 2000);
                }}>Enviar Resúmenes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Rutina de Cliente */}
      {showEditRoutine && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>✏️ Editar Rutina de {selectedClient}</h3>
              <button 
                onClick={() => setShowEditRoutine(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            
            <div className="edit-routine-form">
              <div className="form-section">
                <h4>ℹ️ Información de la Rutina</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre de la Rutina:</label>
                    <input 
                      type="text" 
                      defaultValue={`Rutina Personalizada - ${selectedClient}`}
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group">
                    <label>Objetivo:</label>
                    <select className="form-input">
                      <option value="fuerza">Ganancia de Fuerza</option>
                      <option value="musculo">Ganancia Muscular</option>
                      <option value="perdida">Pérdida de Peso</option>
                      <option value="resistencia">Resistencia</option>
                      <option value="tonificacion">Tonificación</option>
                      <option value="rehabilitacion">Rehabilitación</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duración (semanas):</label>
                    <input type="number" min="1" max="52" defaultValue="8" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Días por semana:</label>
                    <input type="number" min="2" max="7" defaultValue="4" className="form-input" />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h4>🏋️ Rutina Actual</h4>
                <div className="current-routine">
                  {routineDays.map(day => (
                    <div key={day.id} className="routine-day">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h5>{day.name}</h5>
                        <button 
                          className="btn-remove-small"
                          onClick={() => removeDay(day.id)}
                          style={{ background: '#fed7d7', color: '#e53e3e' }}
                        >
                          🗑️ Eliminar Día
                        </button>
                      </div>
                      <div className="exercises-list">
                        {day.exercises.map(exercise => (
                          <div key={exercise.id} className="exercise-row">
                            <input 
                              type="text" 
                              value={exercise.name}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'name', e.target.value)}
                              className="exercise-name-edit" 
                              placeholder="Nombre del ejercicio"
                            />
                            <input 
                              type="number" 
                              value={exercise.sets}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'sets', parseInt(e.target.value))}
                              className="exercise-sets-edit" 
                              placeholder="Series" 
                            />
                            <input 
                              type="number" 
                              value={exercise.reps}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'reps', parseInt(e.target.value))}
                              className="exercise-reps-edit" 
                              placeholder="Reps" 
                            />
                            <input 
                              type="text" 
                              value={exercise.weight}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'weight', e.target.value)}
                              className="exercise-weight-edit" 
                              placeholder="Peso" 
                            />
                            <button 
                              className="btn-remove-small"
                              onClick={() => removeExercise(day.id, exercise.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        <button 
                          className="btn-add-exercise-small"
                          onClick={() => addExerciseToRoutineDay(day.id)}
                        >
                          + Agregar Ejercicio
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    className="btn-add-day-small"
                    onClick={addNewDay}
                  >
                    📅 Agregar Nuevo Día
                  </button>
                </div>
              </div>
              
              <div className="form-section">
                <h4>📝 Notas para el Cliente</h4>
                <textarea 
                  placeholder="Instrucciones especiales, progresiones, recomendaciones..."
                  className="form-textarea"
                  rows="4"
                  defaultValue={`Rutina personalizada para ${selectedClient}. Mantener buena técnica en todos los ejercicios. Progresar gradualmente en peso cada semana.`}
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-primary"
                  onClick={confirmEditRoutine}
                >
                  💾 Guardar Rutina
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowEditRoutine(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Rutina Semanal General */}
      {showWeeklyRoutine && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📅 Rutina Semanal General - 6 Días</h3>
              <button 
                onClick={() => setShowWeeklyRoutine(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            <div className="weekly-routine-form">
              <div style={{marginBottom:'16px'}}>
                <button className="btn-secondary" onClick={() => setShowWeeklyHistoryModal(true)}>
                  📜 Ver historial de rutinas semanales
                </button>
              </div>
                    {/* Modal aparte para historial de rutinas semanales */}
                    {showWeeklyHistoryModal && (
                      <div className="modal-overlay">
                        <div className="modal-content-large">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>📜 Historial de Rutinas Semanales</h3>
                            <button 
                              onClick={() => setShowWeeklyHistoryModal(false)} 
                              className="btn-secondary"
                              style={{ padding: '5px 10px' }}
                            >
                              ✖ Cerrar
                            </button>
                          </div>
                          <div className="weekly-history-section">
                            {weeklyRoutinesHistory.length === 0 ? (
                              <div style={{color:'#888'}}>No hay rutinas semanales creadas aún.</div>
                            ) : (
                              weeklyRoutinesHistory.map(routine => (
                                <div key={routine.id} className="weekly-history-card" style={{background:'#e3f2fd',border:'1px solid #90caf9',borderRadius:8,padding:12,marginBottom:12}}>
                                  <h5 style={{marginBottom:4}}>{routine.name || 'Sin nombre'}</h5>
                                  <p style={{marginBottom:4}}><strong>Descripción:</strong> {routine.description || '-'}</p>
                                  <p style={{marginBottom:4}}><strong>Estado:</strong> {routine.status === 'active' ? '🟢 Activa' : '⚪ Inactiva'}</p>
                                  <p style={{marginBottom:4}}><strong>Creada:</strong> {routine.created_at ? new Date(routine.created_at).toLocaleString() : '-'}</p>
                                  {/* Renderizar días y ejercicios si existen */}
                                  <div className="weekly-days-container">
                                    {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(dayKey => {
                                      const dayObj = routine[dayKey];
                                      if (!dayObj) return null;
                                      return (
                                        <div key={dayObj.name} className="weekly-day-section">
                                          <h6>{dayObj.name}</h6>
                                          <div className="day-exercises">
                                            {Array.isArray(dayObj.exercises) && dayObj.exercises.length > 0 ? (
                                              dayObj.exercises.map(exercise => (
                                                <div key={exercise.id || exercise.name} className="exercise-row">
                                                  <span><strong>{exercise.name}</strong></span>
                                                  <span>Series: {exercise.sets}</span>
                                                  <span>Reps: {exercise.reps}</span>
                                                  <span>Peso/Intensidad: {exercise.weight}</span>
                                                </div>
                                              ))
                                            ) : (
                                              <div className="exercise-row-empty">No hay ejercicios asignados.</div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
              <div className="info-section" style={{ marginBottom: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '8px' }}>
                <p><strong>📢 Nota:</strong> Esta rutina semanal será visible para todos los miembros como "Rutina General del Gimnasio".</p>
                <p>Los miembros con planes personalizados verán tanto su rutina personal como esta rutina general.</p>
                <p><strong>Estado:</strong> {weeklyRoutineLocal?.status === 'active' ? '🟢 Activa' : '⚪ Inactiva'}</p>
              </div>
              <div className="weekly-days-container">
                {weeklyRoutineLocal.days.map(day => (
                  <div key={day.name} className="weekly-day-section">
                    <h4>{day.name}</h4>
                    <div className="day-exercises">
                      {day.exercises.map(exercise => (
                        <div key={exercise.id} className="exercise-row">
                          <input 
                            type="text" 
                            value={exercise.name}
                            onChange={(e) => updateWeeklyExercise(day.name, exercise.id, 'name', e.target.value)}
                            className="exercise-name-edit" 
                            placeholder="Nombre del ejercicio"
                          />
                          <input 
                            type="number" 
                            value={exercise.sets}
                            onChange={(e) => updateWeeklyExercise(day.name, exercise.id, 'sets', parseInt(e.target.value))}
                            className="exercise-sets-edit" 
                            placeholder="Series" 
                          />
                          <input 
                            type="number" 
                            value={exercise.reps}
                            onChange={(e) => updateWeeklyExercise(day.name, exercise.id, 'reps', parseInt(e.target.value))}
                            className="exercise-reps-edit" 
                            placeholder="Reps" 
                          />
                          <input 
                            type="text" 
                            value={exercise.weight}
                            onChange={(e) => updateWeeklyExercise(day.name, exercise.id, 'weight', e.target.value)}
                            className="exercise-weight-edit" 
                            placeholder="Peso/Tiempo" 
                          />
                          <button 
                            className="btn-remove-small"
                            onClick={() => removeExerciseFromWeekDay(day.name, exercise.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button 
                        className="btn-add-exercise-small"
                        onClick={() => addExerciseToWeekDay(day.name)}
                      >
                        + Agregar Ejercicio
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button 
                  className="btn-primary"
                  onClick={saveWeeklyRoutine}
                >
                  💾 Guardar Rutina Semanal
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowWeeklyRoutine(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}