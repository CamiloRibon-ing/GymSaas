import { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import QRGenerator from '../attendance/QRGenerator';
import { getGymById } from '../../api/gyms.api';
import { getUserById } from '../../api/users.api';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import '../../styles/dashboard.css';

export default function Profile({ onBack }) {
  const { profile, loading } = useProfile();
  const [gymName, setGymName] = useState('');
  const [daysRemaining, setDaysRemaining] = useState('Cargando...');
  const [daysColor, setDaysColor] = useState('#667eea');
  const [coachName, setCoachName] = useState('Cargando...');

  // Consultar el nombre del gimnasio cuando el perfil tenga gym_id
  useEffect(() => {
    async function fetchGymName() {
      if (profile && profile.gym_id) {
        try {
          const gym = await getGymById(profile.gym_id);
          setGymName(gym?.name || '');
        } catch (err) {
          setGymName('');
        }
      } else {
        setGymName('');
      }
    }
    fetchGymName();
  }, [profile?.gym_id]);

  // Consultar días restantes de la membresía activa y coach asignado
  useEffect(() => {
    async function fetchMembershipAndCoach() {
      if (!profile?.id || !profile?.gym_id) return;
      // Buscar membresía activa
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('start_date, end_date, plan_id, status')
        .eq('user_id', profile.id)
        .eq('gym_id', profile.gym_id)
        .eq('status', 'active');
      if (error || !memberships || memberships.length === 0) {
        setDaysRemaining('No activa');
        setDaysColor('#e53e3e');
      } else {
        const membership = memberships[0];
        const now = new Date();
        const endDate = new Date(membership.end_date);
        const daysLeft = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
        setDaysRemaining(daysLeft > 0 ? `${daysLeft} días` : 'Vencido');
        if (daysLeft > 20) {
          setDaysColor('#38a169'); // verde
        } else if (daysLeft > 10) {
          setDaysColor('#f6ad55'); // amarillo
        } else if (daysLeft > 0) {
          setDaysColor('#e53e3e'); // rojo
        } else {
          setDaysColor('#e53e3e'); // vencido
        }
      }
      // Buscar coach asignado
      if (profile.assigned_coach_id) {
        try {
          const coach = await getUserById(profile.assigned_coach_id);
          setCoachName(coach ? `${coach.first_name || ''} ${coach.last_name || ''}`.trim() : 'No asignado');
        } catch {
          setCoachName('No asignado');
        }
      } else {
        setCoachName('No asignado');
      }
    }
    fetchMembershipAndCoach();
  }, [profile?.id, profile?.gym_id, profile?.assigned_coach_id]);
  // Log para depuración: mostrar el objeto profile completo
  if (profile) {
    console.log('[Profile.jsx] Perfil cargado:', JSON.stringify(profile, null, 2));
    if (!profile.gym_id) {
      console.warn('[Profile.jsx] El perfil NO tiene gym_id:', profile);
    } else {
      console.log('[Profile.jsx] gym_id detectado:', profile.gym_id);
    }
  }
  const [showMyQR, setShowMyQR] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || ''
  });

  // memberData se construye justo antes del modal para asegurar datos actualizados

  const handleSave = () => {
    // Aquí iría la lógica para guardar en la base de datos
    toast.success('✅ Perfil actualizado correctamente');
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button onClick={onBack} className="back-btn">
          ← Volver
        </button>
        <h1>Mi Perfil</h1>
        <p>Gestiona tu información personal</p>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Información Personal</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Acciones rápidas: Mi QR Personal */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                <button 
                  onClick={() => setShowMyQR(true)} 
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom:'0.5em' }}
                  disabled={loading || !profile?.gym_id}
                >
                  📱 Mi QR Personal
                </button>
                <div style={{fontSize:'0.98em',color:profile?.gym_id?'#2b6cb0':'#e53e3e',fontWeight:'bold'}}>
                  {profile?.gym_id ? (
                    <>
                      🏋️ Gimnasio: {gymName ? gymName : 'Sin nombre'}<br/>
                      ID: {profile.gym_id}
                    </>
                  ) : (
                    <>⚠️ No tienes un gimnasio asignado</>
                  )}
                </div>
              </div>
              {/* Editar perfil */}
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn-primary">
                  ✏️ Editar Perfil
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleSave} className="btn-primary">
                    ✅ Guardar
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary">
                    ❌ Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {profile?.first_name?.charAt(0) || 'U'}
              </div>
            </div>

            {/* Mostrar datos del gimnasio asignado */}
            <div style={{marginBottom:'1rem',textAlign:'center'}}>
              <span style={{fontWeight:'bold',fontSize:'1.1em'}}>🏋️ Gimnasio asignado:</span><br/>
              <span style={{color:'#2b6cb0',fontWeight:'bold'}}>{gymName ? gymName : 'No asignado'}</span>
              <br/>
              <span style={{fontSize:'0.95em',color:'#666'}}>ID: {profile?.gym_id ? profile.gym_id : 'No asignado'}</span>
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  {isEditing ? (
                    <input 
                      type="text"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleChange}
                      className="form-input"
                    />
                  ) : (
                    <div className="form-display">{profile?.first_name || 'No especificado'}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Apellidos</label>
                  {isEditing ? (
                    <input 
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleChange}
                      className="form-input"
                    />
                  ) : (
                    <div className="form-display">{profile?.last_name || 'No especificado'}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  {isEditing ? (
                    <input 
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleChange}
                      className="form-input"
                    />
                  ) : (
                    <div className="form-display">{profile?.email || 'No especificado'}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  {isEditing ? (
                    <input 
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleChange}
                      className="form-input"
                    />
                  ) : (
                    <div className="form-display">{profile?.phone || 'No especificado'}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Usuario</label>
                  <div className="form-display">
                    <span className="role-badge">{profile?.role || 'Miembro'}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Miembro desde</label>
                  <div className="form-display">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES') : 'No disponible'}
                  </div>
                </div>
              </div>
              {/* MÉTRICAS GENERALES DEL MIEMBRO */}
              <div className="form-row">
                <div className="form-group">
                  <label>Días restantes de plan</label>
                  <div className="form-display" style={{fontWeight:'bold',color:daysColor}}>{daysRemaining}</div>
                  {/* Mensaje de advertencia si quedan pocos días */}
                  {(() => {
                    let dias = 0;
                    if (typeof daysRemaining === 'string' && daysRemaining.includes('días')) {
                      dias = parseInt(daysRemaining);
                    }
                    if (dias > 0 && dias <= 10) {
                      return (
                        <div style={{color:'#e53e3e',fontWeight:'bold',marginTop:'0.5em',fontSize:'0.98em'}}>
                          ⚠️ Quedan pocos días. Renueva tu plan para no perder el acceso ni estar en mora con el gimnasio.
                        </div>
                      );
                    }
                    if (daysRemaining === 'Vencido' || daysRemaining === 'No activa') {
                      return (
                        <div style={{color:'#e53e3e',fontWeight:'bold',marginTop:'0.5em',fontSize:'0.98em'}}>
                          ❌ Tu plan está vencido. Renueva para recuperar el acceso.
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="form-group">
                  <label>Mi Coach</label>
                  <div className="form-display" style={{fontWeight:'bold',color:'#764ba2'}}>{coachName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Configuración de Cuenta</h2>
          <div className="config-options">
            <div className="config-item">
              <div>
                <h4>🔔 Notificaciones</h4>
                <p>Recibir alertas sobre entrenamientos y promociones</p>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>

            <div className="config-item">
              <div>
                <h4>📱 Recordatorios de Entrenamiento</h4>
                <p>Notificaciones 30 minutos antes de tu rutina</p>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>

            <div className="config-item">
              <div>
                <h4>🔒 Privacidad de Progreso</h4>
                <p>Mantener mi progreso privado para otros miembros</p>
              </div>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para mostrar mi QR personal (incluye gym_name y gym_id, espera datos) */}
      {showMyQR && profile && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Mi Código QR Personal</h3>
              <button 
                onClick={() => setShowMyQR(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '15px', color: '#666' }}>
              <p>🎯 <strong>Instrucciones:</strong> Muestra este código QR al personal del gimnasio para registrar tu entrada/salida</p>
              <div style={{marginTop:'10px',color:'#2b6cb0',fontWeight:'bold'}}>
                🏋️ Gimnasio: {gymName ? gymName : 'Cargando...'}<br/>
                ID: {profile?.gym_id ? profile.gym_id : 'Cargando...'}
              </div>
            </div>
              {(profile.gym_id && typeof gymName === 'string' && gymName.length > 0) ? (
              (() => {
                const memberData = {
                  id: profile.id,
                  name: `${profile.first_name || 'Usuario'} ${profile.last_name || ''}`.trim(),
                  email: profile.email || 'usuario@gym.com',
                  membership: profile.membership_type || 'Premium',
                  status: profile.status || 'Activo',
                  gym_id: profile.gym_id,
                  gym_name: gymName
                };
                  console.log('[Profile.jsx] memberData FINAL para QRGenerator:', JSON.stringify(memberData, null, 2));
                return <>
                  <pre style={{background:'#f8fafc',padding:'8px',borderRadius:'8px',fontSize:'0.95em',color:'#333',margin:'10px 0'}}>Datos enviados a QRGenerator:
{JSON.stringify(memberData, null, 2)}</pre>
                  <QRGenerator 
                    member={memberData} 
                    onClose={() => setShowMyQR(false)}
                  />
                </>;
              })()
            ) : (
              <div style={{textAlign:'center',color:'#718096',margin:'2em 0'}}>
                <span>⏳ Cargando datos del gimnasio...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
