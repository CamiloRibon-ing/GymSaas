// ...existing code...

 
import { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { useGymData } from '../../context/GymDataContextDB';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { createRoutine } from '../../api/routines.api';
import InviteCoachModal from '../../components/InviteCoachModal';
import Loader from '../../components/ui/Loader';
import '../../styles/dashboard.css';

export default function ManageCoaches({ onBack }) {
      const [showPassword, setShowPassword] = useState(false);
    // Manejar generación de acceso para coach pendiente
    const [accessEmail, setAccessEmail] = useState("");
    const [accessPassword, setAccessPassword] = useState("");

    const handleSubmitCoachAccess = async (e) => {
      e.preventDefault();
      if (!accessCoach || !accessCoach.email || !accessPassword) {
        toast.error("Completa todos los campos para generar el acceso");
        return;
      }
      try {
        // Usar la nueva función automatizada
        const { success, error } = await import('../../api/memberAccess.api').then(api => api.migratePendingCoach(accessCoach.id, accessPassword));
        if (success) {
          toast.success("Acceso generado correctamente");
          setShowAccessModal(false);
          setAccessCoach(null);
          setAccessPassword("");
          await loadCoachesFromDB();
        } else {
          toast.error(error || "Error generando acceso");
        }
      } catch (err) {
        toast.error(err?.message || "Error generando acceso");
      }
    };
  const { profile, loading: profileLoading } = useProfile();
  const [coaches, setCoaches] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [routineType, setRoutineType] = useState('diaria');
  const [newCoachForm, setNewCoachForm] = useState({
    name: '',
    email: '',
    phone: '',
    speciality: '',
    experience: '',
    bio: '',
    certifications: []
  });
  const [accessCoach, setAccessCoach] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
 // Cargar coaches y miembros desde la base de datos
  const loadCoachesFromDB = async () => {
    if (!profile || !profile.gym_id) {
      setCoaches([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Cargar coaches activos
      const { data: coachesData, error: coachesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'coach');
      if (coachesError) throw coachesError;

      // Cargar coaches pendientes
      const { data: pendingCoachesData, error: pendingCoachesError } = await supabase
        .from('pending_coaches')
        .select('*')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'coach');
      if (pendingCoachesError) throw pendingCoachesError;

      // Cargar miembros
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'member');
      if (membersError) throw membersError;

      // Procesar coaches activos
      const processedCoaches = (coachesData || []).map(coach => ({
        id: coach.id,
        name: `${coach.first_name || ''} ${coach.last_name || ''}`.trim(),
        email: coach.email,
        phone: coach.phone,
        speciality: coach.speciality || '',
        experience: coach.experience || '',
        bio: coach.bio || '',
        certifications: coach.certifications || [],
        clients: (membersData || []).filter(m => m.assigned_coach_id === coach.id).length,
        status: coach.status || 'Activo',
        schedule: coach.schedule || '',
        assignedMembers: (membersData || []).filter(m => m.assigned_coach_id === coach.id).map(m => m.id)
      }));

      // Procesar coaches pendientes
      const processedPendingCoaches = (pendingCoachesData || []).map(coach => ({
        id: coach.temp_id,
        name: `${coach.first_name || ''} ${coach.last_name || ''}`.trim(),
        email: coach.email,
        phone: coach.phone,
        speciality: coach.speciality || '',
        experience: coach.experience || '',
        bio: coach.bio || '',
        certifications: coach.certifications || [],
        clients: 0,
        status: coach.status || 'Pendiente',
        schedule: coach.schedule || '',
        assignedMembers: []
      }));

      setCoaches([...processedCoaches, ...processedPendingCoaches]);

      // Procesar miembros
      const processedMembers = (membersData || []).map(member => ({
        id: member.id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        email: member.email,
        phone: member.phone,
        assignedCoach: member.assigned_coach_id || null,
        status: member.status || 'Activo',
      }));
      setMembers(processedMembers);
    } catch (error) {
      setCoaches([]);
      setMembers([]);
      toast.error('Error cargando entrenadores o miembros');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (profileLoading) return;
    if (!profile || !profile.gym_id) {
      setLoading(false);
      setCoaches([]);
      setMembers([]);
      return;
    }
    loadCoachesFromDB();
  }, [profileLoading, profile?.gym_id]);

  const totalClients = coaches.reduce((sum, coach) => sum + coach.clients, 0);
  const activeCoaches = coaches.filter(c => c.status === 'Activo').length;

  if (profileLoading || loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <Loader skeleton rows={6} />
        </div>
      </div>
    );
  }

  const handleViewProfile = (coach) => {
    setSelectedCoach(coach);
    setShowProfileModal(true);
  };
  const handleEditCoach = (coach) => {
    setSelectedCoach(coach);
    setShowEditForm(true);
  };

  const handleAssignClients = (coach) => {
    setSelectedCoach(coach);
    setShowAssignModal(true);
  };

  const handleInviteCoach = (coach) => {
    setSelectedCoach(coach);
    setShowInviteModal(true);
  };

  const handleCreateRoutine = (coach) => {
    setSelectedCoach(coach);
    setShowRoutineModal(true);
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target);
      // Parsear ejercicios (1 por línea, formato: nombre - sets x reps)
      const exercisesRaw = formData.get('exercises').split('\n').map(line => line.trim()).filter(Boolean);
      const exercises = exercisesRaw.map(line => {
        // Ejemplo: "Sentadillas - 4x12" o "Press banca - 4x10"
        const [name, setsReps] = line.split('-').map(s => s.trim());
        let sets = 0, reps = 0;
        if (setsReps) {
          const match = setsReps.match(/(\d+)x(\d+)/);
          if (match) {
            sets = parseInt(match[1]);
            reps = parseInt(match[2]);
          }
        }
        return { name, sets, reps };
      });

      const routineData = {
        name: formData.get('title'),
        description: formData.get('description'),
        goal: '',
        duration_weeks: 1,
        assigned_to: routineType === 'personalizada' ? formData.getAll('targetMembers') : null,
        gym_id: profile.gym_id,
        notes: '',
        days: [
          {
            name: routineType,
            order: 1,
            rest_day: false,
            exercises
          }
        ]
      };
      const result = await createRoutine(routineData);
      if (result.success) {
        toast.success('Rutina creada exitosamente');
        setShowRoutineModal(false);
        setSelectedCoach(null);
      } else {
        toast.error('Error creando rutina: ' + (result.error || ''));
      }
    } catch (error) {
      toast.error('Error creando rutina');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMembers = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.target);
      const selectedMemberIds = formData.getAll('members');
      
      console.log('Asignando miembros:', selectedMemberIds, 'al coach:', selectedCoach.id);
      
      // Primero, desasignar todos los miembros que estaban asignados a este coach
          const { error: unassignError } = await supabase
            .from('profiles')
        .update({ assigned_coach_id: null })
        .eq('assigned_coach_id', selectedCoach.id);
        
      if (unassignError) {
        console.error('Error desasignando miembros:', unassignError);
      }
      
      // Luego, asignar los miembros seleccionados al coach
      if (selectedMemberIds.length > 0) {
        const { error: assignError } = await supabase
              .from('profiles')
          .update({ assigned_coach_id: selectedCoach.id })
          .in('id', selectedMemberIds);
          
        if (assignError) {
          console.error('Error asignando miembros:', assignError);
          alert('Error al asignar miembros: ' + assignError.message);
          return;
        }
      }

      // Recargar datos para reflejar los cambios
      await loadCoachesFromDB();
      
      alert(`${selectedMemberIds.length} miembros asignados exitosamente a ${selectedCoach.name}`);
      setShowAssignModal(false);
      setSelectedCoach(null);
      
    } catch (error) {
      console.error('Error en asignación:', error);
      alert('Error al asignar miembros');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    setLoading(true);
    try {
      const updatedCoachData = {
        first_name: formData.get('name').split(' ')[0] || formData.get('name'),
        last_name: formData.get('name').split(' ').slice(1).join(' ') || '',
        email: formData.get('email'),
        phone: formData.get('phone'),
        speciality: formData.get('speciality'),
        experience: formData.get('experience'),
        bio: formData.get('bio'),
        schedule: formData.get('schedule')
      };

      const { error } = await supabase
            .from('profiles')
        .update(updatedCoachData)
        .eq('id', selectedCoach.id);

      if (error) {
        console.error('Error actualizando entrenador:', error);
        alert('Error al actualizar entrenador: ' + error.message);
        return;
      }

      const updatedCoach = {
        ...selectedCoach,
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        speciality: formData.get('speciality'),
        experience: formData.get('experience'),
        bio: formData.get('bio'),
        schedule: formData.get('schedule')
      };

      setCoaches(prev => prev.map(coach => 
        coach.id === selectedCoach.id ? updatedCoach : coach
      ));

      alert('Entrenador actualizado exitosamente');
      setShowEditForm(false);
      setSelectedCoach(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar entrenador');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar agregar nuevo entrenador
  const handleAddCoach = async () => {
    if (!newCoachForm.name || !newCoachForm.email || !newCoachForm.speciality) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const { data: newPendingCoach, error } = await supabase
        .from('pending_coaches')
        .insert({
          first_name: newCoachForm.name.split(' ')[0] || newCoachForm.name,
          last_name: newCoachForm.name.split(' ').slice(1).join(' ') || '',
          phone: newCoachForm.phone,
          email: newCoachForm.email,
          role: 'coach',
          gym_id: profile.gym_id,
          speciality: newCoachForm.speciality,
          experience: newCoachForm.experience,
          bio: newCoachForm.bio,
          status: 'Pendiente'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando entrenador:', error);
        toast.error('Error al crear entrenador: ' + error.message);
        return;
      }

      // Reset form
      setNewCoachForm({
        name: '',
        email: '',
        phone: '',
        speciality: '',
        experience: '',
        bio: '',
        certifications: []
      });
      setShowAddForm(false);
      toast.success('Entrenador añadido exitosamente');
      // Refrescar la lista para asegurar sincronización
      await loadCoachesFromDB();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al añadir entrenador');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loader">Cargando entrenadores...</div>
        </div>
      </div>
    );
  }

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
        <h1>Administrar Entrenadores</h1>
        <p>Gestiona el equipo de entrenadores del gimnasio</p>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Entrenadores</h3>
          <div className="stat-number">{coaches.length}</div>
          <p>En el equipo</p>
        </div>
        
        <div className="stat-card">
          <h3>Entrenadores Activos</h3>
          <div className="stat-number">{activeCoaches}</div>
          <p>Disponibles hoy</p>
        </div>
        
        <div className="stat-card">
          <h3>Clientes Asignados</h3>
          <div className="stat-number">{totalClients}</div>
          <p>Total de asignaciones</p>
        </div>

        <div className="stat-card">
          <h3>Promedio por Coach</h3>
          <div className="stat-number">{coaches.length > 0 ? Math.round(totalClients / coaches.length) : 0}</div>
          <p>Clientes por entrenador</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section" style={{gridColumn: '1 / -1'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2>Equipo de Entrenadores</h2>
            <button onClick={() => setShowAddForm(true)} className="btn-primary">
              + Contratar Entrenador
            </button>
          </div>

          <div className="coaches-grid-enhanced">
            {coaches.map(coach => (
              <div key={coach.id} className="coach-card-enhanced">
                <div className="coach-header">
                  <div className="coach-avatar">
                    {coach.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="coach-info">
                    <h3>{coach.name}</h3>
                    <p>{coach.email}</p>
                    <span className={`status-badge-coach ${coach.status.toLowerCase().replace(' ', '-')}`}>
                      {coach.status}
                    </span>
                  </div>
                </div>
                
                <div className="coach-details">
                  <div className="detail-item">
                    <strong>Especialidad:</strong>
                    <span>{coach.speciality}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Experiencia:</strong>
                    <span>{coach.experience}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Clientes:</strong>
                    <span>{coach.clients} asignados</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Certificaciones:</strong>
                    <div className="certifications">
                      {coach.certifications.map((cert, idx) => (
                        <span key={idx} className="certification-badge-enhanced">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="coach-actions-enhanced">
                  <button 
                    onClick={() => handleViewProfile(coach)} 
                    className="btn-info"
                  >
                    Ver Perfil
                  </button>
                  <button 
                    onClick={() => handleAssignClients(coach)} 
                    className="btn-success"
                  >
                    Asignar Clientes
                  </button>
                  {coach.status === 'Pendiente' && (
                    <button 
                      onClick={() => {
                        setAccessCoach(coach);
                        setShowAccessModal(true);
                      }} 
                      className="btn-warning"
                      title="Generar acceso/login para coach"
                    >
                      🔑 Generar Acceso
                    </button>
                  )}
                  <button 
                    onClick={() => handleCreateRoutine(coach)} 
                    className="btn-routine"
                  >
                    Crear Rutina
                  </button>
                  <button 
                    onClick={() => handleEditCoach(coach)} 
                    className="btn-warning"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Generar Acceso Coach */}
      {showAccessModal && accessCoach && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <h3>Generar Acceso para {accessCoach.name}</h3>
            <form onSubmit={handleSubmitCoachAccess} className="access-form">
              <div className="form-group">
                <label>Correo electrónico:</label>
                <input
                  type="email"
                  value={accessCoach.email}
                  readOnly
                  required
                />
              </div>
              <div className="form-group">
                <label>Contraseña:</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={accessPassword}
                    onChange={e => setAccessPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ marginLeft: 8 }}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowAccessModal(false);
                  setAccessCoach(null);
                  setAccessPassword("");
                }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Generar Acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Perfil */}
      {showProfileModal && selectedCoach && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <h3>Perfil de {selectedCoach.name}</h3>
            <div className="profile-content">
              <div className="profile-header">
                <div className="coach-avatar-large">
                  {selectedCoach.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="profile-info">
                  <h2>{selectedCoach.name}</h2>
                  <p className="profile-email">{selectedCoach.email}</p>
                  <p className="profile-phone">{selectedCoach.phone}</p>
                  <span className={`status-badge-coach ${selectedCoach.status.toLowerCase()}`}>
                    {selectedCoach.status}
                  </span>
                </div>
              </div>
              
              <div className="profile-details">
                <div className="profile-section">
                  <h4>Información Profesional</h4>
                  <p><strong>Especialidad:</strong> {selectedCoach.speciality}</p>
                  <p><strong>Experiencia:</strong> {selectedCoach.experience}</p>
                  <p><strong>Horario:</strong> {selectedCoach.schedule}</p>
                </div>
                
                <div className="profile-section">
                  <h4>Biografía</h4>
                  <p>{selectedCoach.bio}</p>
                </div>
                
                <div className="profile-section">
                  <h4>Certificaciones</h4>
                  <div className="certifications">
                    {selectedCoach.certifications.map((cert, idx) => (
                      <span key={idx} className="certification-badge-enhanced">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="profile-section">
                  <h4>Miembros Asignados</h4>
                  <div className="assigned-members">
                    {members.filter(member => selectedCoach.assignedMembers?.includes(member.id)).map(member => (
                      <div key={member.id} className="member-item">
                        <span>{member.name}</span>
                        <span className={`plan-badge ${member.plan}`}>{member.plan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={() => setShowProfileModal(false)} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Clientes */}
      {showAssignModal && selectedCoach && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <h3>Asignar Clientes a {selectedCoach.name}</h3>
            <form onSubmit={handleAssignMembers} className="assign-form">
              <div className="members-selection">
                <h4>Seleccionar Miembros:</h4>
                <div className="members-grid">
                  {members.map(member => (
                    <label key={member.id} className="member-checkbox">
                      <input 
                        type="checkbox" 
                        name="members" 
                        value={member.id}
                        defaultChecked={member.assignedCoach === selectedCoach.id}
                      />
                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-email">{member.email}</span>
                        <span className={`plan-badge ${member.plan}`}>{member.plan}</span>
                        {member.assignedCoach && member.assignedCoach !== selectedCoach.id && (
                          <span className="already-assigned">Ya asignado a otro coach</span>
                        )}
                        {member.assignedCoach === selectedCoach.id && (
                          <span className="current-assigned">Asignado actualmente</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Asignar Seleccionados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Rutina */}
      {showRoutineModal && selectedCoach && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <h3>Crear Rutina - {selectedCoach.name}</h3>
            <form onSubmit={handleSaveRoutine} className="routine-form">
              <div className="form-group">
                <label>Tipo de Rutina:</label>
                <select 
                  value={routineType} 
                  onChange={(e) => setRoutineType(e.target.value)}
                  className="routine-type-select"
                >
                  <option value="diaria">Rutina Diaria</option>
                  <option value="semanal">Rutina Semanal</option>
                  <option value="personalizada">Rutina Personalizada</option>
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Título de la Rutina:</label>
                  <input type="text" name="title" required placeholder="Ej: Entrenamiento de Fuerza - Día 1" />
                </div>
                <div className="form-group">
                  <label>Duración (minutos):</label>
                  <input type="number" name="duration" required placeholder="60" min="15" max="180" />
                </div>
              </div>
              
              <div className="form-group">
                <label>Descripción:</label>
                <textarea 
                  name="description" 
                  required 
                  rows="3"
                  placeholder="Descripción general de la rutina y objetivos"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Ejercicios y Series:</label>
                <textarea 
                  name="exercises" 
                  required 
                  rows="8"
                  placeholder="Ejemplo:&#10;1. Sentadillas - 4 series x 12 repeticiones&#10;2. Press de banca - 4 series x 10 repeticiones&#10;3. Peso muerto - 3 series x 8 repeticiones&#10;4. Dominadas - 3 series x máximo repeticiones"
                ></textarea>
              </div>
              
              {routineType === 'personalizada' && (
                <div className="form-group">
                  <label>Asignar a Miembros Específicos:</label>
                  <div className="members-selection-routine">
                    {members.filter(member => selectedCoach.assignedMembers?.includes(member.id)).map(member => (
                      <label key={member.id} className="member-checkbox-small">
                        <input type="checkbox" name="targetMembers" value={member.id} />
                        <span>{member.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowRoutineModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Rutina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Entrenador */}
      {showEditForm && selectedCoach && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <h3>Editar Entrenador</h3>
            <form onSubmit={handleSaveEdit} className="member-form-enhanced">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre Completo:</label>
                  <input type="text" name="name" defaultValue={selectedCoach.name} required />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input type="email" name="email" defaultValue={selectedCoach.email} required />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono:</label>
                  <input type="tel" name="phone" defaultValue={selectedCoach.phone} required />
                </div>
                <div className="form-group">
                  <label>Especialidad:</label>
                  <input type="text" name="speciality" defaultValue={selectedCoach.speciality} required />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Experiencia:</label>
                  <input type="text" name="experience" defaultValue={selectedCoach.experience} required />
                </div>
                <div className="form-group">
                  <label>Horario:</label>
                  <input type="text" name="schedule" defaultValue={selectedCoach.schedule} required />
                </div>
              </div>
              
              <div className="form-group">
                <label>Biografía:</label>
                <textarea name="bio" defaultValue={selectedCoach.bio} rows="3"></textarea>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Entrenador */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Contratar Nuevo Entrenador</h3>
            <form className="coach-form" onSubmit={async (e) => {
              e.preventDefault();
              await handleAddCoach();
            }}>
              <input 
                type="text" 
                placeholder="Nombre completo" 
                value={newCoachForm.name}
                onChange={(e) => setNewCoachForm({...newCoachForm, name: e.target.value})}
                required 
              />
              <input 
                type="email" 
                placeholder="Email" 
                value={newCoachForm.email}
                onChange={(e) => setNewCoachForm({...newCoachForm, email: e.target.value})}
                required 
              />
              <input 
                type="text" 
                placeholder="Teléfono" 
                value={newCoachForm.phone}
                onChange={(e) => setNewCoachForm({...newCoachForm, phone: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Especialidad" 
                value={newCoachForm.speciality}
                onChange={(e) => setNewCoachForm({...newCoachForm, speciality: e.target.value})}
                required 
              />
              <input 
                type="text" 
                placeholder="Años de experiencia" 
                value={newCoachForm.experience}
                onChange={(e) => setNewCoachForm({...newCoachForm, experience: e.target.value})}
              />
              <textarea 
                placeholder="Biografía del entrenador" 
                rows="3"
                value={newCoachForm.bio}
                onChange={(e) => setNewCoachForm({...newCoachForm, bio: e.target.value})}
              ></textarea>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Contratando...' : 'Contratar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}