import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { registerGymAndAdmin } from "../../api/register.api";
import "../../styles/auth.css";
import "../../styles/register-gym.css";

export default function RegisterGym() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    gymName: "",
    gymAddress: "",
    gymCity: "",
    gymPhone: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Para formulario multi-paso
  const [developmentMode, setDevelopmentMode] = useState(false);

  // Función para llenar datos de prueba
  const fillTestData = () => {
    setForm({
      gymName: "Fitness Center Demo",
      gymAddress: "Calle 123 #45-67",
      gymCity: "Bogotá",
      gymPhone: "+57 300 123 4567",
      firstName: "Admin",
      lastName: "Demo",
      phone: "+57 301 234 5678",
      email: `admin${Date.now()}@demo.com`, // Email único para evitar rate limit
      password: "123456",
      confirmPassword: "123456"
    });
    toast.success('✅ Datos de prueba cargados');
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validateStep1 = () => {
    if (!form.gymName.trim()) {
      toast.error("El nombre del gimnasio es obligatorio");
      return false;
    }
    if (!form.gymAddress.trim()) {
      toast.error("La dirección es obligatoria");
      return false;
    }
    if (!form.gymCity.trim()) {
      toast.error("La ciudad es obligatoria");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Nombre y apellido son obligatorios");
      return false;
    }
    if (!form.email.trim()) {
      toast.error("El correo electrónico es obligatorio");
      return false;
    }
    if (form.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) return;

    try {
      setLoading(true);
      toast.loading('Registrando gimnasio...', { id: 'register' });
      
      // Modo desarrollo - simular registro exitoso
      if (developmentMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('🛠️ Registro simulado exitosamente (Modo Desarrollo)', { id: 'register' });
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Registro simulado completado. Usa las credenciales existentes de desarrollo para iniciar sesión.',
              email: 'admin@powergym.co',
              devCredentials: true
            }
          });
        }, 2000);
        return;
      }

      // Registro real
      const result = await registerGymAndAdmin(form);
      
      toast.success('¡Gimnasio registrado exitosamente!', { id: 'register' });
      console.log('Registro exitoso:', result);
      
      // Mostrar mensaje de confirmación
      toast.success('Revisa tu email para confirmar tu cuenta', { duration: 4000 });
      
      // Redirigir al login después de un breve delay
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Gimnasio registrado. Revisa tu email y luego inicia sesión.',
            email: form.email,
            type: 'success'
          }
        });
      }, 3000);
      
    } catch (error) {
      console.error('Error registrando gimnasio:', error);
      
      // Manejo específico de errores
      let errorMessage = 'Error al registrar gimnasio';
      let showEmailTip = false;
      
      if (error.message?.includes('rate limit')) {
        errorMessage = '⚠️ Límite de emails excedido. Prueba con un email diferente o espera unos minutos.';
        showEmailTip = true;
      } else if (error.message?.includes('email')) {
        errorMessage = '📧 Problema con el email. Verifica que sea válido y no esté ya registrado.';
        showEmailTip = true;
      } else if (error.message?.includes('password')) {
        errorMessage = '🔒 Error con la contraseña. Debe tener al menos 6 caracteres.';
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        errorMessage = '🔄 Ya existe un gimnasio con ese nombre o email.';
      } else if (error.message?.includes('gimnasio')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }
      
      toast.error(errorMessage, { 
        id: 'register',
        duration: 8000 
      });

      // Mostrar sugerencias adicionales para problemas de email
      if (showEmailTip) {
        setTimeout(() => {
          toast.success('💡 Consejo: Usa un email que nunca hayas usado en Supabase, o activa el Modo Desarrollo', { 
            duration: 6000 
          });
        }, 1000);
      }
      
      // Si es error de rate limit, sugerir usar otro email
      if (error.message.includes('rate limit')) {
        setTimeout(() => {
          toast('💡 Sugerencia: Prueba con otro email o espera unos minutos', {
            duration: 4000,
            icon: '💡'
          });
        }, 1000);
      }
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container gym-register">
      <div className="auth-card register-card">
        <div className="auth-header">
          <h1>🏋️‍♂️ GymMVP</h1>
          <h2>Registrar Gimnasio</h2>
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>
        </div>

        <form className="auth-form register-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step" key="step1">
              <h3>📍 Información del Gimnasio</h3>
              
              <div className="input-group">
                <label>Nombre del Gimnasio *</label>
                <input
                  name="gymName"
                  type="text"
                  value={form.gymName}
                  placeholder="Ej: Fitness Center Pro"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>Dirección *</label>
                <input
                  name="gymAddress"
                  type="text"
                  value={form.gymAddress}
                  placeholder="Calle 123 #45-67"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Ciudad *</label>
                  <input
                    name="gymCity"
                    type="text"
                    value={form.gymCity}
                    placeholder="Bogotá"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Teléfono</label>
                  <input
                    name="gymPhone"
                    type="tel"
                    value={form.gymPhone}
                    placeholder="(+57) 300 123 4567"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button type="button" className="btn-primary" onClick={handleNextStep}>
                Continuar →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="form-step" key="step2">
              <h3>👤 Información del Administrador</h3>
              
              <div className="input-row">
                <div className="input-group">
                  <label>Nombre *</label>
                  <input
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    placeholder="Juan"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Apellido *</label>
                  <input
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    placeholder="Pérez"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Teléfono Personal</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  placeholder="(+57) 301 234 5678"
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>Correo Electrónico *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  placeholder="admin@gimnasio.com"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Contraseña *</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    placeholder="Mínimo 6 caracteres"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Confirmar Contraseña *</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    placeholder="Repetir contraseña"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handlePreviousStep}>
                  ← Atrás
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Registrando..." : "Crear Gimnasio"}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="auth-footer">
          <p>¿Ya tienes cuenta? <Link to="/login">Inicia Sesión</Link></p>
        </div>

        {/* Sección de desarrollo */}
        <div className="dev-section">
          <p style={{margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#856404'}}>
            🚧 Herramientas de Desarrollo
          </p>
          
          <div className="dev-controls">
            <button 
              type="button" 
              className="btn-dev"
              onClick={fillTestData}
            >
              📝 Llenar Datos de Prueba
            </button>
            
            <label className="dev-toggle">
              <input 
                type="checkbox" 
                checked={developmentMode}
                onChange={(e) => setDevelopmentMode(e.target.checked)}
              />
              <span>🛠️ Modo Desarrollo (Simular Registro)</span>
            </label>

            <button 
              type="button" 
              className="btn-dev btn-help"
              onClick={() => {
                toast.success(`
🔧 CÓMO SOLUCIONAR EL ERROR DE EMAIL:

1. Ve a tu Dashboard de Supabase
2. Authentication > Settings  
3. DESACTIVA "Enable email confirmations"
4. Guarda cambios
5. Reinicia el registro

O usa el Modo Desarrollo arriba ⬆️`, { 
                  duration: 10000 
                });
              }}
            >
              🆘 ¿Error de Email? - Click Aquí
            </button>
          </div>
          
          {developmentMode && (
            <div className="dev-warning">
              ⚠️ Modo desarrollo activado. El registro será simulado sin usar la API real.
              <br />
              <strong>Credenciales de desarrollo:</strong>
              <br />
              📧 Email: admin@powergym.co
              <br />
              🔑 Contraseña: PowerGym2024!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
