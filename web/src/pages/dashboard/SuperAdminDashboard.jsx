import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { getGyms } from "../../api/gyms.api";
import { getUsersByGym } from '../../api/users.api';
import { getNutritionPlansFromDB } from '../../services/database.api';
import { updateGymStatus } from '../../api/gyms.api';
import { useProfile } from "../../hooks/useProfile";
import { logout } from '../../api/auth.api';
import { useNavigate } from 'react-router-dom';
import { createAdmin, sendGymApprovalEmail } from '../../api/users.api';
import { ToastContainer, toast } from 'react-toastify';

// Utilidad para formatear fecha
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}
import 'react-toastify/dist/ReactToastify.css';
import { getFactusPayments } from '../../api/factusPayments.api';
import { BarChart, PieChart } from '../../components/admin/DashboardCharts';

// Obtener solicitudes pendientes de gimnasios
async function getPendingGyms() {
  const { data, error } = await supabase
    .from("pending_gyms")
    .select("*")
    .eq("status", "pendiente");
  if (error) throw error;
  return data;
}

// Aprobar solicitud de gimnasio usando backend seguro
async function approvePendingGym(gym, password) {
  // 1. Crear usuario admin en Auth usando backend
  const adminRes = await createAdmin({
    email: gym.admin_email,
    password,
    user_metadata: {
      first_name: gym.admin_first_name,
      last_name: gym.admin_last_name,
      role: 'gym_admin'
    }
  });
  const userId = adminRes.user?.id || adminRes.id;
  if (!userId) throw new Error('No se pudo obtener el ID del usuario admin.');

  // 2. Crear gimnasio
  const gymSlug = gym.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);
  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .insert({
      name: gym.name,
      slug: gymSlug,
      address: gym.address,
      phone: gym.phone,
      email: gym.email,
      status: 'active'
    })
    .select()
    .single();
  if (gymError) throw new Error('Error creando gimnasio: ' + gymError.message);

  // 3. Crear perfil admin
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      gym_id: gymData.id,
      role: 'gym_admin',
      first_name: gym.admin_first_name,
      last_name: gym.admin_last_name,
      phone: gym.admin_phone,
      email: gym.admin_email,
      status: 'Activo'
    });
  if (profileError) throw new Error('Error creando perfil admin: ' + profileError.message);

  // 4. Actualizar estado de la solicitud y eliminar registro
  const { error: updateError } = await supabase
    .from('pending_gyms')
    .update({ status: 'aprobado', reviewed_at: new Date() })
    .eq('id', gym.id);
  if (updateError) throw new Error('Error actualizando estado: ' + updateError.message);

  // 5. Eliminar registro de pending_gyms
  const { error: deleteError } = await supabase
    .from('pending_gyms')
    .delete()
    .eq('id', gym.id);
  if (deleteError) throw new Error('Error eliminando registro pendiente: ' + deleteError.message);

  return true;
}

// Rechazar solicitud de gimnasio
async function rejectPendingGym(gym) {
  const { error } = await supabase
    .from('pending_gyms')
    .update({ status: 'rechazado', reviewed_at: new Date() })
    .eq('id', gym.id);
  if (error) throw new Error('Error actualizando estado: ' + error.message);
  return true;
}

// Llamada al endpoint backend para enviar correo (ahora desactivada, no bloquea el flujo)
async function sendGymApprovalEmailAPI({ to, gymName, approved }) {
  // Notificación de correo desactivada temporalmente
  try {
    // return await sendGymApprovalEmail({ to, gymName, approved });
    console.log('[NOTIFY][EMAIL] Simulación: correo no enviado (desactivado)', { to, gymName, approved });
    return { success: true, simulated: true };
  } catch (e) {
    // No bloquear el flujo si falla
    console.warn('[NOTIFY][EMAIL] Error simulado (ignorado):', e);
    return { success: false, error: e.message };
  }
}


