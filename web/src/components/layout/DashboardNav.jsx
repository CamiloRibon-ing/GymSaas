import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import toast from 'react-hot-toast';
import '../../styles/dashboard.css';

export default function DashboardNav({ currentPage, onNavigate }) {
  const { logout } = useAuth();
  const { profile } = useProfile();

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
    <nav className="dashboard-nav">
      <div className="nav-user">
        <div className="user-avatar">
          {profile?.first_name?.charAt(0) || 'U'}
        </div>
        <div className="user-info">
          <span className="user-name">{profile?.first_name || 'Usuario'}</span>
          <span className="user-role">{profile?.role || 'Miembro'}</span>
        </div>
      </div>
      
      <div className="nav-actions">
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
  );
}