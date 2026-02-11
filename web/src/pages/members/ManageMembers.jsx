// ...existing code...
  // Estilos responsivos para mobile
  // Puedes mover esto a tu archivo CSS si prefieres
  const responsiveStyles = `
    .status-badge-enhanced.vencido-badge {
      background: linear-gradient(90deg,#ff5858,#f857a6);
      color: #fff !important;
      border: none;
      box-shadow: 0 2px 8px #ff585899;
    }
    @media (max-width: 700px) {
      .members-table-enhanced {
        display: block !important;
        padding: 0 2px;
      }
      .table-header-enhanced {
        display: none !important;
      }
      .table-row-enhanced {
        flex-direction: column !important;
        align-items: flex-start !important;
        padding: 14px 8px !important;
        gap: 8px !important;
        border-radius: 12px !important;
        box-shadow: 0 2px 8px #e0e7ef;
        margin-bottom: 12px;
      }
      .member-info, .member-plan, .plan-status, .member-activity, .member-actions-enhanced {
        width: 100% !important;
        min-width: 0 !important;
        margin-bottom: 6px !important;
      }
      .member-name-email {
        flex-direction: column !important;
        gap: 2px !important;
      }
      .member-actions-enhanced {
        justify-content: flex-start !important;
        gap: 8px !important;
      }
      .plan-price, .plan-start, .days-info, .stat-number {
        font-size: 1em !important;
      }
      .status-badge-enhanced {
        font-size: 0.95em !important;
        padding: 4px 10px !important;
      }
    }
    @media (max-width: 500px) {
      .dashboard-section {
        padding: 8px 2px !important;
      }
      .table-row-enhanced {
        font-size: 0.98em !important;
        padding: 10px 2px !important;
      }
      .member-name-email strong {
        font-size: 1.1em !important;
      }
      .plan-price {
        font-size: 0.95em !important;
      }
    }
  `;
import { useState, useEffect } from 'react';
import { getPaymentsByMember } from '../../api/payments.api';
import { getAttendanceLog } from '../../api/attendance.api';
import jsPDF from 'jspdf';
import logoImage from '../../assets/image.png';
import { useProfile } from '../../hooks/useProfile';
import { useGymData } from '../../context/GymDataContextDB';
import QRGenerator from '../attendance/QRGenerator';
import { createUser as createUserAPI } from '../../api/users.api';
import { updateUser, updatePendingMember } from '../../api/users.api';
import { toast } from 'react-hot-toast';
import { createAuthForMember, getPendingMembers, deletePendingMember } from '../../api/users.api';

import Loader from '../../components/ui/Loader';
import { supabase } from '../../supabaseClient';
import '../../styles/dashboard.css';

// Definir planes disponibles
const MEMBERSHIP_PLANS = {
  rutina_normal: {
    name: 'Rutina Normal',
    price: 3000,
    duration: 'Por sesión',
    description: 'Acceso básico al gimnasio sin plan mensual',
    features: ['Uso de equipos', 'Horarios normales']
  },
  mensualidad: {
    name: 'Mensualidad',
    price: 50000,
    duration: '30 días',
    description: 'Plan mensual básico',
    features: ['Acceso completo', 'Todos los equipos', 'Horarios completos']
  },
  semipersonalizado: {
    name: 'Semipersonalizado',
    price: 80000,
    duration: '30 días',
    description: 'Plan con seguimiento parcial',
    features: ['Todo lo del plan básico', 'Rutinas recomendadas', 'Seguimiento quincenal']
  },
  personalizado: {
    name: 'Personalizado',
    price: 130000,
    duration: '30 días', 
    description: 'Plan completamente personalizado',
    features: ['Todo lo anterior', 'Entrenador personal', 'Plan nutricional', 'Seguimiento diario']
  }
};

// Horarios del gimnasio
const GYM_SCHEDULE = {
  'Lunes a Viernes': '5:00 AM - 11:00 AM y 3:00 PM - 9:00 PM',
  'Sábado': '6:00 AM - 12:00 PM',
  'Domingo': 'CERRADO'
};

