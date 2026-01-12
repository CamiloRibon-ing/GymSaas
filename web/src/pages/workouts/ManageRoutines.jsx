import { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { toast } from 'react-hot-toast';
import { getCoachRoutines, getAllRoutines, getWeeklyRoutines } from '../../api/routines.api';
import { supabase } from '../../supabaseClient';
import Loader from '../../components/ui/Loader';

// Días de la semana global para edición/creación
const weekDays = [
  { name: 'Lunes', order: 1 },
  { name: 'Martes', order: 2 },
  { name: 'Miércoles', order: 3 },
  { name: 'Jueves', order: 4 },
  { name: 'Viernes', order: 5 },
  { name: 'Sábado', order: 6 },
  { name: 'Domingo', order: 7 }
];

const ManageRoutines = ({ onBack }) => {
    // Modal rápido para asignar miembros a rutina personalizada
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignRoutine, setAssignRoutine] = useState(null);

    const handleOpenAssignModal = (routine) => {
      setAssignRoutine(routine);
      setShowAssignModal(true);
    };
    const handleCloseAssignModal = () => {
      setShowAssignModal(false);
      setAssignRoutine(null);
    };
    const handleAssignMembers = (memberId) => {
      setAssignRoutine(r => {
        const assigned = Array.isArray(r.assigned_to) ? r.assigned_to : [];
        const arr = assigned.includes(memberId)
          ? assigned.filter(id => id !== memberId)
          : [...assigned, memberId];
        return { ...r, assigned_to: arr };
      });
    };
    const handleSaveAssignMembers = async () => {
      // Actualizar la rutina personalizada solo con los miembros asignados
      import('../../api/routines.api').then(api => {
        api.updateRoutine(assignRoutine.id, { assigned_to: assignRoutine.assigned_to }).then(res => {
          if (res.success) {
            toast(
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <strong style={{ fontSize: '1.08em', color: '#43a047' }}>¡Miembros asignados!</strong><br />
                  <span style={{ color: '#333' }}>La rutina personalizada fue asignada exitosamente a los clientes seleccionados.</span>
                </div>
              </div>,
              {
                duration: 3500,
                style: {
                  background: '#f1fff1',
                  border: '1px solid #43a047',
                  color: '#222',
                  boxShadow: '0 2px 12px rgba(67,160,71,0.08)',
                  fontSize: '1em',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  minWidth: '320px',
                  maxWidth: '90vw',
                },
                icon: '🎯',
              }
            );
            setShowAssignModal(false);
            setAssignRoutine(null);
            fetchRoutines();
          } else {
            toast.error('Error actualizando miembros asignados');
          }
        });
      });
    };
  const { profile, loading: profileLoading } = useProfile();
  const [weeklyRoutines, setWeeklyRoutines] = useState([]);
  const [personalRoutines, setPersonalRoutines] = useState([]);
  const [coachRoutines, setCoachRoutines] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  // Estado para edición de ejercicios por día (para edición de rutina personalizada)
  const [editExercises, setEditExercises] = useState(() => {
    const map = {};
    weekDays.forEach(d => { map[d.order] = []; });
    return map;
  });
  const [members, setMembers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterCoach, setFilterCoach] = useState('all');
  const [editStatus, setEditStatus] = useState('activa');

  // Cierra el modal de edición
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedRoutine(null);
  };
  // Al abrir modal de edición, inicializar ejercicios
  useEffect(() => {
    if (showEditModal && selectedRoutine && selectedRoutine.type !== 'semanal') {
      const map = {};
      weekDays.forEach(d => {
        // Buscar el día por order (personalizada) o day_order (compatibilidad)
        const found = (selectedRoutine.days || []).find(day => (day.order ?? day.day_order) === d.order);
        if (found && Array.isArray(found.exercises)) {
          // Mapear cada ejercicio asegurando los campos
          map[d.order] = found.exercises.map(ex => ({
            name: ex.name || '',
            sets: ex.sets || '',
            reps: ex.reps || '',
            weight: ex.weight || '',
            notes: ex.notes || ''
          }));
        } else {
          map[d.order] = [];
        }
      });
      setEditExercises(map);
    }
  }, [showEditModal, selectedRoutine]);
  // Handler para añadir ejercicio
  const handleAddExercise = (order) => {
    setEditExercises(prev => ({
      ...prev,
      [order]: [
        ...prev[order],
        { name: '', sets: '', reps: '', weight: '', notes: '' }
      ]
    }));
  };
  // Handler para cambiar input
  const handleInputChange = (order, exIdx, field, value) => {
    setEditExercises(prev => {
      const updated = [...prev[order]];
      updated[exIdx] = { ...updated[exIdx], [field]: value };
      return { ...prev, [order]: updated };
    });
  };

  // Declarar fetchRoutines fuera de useEffect para que esté disponible en todo el componente
  async function fetchRoutines() {
    setLoading(true);
    try {
      // Rutinas semanales generales
      const weeklyRes = await getWeeklyRoutines(profile.gym_id);
      setWeeklyRoutines(weeklyRes.success ? weeklyRes.routines : []);

      // Rutinas personalizadas (todas)
      const personalRes = await getAllRoutines(profile.gym_id);
      setPersonalRoutines(personalRes.success ? personalRes.routines : []);

      // Rutinas por coach (solo si admin)
      if (profile.role === 'admin') {
        const coachRes = await getCoachRoutines();
        setCoachRoutines(coachRes.success ? coachRes.routines : []);
      } else {
        setCoachRoutines([]);
      }
      toast.success('Rutinas cargadas correctamente');
    } catch (err) {
      toast.error('Error cargando datos de rutinas');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (profileLoading) return;
    if (!profile || !profile.gym_id) {
      setLoading(false);
      setRoutines([]);
      setMembers([]);
      setCoaches([]);
      return;
    }
    fetchRoutines();
    async function fetchMembersAndCoaches() {
      // Miembros del gimnasio
      let { data: members } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, membership_type')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'member');
      members = members?.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        plan: m.membership_type || 'N/A'
      })) || [];
      setMembers(members);
      // Coaches del gimnasio
      let { data: coaches } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, speciality')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'coach');
      coaches = coaches?.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        speciality: c.speciality || ''
      })) || [];
      setCoaches(coaches);
    }
    fetchRoutines();
    fetchMembersAndCoaches();
  }, [profileLoading, profile?.gym_id]);

  // (Eliminado: declaración duplicada de filteredRoutines)

  // Asegurar que los datos pasados a los modales siempre tengan los campos requeridos
  const normalizeRoutine = (routine) => ({
    ...routine,
    name: routine.name || routine.title || 'Sin título',
    description: routine.description || '',
    duration_weeks: routine.duration_weeks || routine.duration || 0,
    assigned_to: Array.isArray(routine.assigned_to) ? routine.assigned_to : routine.assigned_to ? [routine.assigned_to] : [],
    status: routine.status || 'activa',
    exercises: routine.exercises || '',
    created_by: routine.created_by || '',
    created_at: routine.created_at || routine.createdAt || new Date().toISOString(),
  });

  const handleViewDetails = (routine) => {
    setSelectedRoutine(normalizeRoutine(routine));
    setShowDetailModal(true);
  };

  const handleEditRoutine = (routine) => {
    // Detectar tipo semanal si viene de weeklyRoutines
    let routineType = routine.type;
    if (!routineType && weeklyRoutines.some(r => r.id === routine.id)) {
      routineType = 'semanal';
    }
    // Solo el coach creador puede editar rutinas personalizadas
    // ...aquí va la lógica de edición, no un return JSX...
    setSelectedRoutine({ ...normalizeRoutine(routine), type: routineType });
    setShowEditModal(true);
  };

  const handleToggleStatus = (routineId) => {
    setRoutines(prev => prev.map(routine => {
      if (routine.id === routineId) {
        const newStatus = (routine.status || 'activa') === 'activa' ? 'pausada' : 'activa';
        toast.success(`Rutina ${newStatus === 'activa' ? 'activada' : 'pausada'}`);
        return { ...routine, status: newStatus };
      }
      return routine;
    }));
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (selectedRoutine.type === 'semanal') {
      // Rutina semanal: recolectar todos los inputs y agrupar por day_order (1-7)
      const weeklyRoutineForDB = {
        name: formData.get('title'),
        description: formData.get('description'),
        days: []
      };
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const order = dayIdx + 1;
        const dayNameMap = {
          1: 'Lunes',
          2: 'Martes',
          3: 'Miércoles',
          4: 'Jueves',
          5: 'Viernes',
          6: 'Sábado',
          7: 'Domingo'
        };
        const exercises = [];
        let exIdx = 0;
        while (formData.has(`exercise_name_${dayIdx}_${exIdx}`)) {
          exercises.push({
            name: formData.get(`exercise_name_${dayIdx}_${exIdx}`),
            sets: parseInt(formData.get(`sets_${dayIdx}_${exIdx}`)),
            reps: parseInt(formData.get(`reps_${dayIdx}_${exIdx}`)),
            weight: formData.get(`weight_${dayIdx}_${exIdx}`),
            notes: formData.get(`notes_${dayIdx}_${exIdx}`)
          });
          exIdx++;
        }
        weeklyRoutineForDB.days.push({
          name: dayNameMap[order],
          day_order: order,
          exercises
        });
      }
      // Enviar gym_id si está disponible
      if (profile && profile.gym_id) {
        weeklyRoutineForDB.gym_id = profile.gym_id;
      }
      // Log para depuración
      console.log('📝 Datos enviados a saveWeeklyRoutine:', weeklyRoutineForDB);
      import('./../../api/routines.api').then(api => {
        api.saveWeeklyRoutine(weeklyRoutineForDB).then(res => {
          if (res.success) {
            toast.success('Rutina semanal actualizada');
            setShowEditModal(false);
            setSelectedRoutine(null);
            fetchRoutines();
          } else {
            toast.error('Error actualizando rutina semanal');
          }
        });
      });
    } else {
      // Rutina personalizada: recolectar días y ejercicios
      let days = [];
      // Si estamos editando, usar los días existentes, si estamos creando, generar días por defecto
      const isEdit = !!selectedRoutine?.id;
      const baseDays = isEdit ? (selectedRoutine.days || []) : [
        { name: 'Lunes', order: 1 },
        { name: 'Martes', order: 2 },
        { name: 'Miércoles', order: 3 },
        { name: 'Jueves', order: 4 },
        { name: 'Viernes', order: 5 },
        { name: 'Sábado', order: 6 },
        { name: 'Domingo', order: 7 }
      ];
      days = baseDays.map((day, dayIdx) => {
        const exercises = [];
        let exIdx = 0;
        while (formData.has(`exercise_name_${dayIdx}_${exIdx}`)) {
          exercises.push({
            name: formData.get(`exercise_name_${dayIdx}_${exIdx}`),
            sets: parseInt(formData.get(`sets_${dayIdx}_${exIdx}`)),
            reps: parseInt(formData.get(`reps_${dayIdx}_${exIdx}`)),
            weight: formData.get(`weight_${dayIdx}_${exIdx}`),
            notes: formData.get(`notes_${dayIdx}_${exIdx}`)
          });
          exIdx++;
        }
        return {
          name: day.name,
          order: day.order,
          exercises
        };
      });
      // Asegurar que assigned_to sea array de UUIDs válidos
      let assignedToRaw = formData.getAll('assigned_to');
      let assigned_to = Array.isArray(assignedToRaw) ? assignedToRaw.filter(v => v && v !== '[]') : [];
      if (assigned_to.length === 0) assigned_to = null;
      // Validar status
      // Eliminada validación de status, el sistema lo asigna internamente
      const routineForDB = {
        name: formData.get('title'),
        description: formData.get('description'),
        duration_weeks: parseInt(formData.get('duration')),
        assigned_to,
        days
      };
      import('./../../api/routines.api').then(api => {
        if (isEdit) {
          api.updateRoutine(selectedRoutine.id, routineForDB).then(res => {
            if (res.success) {
              toast.success('Rutina personalizada actualizada');
              setShowEditModal(false);
              setSelectedRoutine(null);
              fetchRoutines();
            } else {
              toast.error('Error actualizando rutina personalizada');
            }
          });
        } else {
          api.createRoutine({ ...routineForDB, gym_id: profile?.gym_id }).then(res => {
            if (res.success) {
              toast.success('Rutina personalizada creada');
              setShowEditModal(false);
              setSelectedRoutine(null);
              fetchRoutines();
            } else {
              toast.error('Error creando rutina personalizada');
            }
          });
        }
      });
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'activa': return 'success';
      case 'pausada': return 'warning';
      case 'borrador': return 'info';
      default: return 'secondary';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'diaria': return 'Diaria';
      case 'semanal': return 'Semanal';
      case 'personalizada': return 'Personalizada';
      default: return type;
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <Loader skeleton rows={6} />
        </div>
      </div>
    );
  }


  // DEBUG: Mostrar en consola las rutinas diferenciadas
  console.log('Rutinas semanales:', weeklyRoutines);
  console.log('Rutinas personalizadas:', personalRoutines);
  console.log('Rutinas por coach:', coachRoutines);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button
          onClick={onBack}
          className="btn-back-dashboard"
          style={{
            background: 'linear-gradient(90deg,#e53935 60%,#e57373 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 22px',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 2px 8px #e5737399',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: 12
          }}
        >← Volver al Dashboard</button>
        <style>{`
          .btn-back-dashboard:hover {
            background: linear-gradient(90deg,#b71c1c 60%,#f44336 100%);
            color: #fff;
            box-shadow: 0 4px 16px #e5737399;
            transform: scale(1.04);
          }
        `}</style>
        <h1>Gestión de Rutinas</h1>
        <p>Administra todas las rutinas creadas por los entrenadores</p>
      </header>


      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Rutinas Semanales</h3>
          <div className="stat-number">{weeklyRoutines.length}</div>
          <p>Semanales</p>
        </div>
        <div className="stat-card">
          <h3>Total Rutinas Personalizadas</h3>
          <div className="stat-number">{personalRoutines.length}</div>
          <p>Personalizadas</p>
        </div>
        <div className="stat-card">
          <h3>Total Rutinas por Coach</h3>
          <div className="stat-number">{coachRoutines.length}</div>
          <p>Por Coach</p>
        </div>
      </div>



      <div className="dashboard-content">
        <div className="routines-sections-grid">
          <div>
            <h2>Rutina Semanal General</h2>
            <div className="routines-table">
              {weeklyRoutines.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No hay rutinas semanales para mostrar.
                </div>
              )}
              {weeklyRoutines.map(routine => (
                <div key={routine.id} className="table-row-routines">
                  <div className="routine-info">
                    <h4>{routine.name || routine.title || 'Sin título'}</h4>
                    <p>{routine.description || 'Sin descripción'}</p>
                  </div>
                  <span className="routine-type-badge semanal">Semanal</span>
                  <div className="coach-info-small">
                    <span className="coach-name">Equipo de Entrenadores</span>
                  </div>
                  <span className="duration-info">-</span>
                  <span className="members-count" style={{ color: '#1976d2', fontWeight: 600 }}>Todos los miembros</span>
                  <span className="status-badge-routine success">Activa</span>
                  <div className="routine-actions">
                    <button onClick={() => handleViewDetails(routine)} className="btn-info-small" title="Ver detalles">👁️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2>Rutinas Personalizadas</h2>
            <div className="routines-table">
              {personalRoutines.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No hay rutinas personalizadas para mostrar.
                </div>
              )}
              {personalRoutines.map(routine => (
                <div key={routine.id} className="table-row-routines">
                  <div className="routine-info">
                    <h4>{routine.name || routine.title || 'Sin título'}</h4>
                    <p>{routine.description || 'Sin descripción'}</p>
                  </div>
                  <span className="routine-type-badge personalizada">Personalizada</span>
                  <div className="coach-info-small">
                    <span className="coach-name">{(coaches.find(c => c.id === routine.created_by)?.name) || routine.coach || 'Desconocido'}</span>
                  </div>
                  <span className="duration-info">{routine.duration_weeks || routine.duration || 0} semanas</span>
                  <span className="members-count">{Array.isArray(routine.assigned_to) ? routine.assigned_to.length : routine.assigned_to ? 1 : 0} miembros</span>
                  <span className={`status-badge-routine ${getStatusColor(routine.status || 'activa')}`}>{(routine.status || 'activa').charAt(0).toUpperCase() + (routine.status || 'activa').slice(1)}</span>
                  <div className="routine-actions">
                    <button onClick={() => handleViewDetails(routine)} className="btn-info-small" title="Ver detalles">👁️</button>
                    <button onClick={() => handleEditRoutine(routine)} className="btn-warning-small" title="Editar">✏️</button>
                    <button onClick={() => handleOpenAssignModal(routine)} className="btn-primary-small" title="Asignar miembros">👥</button>
                    <button onClick={() => handleToggleStatus(routine.id)} className={`btn-toggle-small ${(routine.status || 'activa') === 'activa' ? 'pause' : 'play'}`} title={(routine.status || 'activa') === 'activa' ? 'Pausar' : 'Activar'}>{(routine.status || 'activa') === 'activa' ? '⏸️' : '▶️'}</button>
                    <button onClick={() => handleDeleteRoutine(routine.id)} className="btn-danger-small" title="Eliminar">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Modal rápido para asignar miembros a rutina personalizada */}
            {showAssignModal && assignRoutine && (
              <div className="modal-overlay">
                <div className="modal-content-large" style={{ maxWidth: 480 }}>
                  <h3>Asignar miembros a: <span style={{ color: '#1976d2' }}>{assignRoutine.name}</span></h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, background: '#f5faff', borderRadius: 10, padding: '16px 12px', border: '1.5px solid #90caf9', minHeight: 56, marginBottom: 18 }}>
                    {members.length === 0 ? (
                      <span style={{ color: '#888', fontSize: 15 }}>No hay miembros disponibles para asignar.</span>
                    ) : (
                      members.map(member => {
                        const isSelected = Array.isArray(assignRoutine.assigned_to) && assignRoutine.assigned_to.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => handleAssignMembers(member.id)}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120, padding: '10px 8px', borderRadius: 8,
                              background: isSelected ? 'linear-gradient(90deg,#1976d2 60%,#64b5f6 100%)' : '#fff',
                              color: isSelected ? '#fff' : '#1976d2',
                              border: isSelected ? '2px solid #1976d2' : '1.5px solid #90caf9',
                              boxShadow: isSelected ? '0 2px 8px #1976d299' : '0 1px 4px #90caf933',
                              cursor: 'pointer', transition: 'all 0.2s', marginBottom: 6
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</span>
                            <span style={{ fontSize: 13, color: isSelected ? '#fff' : '#1976d2', marginTop: 2 }}>{member.plan}</span>
                            <span style={{ fontSize: 12, color: isSelected ? '#e3f2fd' : '#90caf9', marginTop: 2 }}>{member.role === 'coach' ? 'Coach' : 'Miembro'}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                      type="button"
                      onClick={handleCloseAssignModal}
                      style={{
                        background: 'linear-gradient(90deg,#e53935 60%,#e57373 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '10px 22px',
                        fontWeight: 700,
                        fontSize: 16,
                        boxShadow: '0 2px 8px #e5737399',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >Cancelar</button>
                    <button
                      type="button"
                      onClick={handleSaveAssignMembers}
                      style={{
                        background: 'linear-gradient(90deg,#1976d2 60%,#64b5f6 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '10px 22px',
                        fontWeight: 700,
                        fontSize: 16,
                        boxShadow: '0 2px 8px #1976d299',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >Guardar cambios</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <h2>Rutinas Creadas por el Coach</h2>
            <div className="routines-table">
              {coachRoutines.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No hay rutinas de coach para mostrar.
                </div>
              )}
              {coachRoutines.map(routine => (
                <div key={routine.id} className="table-row-routines">
                  <div className="routine-info">
                    <h4>{routine.name || routine.title || 'Sin título'}</h4>
                    <p>{routine.description || 'Sin descripción'}</p>
                  </div>
                  <span className="routine-type-badge personalizada">Personalizada</span>
                  <div className="coach-info-small">
                    <span className="coach-name">{(coaches.find(c => c.id === routine.created_by)?.name) || routine.coach || 'Desconocido'}</span>
                  </div>
                  <span className="duration-info">{routine.duration_weeks || routine.duration || 0} semanas</span>
                  <span className="members-count">{Array.isArray(routine.assigned_to) ? routine.assigned_to.length : routine.assigned_to ? 1 : 0} miembros</span>
                  <span className={`status-badge-routine ${getStatusColor(routine.status || 'activa')}`}>{(routine.status || 'activa').charAt(0).toUpperCase() + (routine.status || 'activa').slice(1)}</span>
                  <div className="routine-actions">
                    <button onClick={() => handleViewDetails(routine)} className="btn-info-small" title="Ver detalles">👁️</button>
                    <button onClick={() => handleEditRoutine(routine)} className="btn-warning-small" title="Editar">✏️</button>
                    <button onClick={() => handleToggleStatus(routine.id)} className={`btn-toggle-small ${(routine.status || 'activa') === 'activa' ? 'pause' : 'play'}`} title={(routine.status || 'activa') === 'activa' ? 'Pausar' : 'Activar'}>{(routine.status || 'activa') === 'activa' ? '⏸️' : '▶️'}</button>
                    <button onClick={() => handleDeleteRoutine(routine.id)} className="btn-danger-small" title="Eliminar">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ver Detalles */}
      {showDetailModal && selectedRoutine && (
        <div className="modal-overlay">
          <div className="modal-content-large routine-edit-modal">
            <h3>Detalles de Rutina</h3>
            <div className="routine-details-content">
              <div className="routine-header-detail">
                <h2>{selectedRoutine.name || (selectedRoutine.type === 'personalizada' ? 'Rutina Personalizada' : 'Rutina Semanal General')}</h2>
                <div className="routine-badges">
                  <span className={`routine-type-badge ${selectedRoutine.type || 'semanal'}`}>
                    {getTypeLabel(selectedRoutine.type || (weeklyRoutines.some(r => r.id === selectedRoutine.id) ? 'semanal' : 'personalizada'))}
                  </span>
                  <span className={`status-badge-routine ${getStatusColor(selectedRoutine.status || 'activa')}`}>
                    {(selectedRoutine.status || 'activa').charAt(0).toUpperCase() + (selectedRoutine.status || 'activa').slice(1)}
                  </span>
                </div>
              </div>
              <div className="routine-meta">
                <div className="meta-item">
                  <strong>Entrenador:</strong> {(coaches.find(c => c.id === selectedRoutine.created_by)?.name) || 'Equipo de Entrenadores'}
                </div>
                <div className="meta-item">
                  <strong>Creada:</strong> {new Date(selectedRoutine.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
              <div className="routine-description">
                <h4>Descripción general</h4>
                <p>{selectedRoutine.description}</p>
              </div>
              {/* Mostrar ejercicios organizados por día */}
              <div className="routine-exercises">
                <h4>Ejercicios por día</h4>
                <div className="routine-days-grid">
                  {(() => {
                    // Determinar días según tipo de rutina
                    let days = [];
                    if (selectedRoutine.type === 'semanal') {
                      days = [1,2,3,4,5,6,7].map(order => selectedRoutine.days?.find(d => d.day_order === order) || { name: weekDays[order-1].name, exercises: [] });
                    } else {
                      // Para personalizada, usar order y mostrar solo días con ejercicios o todos los días
                      days = weekDays.map(d => selectedRoutine.days?.find(day => (day.order ?? day.day_order) === d.order) || { name: d.name, exercises: [] });
                    }
                    return days.map((day, idx) => (
                      <div className="routine-day-card" key={idx}>
                        <h4 className="routine-day-title">{day?.name || `Día ${idx+1}`}</h4>
                        <div className="exercises-content">
                          {Array.isArray(day.exercises) && day.exercises.length > 0 ? (
                            day.exercises.map((ex, exIdx) => (
                              <div key={exIdx} className="exercise-item">
                                <strong>{ex.exercise_name || ex.name}</strong> {ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : ''} {ex.weight ? `(${ex.weight}kg)` : ''} {ex.notes ? `- ${ex.notes}` : ''}
                              </div>
                            ))
                          ) : (
                            <span style={{color:'#888'}}>Sin ejercicios</span>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary">
                Cerrar
              </button>
              <button onClick={() => { setShowDetailModal(false); handleEditRoutine(selectedRoutine); }} className="btn-primary">
                Editar Rutina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Rutina */}
      {showEditModal && selectedRoutine && (
        <div className="modal-overlay">
          <div className="modal-content-large routine-edit-modal">
            <h3>Editar Rutina</h3>
            <form onSubmit={handleSaveEdit} className="routine-form">
              {selectedRoutine.type === 'semanal' ? (
                <>
                  <div className="form-group">
                    <label htmlFor="title" style={{ fontWeight: 600, color: '#1a237e' }}>Título de la rutina</label>
                    <input type="text" name="title" id="title" defaultValue={selectedRoutine.name} required placeholder="Ej: Semana 1 de enero" style={{ border: '1px solid #90caf9', borderRadius: 6, padding: 8, width: '100%', marginTop: 4 }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="description" style={{ fontWeight: 600, color: '#1a237e' }}>Descripción</label>
                    <textarea name="description" id="description" defaultValue={selectedRoutine.description} required rows="3" placeholder="Breve descripción de la rutina" style={{ border: '1px solid #90caf9', borderRadius: 6, padding: 8, width: '100%', marginTop: 4 }}></textarea>
                  </div>
                  {/* Edición de días y ejercicios para semanal */}
                  <div className="routine-days-grid">
                    {[1,2,3,4,5,6,7].map((order, dayIdx) => {
                      // Buscar el día por day_order
                      const day = selectedRoutine.days?.find(d => d.day_order === order);
                      const exercises = day?.exercises || [];
                      return (
                        <div className="routine-day-card" key={order} style={{ background: '#f5faff', borderRadius: 10, padding: 18, minWidth: 260, flex: 1, boxShadow: '0 2px 8px #90caf966', marginBottom: 16 }}>
                          <h4 className="routine-day-title" style={{ color: '#1976d2', marginBottom: 12 }}>{day?.name || `Día ${order}`}</h4>
                          {exercises.length > 0 ? exercises.map((ex, exIdx) => (
                            <div key={ex.id || exIdx} className="exercise-edit-row" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, background: '#fff', borderRadius: 6, padding: 10, boxShadow: '0 1px 4px #90caf933' }}>
                              <label htmlFor={`exercise_name_${dayIdx}_${exIdx}`} style={{ fontWeight: 500, color: '#1976d2', marginBottom: 2 }}>Nombre del ejercicio</label>
                              <input type="text" name={`exercise_name_${dayIdx}_${exIdx}`} id={`exercise_name_${dayIdx}_${exIdx}`} defaultValue={ex.exercise_name || ex.name} placeholder="Ej: Sentadillas, Press banca" required style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, marginBottom: 2 }} />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <label htmlFor={`sets_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Series</label>
                                  <input type="number" name={`sets_${dayIdx}_${exIdx}`} id={`sets_${dayIdx}_${exIdx}`} defaultValue={ex.sets} placeholder="Ej: 3" min="1" required style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label htmlFor={`reps_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Repeticiones</label>
                                  <input type="number" name={`reps_${dayIdx}_${exIdx}`} id={`reps_${dayIdx}_${exIdx}`} defaultValue={ex.reps} placeholder="Ej: 12" min="1" required style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label htmlFor={`weight_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Peso (kg)</label>
                                  <input type="text" name={`weight_${dayIdx}_${exIdx}`} id={`weight_${dayIdx}_${exIdx}`} defaultValue={ex.weight} placeholder="Ej: 50" style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }} />
                                </div>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <label htmlFor={`notes_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Notas</label>
                                <input type="text" name={`notes_${dayIdx}_${exIdx}`} id={`notes_${dayIdx}_${exIdx}`} defaultValue={ex.notes} placeholder="Observaciones, tips, etc." style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }} />
                              </div>
                            </div>
                          )) : (
                            <span style={{color:'#888'}}>Sin ejercicios</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label htmlFor="title" style={{ fontWeight: 600, color: '#1a237e' }}>Título de la rutina</label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      defaultValue={selectedRoutine.name}
                      required
                      placeholder="Ej: Rutina de fuerza personalizada"
                      style={{ border: '1px solid #90caf9', borderRadius: 6, padding: 8, width: '100%', marginTop: 4 }}
                    />
                  </div>
                  <div className="form-row" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="duration" style={{ fontWeight: 600, color: '#1a237e' }}>Duración (semanas)</label>
                      <input
                        type="number"
                        name="duration"
                        id="duration"
                        defaultValue={selectedRoutine.duration_weeks}
                        required
                        min="1"
                        max="52"
                        placeholder="Ej: 4"
                        style={{ border: '1px solid #90caf9', borderRadius: 6, padding: 8, width: '100%', marginTop: 4 }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      {/* Eliminado campo de estado, el sistema lo asigna internamente */}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label htmlFor="description" style={{ fontWeight: 600, color: '#1a237e' }}>Descripción</label>
                    <textarea
                      name="description"
                      id="description"
                      defaultValue={selectedRoutine.description}
                      required
                      rows="3"
                      placeholder="Describe brevemente la rutina, objetivos, etc."
                      style={{ border: '1px solid #90caf9', borderRadius: 6, padding: 8, width: '100%', marginTop: 4 }}
                    ></textarea>
                  </div>
                  {/* Edición de días y ejercicios */}
                  <div className="routine-days-grid" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
                    {weekDays.map((d, dayIdx) => (
                      <div className="routine-day-card" key={d.order} style={{ background: '#e3f2fd', borderRadius: 10, padding: 18, minWidth: 260, flex: 1, boxShadow: '0 2px 8px #90caf966' }}>
                        <h4 className="routine-day-title" style={{ color: '#1976d2', marginBottom: 12 }}>{d.name}</h4>
                        {(editExercises[d.order] || []).map((ex, exIdx) => (
                          <div key={exIdx} className="exercise-edit-row" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, background: '#fff', borderRadius: 6, padding: 10, boxShadow: '0 1px 4px #90caf933' }}>
                            <label htmlFor={`exercise_name_${dayIdx}_${exIdx}`} style={{ fontWeight: 500, color: '#1976d2', marginBottom: 2 }}>Nombre del ejercicio #{exIdx + 1}</label>
                            <input
                              type="text"
                              name={`exercise_name_${dayIdx}_${exIdx}`}
                              id={`exercise_name_${dayIdx}_${exIdx}`}
                              defaultValue={ex.name}
                              placeholder="Ej: Sentadillas, Press banca, etc."
                              required
                              onChange={e => handleInputChange(d.order, exIdx, 'name', e.target.value)}
                              style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, marginBottom: 2 }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <label htmlFor={`sets_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Series</label>
                                <input
                                  type="number"
                                  name={`sets_${dayIdx}_${exIdx}`}
                                  id={`sets_${dayIdx}_${exIdx}`}
                                  defaultValue={ex.sets}
                                  placeholder="Ej: 3"
                                  min="1"
                                  required
                                  onChange={e => handleInputChange(d.order, exIdx, 'sets', e.target.value)}
                                  style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label htmlFor={`reps_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Repeticiones</label>
                                <input
                                  type="number"
                                  name={`reps_${dayIdx}_${exIdx}`}
                                  id={`reps_${dayIdx}_${exIdx}`}
                                  defaultValue={ex.reps}
                                  placeholder="Ej: 12"
                                  min="1"
                                  required
                                  onChange={e => handleInputChange(d.order, exIdx, 'reps', e.target.value)}
                                  style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label htmlFor={`weight_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Peso (kg)</label>
                                <input
                                  type="text"
                                  name={`weight_${dayIdx}_${exIdx}`}
                                  id={`weight_${dayIdx}_${exIdx}`}
                                  defaultValue={ex.weight}
                                  placeholder="Ej: 50"
                                  onChange={e => handleInputChange(d.order, exIdx, 'weight', e.target.value)}
                                  style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }}
                                />
                              </div>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <label htmlFor={`notes_${dayIdx}_${exIdx}`} style={{ fontSize: 12, color: '#1976d2' }}>Notas</label>
                              <input
                                type="text"
                                name={`notes_${dayIdx}_${exIdx}`}
                                id={`notes_${dayIdx}_${exIdx}`}
                                defaultValue={ex.notes}
                                placeholder="Observaciones, tips, etc."
                                onChange={e => handleInputChange(d.order, exIdx, 'notes', e.target.value)}
                                style={{ border: '1px solid #90caf9', borderRadius: 4, padding: 6, width: '100%' }}
                              />
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => handleAddExercise(d.order)} style={{ marginTop: 8, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>
                          Añadir ejercicio
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Asignar miembros solo en personalizada */}
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label style={{ fontWeight: 700, color: '#1976d2', marginBottom: 10, fontSize: 17 }}>Asignar miembros a la rutina</label>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 14, background: '#f5faff', borderRadius: 10, padding: '16px 12px', border: '1.5px solid #90caf9', minHeight: 56
                    }}>
                      {members.length === 0 ? (
                        <span style={{ color: '#888', fontSize: 15 }}>No hay miembros disponibles para asignar.</span>
                      ) : (
                        members.map(member => {
                          const isSelected = selectedRoutine.assigned_to.includes(member.id);
                          return (
                            <div
                              key={member.id}
                              onClick={() => {
                                setSelectedRoutine(r => {
                                  const arr = r.assigned_to.includes(member.id)
                                    ? r.assigned_to.filter(id => id !== member.id)
                                    : [...r.assigned_to, member.id];
                                  return { ...r, assigned_to: arr };
                                });
                              }}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120, padding: '10px 8px', borderRadius: 8,
                                background: isSelected ? 'linear-gradient(90deg,#1976d2 60%,#64b5f6 100%)' : '#fff',
                                color: isSelected ? '#fff' : '#1976d2',
                                border: isSelected ? '2px solid #1976d2' : '1.5px solid #90caf9',
                                boxShadow: isSelected ? '0 2px 8px #1976d299' : '0 1px 4px #90caf933',
                                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 6
                              }}
                            >
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</span>
                              <span style={{ fontSize: 13, color: isSelected ? '#fff' : '#1976d2', marginTop: 2 }}>{member.plan}</span>
                              <span style={{ fontSize: 12, color: isSelected ? '#e3f2fd' : '#90caf9', marginTop: 2 }}>Miembro</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#1976d2', marginTop: 8 }}>
                      Haz click sobre los miembros para asignar/desasignar. Solo se mostrarán miembros con plan activo.
                    </div>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    background: 'linear-gradient(90deg,#e53935 60%,#e57373 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 22px',
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 2px 8px #e5737399',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >Cancelar</button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(90deg,#1976d2 60%,#64b5f6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 22px',
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 2px 8px #1976d299',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



export default ManageRoutines;
