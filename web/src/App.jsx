import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import RegisterGym from "./pages/auth/RegisterGym";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import CoachDashboard from "./pages/dashboard/CoachDashboard";
import MemberDashboard from "./pages/dashboard/MemberDashboard";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { useProfile } from "./hooks/useProfile";
import { GymDataProvider } from "./context/GymDataContextDB";

function App() {
  return (
    <GymDataProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta raíz - redirección inteligente */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterGym />} />

          {/* Rutas protegidas */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coach"
            element={
              <ProtectedRoute>
                <CoachDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member"
            element={
              <ProtectedRoute>
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 - Redirigir a login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </GymDataProvider>
  );
}

// Componente para manejar redirección inteligente desde raíz
function RootRedirect() {
  const { profile, loading } = useProfile();

  // Mostrar loading mientras se carga el perfil
  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Cargando...</h2>
          <p>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay perfil, ir al login
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Redirección según rol del usuario
  switch (profile.role) {
    case "gym_admin":
      return <Navigate to="/admin" replace />;
    case "coach":
      return <Navigate to="/coach" replace />;
    case "member":
      return <Navigate to="/member" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;