export default function ManageMembers({ onBack }) {
  const { profile, loading: profileLoading } = useProfile();
  // Force-inject vencido-badge style for max specificity
  const vencidoBadgeStyle = `
    .status-badge-enhanced.vencido-badge {
      background: linear-gradient(90deg,#ff5858,#f857a6) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 2px 8px #ff585899 !important;
    }
  `;
  // Estados para gestión de planes
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  // Métricas por plan
  const [planMetrics, setPlanMetrics] = useState({});

  // Cargar métricas reales de miembros activos e ingresos por plan
  useEffect(() => {
    if (!profile?.gym_id || plans.length === 0) return;
    const fetchMetrics = async () => {
      const metrics = {};
      for (const plan of plans) {
        // Miembros activos
        const { data: memberships, error: membershipsError } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('plan_id', plan.id)
          .eq('gym_id', profile.gym_id)
          .eq('status', 'active');
        const activeMembers = membershipsError ? 0 : (memberships?.length || 0);

        // Ingresos
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('plan_id', plan.id)
          .eq('gym_id', profile.gym_id)
          .eq('status', 'completed');
        const totalRevenue = paymentsError ? 0 : payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        metrics[plan.id] = {
          activeMembers,
          totalRevenue
        };
      }
      setPlanMetrics(metrics);
    };
    fetchMetrics();
  }, [profile?.gym_id, plans]);

      // Cargar planes de la BD
      useEffect(() => {
        if (!profile?.gym_id) return;
        setLoadingPlans(true);
        supabase
          .from('plans')
          .select('*')
          .eq('gym_id', profile.gym_id)
          .eq('active', true)
          .then(({ data, error }) => {
            if (!error) setPlans(data || []);
            setLoadingPlans(false);
          });
      }, [profile?.gym_id, showPlanModal]);

      // Crear o editar plan
      const handleSavePlan = async (planData) => {
        setLoadingPlans(true);
        const payload = {
          gym_id: profile.gym_id,
          name: planData.name,
          description: planData.description,
          price: Number(planData.price),
          duration_days: Number(planData.duration_days),
          allows_personal_routine: !!planData.allows_personal_routine,
          allows_nutrition_plan: !!planData.allows_nutrition_plan,
          active: true
        };
        let result;
        if (editingPlan) {
          result = await supabase.from('plans').update(payload).eq('id', editingPlan.id);
          toast.success('Plan actualizado');
        } else {
          result = await supabase.from('plans').insert([payload]);
          toast.success('Plan creado');
        }
        setShowPlanModal(false);
        setEditingPlan(null);
        setLoadingPlans(false);
      };

      // Eliminar plan
      const handleDeletePlan = async (planId) => {
        if (!window.confirm('¿Eliminar este plan?')) return;
        setLoadingPlans(true);
        await supabase.from('plans').update({ active: false }).eq('id', planId);
        toast.success('Plan eliminado');
        setLoadingPlans(false);
        setShowPlanModal(false);
        setEditingPlan(null);
      };
    // Estados para pagos y visibilidad de facturas por miembro
    const [showPaymentsByMember, setShowPaymentsByMember] = useState({});
    const [paymentsByMember, setPaymentsByMember] = useState({});
    const [loadingPaymentsByMember, setLoadingPaymentsByMember] = useState({});
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState(null);
  const [members, setMembers] = useState([]); // Activos
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.ceil((members?.length || 0) / pageSize);
  const paginatedMembers = members.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedMemberForQR, setSelectedMemberForQR] = useState(null);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    membership: 'mensualidad',
    status: 'Activo'
  });
  
  // Función para calcular días restantes y transcurridos
  const calculateDaysInfo = (startDate, planType, planDuration = 30) => {
    if (!startDate) return { daysElapsed: '-', daysRemaining: '-' };
    if (planType === 'rutina_normal') return { daysElapsed: '-', daysRemaining: 'Por sesión' };
    const start = new Date(startDate);
    const now = new Date();
    // Limpiar horas para evitar desfases
    start.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    if (start > now) {
      return { daysElapsed: 'No iniciado', daysRemaining: 'No iniciado' };
    }
    const duration = planDuration; // días
    const endDate = new Date(start.getTime() + (duration * 24 * 60 * 60 * 1000));
    const daysElapsed = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    const daysLeft = Math.max(0, Math.ceil((endDate - now) / (24 * 60 * 60 * 1000)));
    return {
      daysElapsed: daysElapsed >= 0 ? daysElapsed : 0,
      daysRemaining: daysLeft > 0 ? daysLeft : 'Vencido'
    };
  };

  // Mover la función fuera del useEffect para reutilizarla
  const loadMembersFromDB = async () => {
    try {
      console.log('🔍 === DEBUGGING MANAGE MEMBERS ===');
      console.log('Profile completo:', profile);
      console.log('Profile gym_id:', profile?.gym_id);
      if (!profile?.gym_id) {
        setMembers([]);
        setPendingMembers([]);
        return;
      }
      // Cargar miembros desde profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'member');
      console.log('Respuesta de Supabase:', { profiles, error });
      if (error) {
        console.error('Error cargando miembros:', error);
        setMembers([]);
        setPendingMembers([]);
      } else {
        console.log('Datos cargados exitosamente:', profiles);
        // Obtener membresías activas
        const { data: memberships, error: membershipsError } = await supabase
          .from('memberships')
          .select('*')
          .eq('gym_id', profile.gym_id)
          .eq('status', 'active');

        // Obtener pagos de todos los miembros
        const { data: allPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('gym_id', profile.gym_id)
          .order('paid_at', { ascending: false });

        // Obtener asistencias de todos los miembros
        const attendanceRes = await getAttendanceLog(profile.gym_id);
        const allAttendance = attendanceRes.success ? attendanceRes.attendance : [];

        // Convertir datos de Supabase al formato esperado, enriqueciendo con membresía, pagos y asistencias
        const membersData = profiles.map(profile => {
          const memberMembership = (memberships || []).find(m => m.user_id === profile.id);
          const memberPayments = (allPayments || []).filter(p => p.member_id === profile.id);
          const memberAttendance = (allAttendance || []).filter(a => a.member_id === profile.id);

          // Fechas de plan
          let planStartDate = memberMembership?.start_date ? new Date(memberMembership.start_date) : (profile.created_at ? new Date(profile.created_at) : null);
          let planEndDate = memberMembership?.end_date ? new Date(memberMembership.end_date) : null;
          let daysElapsed = 0;
          let daysRemaining = 'Sin plan';
          let planStatus = 'Sin plan';
          if (planStartDate && planEndDate) {
            const now = new Date();
            daysElapsed = Math.max(0, Math.floor((now - planStartDate) / (24 * 60 * 60 * 1000)));
            daysRemaining = Math.max(0, Math.ceil((planEndDate - now) / (24 * 60 * 60 * 1000)));
            if (now > planEndDate) {
              daysRemaining = 'Vencido';
              planStatus = 'Vencido';
            } else if (memberMembership.status === 'active') {
              planStatus = 'Activo';
            } else {
              planStatus = memberMembership.status;
            }
          }

          // Visitas y última asistencia
          const visits = memberAttendance.length;
          const lastVisit = memberAttendance.length > 0 ? new Date(memberAttendance[0].timestamp).toLocaleDateString() : '-';

          // Pagos y total pagado
          const totalPaid = memberPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          // Pago del plan actual
          let currentPlanPayment = null;
          if (memberMembership) {
            currentPlanPayment = memberPayments.find(p => p.plan_id === memberMembership.plan_id && p.status === 'completed');
          }

          return {
            id: profile.id,
            gym_id: profile.gym_id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: profile.email || `${profile.first_name || 'user'}@gym.com`,
            phone: profile.phone || 'N/A',
            membership: profile.membership_type || 'mensualidad',
            status: planStatus,
            joined: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            planStartDate: planStartDate ? planStartDate.toLocaleDateString() : '-',
            planEndDate: planEndDate ? planEndDate.toLocaleDateString() : '-',
            daysElapsed,
            daysRemaining,
            lastVisit,
            visits,
            totalPaid,
            currentPlanPaid: currentPlanPayment ? currentPlanPayment.amount : 0,
            assignedCoach: profile.assigned_coach_id
          };
        });
        setMembers(membersData || []); // Asegurar que siempre sea array

        // Cargar miembros pendientes
        const pending = await getPendingMembers(profile.gym_id);
        const pendingData = (pending || []).map(pm => ({
          id: pm.id,
          name: `${pm.first_name || ''} ${pm.last_name || ''}`.trim(),
          email: pm.email,
          phone: pm.phone,
          membership: pm.membership_type || 'mensualidad',
          status: pm.status || 'Pendiente',
          joined: pm.created_at ? new Date(pm.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        }));
        setPendingMembers(pendingData);
      }
    } catch (error) {
      console.error('💥 Error general:', error);
      setMembers([]); // Asegurar que siempre sea array vacío
      setPendingMembers([]);
    } finally {
      setLoading(false);

  } // <-- Cierre correcto de handleSaveMember
  };

  // Datos de ejemplo para miembros con información de planes
  useEffect(() => {
    if (profileLoading) return;
    if (!profile || !profile.gym_id) {
      setLoading(false);
      setMembers([]);
      setPendingMembers([]);
      return;
    }
    loadMembersFromDB();
  }, [profileLoading, profile?.gym_id]);

  if (profileLoading || loading) {
    return (
      <>
        <style>{responsiveStyles}</style>
        <div className="dashboard">
          <div className="loading-container">
            <Loader skeleton rows={6} />
          </div>
        </div>
      </>
    );
  }

  const handleDeleteMember = (memberId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este miembro?')) {
      supabase
        .from('profiles')
        .delete()
        .eq('id', memberId)
        .then(({ error }) => {
          if (error) {
            alert('Error al eliminar miembro: ' + error.message);
          } else {
            setMembers(members.filter(member => member.id !== memberId));
            alert('Miembro eliminado exitosamente');
          }
        });
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowAddForm(true);
  };

  const handleStatusChange = (memberId, newStatus) => {
    supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', memberId)
      .then(({ error }) => {
        if (error) {
          alert('Error al actualizar estado: ' + error.message);
        } else {
          setMembers(members.map(member => 
            member.id === memberId ? { ...member, status: newStatus } : member
          ));
          alert(`Estado del miembro actualizado a ${newStatus}`);
        }
      });
  };

  const handleGenerateQR = (member) => {
    // Asegurar que el campo gym_id esté presente y loguear el objeto
    const memberWithGymId = {
      ...member,
      gym_id: member.gym_id || member.gymId
    };
    console.log('[ManageMembers.jsx] memberWithGymId enviado a QRGenerator:', JSON.stringify(memberWithGymId, null, 2));
    setSelectedMemberForQR(memberWithGymId);
    setShowQRGenerator(true);
    console.log('Modal QRGenerator debería estar visible');
  };

  const handleSaveMember = async (memberData) => {
    if (!memberData.name || !memberData.email) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }
    setLoading(true);
    try {
      let gymId = profile?.gym_id;
      if (!gymId) {
        toast.error('Error: No se pudo determinar el gimnasio');
        return;
      }

      if (editingMember) {
        // Detectar si es miembro pendiente o activo
        const isPending = pendingMembers.some(m => m.id === editingMember.id);
        if (isPending) {
          // Editar miembro pendiente
          const payload = {
            first_name: memberData.name.split(' ')[0] || memberData.name,
            last_name: memberData.name.split(' ').slice(1).join(' ') || '',
            phone: memberData.phone,
            email: memberData.email,
            membership_type: memberData.membership,
            status: memberData.status || 'Pendiente'
          };
          await updatePendingMember(editingMember.id, payload);
          toast.success('Miembro pendiente actualizado');
        } else {
          // Editar miembro activo
          const payload = {
            first_name: memberData.name.split(' ')[0] || memberData.name,
            last_name: memberData.name.split(' ').slice(1).join(' ') || '',
            phone: memberData.phone,
            email: memberData.email,
            membership_type: memberData.membership,
            status: memberData.status
          };
          await updateUser(editingMember.id, payload);
          // Insertar o actualizar membresía activa si se seleccionó un plan válido
          try {
            const gymId = profile?.gym_id;
            // Buscar el plan seleccionado en la tabla plans de la BD
            const { data: plans, error: plansError } = await supabase
              .from('plans')
              .select('id, duration_days')
              .eq('gym_id', gymId)
              .eq('active', true);
            if (!plansError && plans && plans.length > 0) {
              // Buscar el plan por nombre (membership)
              const selectedPlan = plans.find(p => p.id === memberData.plan_id || p.name?.toLowerCase() === memberData.membership?.toLowerCase());
              if (selectedPlan) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(startDate.getDate() + Number(selectedPlan.duration_days || 30));
                await supabase.from('memberships').upsert([
                  {
                    user_id: editingMember.id,
                    plan_id: selectedPlan.id,
                    gym_id: gymId,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'active',
                  }
                ], { onConflict: ['user_id', 'gym_id'] });
              }
            }
          } catch (err) {
            console.error('Error actualizando membresía:', err);
          }
          toast.success('Miembro actualizado exitosamente');
        }
        setTimeout(() => {
          loadMembersFromDB();
        }, 500);
      } else {
        // Crear miembro solo en pending_members (sin Auth ni contraseña)
        const payload = {
          first_name: memberData.name.split(' ')[0] || memberData.name,
          last_name: memberData.name.split(' ').slice(1).join(' ') || '',
          phone: memberData.phone,
          email: memberData.email,
          role: 'member',
          gym_id: gymId,
          membership_type: memberData.membership,
          status: memberData.status || 'Pendiente'
        };
        console.log('Payload a pending_members:', payload);
        const result = await createUserAPI(payload);
        if (result) {
          // Insertar membresía activa solo si no tiene una vigente
          try {
            // Buscar membresía activa vigente
            const { data: activeMemberships, error: activeError } = await supabase
              .from('memberships')
              .select('id, end_date')
              .eq('user_id', result.id)
              .eq('gym_id', gymId)
              .eq('status', 'active');
            const now = new Date();
            const hasActive = (activeMemberships || []).some(m => new Date(m.end_date) >= now);
            if (!hasActive) {
              // Buscar el plan seleccionado en la tabla plans de la BD
              const { data: plans, error: plansError } = await supabase
                .from('plans')
                .select('id, duration_days')
                .eq('gym_id', gymId)
                .eq('active', true);
              if (!plansError && plans && plans.length > 0) {
                // Buscar el plan por nombre (membership)
                const selectedPlan = plans.find(p => p.id === memberData.plan_id || p.name?.toLowerCase() === memberData.membership?.toLowerCase());
                if (selectedPlan) {
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setDate(startDate.getDate() + Number(selectedPlan.duration_days || 30));
                  await supabase.from('memberships').insert([
                    {
                      user_id: result.id,
                      plan_id: selectedPlan.id,
                      gym_id: gymId,
                      start_date: startDate.toISOString(),
                      end_date: endDate.toISOString(),
                      status: 'active',
                    }
                  ]);
                }
              }
            } else {
              toast.error('El miembro ya tiene una membresía activa. El nuevo plan se podrá asignar cuando termine la actual.');
            }
          } catch (err) {
            console.error('Error insertando membresía:', err);
          }
          toast.success('Miembro añadido exitosamente');
          setTimeout(() => {
            loadMembersFromDB();
          }, 500);
        } else {
          toast.error('Error al crear miembro');
        }
      }
    } catch (error) {
      toast.error('Error al guardar miembro: ' + (error.message || error));
    } finally {
      setLoading(false);
      setShowAddForm(false);
      setEditingMember(null);
    }
  }
  const activeMembers = (members || []).filter(m => m && m.status === 'Activo').length;
  const totalRevenue = (members || []).reduce((sum, member) => sum + (member?.totalPaid || 0), 0);
  const expiringSoon = (members || []).filter(m => {
    if (!m || m.membership === 'rutina_normal') return false;
    const plan = MEMBERSHIP_PLANS[m.membership] || MEMBERSHIP_PLANS['mensualidad'];
    const { daysRemaining } = calculateDaysInfo(m.planStartDate, m.membership, plan.duration ? parseInt(plan.duration) : 30);
    return daysRemaining !== 'Por sesión' && daysRemaining !== 'Vencido' && daysRemaining !== 'No iniciado' && parseInt(daysRemaining) <= 7;
  }).length;

  // Renderizar vista de planes
  if (activeTab === 'plans') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button
            onClick={onBack}
            className="btn-back-dashboard"
            style={{
              background: 'linear-gradient(90deg,#e53935 60%,#e57373 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 22px',
              fontWeight: 700,
              fontSize: 16,
              boxShadow: '0 2px 8px #e5737399',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: 12
            }}
          >← Volver al Dashboard</button>
          <style>{`
            .btn-back-dashboard:hover {
              background: linear-gradient(90deg,#b71c1c 60%,#f44336 100%);
              color: #fff;
              box-shadow: 0 4px 16px #e5737399;
              transform: scale(1.04);
            }
            .plan-action-btn {
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              font-size: 1em;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s, color 0.2s, box-shadow 0.2s;
              box-shadow: 0 2px 8px #e0e7ef;
              margin-right: 6px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .plan-action-btn.edit {
              background: linear-gradient(90deg,#1976d2 60%,#64b5f6 100%);
              color: #fff;
            }
            .plan-action-btn.edit:hover {
              background: linear-gradient(90deg,#1565c0 60%,#1976d2 100%);
              color: #fff;
              box-shadow: 0 4px 16px #90caf9;
            }
            .plan-action-btn.delete {
              background: linear-gradient(90deg,#e53935 60%,#ff6b6b 100%);
              color: #fff;
            }
            .plan-action-btn.delete:hover {
              background: linear-gradient(90deg,#b71c1c 60%,#e53935 100%);
              color: #fff;
              box-shadow: 0 4px 16px #ffcdd2;
            }
            .btn-create-plan {
              background: linear-gradient(90deg,#43e97b 60%,#38f9d7 100%);
              color: #222;
              border: none;
              border-radius: 6px;
              padding: 10px 22px;
              font-weight: 700;
              font-size: 1.1em;
              box-shadow: 0 2px 8px #b2f7ef99;
              cursor: pointer;
              transition: all 0.2s;
              margin-bottom: 18px;
              margin-top: 8px;
            }
            .btn-create-plan:hover {
              background: linear-gradient(90deg,#11998e 60%,#38f9d7 100%);
              color: #fff;
              box-shadow: 0 4px 16px #38f9d799;
              transform: scale(1.04);
            }
          `}</style>
          <h1>Planes y Precios</h1>
          <p>Información detallada de todos los planes disponibles</p>
        </header>

        <div className="tabs-container">
          <button 
            className={activeTab === 'members' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('members')}
          >
            👥 Miembros
          </button>
          <button 
            className={activeTab === 'plans' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('plans')}
          >
            💳 Planes
          </button>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-section" style={{gridColumn: '1 / -1', padding:'24px 0', display:'flex', flexDirection:'column', gap:'24px'}}>
            <button className="btn-create-plan" onClick={() => { setEditingPlan(null); setShowPlanModal(true); }}>+ Crear Plan</button>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))',
              gap: '24px',
              alignItems: 'start',
              marginBottom: '0',
              maxWidth: '100%',
            }}>
              {plans && plans.length > 0 ? (
                plans.map(plan => (
                  <div key={plan.id} className="plan-card" style={{border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, background: '#fff', boxShadow: '0 2px 8px #e0e7ef'}}>
                    <h2 style={{marginBottom: 8}}>{plan.name}</h2>
                    <div style={{fontWeight: 600, fontSize: 20, color: '#e53935', marginBottom: 8}}>${Number(plan.price).toLocaleString()} COP</div>
                    <div style={{marginBottom: 8}}>Duración: <strong>{plan.duration_days} días</strong></div>
                    <div style={{marginBottom: 8}}>{plan.description}</div>
                    <div style={{marginBottom: 8}}>
                      {plan.allows_personal_routine && <span style={{marginRight: 8, background: '#e3f2fd', color: '#1976d2', padding: '2px 8px', borderRadius: 6, fontSize: 13}}>Rutina Personalizada</span>}
                      {plan.allows_nutrition_plan && <span style={{background: '#fce4ec', color: '#c2185b', padding: '2px 8px', borderRadius: 6, fontSize: 13}}>Plan Nutricional</span>}
                    </div>
                    <div style={{marginTop: 12, display: 'flex', gap: 8}}>
                      <button className="plan-action-btn edit" onClick={() => { setEditingPlan(plan); setShowPlanModal(true); }} title="Editar plan">
                        <span style={{display:'flex',alignItems:'center'}}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          Editar
                        </span>
                      </button>
                      <button className="plan-action-btn delete" onClick={() => handleDeletePlan(plan.id)} title="Eliminar plan">
                        <span style={{display:'flex',alignItems:'center'}}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                          Eliminar
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', color: '#888'}}>No hay planes registrados.</div>
              )}
            </div>
          </div>
        </div>

        {showPlanModal && (
          <PlanModal
            plan={editingPlan}
            onSave={handleSavePlan}
            onClose={()=>{setShowPlanModal(false); setEditingPlan(null);}}
          />
        )}
      </div>
    );
  // Modal para crear/editar plan
  function PlanModal({ plan, onSave, onClose }) {
    const [formData, setFormData] = useState({
      name: plan?.name || '',
      description: plan?.description || '',
      price: plan?.price || '',
      duration_days: plan?.duration_days || 30,
      allows_personal_routine: !!plan?.allows_personal_routine,
      allows_nutrition_plan: !!plan?.allows_nutrition_plan
    });

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.name || !formData.price || !formData.duration_days) {
        toast.error('Completa todos los campos obligatorios');
        return;
      }
      onSave(formData);
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content-large">
          <h3>{plan ? 'Editar Plan' : 'Crear Nuevo Plan'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre *</label>
              <input name="name" value={formData.name} onChange={handleChange} required placeholder="Nombre del plan" />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descripción" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Precio *</label>
                <input name="price" type="number" value={formData.price} onChange={handleChange} required placeholder="Precio en COP" min="0" />
              </div>
              <div className="form-group">
                <label>Duración (días) *</label>
                <input name="duration_days" type="number" value={formData.duration_days} onChange={handleChange} required min="1" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <input name="allows_personal_routine" type="checkbox" checked={formData.allows_personal_routine} onChange={handleChange} /> Rutina Personalizada
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input name="allows_nutrition_plan" type="checkbox" checked={formData.allows_nutrition_plan} onChange={handleChange} /> Plan Nutricional
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn-primary">{plan ? 'Actualizar' : 'Crear'} Plan</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  }

  // Renderizar vista de miembros
  return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button
            onClick={onBack}
            className="btn-back-dashboard"
            style={{
              background: 'linear-gradient(90deg,#e53935 60%,#e57373 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 22px',
              fontWeight: 700,
              fontSize: 16,
              boxShadow: '0 2px 8px #e5737399',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: 12
            }}
          >← Volver al Dashboard</button>
          <style>{`
            .btn-back-dashboard:hover {
              background: linear-gradient(90deg,#b71c1c 60%,#f44336 100%);
              color: #fff;
              box-shadow: 0 4px 16px #e5737399;
              transform: scale(1.04);
            }
          `}</style>
        <h1>Gestionar Miembros</h1>
        <p>Administra la membresía de tu gimnasio</p>
      </header>

      <div className="tabs-container">
        <button 
          className={activeTab === 'members' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('members')}
        >
          👥 Miembros ({members.length})
        </button>
        <button 
          className={activeTab === 'plans' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('plans')}
        >
          💳 Planes y Precios
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Miembros</h3>
          <div className="stat-number">{members.length}</div>
          <p>Miembros registrados</p>
        </div>
        
        <div className="stat-card">
          <h3>Miembros Activos</h3>
          <div className="stat-number">{activeMembers}</div>
          <p>Membresías activas</p>
        </div>
        
        <div className="stat-card">
          <h3>Expiran Pronto</h3>
          <div className="stat-number" style={{color: expiringSoon > 0 ? '#ff6b6b' : '#4CAF50'}}>
            {expiringSoon}
          </div>
          <p>En los próximos 7 días</p>
        </div>

        <div className="stat-card">
          <h3>Ingresos Totales</h3>
          <div className="stat-number">${totalRevenue.toLocaleString()}</div>
          <p>Total recaudado</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section" style={{gridColumn: '1 / -1'}}>          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap:'wrap', maxWidth:'1200px'}}>            
            <h2>Lista de Miembros</h2>
            <button onClick={() => { setEditingMember(null); setShowAddForm(true); }} className="btn-primary">
              + Agregar Nuevo Miembro
            </button>
          </div>

          <div className="members-table-enhanced">
            <div className="table-header-enhanced">
              <div>Información Personal</div>
              <div>Plan Actual</div>
              <div>Estado del Plan</div>
              <div>Actividad</div>
              <div>Acciones</div>
            </div>
            
            {/* Miembros pendientes */}
            {pendingMembers && pendingMembers.length > 0 && pendingMembers.map(member => {
              const plan = MEMBERSHIP_PLANS[member.membership] || MEMBERSHIP_PLANS['mensualidad'];
              return (
                <div key={member.id} className="table-row-enhanced pending-member-row">
                  <div className="member-info">
                    <div className="member-name-email">
                      <strong>{member.name || 'Sin nombre'}</strong>
                      <span className="member-email">{member.email || 'Sin email'}</span>
                      <span className="member-phone">{member.phone || 'Sin teléfono'}</span>
                    </div>
                  </div>
                  <div className="member-plan">
                    <div className={`membership-badge-enhanced ${member.membership}`}>{plan?.name || 'Plan Desconocido'}</div>
                    <div className="plan-price">${(plan?.price || 0).toLocaleString()} COP</div>
                  </div>
                  <div className="plan-status">
                    <div className={`status-badge-enhanced pendiente`}>Pendiente</div>
                  </div>
                  <div className="member-activity">
                    <div>-</div>
                  </div>
                  <div className="member-actions-enhanced">
                    <button
                      className="action-btn-small access"
                      onClick={() => {
                        setSelectedMemberForAccess(member);
                        setShowAccessModal(true);
                      }}
                      title="Generar acceso (credenciales)"
                    >
                      🔑
                    </button>
                    <button
                      className="action-btn-small delete"
                      onClick={async () => {
                        if (window.confirm('¿Eliminar miembro pendiente?')) {
                          await deletePendingMember(member.id);
                          setTimeout(() => loadMembersFromDB(), 500);
                        }
                      }}
                      title="Eliminar miembro pendiente"
                    >🗑️</button>
                  </div>
                </div>
              );
            })}
            {/* Miembros activos */}
            {paginatedMembers && paginatedMembers.length > 0 && paginatedMembers.filter(member => member && member.id).map(member => {
              // Estados por miembro
              const showPayments = showPaymentsByMember[member.id] || false;
              const payments = paymentsByMember[member.id] || [];
              const loadingPayments = loadingPaymentsByMember[member.id] || false;

              const fetchPayments = async (memberId, gymId) => {
                setLoadingPaymentsByMember(prev => ({ ...prev, [memberId]: true }));
                try {
                  const data = await getPaymentsByMember(memberId, gymId);
                  setPaymentsByMember(prev => ({ ...prev, [memberId]: data }));
                } catch (err) {
                  toast.error('Error cargando pagos');
                }
                setLoadingPaymentsByMember(prev => ({ ...prev, [memberId]: false }));
              };

              const handleDownloadInvoice = (payment) => {
                const doc = new jsPDF();
                // Encabezado con logo y color
                doc.setFillColor(25, 118, 210);
                doc.rect(0, 0, 210, 38, 'F');
                const addLogoAndContinue = (base64Logo) => {
                  doc.addImage(base64Logo, 'PNG', 12, 7, 28, 18);
                  doc.setTextColor(255,255,255);
                  doc.setFontSize(22);
                  doc.text('GYM', 44, 20); // Puedes personalizar el nombre del gym si tienes el dato
                  doc.setFontSize(13);
                  doc.text('FACTURA ELECTRÓNICA', 180, 20, { align: 'right' });
                  doc.setFontSize(10);
                  doc.text(`Fecha: ${payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : new Date().toLocaleDateString()}`, 180, 30, { align: 'right' });

                  // Sombra bajo encabezado
                  doc.setFillColor(220, 220, 220);
                  doc.rect(0, 38, 210, 2, 'F');

                  // Sección datos del cliente
                  doc.setTextColor(40,40,40);
                  doc.setFontSize(12);
                  doc.setDrawColor(200,200,200);
                  doc.line(12, 44, 198, 44);
                  doc.text('Datos del Cliente', 12, 50);
                  doc.setFontSize(10);
                  doc.text(`Nombre: ${member.name || '-'}`, 12, 56);
                  doc.text(`Email: ${member.email || '-'}`, 12, 61);
                  doc.text(`ID Miembro: ${member.id || '-'}`, 12, 66);

                  // Tabla de detalle de la venta
                  doc.setDrawColor(180,180,180);
                  doc.line(12, 72, 198, 72);
                  doc.setFontSize(12);
                  doc.text('Detalle de la Venta', 12, 78);
                  doc.setFontSize(10);
                  doc.setFillColor(245, 247, 250);
                  doc.roundedRect(12, 82, 186, 10, 2, 2, 'F');
                  doc.setTextColor(60, 60, 60);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Plan', 18, 89);
                  doc.text('Monto', 80, 89);
                  doc.text('Fecha', 140, 89);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(40,40,40);
                  // Fila de datos
                  const planName = payment.plan_name || payment.plan_id || '-';
                  const planAmount = payment.amount || '-';
                  doc.text(planName, 18, 96);
                  doc.text(`$${planAmount ? Number(planAmount).toLocaleString() : '-'}`, 80, 96);
                  doc.text(`${payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : '-'}`, 140, 96);

                  // Línea de total
                  doc.setDrawColor(25, 118, 210);
                  doc.line(12, 102, 198, 102);
                  doc.setFontSize(13);
                  doc.setTextColor(25, 118, 210);
                  doc.setFont('helvetica', 'bold');
                  doc.text('TOTAL:', 120, 109);
                  doc.setTextColor(40,40,40);
                  doc.text(`$${planAmount ? Number(planAmount).toLocaleString() : '-'}`, 150, 109);
                  doc.setFont('helvetica', 'normal');

                  // Pie de página
                  doc.setFontSize(10);
                  doc.setTextColor(120,120,120);
                  doc.text('Gracias por su compra y confianza.', 12, 285);
                  doc.setFontSize(8);
                  doc.text('Documento generado automáticamente por GymMVP - Solo para uso interno', 12, 291);
                  doc.save(`Factura_${member.name.replace(/ /g,'_')}_${payment.id}.pdf`);
                };
                // Si la imagen ya es base64, úsala directo. Si es ruta, conviértela:
                if (typeof logoImage === 'string' && logoImage.startsWith('data:image')) {
                  addLogoAndContinue(logoImage);
                } else {
                  fetch(logoImage)
                    .then(res => res.blob())
                    .then(blob => {
                      const reader = new FileReader();
                      reader.onload = function(e) {
                        addLogoAndContinue(e.target.result);
                      };
                      reader.readAsDataURL(blob);
                    });
                }
              };
                        {/* Controles de paginación */}
                        {totalPages > 1 && (
                          <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '28px 0 0 0' }}>
                            <button
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              style={{
                                background: currentPage === 1 ? '#e0e0e0' : '#1976d2',
                                color: currentPage === 1 ? '#888' : '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 14px',
                                fontWeight: 600,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s'
                              }}
                              title="Primera página"
                            >⏮</button>
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              style={{
                                background: currentPage === 1 ? '#e0e0e0' : '#1976d2',
                                color: currentPage === 1 ? '#888' : '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 14px',
                                fontWeight: 600,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s'
                              }}
                              title="Página anterior"
                            >◀</button>
                            <span style={{fontWeight: 600, fontSize: '1.1em', color: '#222'}}>
                              Página {currentPage} de {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              style={{
                                background: currentPage === totalPages ? '#e0e0e0' : '#1976d2',
                                color: currentPage === totalPages ? '#888' : '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 14px',
                                fontWeight: 600,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s'
                              }}
                              title="Página siguiente"
                            >▶</button>
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              style={{
                                background: currentPage === totalPages ? '#e0e0e0' : '#1976d2',
                                color: currentPage === totalPages ? '#888' : '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 14px',
                                fontWeight: 600,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s'
                              }}
                              title="Última página"
                            >⏭</button>
                          </div>
                        )}
                    {/* Responsividad para la lista de miembros y vencido-badge override */}
                    <style>{`
                      ${vencidoBadgeStyle}
                      @media (max-width: 900px) {
                        .table-row-enhanced {
                          flex-direction: column !important;
                          align-items: flex-start !important;
                          padding: 14px 8px !important;
                          gap: 8px !important;
                        }
                        .member-info, .member-plan, .plan-status, .member-activity, .member-actions-enhanced {
                          width: 100% !important;
                          min-width: 0 !important;
                          margin-bottom: 6px !important;
                        }
                        .member-name-email {
                          flex-direction: column !important;
                          gap: 2px !important;
                        }
                        .member-actions-enhanced {
                          justify-content: flex-start !important;
                          gap: 8px !important;
                        }
                      }
                      @media (max-width: 600px) {
                        .dashboard-section {
                          padding: 8px 2px !important;
                        }
                        .table-row-enhanced {
                          font-size: 0.98em !important;
                          padding: 10px 2px !important;
                        }
                      }
                    `}</style>
              const plan = MEMBERSHIP_PLANS[member.membership] || MEMBERSHIP_PLANS['mensualidad']; // Fallback plan
              const { daysElapsed, daysRemaining } = calculateDaysInfo(member.planStartDate, member.membership, plan.duration ? parseInt(plan.duration) : 30);
              const isExpiringSoon = daysRemaining !== 'Por sesión' && daysRemaining !== 'Vencido' && daysRemaining !== 'No iniciado' && parseInt(daysRemaining) <= 7;
              return (
                <div key={member.id} className="table-row-enhanced" style={{background: showPayments ? '#f8f9fa' : 'inherit', borderRadius: showPayments ? 12 : 0, boxShadow: showPayments ? '0 2px 8px #e5737399' : 'none', marginBottom: showPayments ? 18 : 0, paddingBottom: 0, display: 'block', width: '100%'}}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(220px, 1.2fr)',
                  alignItems: 'stretch',
                  width: '100%'
                }}>
                  <div className="member-info">
                    <div className="member-name-email">
                      <strong>{member.name || 'Sin nombre'}</strong>
                      <span className="member-email">{member.email || 'Sin email'}</span>
                      <span className="member-phone">{member.phone || 'Sin teléfono'}</span>
                    </div>
                  </div>
                  {/* PLAN ACTUAL */}
                  <div className="member-plan" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4}}>
                    <div className={`membership-badge-enhanced ${member.membership}`}>{plan?.name || 'Plan Desconocido'}</div>
                    <div className="plan-price" style={{fontWeight: 700, fontSize: '1.1em', color: '#222'}}>${(plan?.price || 0).toLocaleString()} COP</div>
                    {member.planStartDate && (
                      <div className="plan-start" style={{fontSize: '0.95em', color: '#555'}}>Inició: {new Date(member.planStartDate).toLocaleDateString()}</div>
                    )}
                  </div>
                  {/* ESTADO DEL PLAN */}
                  <div className="plan-status" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4}}>
                    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                      <div
                        className={`status-badge-enhanced ${member.status.toLowerCase()}${member.status === 'Vencido' ? ' vencido-badge' : ''}`}
                        style={
                          member.status === 'Vencido'
                            ? {
                                background: 'linear-gradient(90deg,#ff5858,#f857a6)',
                                color: '#fff',
                                border: 'none',
                                boxShadow: '0 2px 8px #ff585899',
                                fontWeight: 700
                              }
                            : member.status === 'Sin plan'
                            ? {
                                background: 'linear-gradient(90deg,#bdbdbd,#757575)',
                                color: '#fff',
                                border: 'none',
                                boxShadow: '0 2px 8px #bdbdbd99',
                                fontWeight: 700
                              }
                            : undefined
                        }
                      >
                        {member.status}
                      </div>
                    </div>
                    {member.planStartDate && (
                      <div className="days-info" style={{fontSize: '0.95em', color: '#555'}}>
                        <span>Transcurridos: {typeof daysElapsed === 'number' ? `${daysElapsed} días` : daysElapsed}</span>
                        <span style={{marginLeft: 12}} className={isExpiringSoon ? 'expiring-soon' : ''}>Restantes: {typeof daysRemaining === 'number' ? `${daysRemaining} días` : daysRemaining}</span>
                      </div>
                    )}
                  </div>
                  <div className="member-activity">
                    <div>Visitas: <strong>{member.visits}</strong></div>
                    <div>Última: {new Date(member.lastVisit).toLocaleDateString()}</div>
                    <div>Total pagado: <strong>${member.totalPaid.toLocaleString()}</strong></div>
                  </div>
                  <div className="member-actions-enhanced" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 8}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', justifyContent: 'flex-end'}}>
                      <button className="action-btn-small edit" onClick={() => handleEditMember(member)} title="Editar miembro">✏️</button>
                      <button className="action-btn-small qr" onClick={() => handleGenerateQR(member)} title="Generar QR">📱</button>
                      <button className="action-btn-small delete" onClick={() => handleDeleteMember(member.id)} title="Eliminar miembro">🗑️</button>
                      <button className="action-btn-small toggle" onClick={() => handleStatusChange(member.id, member.status === 'Activo' ? 'Suspendido' : 'Activo')} title={member.status === 'Activo' ? 'Suspender' : 'Activar'}>{member.status === 'Activo' ? '⏸️' : '▶️'}</button>
                      <button
                        className="action-btn-small"
                        style={{background: showPayments ? '#1976d2' : '#ff5858', color: '#fff', borderRadius: 6, fontWeight: 600, marginLeft: 0, minWidth: 120, transition: 'background 0.2s'}}
                        onClick={() => {
                          setShowPaymentsByMember(prev => ({ ...prev, [member.id]: !showPayments }));
                          if (!payments.length) fetchPayments(member.id, member.gym_id);
                        }}
                      >
                        {showPayments ? 'Ocultar Facturas' : 'Ver Facturas'}
                      </button>
                    </div>
                  </div>
                </div>
                {/* Área de facturas debajo de la fila, empujando el resto del contenido */}
                {showPayments && (
                  <div style={{marginTop: 0, background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px #e5737399', width: '100%'}}>
                    <h4 style={{marginBottom: 8}}>Historial de Pagos y Facturas</h4>
                    {loadingPayments ? <div>Cargando pagos...</div> : payments.length === 0 ? <div>No hay pagos registrados.</div> : (
                      <div style={{width:'100%',overflowX:'auto',margin:'0'}}>
                        <table style={{minWidth:'700px',width:'100%',fontSize:'1.05em',background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px #e5737399',borderCollapse:'collapse',margin:'0'}}>
                          <thead>
                            <tr style={{background:'#ffeaea',color:'#222',fontWeight:700}}>
                              <th style={{padding:'12px 8px'}}>Plan</th>
                              <th style={{padding:'12px 8px'}}>Nombre del Plan</th>
                              <th style={{padding:'12px 8px'}}>Monto</th>
                              <th style={{padding:'12px 8px'}}>Fecha</th>
                              <th style={{padding:'12px 8px'}}>Factura</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map(payment => {
                              let planName = payment.plan_name;
                              if (!planName && payment.plan_id) {
                                const planObj = plans.find(p => p.id === payment.plan_id);
                                planName = planObj ? planObj.name : payment.plan_id;
                              }
                              return (
                                <tr key={payment.id} style={{borderBottom:'1px solid #f3caca'}}>
                                  <td style={{padding:'10px 8px',fontFamily:'monospace',color:'#888'}}>{payment.plan_id || '-'}</td>
                                  <td style={{padding:'10px 8px',fontWeight:600}}>{planName || '-'}</td>
                                  <td style={{padding:'10px 8px',color:'#1976d2'}}>${Number(payment.amount).toLocaleString()}</td>
                                  <td style={{padding:'10px 8px'}}>{new Date(payment.paid_at).toLocaleDateString()}</td>
                                  <td style={{padding:'10px 8px'}}>
                                    <button style={{background:'linear-gradient(90deg,#ff5858,#f857a6)',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,padding:'6px 18px',fontSize:'1em',boxShadow:'0 2px 8px #ff585899',cursor:'pointer'}} onClick={() => handleDownloadInvoice(payment)}>
                                      Descargar Factura
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddForm && (
        <MemberFormModal
          member={editingMember}
          onSave={handleSaveMember}
          onClose={() => {
            setShowAddForm(false);
            setEditingMember(null);
          }}
        />
      )}

      {/* Modal para generar acceso (credenciales) */}
      {showAccessModal && selectedMemberForAccess && (
        <AccessModal
          member={selectedMemberForAccess}
          onClose={() => {
            setShowAccessModal(false);
            setSelectedMemberForAccess(null);
          }}
          onAccessCreated={() => {
            setShowAccessModal(false);
            setSelectedMemberForAccess(null);
            setTimeout(() => loadMembersFromDB(), 500);
          }}
        />
      )}

      {/* Modal para generar QR */}
      {showQRGenerator && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-content-large" style={{ backgroundColor: 'white', border: '2px solid red' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Generar QR de Asistencia</h3>
              <button 
                onClick={() => {
                  console.log('Closing QR modal');
                  setShowQRGenerator(false);
                }} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            {selectedMemberForQR ? (
              <>
                {/* El pre con los datos enviados a QRGenerator ha sido eliminado para una vista más limpia */}
                <QRGenerator 
                  member={selectedMemberForQR} 
                  onClose={() => setShowQRGenerator(false)}
                />
              </>
            ) : (
              <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
                <p>Error: No hay miembro seleccionado</p>
                <p>selectedMemberForQR: {JSON.stringify(selectedMemberForQR)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AccessModal({ member, onClose, onAccessCreated }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < 6) return 'Debe tener al menos 6 caracteres.';
    if (!/[A-Z]/.test(pwd)) return 'Debe tener al menos una mayúscula.';
    if (!/[a-z]/.test(pwd)) return 'Debe tener al menos una minúscula.';
    if (!/[0-9]/.test(pwd)) return 'Debe tener al menos un número.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccess(false);
    const validation = validatePassword(password);
    if (validation) {
      setPasswordError(validation);
      toast.error(validation);
      return;
    }
    setLoading(true);
    try {
      // Usar la nueva función automatizada
      const { success, error } = await import('../../api/memberAccess.api').then(api => api.migratePendingMember(member.id, password));
      if (success) {
        setSuccess(true);
        toast.success('Acceso creado correctamente');
        onAccessCreated();
      } else {
        setPasswordError(error || 'Error creando acceso');
        toast.error(error || 'Error creando acceso');
      }
    } catch (err) {
      const msg = err.message || 'Error creando acceso';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-large">
        <h3>Generar Acceso para {member.name}</h3>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={member.email} disabled />
          </div>
          <div className="form-group">
            <label>Contraseña *</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Definir contraseña"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && <div style={{ color: 'red', marginTop: 4 }}>{passwordError}</div>}
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Acceso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MemberFormModal({ member, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    membership: member?.membership || 'mensualidad',
    status: member?.status || 'Activo'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-large">
        <h3>{member ? 'Editar Miembro' : 'Agregar Nuevo Miembro'}</h3>
        <form className="member-form-enhanced" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre Completo *</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre completo" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email" 
                required 
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono *</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="300-123-4567" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Plan de Membresía</label>
              <select 
                name="membership"
                value={formData.membership}
                onChange={handleChange}
                required
              >
                {Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => (
                  <option key={key} value={key}>
                    {plan.name} - ${plan.price.toLocaleString()} COP
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="selected-plan-info">
            <h4>Información del Plan Seleccionado:</h4>
            <div className="plan-details">
              <p><strong>Plan:</strong> {MEMBERSHIP_PLANS[formData.membership].name}</p>
              <p><strong>Precio:</strong> ${MEMBERSHIP_PLANS[formData.membership].price.toLocaleString()} COP</p>
              <p><strong>Duración:</strong> {MEMBERSHIP_PLANS[formData.membership].duration}</p>
              <p><strong>Descripción:</strong> {MEMBERSHIP_PLANS[formData.membership].description}</p>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {member ? 'Actualizar' : 'Agregar'} Miembro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
