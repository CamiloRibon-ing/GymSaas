import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../supabaseClient";
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
      // 1. Autenticar con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        console.error("❌ Error de autenticación:", authError.message);
        
        // Mensajes de error más específicos
        if (authError.message.includes('Invalid login credentials')) {
          toast.error("Email o contraseña incorrectos");
        } else if (authError.message.includes('Email not confirmed')) {
          toast.error("Por favor confirma tu email");
        } else {
          toast.error(`Error de login: ${authError.message}`);
        }
        return;
      }

      console.log("✅ Autenticación exitosa:", authData.user.email);

      // 2. Obtener perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          gyms (
            id,
            name,
            slug
          )
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error("❌ Error obteniendo perfil:", profileError.message);
        toast.error("Error cargando perfil de usuario");
        await supabase.auth.signOut();
        return;
      }

      if (!profile) {
        console.error("❌ No se encontró perfil para el usuario");
        toast.error("Perfil de usuario no encontrado");
        await supabase.auth.signOut();
        return;
      }

      console.log("✅ Perfil obtenido:", profile);

      // 3. Mostrar éxito y redirigir según rol
      toast.success(`¡Bienvenido ${profile.first_name}!`);

      switch (profile.role) {
        case "gym_admin":
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

    } catch (error) {
      console.error("❌ Error general:", error);
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