export default function SuperAdminDashboard() {
  // PRIMERO: hook de perfil, para que esté disponible en todos los useEffect y lógica
  const { profile, loading } = useProfile();
  // Estado y lógica para tickets de soporte (debe estar dentro del componente)
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Fetch all support tickets (solo superadmin)
  // El hook useProfile ya está declarado más abajo, así que solo usamos el profile de ahí
  useEffect(() => {
    async function fetchTickets() {
      setLoadingTickets(true);
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('id, subject, description, status, created_at, updated_at, gym_id, user_id, response, responded_by')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setSupportTickets(data || []);
      } catch (e) {
        setSupportTickets([]);
        toast.error('Error cargando tickets de soporte');
      }
      setLoadingTickets(false);
    }
    if (profile?.role === 'super_admin') fetchTickets();
  }, [profile]);
  // ...existing code...
    // ...eliminada lógica de soporte para superadmin...
  // Estados principales
  const [stats, setStats] = useState({
    totalGyms: 0,
    activeGyms: 0,
    inactiveGyms: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalPayments: 0
  });
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifMsgRef = React.useRef();
  const notifTargetRef = React.useRef();
  const notifIdRef = React.useRef();

  // Notification helpers
  async function sendNotification({ type = 'message', target = 'all', title, message }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ type, target, title, message, created_at: new Date().toISOString(), read: false }]);
    if (error) throw error;
    return data;
  }

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Fetch notifications on mount
  React.useEffect(() => {
    setNotifLoading(true);
    fetchNotifications().then(setNotifications).finally(() => setNotifLoading(false));
    // Subscribe to real-time updates (if available)
    const channel = supabase.channel('notifications').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
      fetchNotifications().then(setNotifications);
    }).subscribe();
    return () => { channel.unsubscribe(); };
  }, []);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plans, setPlans] = useState([]); // planes nutricionales asignados
  const [gymPlans, setGymPlans] = useState([]); // planes mensuales/ofertas de gimnasios
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'plans'
  const [selectedGyms, setSelectedGyms] = useState([]);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        // 1. Gyms
        const gyms = await getGyms();
        const totalGyms = gyms.length;
        const activeGyms = gyms.filter(g => g.status === 'active').length;
        const inactiveGyms = gyms.filter(g => g.status !== 'active').length;
        // 2. Users
        let totalUsers = 0;
        for (const gym of gyms) {
          try {
            const users = await getUsersByGym(gym.id);
            totalUsers += users.length;
          } catch {}
        }
        // 3. Revenue (Factus payments)
        let totalRevenue = 0;
        let totalPayments = 0;
        try {
          const payments = await getFactusPayments();
          if (Array.isArray(payments)) {
            totalPayments = payments.length;
            totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          }
        } catch {}
        setStats({ totalGyms, activeGyms, inactiveGyms, totalUsers, totalRevenue, totalPayments });
      } catch {
        setStats({ totalGyms: 0, activeGyms: 0, inactiveGyms: 0, totalUsers: 0, totalRevenue: 0, totalPayments: 0 });
      }
      setLoadingStats(false);
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchAllData() {
      setLoadingMembers(true);
      setLoadingPlans(true);
      if (selectedGyms.length === 0) {
        setMembers([]);
        setPlans([]);
        setGymPlans([]);
        setLoadingMembers(false);
        setLoadingPlans(false);
        return;
      }
      let allMembers = [];
      let allPlans = [];
      let allGymPlans = [];
      // 1. Traer miembros y sus planes nutricionales asignados
      for (const gymId of selectedGyms) {
        try {
          const users = await getUsersByGym(gymId);
          allMembers = allMembers.concat(users);
        } catch {}
      }
      // 2. Traer planes nutricionales asignados a los miembros (usando tabla de asignaciones)
      if (allMembers.length > 0) {
        const memberIds = allMembers.map(m => m.id);
        // Buscar asignaciones de planes para estos miembros
        const { data: assignments, error: assignError } = await supabase
          .from('nutrition_plan_assignments')
          .select('*, nutrition_plan: nutrition_plans(*), member: profiles(id, first_name, last_name, email)')
          .in('member_id', memberIds);
        if (!assignError && assignments) {
          allPlans = assignments.map(a => ({
            ...a.nutrition_plan,
            member: a.member,
            start_date: a.start_date,
            end_date: a.end_date
          }));
        }
      }
      // 3. Traer planes mensuales/ofertas de cada gimnasio
      for (const gymId of selectedGyms) {
        try {
          const { data: plansData, error: plansError } = await supabase
            .from('plans')
            .select('*')
            .eq('gym_id', gymId)
            .eq('active', true);
          if (!plansError && plansData) {
            allGymPlans = allGymPlans.concat(plansData.map(p => ({ ...p, gymId })));
          }
        } catch {}
      }
      setMembers(allMembers);
      setPlans(allPlans);
      setGymPlans(allGymPlans);
      setLoadingMembers(false);
      setLoadingPlans(false);
    }
    fetchAllData();
  }, [selectedGyms]);

      // Filtrar miembros
      const filteredMembers = members.filter(m => {
        const search = filter.toLowerCase();
        return (
          m.first_name?.toLowerCase().includes(search) ||
          m.last_name?.toLowerCase().includes(search) ||
          m.email?.toLowerCase().includes(search) ||
          m.role?.toLowerCase().includes(search)
        );
      });
    const navigate = useNavigate();
    // Handler para logout
    const handleLogout = async () => {
      await logout();
      navigate('/login', { replace: true });
    };
  // Ya se declaró useProfile arriba, así que solo usamos 'profile' y 'loading' de ahí si es necesario
  const [gyms, setGyms] = useState([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [statusLoading, setStatusLoading] = useState("");
    // Cambiar estado de gimnasio (activar/desactivar)
    const handleToggleGymStatus = async (gym) => {
      const newStatus = gym.status === 'active' ? 'inactive' : 'active';
      if (!window.confirm(`¿Seguro que deseas ${newStatus === 'inactive' ? 'desactivar' : 'activar'} el gimnasio "${gym.name}"?`)) return;
      setStatusLoading(gym.id);
      try {
        await updateGymStatus(gym.id, newStatus);
        toast.success(`Gimnasio ${newStatus === 'inactive' ? 'desactivado' : 'activado'} correctamente.`);
        // Refrescar lista
        const updated = await getGyms();
        setGyms(updated || []);
      } catch (e) {
        toast.error('Error actualizando estado: ' + (e.message || e));
      }
      setStatusLoading("");
    };
  const [pendingGyms, setPendingGyms] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Handlers para aprobar/rechazar
  const [adminPassword, setAdminPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(""); // id de gym en acción
  const [actionMsg, setActionMsg] = useState("");

  const handleApprove = async (gym) => {
    const password = prompt("Contraseña para el admin del gimnasio:", "123456");
    if (!password || password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setActionLoading(gym.id);
    setActionMsg("");
    try {
      await approvePendingGym(gym, password);
      toast.success("✅ Gimnasio y admin creados correctamente. Los accesos han sido generados.");
      // Refrescar lista
      const updated = await getPendingGyms();
      setPendingGyms(updated || []);
    } catch (e) {
      toast.error("❌ " + (e.message || e));
    }
    setActionLoading("");
  };

  const handleReject = async (gym) => {
    if (!window.confirm("¿Seguro que deseas rechazar esta solicitud?")) return;
    setActionLoading(gym.id);
    setActionMsg("");
    try {
      await rejectPendingGym(gym);
      toast.info("Solicitud rechazada. Se ha notificado al usuario.");
      // Refrescar lista
      const updated = await getPendingGyms();
      setPendingGyms(updated || []);
    } catch (e) {
      toast.error("❌ " + (e.message || e));
    }
    setActionLoading("");
  };

  useEffect(() => {
    if (profile?.role === "super_admin") {
      getGyms().then((data) => {
        setGyms(data || []);
        setLoadingGyms(false);
      });
      getPendingGyms().then((data) => {
        setPendingGyms(data || []);
        setLoadingPending(false);
      });
    }
  }, [profile]);

  if (loading) {
    return <div style={{ padding: 32 }}>Cargando perfil...</div>;
  }
  if (!profile) {
    return <div style={{ padding: 32 }}>No se encontró el perfil.</div>;
  }
  if (profile.role !== "super_admin") {
    return <div style={{ padding: 32 }}>Acceso restringido.</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto', fontFamily: 'Inter, Arial, sans-serif', background: '#f6f8fb', minHeight: '100vh' }}>
      {/* Encabezado principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: '#222', margin: 0, letterSpacing: '-1px' }}>Panel Superadmin</h1>
          <p style={{ color: '#64748b', fontSize: 19, marginTop: 8, fontWeight: 500 }}>Bienvenido, aquí puedes gestionar y visualizar el estado global de todos los gimnasios y usuarios.</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#e53935',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 28px',
            fontWeight: 700,
            fontSize: 17,
            boxShadow: '0 2px 12px #e5393522',
            cursor: 'pointer',
            marginLeft: 24
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* Tarjetas de resumen y acciones rápidas */}
      {!loadingStats && (
        <div style={{ display: 'flex', gap: 28, marginBottom: 36, flexWrap: 'wrap' }}>
          {/* Tarjeta 1: Ingresos totales */}
          <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #1976d211', padding: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ background: '#e3fcec', borderRadius: 12, padding: 12 }}>
              <span style={{ fontSize: 28, color: '#38a169' }}>💰</span>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600, fontSize: 15 }}>Ingresos totales</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#222' }}>${stats.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</div>
            </div>
          </div>
          {/* Tarjeta 2: Usuarios totales */}
          <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #1976d211', padding: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ background: '#e3e9f7', borderRadius: 12, padding: 12 }}>
              <span style={{ fontSize: 28, color: '#1976d2' }}>👥</span>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600, fontSize: 15 }}>Usuarios totales</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#222' }}>{stats.totalUsers}</div>
            </div>
          </div>
          {/* Tarjeta 3: Pagos procesados */}
          <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #1976d211', padding: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ background: '#ffeaea', borderRadius: 12, padding: 12 }}>
              <span style={{ fontSize: 28, color: '#e53935' }}>🧾</span>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600, fontSize: 15 }}>Pagos procesados</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#222' }}>{stats.totalPayments}</div>
            </div>
          </div>
          {/* Tarjeta 4: Gimnasios activos */}
          <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #1976d211', padding: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ background: '#e3e9f7', borderRadius: 12, padding: 12 }}>
              <span style={{ fontSize: 28, color: '#1976d2' }}>🏋️‍♂️</span>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600, fontSize: 15 }}>Gimnasios activos</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#222' }}>{stats.activeGyms} / {stats.totalGyms}</div>
            </div>
          </div>
        </div>
      )}
      {/* Sección de notificaciones y alertas */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #1976d211', padding: 32, marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1976d2', margin: 0, letterSpacing: '-0.5px' }}>Notificaciones y Alertas</h2>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <form style={{ flex: 2, minWidth: 320 }} onSubmit={async e => {
            e.preventDefault();
            const msg = notifMsgRef.current.value.trim();
            const target = notifTargetRef.current.value;
            const id = notifIdRef.current.value.trim();
            if (!msg) return toast.error('El mensaje no puede estar vacío');
            try {
              await sendNotification({
                type: 'message',
                target: target === 'all' ? 'all' : id || 'all',
                title: 'Mensaje del Superadmin',
                message: msg
              });
              notifMsgRef.current.value = '';
              notifIdRef.current.value = '';
              toast.success('Mensaje enviado');
            } catch (err) {
              toast.error('Error enviando notificación');
            }
          }}>
            <div style={{ fontWeight: 700, color: '#1976d2', marginBottom: 8 }}>Enviar mensaje global</div>
            <textarea ref={notifMsgRef} placeholder="Escribe el mensaje para todos los gimnasios o usuarios..." style={{ width: '100%', minHeight: 60, borderRadius: 10, border: '1.5px solid #d1e3fa', padding: 12, fontSize: 16, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <select ref={notifTargetRef} style={{ borderRadius: 8, border: '1.5px solid #d1e3fa', padding: 8, fontSize: 15 }}>
                <option value="all">Todos los gimnasios</option>
                <option value="user">Usuario específico</option>
                <option value="gym">Gimnasio específico</option>
              </select>
              <input ref={notifIdRef} type="text" placeholder="ID de usuario/gimnasio (opcional)" style={{ borderRadius: 8, border: '1.5px solid #d1e3fa', padding: 8, fontSize: 15, flex: 1 }} />
              <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Enviar</button>
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>Puedes enviar mensajes globales o a usuarios/gimnasios específicos.</div>
          </form>
          <div style={{ flex: 1, minWidth: 260, background: '#f8fbff', borderRadius: 12, padding: 18, boxShadow: '0 1px 6px #1976d211', height: 'fit-content' }}>
            <div style={{ fontWeight: 700, color: '#e53935', marginBottom: 8, fontSize: 17 }}>Alertas automáticas</div>
            <ul style={{ color: '#e53935', fontWeight: 600, fontSize: 15, margin: 0, paddingLeft: 18 }}>
              <li>Vencimiento de membresías (próximos 7 días)</li>
              <li>Pagos pendientes detectados</li>
              <li>Otras alertas importantes del sistema</li>
            </ul>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>(Próximamente: alertas automáticas en tiempo real)</div>
          </div>
        </div>
        {/* Lista de notificaciones */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18, marginBottom: 10 }}>Historial de notificaciones</div>
          {notifLoading ? <div style={{ color: '#1976d2' }}>Cargando notificaciones...</div> : notifications.length === 0 ? <div style={{ color: '#64748b' }}>No hay notificaciones enviadas.</div> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notifications.map(n => (
                <li key={n.id} style={{ background: '#f8fbff', borderRadius: 10, marginBottom: 10, padding: 14, boxShadow: '0 1px 4px #1976d211' }}>
                  <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 15 }}>{n.title || 'Notificación'}</div>
                  <div style={{ color: '#222', fontSize: 16, margin: '6px 0' }}>{n.message}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>Para: {n.target} | {new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #1976d222', padding: 36, minHeight: 220, marginBottom: 48 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1976d2', marginBottom: 28, letterSpacing: '-1px' }}>Panel de Reportes y Estadísticas</h2>
        {loadingStats ? (
          <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 18 }}>Cargando estadísticas...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ background: '#f8fbff', borderRadius: 14, boxShadow: '0 2px 12px #1976d211', padding: 28, minWidth: 180, flex: 1 }}>
                <div style={{ fontSize: 16, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Gimnasios registrados</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1976d2' }}>{stats.totalGyms}</div>
                <div style={{ fontSize: 15, color: '#38a169', fontWeight: 700 }}>Activos: {stats.activeGyms}</div>
                <div style={{ fontSize: 15, color: '#e53935', fontWeight: 700 }}>Inactivos: {stats.inactiveGyms}</div>
              </div>
              <div style={{ background: '#f8fbff', borderRadius: 14, boxShadow: '0 2px 12px #1976d211', padding: 28, minWidth: 180, flex: 1 }}>
                <div style={{ fontSize: 16, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Usuarios totales</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1976d2' }}>{stats.totalUsers}</div>
              </div>
              <div style={{ background: '#f8fbff', borderRadius: 14, boxShadow: '0 2px 12px #1976d211', padding: 28, minWidth: 180, flex: 1 }}>
                <div style={{ fontSize: 16, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Pagos procesados</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1976d2' }}>{stats.totalPayments}</div>
                <div style={{ fontSize: 15, color: '#1976d2', fontWeight: 700 }}>Ingresos totales: <span style={{ color: '#38a169' }}>${stats.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span></div>
              </div>
            </div>
            {/* Gráficas profesionales */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <BarChart
                  title="Gimnasios activos vs inactivos"
                  data={[{ tipo: 'Gimnasios', Activos: stats.activeGyms, Inactivos: stats.inactiveGyms }]}
                  keys={['Activos', 'Inactivos']}
                  indexBy="tipo"
                  colors={["#38a169", "#e53935"]}
                />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <PieChart
                  title="Distribución de gimnasios"
                  data={[
                    { id: 'Activos', label: 'Activos', value: stats.activeGyms, color: '#38a169' },
                    { id: 'Inactivos', label: 'Inactivos', value: stats.inactiveGyms, color: '#e53935' }
                  ]}
                />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <BarChart
                  title="Usuarios totales"
                  data={[{ tipo: 'Usuarios', Total: stats.totalUsers }]}
                  keys={['Total']}
                  indexBy="tipo"
                  colors={["#1976d2"]}
                />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <BarChart
                  title="Pagos e ingresos"
                  data={[{ tipo: 'Pagos', Pagos: stats.totalPayments, Ingresos: stats.totalRevenue }]}
                  keys={['Pagos', 'Ingresos']}
                  indexBy="tipo"
                  colors={["#1976d2", "#38a169"]}
                />
              </div>
            </div>
          </>
        )}
      </div>
      {/* Sección duplicada de título y cerrar sesión eliminada, solo queda la superior */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #1976d211', padding: 32, minHeight: 320, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1976d2', margin: 0, letterSpacing: '-0.5px' }}>Gimnasios Registrados</h2>
        </div>
        {loadingGyms ? (
          <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 18 }}>Cargando gimnasios...</div>
        ) : gyms.length === 0 ? (
          <div style={{ color: '#64748b', fontWeight: 500, fontSize: 18 }}>No hay gimnasios registrados.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 17, background: '#f8fbff', borderRadius: 14, boxShadow: '0 1px 6px #1976d211' }}>
              <thead>
                <tr style={{ background: '#f1f5fa', borderBottom: '2px solid #e3e9f7' }}>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>ID</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Nombre</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Dirección</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Teléfono</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Email</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym, idx) => (
                  <tr key={gym.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f6f8fb', transition: 'background 0.2s', borderBottom: '1px solid #e3e9f7', cursor: 'pointer' }}>
                    <td style={{ padding: '13px 10px', color: '#222', fontWeight: 500 }}>{gym.id}</td>
                    <td style={{ padding: '13px 10px', color: '#1976d2', fontWeight: 700 }}>{gym.name}</td>
                    <td style={{ padding: '13px 10px', color: '#64748b' }}>{gym.address}</td>
                    <td style={{ padding: '13px 10px', color: '#222' }}>{gym.phone}</td>
                    <td style={{ padding: '13px 10px', color: '#222' }}>{gym.email}</td>
                    <td style={{ padding: '13px 10px', color: gym.status === 'active' ? '#38a169' : '#e53935', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {gym.status === 'active' ? 'Activo' : 'Inactivo'}
                      <button
                        onClick={() => handleToggleGymStatus(gym)}
                        disabled={statusLoading === gym.id}
                        style={{
                          background: gym.status === 'active' ? '#e53935' : '#38a169',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 15
                        }}
                      >
                        {statusLoading === gym.id
                          ? 'Actualizando...'
                          : gym.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #1976d211', padding: 32, minHeight: 320, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1976d2', margin: 0, letterSpacing: '-0.5px' }}>Solicitudes de Nuevos Gimnasios</h2>
        </div>
        {loadingPending ? (
          <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 18 }}>Cargando solicitudes...</div>
        ) : pendingGyms.length === 0 ? (
          <div style={{ color: '#64748b', fontWeight: 500, fontSize: 18 }}>No hay solicitudes pendientes.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 17, background: '#f8fbff', borderRadius: 14, boxShadow: '0 1px 6px #1976d211' }}>
              <thead>
                <tr style={{ background: '#f1f5fa', borderBottom: '2px solid #e3e9f7' }}>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Nombre</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Dirección</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Teléfono</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Email</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Admin</th>
                  <th style={{ padding: '16px 10px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingGyms.map((gym, idx) => (
                  <tr key={gym.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f6f8fb', transition: 'background 0.2s', borderBottom: '1px solid #e3e9f7', cursor: 'pointer' }}>
                    <td style={{ padding: '13px 10px', color: '#1976d2', fontWeight: 700 }}>{gym.name}</td>
                    <td style={{ padding: '13px 10px', color: '#64748b' }}>{gym.address}</td>
                    <td style={{ padding: '13px 10px', color: '#222' }}>{gym.phone}</td>
                    <td style={{ padding: '13px 10px', color: '#222' }}>{gym.email}</td>
                    <td style={{ padding: '13px 10px', color: '#222' }}>{gym.admin_first_name} {gym.admin_last_name} <br /><span style={{ color: '#64748b', fontSize: 14 }}>{gym.admin_email}</span></td>
                    <td style={{ padding: '13px 10px' }}>
                      <button onClick={() => handleApprove(gym)} disabled={actionLoading === gym.id} style={{ background: '#38a169', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600, marginRight: 8, cursor: 'pointer' }}>{actionLoading === gym.id ? 'Procesando...' : 'Aprobar'}</button>
                      <button onClick={() => handleReject(gym)} disabled={actionLoading === gym.id} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }}>{actionLoading === gym.id ? 'Procesando...' : 'Rechazar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {actionMsg && <div style={{marginTop:16, fontWeight:600, color: actionMsg.startsWith('✅') ? '#38a169' : '#e53935'}}>{actionMsg}</div>}
      </div>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #1976d222', padding: 36, minHeight: 340, marginBottom: 48, marginTop: 48 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1976d2', marginBottom: 28, letterSpacing: '-1px' }}>Panel de Gimnasios Seleccionados</h2>
        <div style={{ marginBottom: 24, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 700, color: '#1976d2', fontSize: 18 }}>Gimnasios:</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {gyms.map(gym => (
              <button
                key={gym.id}
                onClick={() => setSelectedGyms(selectedGyms.includes(gym.id) ? selectedGyms.filter(id => id !== gym.id) : [...selectedGyms, gym.id])}
                style={{
                  background: selectedGyms.includes(gym.id) ? '#1976d2' : '#f1f5fa',
                  color: selectedGyms.includes(gym.id) ? '#fff' : '#1976d2',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 20px',
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: selectedGyms.includes(gym.id) ? '0 2px 8px #1976d233' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: selectedGyms.includes(gym.id) ? '2px solid #1976d2' : 'none'
                }}
              >
                {gym.name}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', marginLeft: 16 }}>
            <span style={{ marginRight: 8, color: '#1976d2', fontSize: 20 }}>🔍</span>
            <input type="text" placeholder="Filtrar por nombre, email, rol o membresía..." value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 10, borderRadius: 10, border: '1.5px solid #d1e3fa', fontSize: 16, width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <button onClick={() => setActiveTab('members')} style={{ background: activeTab === 'members' ? '#1976d2' : '#f1f5fa', color: activeTab === 'members' ? '#fff' : '#1976d2', border: 'none', borderRadius: 12, padding: '8px 24px', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'all 0.2s' }}>Miembros</button>
          <button onClick={() => setActiveTab('plans')} style={{ background: activeTab === 'plans' ? '#1976d2' : '#f1f5fa', color: activeTab === 'plans' ? '#fff' : '#1976d2', border: 'none', borderRadius: 12, padding: '8px 24px', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'all 0.2s' }}>Planes Nutricionales</button>
        </div>
        {activeTab === 'members' && (
          <div style={{ overflowX: 'auto', borderRadius: 14, boxShadow: '0 2px 12px #1976d211', background: '#f8fbff' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 17, borderRadius: 14 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f1f5fa', borderBottom: '2px solid #e3e9f7' }}>
                  <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Nombre</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Email</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Rol</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Membresía</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingMembers ? (
                  <tr><td colSpan={5} style={{ padding: 32, color: '#1976d2', textAlign: 'center', fontWeight: 700, fontSize: 18 }}>Cargando miembros...</td></tr>
                ) : filteredMembers.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 32, color: '#64748b', textAlign: 'center', fontWeight: 600 }}>No hay miembros para mostrar.</td></tr>
                ) : filteredMembers.map((m, idx) => (
                  <tr key={m.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f6f8fb', transition: 'background 0.2s', borderBottom: '1px solid #e3e9f7', cursor: 'pointer' }}>
                    <td style={{ padding: '13px 12px', color: '#1976d2', fontWeight: 700 }}>{m.first_name} {m.last_name}</td>
                    <td style={{ padding: '13px 12px', color: '#222' }}>{m.email}</td>
                    <td style={{ padding: '13px 12px', color: '#222', fontWeight: 600 }}>{m.role}</td>
                    <td style={{ padding: '13px 12px', color: '#1976d2', fontWeight: 600 }}>{m.membership_type || '-'}</td>
                    <td style={{ padding: '13px 12px', color: m.status === 'Activo' ? '#38a169' : '#e53935', fontWeight: 700 }}>{m.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'plans' && (
          <>
            <div style={{ marginBottom: 18, fontWeight: 700, color: '#1976d2', fontSize: 19 }}>Planes nutricionales asignados a miembros</div>
            <div style={{ overflowX: 'auto', borderRadius: 14, boxShadow: '0 2px 12px #1976d211', background: '#f8fbff', marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 17, borderRadius: 14 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr style={{ background: '#f1f5fa', borderBottom: '2px solid #e3e9f7' }}>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Miembro</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Título del Plan</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Notas</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Fecha Inicio</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Fecha Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPlans ? (
                    <tr><td colSpan={5} style={{ padding: 32, color: '#1976d2', textAlign: 'center', fontWeight: 700, fontSize: 18 }}>Cargando planes...</td></tr>
                  ) : plans.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 32, color: '#64748b', textAlign: 'center', fontWeight: 600 }}>No hay planes para mostrar.</td></tr>
                  ) : plans.map((plan, idx) => (
                    <tr key={plan.id + '-' + (plan.member?.id || idx)} style={{ background: idx % 2 === 0 ? '#fff' : '#f6f8fb', transition: 'background 0.2s', borderBottom: '1px solid #e3e9f7' }}>
                      <td style={{ padding: '13px 12px', color: '#1976d2', fontWeight: 700 }}>{plan.member?.first_name} {plan.member?.last_name}</td>
                      <td style={{ padding: '13px 12px', color: '#222', fontWeight: 600 }}>{plan.title}</td>
                      <td style={{ padding: '13px 12px', color: '#222' }}>{plan.notes}</td>
                      <td style={{ padding: '13px 12px', color: '#1976d2' }}>{plan.start_date ? new Date(plan.start_date).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '13px 12px', color: '#1976d2' }}>{plan.end_date ? new Date(plan.end_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginBottom: 18, fontWeight: 700, color: '#1976d2', fontSize: 19 }}>Planes mensuales/ofertas de los gimnasios seleccionados</div>
            <div style={{ overflowX: 'auto', borderRadius: 14, boxShadow: '0 2px 12px #1976d211', background: '#f8fbff' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 17, borderRadius: 14 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr style={{ background: '#f1f5fa', borderBottom: '2px solid #e3e9f7' }}>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Gimnasio</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Nombre del Plan</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Descripción</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Precio</th>
                    <th style={{ padding: '16px 12px', fontWeight: 800, color: '#1976d2', textAlign: 'left', fontSize: 16 }}>Duración (días)</th>
                  </tr>
                </thead>
                <tbody>
                  {gymPlans.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 32, color: '#64748b', textAlign: 'center', fontWeight: 600 }}>No hay planes mensuales/ofertas para mostrar.</td></tr>
                  ) : gymPlans.map((plan, idx) => (
                    <tr key={plan.id + '-' + plan.gymId} style={{ background: idx % 2 === 0 ? '#fff' : '#f6f8fb', transition: 'background 0.2s', borderBottom: '1px solid #e3e9f7' }}>
                      <td style={{ padding: '13px 12px', color: '#1976d2', fontWeight: 700 }}>{gyms.find(g => g.id === plan.gymId)?.name || '-'}</td>
                      <td style={{ padding: '13px 12px', color: '#222', fontWeight: 600 }}>{plan.name}</td>
                      <td style={{ padding: '13px 12px', color: '#222' }}>{plan.description}</td>
                      <td style={{ padding: '13px 12px', color: '#1976d2', fontWeight: 700 }}>{plan.price ? `$${plan.price}` : '-'}</td>
                      <td style={{ padding: '13px 12px', color: '#1976d2' }}>{plan.duration_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {/* Sección: Tickets de Soporte */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #1976d211', padding: 32, minHeight: 320, marginBottom: 32 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1976d2', margin: 0, letterSpacing: '-0.5px', marginBottom: 18 }}>Tickets de Soporte</h2>
        {loadingTickets ? (
          <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 18 }}>Cargando tickets...</div>
        ) : supportTickets.length === 0 ? (
          <div style={{ color: '#64748b', fontWeight: 500, fontSize: 18 }}>No hay tickets de soporte enviados.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {supportTickets.map((t) => (
              <div key={t.id} style={{
                background: '#f8fbff',
                borderRadius: 14,
                boxShadow: '0 2px 12px #1976d211',
                padding: 24,
                minWidth: 320,
                maxWidth: 420,
                flex: '1 1 340px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                border: '1.5px solid #e3e9f7',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, color: '#1976d2', fontSize: 18 }}>#{t.id}</span>
                  <span style={{
                    background: t.status === 'cerrado' ? '#38a16922' : t.status === 'en_revision' ? '#facc1533' : '#e5393522',
                    color: t.status === 'cerrado' ? '#38a169' : t.status === 'en_revision' ? '#b7791f' : '#e53935',
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: '2px 12px',
                    fontSize: 15,
                    marginLeft: 8
                  }}>{t.status === 'cerrado' ? 'Resuelto' : t.status === 'en_revision' ? 'En Revisión' : 'Pendiente'}</span>
                  <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>{formatDate(t.created_at)}</span>
                </div>
                <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 17, marginBottom: 2 }}>{t.subject}</div>
                <div style={{ color: '#222', fontSize: 16, marginBottom: 8 }}>{t.description}</div>
                <div style={{ color: '#64748b', fontSize: 15, marginBottom: 4 }}>
                  <b>Gimnasio:</b> {gyms.find(g => g.id === t.gym_id)?.name || t.gym_id || '-'}
                </div>
                <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>
                  <b>Usuario:</b> {t.user_id || '-'}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  {t.status !== 'cerrado' && (
                    <button
                      onClick={async () => {
                        const newStatus = t.status === 'pendiente' ? 'en_revision' : 'cerrado';
                        const { error } = await supabase
                          .from('support_tickets')
                          .update({ status: newStatus, updated_at: new Date().toISOString() })
                          .eq('id', t.id);
                        if (!error) {
                          toast.success(`Ticket marcado como ${newStatus === 'en_revision' ? 'En Revisión' : 'Resuelto'}`);
                          setSupportTickets(supportTickets => supportTickets.map(st => st.id === t.id ? { ...st, status: newStatus } : st));
                        } else {
                          toast.error('Error actualizando estado');
                        }
                      }}
                      style={{
                        background: t.status === 'pendiente' ? 'linear-gradient(90deg, #facc15 60%, #f59e42 100%)' : 'linear-gradient(90deg, #38a169 60%, #1976d2 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 18px',
                        fontWeight: 700,
                        fontSize: 15,
                        boxShadow: '0 2px 8px #1976d233',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        minWidth: 120
                      }}
                    >
                      {t.status === 'pendiente' ? 'Marcar En Revisión' : 'Marcar Resuelto'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </div>

  );
}
