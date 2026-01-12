import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <h2>🔄 Verificando acceso...</h2>
            <p>Por favor espera un momento</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    console.log("🚫 Usuario no autenticado, redirigiendo a login");
    return <Navigate to="/login" replace />;
  }

  console.log("✅ Usuario autenticado, permitiendo acceso:", user.email);
  // Usuario autenticado, renderizar componente protegido
  return children;
}
