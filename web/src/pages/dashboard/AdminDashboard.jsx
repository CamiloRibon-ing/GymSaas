import { useRef } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState, useEffect } from "react";
import { useProfile } from "../../hooks/useProfile";
import { supabase } from "../../supabaseClient";
import DashboardNav from "../../components/layout/DashboardNav";
import ManageMembers from "../members/ManageMembers";
import ManageCoaches from "../coaches/ManageCoaches";
import ManageRoutines from "../workouts/ManageRoutines";
import ManageNutrition from "../nutrition/ManageNutrition";
import ViewRevenue from "../revenue/ViewRevenue";
import ReportsMetrics from "../reports/ReportsMetrics";
import QRAttendance from "../attendance/QRAttendance";
import Modal from "../../components/ui/Modal";
import { createSuperAdmin } from "../../api/memberAccess.api";
import "../../styles/dashboard.css";

export default function AdminDashboard() {
  // Obtener perfil y loading ANTES de cualquier uso de profile
  const { profile, loading } = useProfile();
  // Evitar renderizar si el perfil está cargando o no existe
  if (loading || !profile) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#1976d2', fontWeight: 700, fontSize: 22 }}>Cargando perfil...</div>;
  }
  // Soporte/ticket modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const supportSubjectRef = useRef();
  const supportMsgRef = useRef();
  const [supportStatus, setSupportStatus] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

    // Cargar tickets de soporte del gimnasio actual
    useEffect(() => {
      let channel;
      async function fetchTickets() {
        if (!profile?.gym_id) return;
        setLoadingTickets(true);
        const { data, error } = await supabase
          .from('support_tickets')
          .select('id, subject, description, status, created_at, updated_at')
          .eq('gym_id', profile.gym_id)
          .order('created_at', { ascending: false });
        if (!error) setMyTickets(data || []);
        setLoadingTickets(false);
      }
      if (showSupportModal && profile?.gym_id) {
        fetchTickets();
        // Suscripción en tiempo real a cambios en support_tickets
        channel = supabase.channel('support_tickets_admin')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, payload => {
            // Solo refrescar si el ticket es de este gimnasio
            if (payload.new?.gym_id === profile.gym_id || payload.old?.gym_id === profile.gym_id) {
              fetchTickets();
            }
          })
          .subscribe();
      }
      return () => {
        if (channel) channel.unsubscribe();
      };
    }, [showSupportModal, profile]);

    // Enviar ticket de soporte
    async function handleSupportSubmit(e) {
      e.preventDefault();
      setSupportStatus(null);
      const subject = supportSubjectRef.current.value.trim();
      const message = supportMsgRef.current.value.trim();
      if (!subject || !message) {
        setSupportStatus({ success: false, message: 'Completa todos los campos.' });
        return;
      }
      try {
        if (!profile?.gym_id) {
          setSupportStatus({ success: false, message: 'No se detectó el gimnasio. No se puede enviar el ticket.' });
          toast.error('No se detectó el gimnasio. No se puede enviar el ticket.', { position: 'top-right', autoClose: 3500, style: { fontWeight: 600, fontSize: 16 } });
          return;
        }
        // Insertar ticket en la tabla support_tickets (usando description y gym_id requerido)
        const { data, error } = await supabase
          .from('support_tickets')
          .insert([
            {
              subject,
              description: message,
              status: 'abierto',
              created_at: new Date().toISOString(),
              gym_id: profile.gym_id,
              user_id: profile?.id || null
            }
          ]);
        if (error) throw error;
        setSupportStatus({ success: true, message: '✅ Ticket enviado correctamente. Nuestro equipo te contactará pronto.' });
        toast.success('✅ Ticket enviado correctamente. Nuestro equipo te contactará pronto.', { position: 'top-right', autoClose: 3500, style: { fontWeight: 600, fontSize: 16 } });
        supportSubjectRef.current.value = '';
        supportMsgRef.current.value = '';
        setTimeout(() => {
          setShowSupportModal(false);
          setSupportStatus(null);
        }, 1800);
        // Refrescar tickets después de enviar
        setTimeout(() => {
          if (profile?.gym_id) {
            supabase
              .from('support_tickets')
              .select('id, subject, description, status, created_at, updated_at')
              .eq('gym_id', profile.gym_id)
              .order('created_at', { ascending: false })
              .then(({ data, error }) => {
                if (!error) setMyTickets(data || []);
              });
          }
        }, 1000);
      } catch (err) {
        setSupportStatus({ success: false, message: 'Error enviando el ticket. Intenta de nuevo.' });
        toast.error('Error enviando el ticket. Intenta de nuevo.', { position: 'top-right', autoClose: 3500, style: { fontWeight: 600, fontSize: 16 } });
      }
    }
  // Eliminada declaración duplicada de useProfile
  const [currentPage, setCurrentPage] = useState("dashboard");
  // Métricas reales
  const [memberCount, setMemberCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [routineCount, setRoutineCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [nutritionCount, setNutritionCount] = useState(0);


  useEffect(() => {
    async function fetchStats() {
      if (!profile?.gym_id) return;
      // Miembros activos
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("gym_id", profile.gym_id)
        .eq("role", "member");
      setMemberCount(members ? members.length : 0);
      // Ingresos del mes
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("gym_id", profile.gym_id);
      const monthPayments = (payments || []).filter((p) => {
        const d = new Date(p.paid_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      setMonthRevenue(monthPayments.reduce((a, b) => a + (b.amount || 0), 0));
      // Rutinas activas
      const { data: routines } = await supabase
        .from("routines")
        .select("id")
        .eq("gym_id", profile.gym_id)
        .eq("status", "active");
      setRoutineCount(routines ? routines.length : 0);
      // Entrenadores
      const { data: coaches } = await supabase
        .from("profiles")
        .select("id")
        .eq("gym_id", profile.gym_id)
        .eq("role", "coach");
      setCoachCount(coaches ? coaches.length : 0);
      // Planes nutricionales activos (asignados a miembros y status 'activo')
      // 1. Obtener todos los planes del gimnasio
      const { data: allPlans } = await supabase
        .from("nutrition_plans")
        .select("id")
        .eq("gym_id", profile.gym_id);
      const planIds = (allPlans || []).map(p => p.id);
      // 2. Obtener asignaciones activas de esos planes
      let nutritionCount = 0;
      if (planIds.length > 0) {
        const { data: assignments } = await supabase
          .from("nutrition_plan_assignments")
          .select("nutrition_plan_id")
          .in("nutrition_plan_id", planIds)
          .eq("status", "activo");
        // Contar planes únicos asignados
        const uniquePlanIds = Array.from(new Set((assignments || []).map(a => a.nutrition_plan_id)));
        nutritionCount = uniquePlanIds.length;
      }
      setNutritionCount(nutritionCount);
    }
    fetchStats();
  }, [profile]);

  const handleSuperAdminChange = (e) => {
    setSuperAdminForm({ ...superAdminForm, [e.target.name]: e.target.value });
  };

  const handleSuperAdminSubmit = async (e) => {
    e.preventDefault();
    setSuperAdminLoading(true);
    setSuperAdminMsg("");
    const result = await createSuperAdmin(superAdminForm);
    if (result.success) {
      setSuperAdminMsg("✅ Superadmin creado con éxito");
    } else {
      setSuperAdminMsg("❌ " + result.error);
    }
    setSuperAdminLoading(false);
  };

  // Navegación de páginas
  const handleBackToDashboard = () => setCurrentPage("dashboard");

  if (currentPage === "members") return <ManageMembers onBack={handleBackToDashboard} />;
  if (currentPage === "coaches") return <ManageCoaches onBack={handleBackToDashboard} />;
  if (currentPage === "routines") return <ManageRoutines onBack={handleBackToDashboard} />;
  if (currentPage === "nutrition") return <ManageNutrition onBack={handleBackToDashboard} />;
  if (currentPage === "revenue") return <ViewRevenue onBack={handleBackToDashboard} />;
  if (currentPage === "reports") return <ReportsMetrics onBack={handleBackToDashboard} />;
  if (currentPage === "attendance") return <QRAttendance onBack={handleBackToDashboard} />;

  // Dashboard principal
  return (
    <div className="dashboard">
      <DashboardNav currentPage={currentPage} onNavigate={setCurrentPage} />

      <header className="dashboard-header">
        <h1>Panel Administrador</h1>
        <p>Bienvenido/a, {profile?.first_name || "Admin"} - Gestiona tu gimnasio</p>
      </header>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Miembros</h3>
          <div className="stat-number">{memberCount}</div>
          <p>Miembros activos</p>
        </div>
        <div className="stat-card">
          <h3>Ingresos del Mes</h3>
          <div className="stat-number">{monthRevenue.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</div>
          <p>Mes actual</p>
        </div>
        <div className="stat-card">
          <h3>Entrenadores</h3>
          <div className="stat-number">{coachCount}</div>
          <p>Staff disponible</p>
        </div>
        <div className="stat-card">
          <h3>Rutinas Activas</h3>
          <div className="stat-number">{routineCount}</div>
          <p>Rutinas en uso</p>
        </div>
        <div className="stat-card">
          <h3>Planes Nutricionales</h3>
          <div className="stat-number">{nutritionCount}</div>
          <p>Planes asignados</p>
        </div>
      </div>
      <div className="dashboard-section">
        <h2>Acciones Rápidas</h2>
        <div className="quick-actions">
          <div className="action-btn" onClick={() => setShowSupportModal(true)}>
            <span>🛠️</span>
            <div>Soporte del Sistema</div>
          </div>
                {/* Modal de soporte */}
                {showSupportModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(30,40,60,0.18)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      background: '#fff',
                      borderRadius: 18,
                      boxShadow: '0 8px 32px #1976d244',
                      padding: 36,
                      minWidth: 380,
                      maxWidth: 420,
                      width: '100%',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 18
                    }}>
                      <button onClick={() => setShowSupportModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 22, color: '#64748b', cursor: 'pointer' }} title="Cerrar">✖️</button>
                      <h2 style={{ color: '#1976d2', fontWeight: 800, fontSize: 24, marginBottom: 6 }}>Solicitar Soporte</h2>
                      <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>Describe el problema o solicitud. El equipo de soporte te responderá lo antes posible.</div>
                      <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input type="text" ref={supportSubjectRef} placeholder="Asunto o título del ticket" required style={{ borderRadius: 8, border: '1.5px solid #d1e3fa', padding: 10, fontSize: 16 }} />
                        <textarea ref={supportMsgRef} placeholder="Describe tu problema o solicitud..." required style={{ borderRadius: 8, border: '1.5px solid #d1e3fa', padding: 10, fontSize: 16, minHeight: 80 }} />
                        <button type="submit" style={{ background: 'linear-gradient(90deg, #1976d2 60%, #38a169 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 17, marginTop: 8, cursor: 'pointer', boxShadow: '0 2px 8px #1976d233' }}>Enviar Ticket</button>
                        {supportStatus && <div style={{ color: supportStatus.success ? '#38a169' : '#e53935', fontWeight: 600, marginTop: 6 }}>{supportStatus.message}</div>}
                      </form>
                      <div style={{ marginTop: 24 }}>
                        <h3 style={{ color: '#1976d2', fontWeight: 700, fontSize: 19, marginBottom: 10 }}>Mis Tickets de Soporte</h3>
                        {loadingTickets ? (
                          <div style={{ color: '#1976d2', fontWeight: 600 }}>Cargando tickets...</div>
                        ) : myTickets.length === 0 ? (
                          <div style={{ color: '#64748b' }}>No has enviado tickets aún.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {myTickets.map(t => (
                              <div key={t.id} style={{
                                background: '#f8fbff',
                                borderRadius: 10,
                                boxShadow: '0 1px 6px #1976d211',
                                padding: 14,
                                border: '1.5px solid #e3e9f7',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 16 }}>#{t.id}</span>
                                  <span style={{
                                    background: t.status === 'cerrado' ? '#38a16922' : t.status === 'en_revision' ? '#facc1533' : '#e5393522',
                                    color: t.status === 'cerrado' ? '#38a169' : t.status === 'en_revision' ? '#b7791f' : '#e53935',
                                    fontWeight: 700,
                                    borderRadius: 8,
                                    padding: '2px 10px',
                                    fontSize: 14,
                                    marginLeft: 8
                                  }}>{t.status === 'cerrado' ? 'Resuelto' : t.status === 'en_revision' ? 'En Revisión' : 'Pendiente'}</span>
                                  <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>{new Date(t.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                                <div style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>{t.subject}</div>
                                <div style={{ color: '#222', fontSize: 15 }}>{t.description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
          <div className="action-btn" onClick={() => setCurrentPage("members")}> <span>👥</span> <div>Gestionar Miembros</div> </div>
          <div className="action-btn" onClick={() => setCurrentPage("coaches")}> <span>👨‍🏫</span> <div>Administrar Entrenadores</div> </div>
          <div className="action-btn" onClick={() => setCurrentPage("routines")}> <span>💪</span> <div>Gestionar Rutinas</div> </div>
          <div className="action-btn" onClick={() => setCurrentPage("nutrition")}> <span>🍎</span> <div>Planes Alimenticios</div> </div>
          <div className="action-btn" onClick={() => setCurrentPage("revenue")}> <span>💰</span> <div>Ver Ingresos</div> </div>
          <div className="action-btn" onClick={() => setCurrentPage("reports")}> <span>📊</span> <div>Reportes y Métricas</div> </div>
          <div className="action-btn" onClick={() => setCurrentPage("attendance")}> <span>📱</span> <div>Asistencia QR</div> </div>
        </div>
      </div>
      <div className="dashboard-section">
        <h2>Actividad Reciente</h2>
        <div className="recent-activity">
          <div className="activity-item">
            <strong>Juan Torres</strong> se registró como miembro Premium
            <span className="activity-time">Hace 2 horas</span>
          </div>
          <div className="activity-item">
            <strong>María García</strong> completó su entrenamiento
            <span className="activity-time">Hace 3 horas</span>
          </div>
          <div className="activity-item">
            <strong>Carlos Ruiz</strong> renovó su membresía VIP
            <span className="activity-time">Hace 5 horas</span>
          </div>
          <div className="activity-item">
            <strong>Ana Martínez</strong> reservó sesión de entrenamiento personal
            <span className="activity-time">Hace 1 día</span>
          </div>
        </div>
      </div>
      <div className="dashboard-section">
        <h2>Alertas y Notificaciones</h2>
        <div className="alerts-container">
          <div className="alert-item warning">
            <strong>⚠️ Mantenimiento Programado</strong>
            <p>Revisión de equipos de cardio programada para mañana a las 6:00 AM</p>
          </div>
          <div className="alert-item success">
            <strong>✅ Meta Mensual Alcanzada</strong>
            <p>¡Felicitaciones! Se superó la meta de nuevos miembros este mes</p>
          </div>
          <div className="alert-item alert-urgent">
            <strong>🔔 Pago Pendiente</strong>
            <p>3 miembros tienen pagos pendientes por más de 15 días</p>
          </div>
        </div>
      </div>
      <div className="dashboard-section">
        <h2>Resumen del Día</h2>
        <div className="daily-summary">
          <div className="summary-item">
            <span className="summary-label">Miembros en el gimnasio:</span>
            <span className="summary-value">47 actualmente</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Sesiones de entrenamiento:</span>
            <span className="summary-value">23 completadas</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Nuevos registros:</span>
            <span className="summary-value">3 hoy</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Ingresos del día:</span>
            <span className="summary-value">$1,847</span>
          </div>
        </div>
      </div>
    <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}