
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useGymInfo } from '../../hooks/useGymInfo';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import '../../styles/dashboard.css';

export default function DashboardNav({ currentPage, onNavigate }) {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const { gym } = useGymInfo(profile?.gym_id);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <>
      <nav className="dashboard-nav">
        <div className="nav-user" style={{cursor:'pointer'}} onClick={() => setShowProfileModal(true)}>
          <div className="user-avatar">
            {profile?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{profile?.first_name || 'Usuario'}</span>
            <span className="user-role">{profile?.role || 'Miembro'}</span>
          </div>
        </div>
        <div className="nav-actions">
          {profile?.role === 'superadmin' && (
            <button
              onClick={() => window.location.href = '/superadmin'}
              className="nav-btn"
              title="Panel Superadmin"
            >
              🏢 Superadmin
            </button>
          )}
          {currentPage !== 'dashboard' && (
            <button 
              onClick={() => onNavigate('dashboard')} 
              className="nav-btn"
              title="Volver al Dashboard"
            >
              🏠 Dashboard
            </button>
          )}
          <button 
            onClick={handleLogout} 
            className="nav-btn logout"
            title="Cerrar Sesión"
          >
            🚪 Logout
          </button>
        </div>
      </nav>
      <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)} title={null}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,minWidth:340}}>
          {/* Bloque Gimnasio */}
          <div style={{width:'100%',marginBottom:18,display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{fontSize:20,fontWeight:700,color:'#1976d2',display:'flex',alignItems:'center',gap:8}}>
              <span role="img" aria-label="gym">🏋️‍♂️</span> {gym?.name || 'Gimnasio'}
            </div>
            <div style={{fontSize:13,color:'#64748b',fontWeight:500,marginTop:2,letterSpacing:0.2}}>
              ID: <span style={{fontWeight:600}}>{gym?.id || profile?.gym_id}</span>
            </div>
          </div>
          {/* Bloque Admin */}
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:18}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#1976d2 60%,#64b5f6 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,color:'#fff',fontWeight:700,boxShadow:'0 2px 12px #1976d233'}}>
              <span role="img" aria-label="admin">👤</span>
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:'#222',marginBottom:2}}>{profile?.first_name} {profile?.last_name}</div>
              <div style={{fontSize:13,color:'#64748b',fontWeight:500,letterSpacing:0.2}}>
                ID: <span style={{fontWeight:600}}>{profile?.id}</span>
              </div>
              <div style={{fontSize:15,color:'#1976d2',fontWeight:500,marginTop:2}}>{profile?.role === 'admin' ? 'Administrador del Gimnasio' : profile?.role}</div>
            </div>
          </div>
          <div style={{width:'100%',background:'#f5faff',borderRadius:10,padding:'18px 20px',boxShadow:'0 1px 6px #1976d211',display:'grid',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:600,color:'#1976d2',minWidth:90}}>📧 Correo:</span>
              <span style={{color:'#222'}}>{profile?.email}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:600,color:'#1976d2',minWidth:90}}>📱 Teléfono:</span>
              <span style={{color:'#222'}}>{profile?.phone || 'No registrado'}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:600,color:'#1976d2',minWidth:90}}>🔒 Estado:</span>
              <span style={{color:profile?.status==='activo'||profile?.status==='Activo'?'#38a169':'#e53935',fontWeight:600}}>{profile?.status || 'Activo'}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}