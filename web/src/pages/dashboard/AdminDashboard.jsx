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
import "../../styles/dashboard.css";

export default function AdminDashboard() {
  const { profile } = useProfile();
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
    </div>
  );
}