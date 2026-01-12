import { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { useGymData } from '../../context/GymDataContextDB';
import QRGenerator from '../attendance/QRGenerator';
import { createUser as createUserAPI } from '../../api/users.api';
import { updateUser, updatePendingMember } from '../../api/users.api';
import { toast } from 'react-hot-toast';
import { createAuthForMember, getPendingMembers, deletePendingMember } from '../../api/users.api';

import Loader from '../../components/ui/Loader';
import { supabase } from '../../supabaseClient';
import '../../styles/dashboard.css';

// Definir planes disponibles
const MEMBERSHIP_PLANS = {
  rutina_normal: {
    name: 'Rutina Normal',
    price: 3000,
    duration: 'Por sesión',
    description: 'Acceso básico al gimnasio sin plan mensual',
    features: ['Uso de equipos', 'Horarios normales']
  },
  mensualidad: {
    name: 'Mensualidad',
    price: 50000,
    duration: '30 días',
    description: 'Plan mensual básico',
    features: ['Acceso completo', 'Todos los equipos', 'Horarios completos']
  },
  semipersonalizado: {
    name: 'Semipersonalizado',
    price: 80000,
    duration: '30 días',
    description: 'Plan con seguimiento parcial',
    features: ['Todo lo del plan básico', 'Rutinas recomendadas', 'Seguimiento quincenal']
  },
  personalizado: {
    name: 'Personalizado',
    price: 130000,
    duration: '30 días', 
    description: 'Plan completamente personalizado',
    features: ['Todo lo anterior', 'Entrenador personal', 'Plan nutricional', 'Seguimiento diario']
  }
};

// Horarios del gimnasio
const GYM_SCHEDULE = {
  'Lunes a Viernes': '5:00 AM - 11:00 AM y 3:00 PM - 9:00 PM',
  'Sábado': '6:00 AM - 12:00 PM',
  'Domingo': 'CERRADO'
};

export default function ManageMembers({ onBack }) {
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState(null);
  const { profile, loading: profileLoading } = useProfile();
  const { members: contextMembers, currentUser } = useGymData();
  const [members, setMembers] = useState([]); // Activos
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedMemberForQR, setSelectedMemberForQR] = useState(null);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    membership: 'mensualidad',
    status: 'Activo'
  });
  
  // Función para calcular días restantes
  const calculateDaysRemaining = (startDate, planType) => {
    if (planType === 'rutina_normal') return 'Por sesión';
    
    const start = new Date(startDate);
    const now = new Date();
    const duration = 30; // días
    const endDate = new Date(start.getTime() + (duration * 24 * 60 * 60 * 1000));
    const daysLeft = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
    
    return daysLeft > 0 ? `${daysLeft} días` : 'Vencido';
  };
  
  // Función para calcular días transcurridos
  const calculateDaysElapsed = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();
    const daysElapsed = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return daysElapsed;
  };

  // Mover la función fuera del useEffect para reutilizarla
  const loadMembersFromDB = async () => {
    try {
      console.log('🔍 === DEBUGGING MANAGE MEMBERS ===');
      console.log('Profile completo:', profile);
      console.log('Profile gym_id:', profile?.gym_id);
      if (!profile?.gym_id) {
        setMembers([]);
        setPendingMembers([]);
        return;
      }
      // Cargar miembros desde profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'member');
      console.log('Respuesta de Supabase:', { profiles, error });
      if (error) {
        console.error('Error cargando miembros:', error);
        setMembers([]);
        setPendingMembers([]);
      } else {
        console.log('Datos cargados exitosamente:', profiles);
        // Convertir datos de Supabase al formato esperado
        const membersData = profiles.map(profile => ({
          id: profile.id,
          gym_id: profile.gym_id, // Asegura que el QR tenga el gym_id correcto
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          email: profile.email || `${profile.first_name || 'user'}@gym.com`,
          phone: profile.phone || 'N/A',
          membership: profile.membership_type || 'mensualidad',
          status: profile.status || 'Activo',
          joined: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          planStartDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          lastVisit: null,
          totalPaid: 0,
          visits: 0,
          assignedCoach: profile.assigned_coach_id
        }));
        console.log('Miembros procesados:', membersData);
        setMembers(membersData || []); // Asegurar que siempre sea array

        // Cargar miembros pendientes
        const pending = await getPendingMembers(profile.gym_id);
        const pendingData = (pending || []).map(pm => ({
          id: pm.id,
          name: `${pm.first_name || ''} ${pm.last_name || ''}`.trim(),
          email: pm.email,
          phone: pm.phone,
          membership: pm.membership_type || 'mensualidad',
          status: pm.status || 'Pendiente',
          joined: pm.created_at ? new Date(pm.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        }));
        setPendingMembers(pendingData);
      }
    } catch (error) {
      console.error('💥 Error general:', error);
      setMembers([]); // Asegurar que siempre sea array vacío
      setPendingMembers([]);
    } finally {
      setLoading(false);

  } // <-- Cierre correcto de handleSaveMember
  };

  // Datos de ejemplo para miembros con información de planes
  useEffect(() => {
    if (profileLoading) return;
    if (!profile || !profile.gym_id) {
      setLoading(false);
      setMembers([]);
      setPendingMembers([]);
      return;
    }
    loadMembersFromDB();
  }, [profileLoading, profile?.gym_id]);

  if (profileLoading || loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <Loader skeleton rows={6} />
        </div>
      </div>
    );
  }

  const handleDeleteMember = (memberId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este miembro?')) {
      supabase
        .from('profiles')
        .delete()
        .eq('id', memberId)
        .then(({ error }) => {
          if (error) {
            alert('Error al eliminar miembro: ' + error.message);
          } else {
            setMembers(members.filter(member => member.id !== memberId));
            alert('Miembro eliminado exitosamente');
          }
        });
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowAddForm(true);
  };

  const handleStatusChange = (memberId, newStatus) => {
    supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', memberId)
      .then(({ error }) => {
        if (error) {
          alert('Error al actualizar estado: ' + error.message);
        } else {
          setMembers(members.map(member => 
            member.id === memberId ? { ...member, status: newStatus } : member
          ));
          alert(`Estado del miembro actualizado a ${newStatus}`);
        }
      });
  };

  const handleGenerateQR = (member) => {
    // Asegurar que el campo gym_id esté presente y loguear el objeto
    const memberWithGymId = {
      ...member,
      gym_id: member.gym_id || member.gymId
    };
    console.log('[ManageMembers.jsx] memberWithGymId enviado a QRGenerator:', JSON.stringify(memberWithGymId, null, 2));
    setSelectedMemberForQR(memberWithGymId);
    setShowQRGenerator(true);
    console.log('Modal QRGenerator debería estar visible');
  };

  const handleSaveMember = async (memberData) => {
    if (!memberData.name || !memberData.email) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }
    setLoading(true);
    try {
      let gymId = profile?.gym_id;
      if (!gymId) {
        toast.error('Error: No se pudo determinar el gimnasio');
        return;
      }

      if (editingMember) {
        // Detectar si es miembro pendiente o activo
        const isPending = pendingMembers.some(m => m.id === editingMember.id);
        if (isPending) {
          // Editar miembro pendiente
          const payload = {
            first_name: memberData.name.split(' ')[0] || memberData.name,
            last_name: memberData.name.split(' ').slice(1).join(' ') || '',
            phone: memberData.phone,
            email: memberData.email,
            membership_type: memberData.membership,
            status: memberData.status || 'Pendiente'
          };
          await updatePendingMember(editingMember.id, payload);
          toast.success('Miembro pendiente actualizado');
        } else {
          // Editar miembro activo
          const payload = {
            first_name: memberData.name.split(' ')[0] || memberData.name,
            last_name: memberData.name.split(' ').slice(1).join(' ') || '',
            phone: memberData.phone,
            email: memberData.email,
            membership_type: memberData.membership,
            status: memberData.status
          };
          await updateUser(editingMember.id, payload);
          // Insertar o actualizar membresía activa si se seleccionó un plan válido
          try {
            const gymId = profile?.gym_id;
            // Buscar el plan seleccionado en la tabla plans de la BD
            const { data: plans, error: plansError } = await supabase
              .from('plans')
              .select('id, duration_days')
              .eq('gym_id', gymId)
              .eq('active', true);
            if (!plansError && plans && plans.length > 0) {
              // Buscar el plan por nombre (membership)
              const selectedPlan = plans.find(p => p.id === memberData.plan_id || p.name?.toLowerCase() === memberData.membership?.toLowerCase());
              if (selectedPlan) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(startDate.getDate() + Number(selectedPlan.duration_days || 30));
                await supabase.from('memberships').upsert([
                  {
                    user_id: editingMember.id,
                    plan_id: selectedPlan.id,
                    gym_id: gymId,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'active',
                  }
                ], { onConflict: ['user_id', 'gym_id'] });
              }
            }
          } catch (err) {
            console.error('Error actualizando membresía:', err);
          }
          toast.success('Miembro actualizado exitosamente');
        }
        setTimeout(() => {
          loadMembersFromDB();
        }, 500);
      } else {
        // Crear miembro solo en pending_members (sin Auth ni contraseña)
        const payload = {
          first_name: memberData.name.split(' ')[0] || memberData.name,
          last_name: memberData.name.split(' ').slice(1).join(' ') || '',
          phone: memberData.phone,
          email: memberData.email,
          role: 'member',
          gym_id: gymId,
          membership_type: memberData.membership,
          status: memberData.status || 'Pendiente'
        };
        console.log('Payload a pending_members:', payload);
        const result = await createUserAPI(payload);
        if (result) {
          // Insertar membresía activa solo si no tiene una vigente
          try {
            // Buscar membresía activa vigente
            const { data: activeMemberships, error: activeError } = await supabase
              .from('memberships')
              .select('id, end_date')
              .eq('user_id', result.id)
              .eq('gym_id', gymId)
              .eq('status', 'active');
            const now = new Date();
            const hasActive = (activeMemberships || []).some(m => new Date(m.end_date) >= now);
            if (!hasActive) {
              // Buscar el plan seleccionado en la tabla plans de la BD
              const { data: plans, error: plansError } = await supabase
                .from('plans')
                .select('id, duration_days')
                .eq('gym_id', gymId)
                .eq('active', true);
              if (!plansError && plans && plans.length > 0) {
                // Buscar el plan por nombre (membership)
                const selectedPlan = plans.find(p => p.id === memberData.plan_id || p.name?.toLowerCase() === memberData.membership?.toLowerCase());
                if (selectedPlan) {
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setDate(startDate.getDate() + Number(selectedPlan.duration_days || 30));
                  await supabase.from('memberships').insert([
                    {
                      user_id: result.id,
                      plan_id: selectedPlan.id,
                      gym_id: gymId,
                      start_date: startDate.toISOString(),
                      end_date: endDate.toISOString(),
                      status: 'active',
                    }
                  ]);
                }
              }
            } else {
              toast.error('El miembro ya tiene una membresía activa. El nuevo plan se podrá asignar cuando termine la actual.');
            }
          } catch (err) {
            console.error('Error insertando membresía:', err);
          }
          toast.success('Miembro añadido exitosamente');
          setTimeout(() => {
            loadMembersFromDB();
          }, 500);
        } else {
          toast.error('Error al crear miembro');
        }
      }
    } catch (error) {
      toast.error('Error al guardar miembro: ' + (error.message || error));
    } finally {
      setLoading(false);
      setShowAddForm(false);
      setEditingMember(null);
    }
  }
  const activeMembers = (members || []).filter(m => m && m.status === 'Activo').length;
  const totalRevenue = (members || []).reduce((sum, member) => sum + (member?.totalPaid || 0), 0);
  const expiringSoon = (members || []).filter(m => {
    if (!m || m.membership === 'rutina_normal') return false;
    const remaining = calculateDaysRemaining(m.planStartDate, m.membership);
    return remaining !== 'Vencido' && parseInt(remaining) <= 7;
  }).length;

  // Renderizar vista de planes
  if (activeTab === 'plans') {
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
          <h1>Planes y Membresías</h1>
          <p>Información detallada de todos los planes disponibles</p>
        </header>

        <div className="tabs-container">
          <button 
            className={activeTab === 'members' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('members')}
          >
            👥 Miembros
          </button>
          <button 
            className={activeTab === 'plans' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('plans')}
          >
            💳 Planes
          </button>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-section" style={{gridColumn: '1 / -1'}}>            
            <h2>Horarios del Gimnasio</h2>
            <div className="gym-schedule">
              {Object.entries(GYM_SCHEDULE).map(([day, hours]) => (
                <div key={day} className={`schedule-item ${day === 'Domingo' ? 'closed' : ''}`}>
                  <strong>{day}:</strong>
                  <span>{hours}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section" style={{gridColumn: '1 / -1'}}>            
            <h2>Planes Disponibles</h2>
            <div className="plans-grid">
              {Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => {
                const membersWithPlan = members.filter(m => m.membership === key).length;
                const planRevenue = members
                  .filter(m => m.membership === key)
                  .reduce((sum, member) => sum + member.totalPaid, 0);
                
                return (
                  <div key={key} className="plan-card">
                    <div className="plan-header">
                      <h3>{plan.name}</h3>
                      <div className="plan-price">
                        ${plan.price.toLocaleString()} COP
                        <span>/{plan.duration}</span>
                      </div>
                    </div>
                    
                    <div className="plan-description">
                      <p>{plan.description}</p>
                    </div>
                    
                    <div className="plan-features">
                      <h4>Características:</h4>
                      <ul>
                        {plan.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="plan-stats">
                      <div className="stat">
                        <strong>{membersWithPlan}</strong>
                        <span>Miembros activos</span>
                      </div>
                      <div className="stat">
                        <strong>${planRevenue.toLocaleString()}</strong>
                        <span>Ingresos totales</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar vista de miembros
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
        <h1>Gestionar Miembros</h1>
        <p>Administra la membresía de tu gimnasio</p>
      </header>

      <div className="tabs-container">
        <button 
          className={activeTab === 'members' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('members')}
        >
          👥 Miembros ({members.length})
        </button>
        <button 
          className={activeTab === 'plans' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('plans')}
        >
          💳 Planes y Precios
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Miembros</h3>
          <div className="stat-number">{members.length}</div>
          <p>Miembros registrados</p>
        </div>
        
        <div className="stat-card">
          <h3>Miembros Activos</h3>
          <div className="stat-number">{activeMembers}</div>
          <p>Membresías activas</p>
        </div>
        
        <div className="stat-card">
          <h3>Expiran Pronto</h3>
          <div className="stat-number" style={{color: expiringSoon > 0 ? '#ff6b6b' : '#4CAF50'}}>
            {expiringSoon}
          </div>
          <p>En los próximos 7 días</p>
        </div>

        <div className="stat-card">
          <h3>Ingresos Totales</h3>
          <div className="stat-number">${totalRevenue.toLocaleString()}</div>
          <p>Total recaudado</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section" style={{gridColumn: '1 / -1'}}>          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>            
            <h2>Lista de Miembros</h2>
            <button onClick={() => { setEditingMember(null); setShowAddForm(true); }} className="btn-primary">
              + Agregar Nuevo Miembro
            </button>
          </div>

          <div className="members-table-enhanced">
            <div className="table-header-enhanced">
              <div>Información Personal</div>
              <div>Plan Actual</div>
              <div>Estado del Plan</div>
              <div>Actividad</div>
              <div>Acciones</div>
            </div>
            
            {/* Miembros pendientes */}
            {pendingMembers && pendingMembers.length > 0 && pendingMembers.map(member => {
              const plan = MEMBERSHIP_PLANS[member.membership] || MEMBERSHIP_PLANS['mensualidad'];
              return (
                <div key={member.id} className="table-row-enhanced pending-member-row">
                  <div className="member-info">
                    <div className="member-name-email">
                      <strong>{member.name || 'Sin nombre'}</strong>
                      <span className="member-email">{member.email || 'Sin email'}</span>
                      <span className="member-phone">{member.phone || 'Sin teléfono'}</span>
                    </div>
                  </div>
                  <div className="member-plan">
                    <div className={`membership-badge-enhanced ${member.membership}`}>{plan?.name || 'Plan Desconocido'}</div>
                    <div className="plan-price">${(plan?.price || 0).toLocaleString()} COP</div>
                  </div>
                  <div className="plan-status">
                    <div className={`status-badge-enhanced pendiente`}>Pendiente</div>
                  </div>
                  <div className="member-activity">
                    <div>-</div>
                  </div>
                  <div className="member-actions-enhanced">
                    <button
                      className="action-btn-small access"
                      onClick={() => {
                        setSelectedMemberForAccess(member);
                        setShowAccessModal(true);
                      }}
                      title="Generar acceso (credenciales)"
                    >
                      🔑
                    </button>
                    <button
                      className="action-btn-small delete"
                      onClick={async () => {
                        if (window.confirm('¿Eliminar miembro pendiente?')) {
                          await deletePendingMember(member.id);
                          setTimeout(() => loadMembersFromDB(), 500);
                        }
                      }}
                      title="Eliminar miembro pendiente"
                    >🗑️</button>
                  </div>
                </div>
              );
            })}
            {/* Miembros activos */}
            {members && members.length > 0 && members.filter(member => member && member.id).map(member => {
              const plan = MEMBERSHIP_PLANS[member.membership] || MEMBERSHIP_PLANS['mensualidad']; // Fallback plan
              const daysRemaining = calculateDaysRemaining(member.planStartDate, member.membership);
              const daysElapsed = member.planStartDate ? calculateDaysElapsed(member.planStartDate) : 0;
              const isExpiringSoon = daysRemaining !== 'Por sesión' && daysRemaining !== 'Vencido' && parseInt(daysRemaining) <= 7;
              return (
                <div key={member.id} className="table-row-enhanced">
                  <div className="member-info">
                    <div className="member-name-email">
                      <strong>{member.name || 'Sin nombre'}</strong>
                      <span className="member-email">{member.email || 'Sin email'}</span>
                      <span className="member-phone">{member.phone || 'Sin teléfono'}</span>
                    </div>
                  </div>
                  <div className="member-plan">
                    <div className={`membership-badge-enhanced ${member.membership}`}>{plan?.name || 'Plan Desconocido'}</div>
                    <div className="plan-price">${(plan?.price || 0).toLocaleString()} COP</div>
                    {member.planStartDate && (
                      <div className="plan-start">Inició: {new Date(member.planStartDate).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div className="plan-status">
                    <div className={`status-badge-enhanced ${member.status.toLowerCase()}`}>{member.status}</div>
                    {member.planStartDate && (
                      <>
                        <div className="days-info">
                          <span>Transcurridos: {daysElapsed} días</span>
                          <span className={isExpiringSoon ? 'expiring-soon' : ''}>Restantes: {daysRemaining}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="member-activity">
                    <div>Visitas: <strong>{member.visits}</strong></div>
                    <div>Última: {new Date(member.lastVisit).toLocaleDateString()}</div>
                    <div>Total pagado: <strong>${member.totalPaid.toLocaleString()}</strong></div>
                  </div>
                  <div className="member-actions-enhanced">
                    <button className="action-btn-small edit" onClick={() => handleEditMember(member)} title="Editar miembro">✏️</button>
                    <button className="action-btn-small qr" onClick={() => handleGenerateQR(member)} title="Generar QR">📱</button>
                    <button className="action-btn-small delete" onClick={() => handleDeleteMember(member.id)} title="Eliminar miembro">🗑️</button>
                    <button className="action-btn-small toggle" onClick={() => handleStatusChange(member.id, member.status === 'Activo' ? 'Suspendido' : 'Activo')} title={member.status === 'Activo' ? 'Suspender' : 'Activar'}>{member.status === 'Activo' ? '⏸️' : '▶️'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddForm && (
        <MemberFormModal
          member={editingMember}
          onSave={handleSaveMember}
          onClose={() => {
            setShowAddForm(false);
            setEditingMember(null);
          }}
        />
      )}

      {/* Modal para generar acceso (credenciales) */}
      {showAccessModal && selectedMemberForAccess && (
        <AccessModal
          member={selectedMemberForAccess}
          onClose={() => {
            setShowAccessModal(false);
            setSelectedMemberForAccess(null);
          }}
          onAccessCreated={() => {
            setShowAccessModal(false);
            setSelectedMemberForAccess(null);
            setTimeout(() => loadMembersFromDB(), 500);
          }}
        />
      )}

      {/* Modal para generar QR */}
      {showQRGenerator && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-content-large" style={{ backgroundColor: 'white', border: '2px solid red' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Generar QR de Asistencia</h3>
              <button 
                onClick={() => {
                  console.log('Closing QR modal');
                  setShowQRGenerator(false);
                }} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            {selectedMemberForQR ? (
              <>
                {/* El pre con los datos enviados a QRGenerator ha sido eliminado para una vista más limpia */}
                <QRGenerator 
                  member={selectedMemberForQR} 
                  onClose={() => setShowQRGenerator(false)}
                />
              </>
            ) : (
              <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
                <p>Error: No hay miembro seleccionado</p>
                <p>selectedMemberForQR: {JSON.stringify(selectedMemberForQR)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AccessModal({ member, onClose, onAccessCreated }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < 6) return 'Debe tener al menos 6 caracteres.';
    if (!/[A-Z]/.test(pwd)) return 'Debe tener al menos una mayúscula.';
    if (!/[a-z]/.test(pwd)) return 'Debe tener al menos una minúscula.';
    if (!/[0-9]/.test(pwd)) return 'Debe tener al menos un número.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccess(false);
    const validation = validatePassword(password);
    if (validation) {
      setPasswordError(validation);
      toast.error(validation);
      return;
    }
    setLoading(true);
    try {
      // Usar la nueva función automatizada
      const { success, error } = await import('../../api/memberAccess.api').then(api => api.migratePendingMember(member.id, password));
      if (success) {
        setSuccess(true);
        toast.success('Acceso creado correctamente');
        onAccessCreated();
      } else {
        setPasswordError(error || 'Error creando acceso');
        toast.error(error || 'Error creando acceso');
      }
    } catch (err) {
      const msg = err.message || 'Error creando acceso';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-large">
        <h3>Generar Acceso para {member.name}</h3>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={member.email} disabled />
          </div>
          <div className="form-group">
            <label>Contraseña *</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Definir contraseña"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && <div style={{ color: 'red', marginTop: 4 }}>{passwordError}</div>}
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Acceso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MemberFormModal({ member, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    membership: member?.membership || 'mensualidad',
    status: member?.status || 'Activo'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-large">
        <h3>{member ? 'Editar Miembro' : 'Agregar Nuevo Miembro'}</h3>
        <form className="member-form-enhanced" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre Completo *</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre completo" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email" 
                required 
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono *</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="300-123-4567" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Plan de Membresía</label>
              <select 
                name="membership"
                value={formData.membership}
                onChange={handleChange}
                required
              >
                {Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => (
                  <option key={key} value={key}>
                    {plan.name} - ${plan.price.toLocaleString()} COP
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="selected-plan-info">
            <h4>Información del Plan Seleccionado:</h4>
            <div className="plan-details">
              <p><strong>Plan:</strong> {MEMBERSHIP_PLANS[formData.membership].name}</p>
              <p><strong>Precio:</strong> ${MEMBERSHIP_PLANS[formData.membership].price.toLocaleString()} COP</p>
              <p><strong>Duración:</strong> {MEMBERSHIP_PLANS[formData.membership].duration}</p>
              <p><strong>Descripción:</strong> {MEMBERSHIP_PLANS[formData.membership].description}</p>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {member ? 'Actualizar' : 'Agregar'} Miembro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
