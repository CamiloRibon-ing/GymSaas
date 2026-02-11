import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../supabaseClient";
import { secureLogin } from '../../api/auth.api';
import "../../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Mostrar mensaje si viene de registro
    if (location.state?.message) {
      toast.success(location.state.message);
      if (location.state.email) {
        setEmail(location.state.email);
      }
      // Si viene del modo desarrollo, mostrar credenciales
      if (location.state.devCredentials) {
        toast.info('🛠️ Usa las credenciales de desarrollo que aparecen abajo', { duration: 5000 });
      }
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    console.log("🔐 Intentando login con:", email);
    setLoading(true);

    try {
      // Login seguro: bloquea acceso si el gimnasio está inactivo
      try {
        const authData = await secureLogin(email, password);
        // 2. Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        if (profileError) {
          toast.error("Error cargando perfil de usuario");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (!profile) {
          toast.error("Perfil de usuario no encontrado");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        // Bloqueo por suspensión de perfil
        if (profile.status && profile.status.toLowerCase() === 'suspendido') {
          toast.error("Tu acceso ha sido suspendido temporalmente. Por favor, contacta a la administración del gimnasio para más información.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        // Advertencia si el plan está vencido (solo para miembros)
        if (profile.role === 'member') {
          const { data: memberships } = await supabase
            .from('memberships')
            .select('*')
            .eq('user_id', profile.id)
            .eq('gym_id', profile.gym_id)
            .order('end_date', { ascending: false })
            .limit(1);
          if (memberships && memberships.length > 0) {
            const membership = memberships[0];
            const now = new Date();
            const end = membership.end_date ? new Date(membership.end_date) : null;
            if (end && now > end) {
              toast.error('Tu plan ha vencido. Renueva tu membresía para seguir disfrutando de los servicios del gimnasio.');
            }
          }
        }
        toast.success(`¡Bienvenido ${profile.first_name}!`);
        switch (profile.role) {
          case "super_admin":
            navigate("/superadmin", { replace: true });
            break;
          case "gym_admin":
          case "admin":
            navigate("/admin", { replace: true });
            break;
          case "coach":
            navigate("/coach", { replace: true });
            break;
          case "member":
            navigate("/member", { replace: true });
            break;
          default:
            toast.error("Rol de usuario no reconocido");
            await supabase.auth.signOut();
        }
      } catch (err) {
        if (err.message && err.message.includes('gimnasio está inactivo')) {
          toast.error('Acceso restringido: tu gimnasio está inactivo o bloqueado. Contacta al administrador.');
        } else if (err.message && err.message.includes('Invalid login credentials')) {
          toast.error("Email o contraseña incorrectos");
        } else if (err.message && err.message.includes('Email not confirmed')) {
          toast.error("Por favor confirma tu email");
        } else {
          toast.error(`Error de login: ${err.message || err}`);
        }
        setLoading(false);
        return;
      }
    } catch (error) {
      toast.error("Error inesperado durante el login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>GymMVP</h1>
          <h2>Iniciar Sesión</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿No tienes gimnasio registrado?{" "}
            <Link to="/register">Registra tu gimnasio</Link>
          </p>
        </div>

        {/* Panel de ayuda para desarrollo eliminado para producción */}
      </div>
    </div>
  );
}
