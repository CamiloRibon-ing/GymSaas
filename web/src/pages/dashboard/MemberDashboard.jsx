import { useState, useEffect } from 'react';
import { getWeeklyRoutine, getMemberPersonalRoutines } from '../../api/routines.api';
import { getNutritionPlansForMember } from '../../api/nutrition.api';
import { useProfile } from "../../hooks/useProfile";
import { getUserById } from '../../api/users.api';
import { supabase } from '../../supabaseClient';
import DashboardNav from "../../components/layout/DashboardNav";
import QRGenerator from '../attendance/QRGenerator';
import jsPDF from 'jspdf';
import "../../styles/dashboard.css";
import "../../styles/routine-tabs.css";

import { getPaymentsByMember } from '../../api/payments.api';

export default function MemberDashboard() {
  const { profile } = useProfile();
  const [daysRemaining, setDaysRemaining] = useState('Cargando...');
  const [daysColor, setDaysColor] = useState('#667eea');
  const [coachName, setCoachName] = useState('Cargando...');
  const [showWarning, setShowWarning] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showWeightLog, setShowWeightLog] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [activeRoutineTab, setActiveRoutineTab] = useState('personal'); // 'personal' o 'general'
  const [personalRoutine, setPersonalRoutine] = useState(null);
  const [weeklyRoutine, setWeeklyRoutine] = useState(null);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [loadingNutritionPlans, setLoadingNutritionPlans] = useState(true);
  // Estado para la membresía activa
  const [membership, setMembership] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  // Estado para detalles del plan
  const [planDetails, setPlanDetails] = useState(null);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
  // Estado para historial de pagos
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  // Estados para paginación de pagos
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 5;
  const totalPages = Math.ceil(payments.length / paymentsPerPage);
  const paginatedPayments = payments.slice((currentPage - 1) * paymentsPerPage, currentPage * paymentsPerPage);
  // Consultar detalles del plan cuando membership cambia
  useEffect(() => {
    async function fetchPlanDetails() {
      if (!membership?.plan_id) {
        setPlanDetails(null);
        return;
      }
      setLoadingPlanDetails(true);
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', membership.plan_id);
      if (!error && plans && plans.length > 0) {
        setPlanDetails(plans[0]);
      } else {
        setPlanDetails(null);
      }
      setLoadingPlanDetails(false);
    }
    fetchPlanDetails();
  }, [membership?.plan_id]);

  // Obtener historial de pagos del miembro
  useEffect(() => {
    async function fetchPayments() {
      if (!profile?.id || !profile?.gym_id) {
        setPayments([]);
        setLoadingPayments(false);
        return;
      }
      setLoadingPayments(true);
      try {
        const data = await getPaymentsByMember(profile.id, profile.gym_id);
        setPayments(data || []);
      } catch (err) {
        setPayments([]);
      }
      setLoadingPayments(false);
    }
    fetchPayments();
  }, [profile?.id, profile?.gym_id]);

  // Obtener nombres de planes para los pagos
  useEffect(() => {
    async function fetchPlanNames() {
      if (!payments.length) return;
      // Obtener todos los plan_id únicos
      const planIds = [...new Set(payments.map(p => p.plan_id).filter(Boolean))];
      if (planIds.length === 0) return;
      const { data: plans, error } = await supabase
        .from('plans')
        .select('id, name')
        .in('id', planIds);
      if (!error && plans) {
        // Crear un mapa id -> name
        const planMap = Object.fromEntries(plans.map(p => [p.id, p.name]));
        // Actualizar los pagos con el nombre del plan
        setPayments(payments => payments.map(p => ({
          ...p,
          plan_name: planMap[p.plan_id] || p.plan_id
        })));
      }
    }
    fetchPlanNames();
  }, [payments.length]);

  // Crear datos del miembro actual para el QR, incluyendo gym_id
  const memberData = {
    id: profile?.id || 1,
    name: `${profile?.first_name || 'Usuario'} ${profile?.last_name || ''}`.trim(),
    email: profile?.email || 'usuario@gym.com',
    membership: profile?.membership_type || 'Premium',
    status: profile?.status || 'Activo',
    gym_id: profile?.gym_id
  };

  // Consultar días restantes, coach asignado y membresía activa
  useEffect(() => {
    async function fetchMembershipAndCoach() {
      if (!profile?.id || !profile?.gym_id) return;
      // Buscar membresía activa
      setLoadingMembership(true);
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('start_date, end_date, plan_id, status')
        .eq('user_id', profile.id)
        .eq('gym_id', profile.gym_id)
        .eq('status', 'active');
      if (error || !memberships || memberships.length === 0) {
        setDaysRemaining('No activa');
        setDaysColor('#e53e3e');
        setShowWarning(false);
        setMembership(null);
      } else {
        const m = memberships[0];
        setMembership(m);
        const now = new Date();
        const endDate = new Date(m.end_date);
        const daysLeft = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
        setDaysRemaining(daysLeft > 0 ? `${daysLeft}` : 'Vencido');
        if (daysLeft > 20) {
          setDaysColor('#38a169'); // verde
          setShowWarning(false);
        } else if (daysLeft > 10) {
          setDaysColor('#f6ad55'); // amarillo
          setShowWarning(false);
        } else if (daysLeft > 0) {
          setDaysColor('#e53e3e'); // rojo
          setShowWarning(true);
        } else {
          setDaysColor('#e53e3e'); // vencido
          setShowWarning(false);
        }
      }
      setLoadingMembership(false);
      // Buscar coach asignado
      if (profile.assigned_coach_id) {
        try {
          const coach = await getUserById(profile.assigned_coach_id);
          setCoachName(coach ? `${coach.first_name || ''} ${coach.last_name || ''}`.trim() : 'No asignado');
        } catch {
          setCoachName('No asignado');
        }
      } else {
        setCoachName('No asignado');
      }
    }
    fetchMembershipAndCoach();
  }, [profile?.id, profile?.gym_id, profile?.assigned_coach_id]);

  // Cargar planes nutricionales asignados
  useEffect(() => {
    async function fetchNutritionPlans() {
      setLoadingNutritionPlans(true);
      if (profile?.id) {
        const { success, plans } = await getNutritionPlansForMember(profile.id);
        setNutritionPlans(success ? plans : []);
      }
      setLoadingNutritionPlans(false);
    }
    fetchNutritionPlans();
  }, [profile?.id]);
  useEffect(() => {
    async function fetchRoutines() {
      setLoadingRoutines(true);
      let personal = null;
      let weekly = null;
      try {
        // Buscar rutinas personalizadas asignadas a este miembro
        const { success, routines } = await getMemberPersonalRoutines(profile?.id);
        if (success && routines && routines.length > 0) {
          personal = routines[0]; // Tomar la más reciente
        }
        // Buscar rutina semanal general
        const weeklyRes = await getWeeklyRoutine();
        if (weeklyRes.success) weekly = weeklyRes.weeklyRoutine;
      } catch (err) {
        // ...
      }
      setPersonalRoutine(personal || null);
      setWeeklyRoutine(weekly || null);
      setLoadingRoutines(false);
    }
    if (profile?.id) fetchRoutines();
  }, [profile?.id]);

  // Función para descargar factura PDF
  function handleDownloadInvoice(payment) {
    const doc = new jsPDF();
    const memberName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    doc.setFontSize(18);
    doc.text('Factura de Membresía', 20, 20);
    doc.setFontSize(12);
    doc.text(`Miembro: ${memberName}`, 20, 35);
    doc.text(`Email: ${profile?.email || '-'}`, 20, 43);
    doc.text(`Plan: ${payment.plan_name || payment.plan_id || '-'}`, 20, 55);
    doc.text(`Monto: $${payment.amount || '-'}`, 20, 63);
    doc.text(`Fecha de pago: ${payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : '-'}`, 20, 71);
    doc.text(`Estado: ${payment.status || 'Pagado'}`, 20, 79);
    doc.text('Gracias por tu preferencia.', 20, 100);
    doc.save(`Factura_${memberName.replace(/ /g,'_')}_${payment.id}.pdf`);
  }

  return (
    <div className="dashboard">
      <DashboardNav 
        currentPage="dashboard" 
        onNavigate={() => {}}
      />

      <header className="dashboard-header">
        <h1>Mi Panel Personal</h1>
        <p>¡Hola, {profile?.first_name || "Atleta"}! Vamos a entrenar 🚀</p>
      </header>

      {/* Acciones rápidas al inicio */}
      <section className="dashboard-section" style={{marginBottom: 24}}>
        <h2 style={{marginBottom: 12}}>Acciones rápidas</h2>
        <div className="quick-actions">
          <div className="action-btn" onClick={() => setShowMyQR(true)}>
            <span role="img" aria-label="QR">📱</span>
            <div>Mi Código QR</div>
          </div>
          <div className="action-btn" onClick={() => setShowRoutine(true)}>
            <span role="img" aria-label="Rutina">💪</span>
            <div>Ver Mi Rutina</div>
          </div>
          <div className="action-btn" onClick={() => setShowWeightLog(true)}>
            <span role="img" aria-label="Peso">📊</span>
            <div>Registrar Peso</div>
          </div>
          <div className="action-btn" onClick={() => setShowNutrition(true)}>
            <span role="img" aria-label="Nutrición">🍎</span>
            <div>Plan Nutricional</div>
          </div>
        </div>
      </section>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Mi Peso Actual</h3>
          <div className="stat-number">72.5</div>
          <p>kg</p>
        </div>
        <div className="stat-card">
          <h3>Entrenamientos</h3>
          <div className="stat-number">12</div>
          <p>Esta semana</p>
        </div>
        <div className="stat-card">
          <h3>Días Restantes</h3>
          <div className="stat-number" style={{color:daysColor}}>{daysRemaining}</div>
          <p>Membresía activa</p>
          {showWarning && (
            <div style={{color:'#e53e3e',fontWeight:'bold',marginTop:'0.5em',fontSize:'0.98em'}}>
              ⚠️ Quedan pocos días. Renueva tu plan para no perder el acceso ni estar en mora con el gimnasio.
            </div>
          )}
        </div>
        <div className="stat-card">
          <h3>Mi Coach</h3>
          <div className="stat-number" style={{color:'#764ba2'}}>{coachName}</div>
          <p>Coach asignado</p>
        </div>
      </div>

      <div className="dashboard-content">
          {/* Historial de Pagos y Facturas */}
          <div className="dashboard-section">
            <h2>Mis Pagos y Facturas</h2>
            {loadingPayments ? (
              <div className="routine-loading">Cargando historial de pagos...</div>
            ) : payments.length === 0 ? (
              <div className="routine-empty">No se encontraron pagos registrados.</div>
            ) : (
              <div className="payments-list">
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
                  <thead>
                    <tr style={{background:'#f1f5f9'}}>
                      <th style={{padding:'8px',border:'1px solid #e2e8f0'}}>Plan</th>
                      <th style={{padding:'8px',border:'1px solid #e2e8f0'}}>Monto</th>
                      <th style={{padding:'8px',border:'1px solid #e2e8f0'}}>Fecha</th>
                      <th style={{padding:'8px',border:'1px solid #e2e8f0'}}>Estado</th>
                      <th style={{padding:'8px',border:'1px solid #e2e8f0'}}>Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((p, idx) => (
                      <tr key={p.id || idx} style={{background: idx%2===0 ? '#fff' : '#f8fafc'}}>
                        <td style={{padding:'8px',border:'1px solid #e2e8f0'}} data-label="Plan">{p.plan_name || p.plan_id || '-'}</td>
                        <td style={{padding:'8px',border:'1px solid #e2e8f0'}} data-label="Monto">${p.amount || '-'}</td>
                        <td style={{padding:'8px',border:'1px solid #e2e8f0'}} data-label="Fecha">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                        <td style={{padding:'8px',border:'1px solid #e2e8f0'}} data-label="Estado">{p.status || 'Pagado'}</td>
                        <td style={{padding:'8px',border:'1px solid #e2e8f0'}} data-label="Factura">
                          <button className="btn-primary" style={{fontSize:'0.95em',padding:'4px 10px'}} onClick={() => handleDownloadInvoice(p)}>
                            Descargar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Paginación debajo de la tabla */}
                {totalPages > 1 && (
                  <div style={{display:'flex',justifyContent:'center',gap:8,margin:'12px 0'}}>
                    <button className="btn-secondary" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Anterior</button>
                    <span style={{alignSelf:'center'}}>Página {currentPage} de {totalPages}</span>
                    <button className="btn-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Siguiente</button>
                  </div>
                )}
                <div style={{fontSize:'0.95em',color:'#64748b'}}>Puedes descargar tu factura de cada pago realizado.</div>
              </div>
            )}
          </div>
        {/* Rutina personalizada asignada al miembro */}
        <div className="dashboard-section">
          <h2>Mi Rutina Personalizada</h2>
          {loadingRoutines ? (
            <div className="routine-loading">Cargando rutina personalizada...</div>
          ) : personalRoutine ? (
            <div>
              <div className="plan-info" style={{marginBottom:16, background:'#f0fff4', border:'1px solid #38a169', borderRadius:8, padding:12}}>
                <h4>🎯 {personalRoutine.name || 'Rutina Personalizada'}</h4>
                <p><strong>👨‍🏫 Asignado por:</strong> {personalRoutine.coach_name || 'Coach'}</p>
                <p><strong>🎯 Objetivo:</strong> {personalRoutine.goal || 'Personalizado'}</p>
                <p><strong>📅 Creada:</strong> {personalRoutine.created_at ? new Date(personalRoutine.created_at).toLocaleDateString() : '-'}</p>
                {personalRoutine.notes && <div style={{marginTop:8, color:'#64748b'}}><strong>Notas:</strong> {personalRoutine.notes}</div>}
              </div>
              <div className="routine-content">
                {Array.isArray(personalRoutine.days) && personalRoutine.days.length > 0 ? (
                  personalRoutine.days.map(day => (
                    <div key={day.id || day.name} style={{marginBottom:16, background:'#f8fafc', border:'1px solid #e0e7ef', borderRadius:8, padding:10}}>
                      <h5 style={{color:'#1976d2', marginBottom:6}}>{day.name || 'Día'}</h5>
                      {Array.isArray(day.exercises) && day.exercises.length > 0 ? (
                        <ul style={{marginLeft:16}}>
                          {day.exercises.map((ex, idx) => (
                            <li key={ex.id || idx} style={{marginBottom:4}}>
                              <strong>{ex.exercise_name || ex.name}</strong> - {ex.sets || '-'}x{ex.reps || '-'} {ex.weight ? `(${ex.weight}kg)` : ''} {ex.notes ? `- ${ex.notes}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : <span style={{color:'#888'}}>Día de descanso o sin ejercicios.</span>}
                    </div>
                  ))
                ) : <span style={{color:'#888'}}>No hay días ni ejercicios asignados.</span>}
              </div>
            </div>
          ) : (
            <div className="routine-empty">No tienes una rutina personalizada asignada.</div>
          )}
        </div>

        {/* Plan completo del miembro */}
        <div className="dashboard-section">
          <h2>Mi Plan Actual</h2>
          {loadingMembership ? (
            <div className="routine-loading">Cargando plan...</div>
          ) : membership ? (
            <div className="plan-info" style={{marginBottom:16, background:'#e3f2fd', border:'1px solid #1976d2', borderRadius:8, padding:12}}>
              <h4>📅 Plan Actual</h4>
              <p><strong>Inicio:</strong> {membership.start_date ? new Date(membership.start_date).toLocaleDateString() : '-'}</p>
              <p><strong>Fin:</strong> {membership.end_date ? new Date(membership.end_date).toLocaleDateString() : '-'}</p>
              <p><strong>Estado:</strong> {membership.status}</p>
              <p><strong>ID de Plan:</strong> {membership.plan_id}</p>
              {loadingPlanDetails ? (
                <div className="routine-loading">Cargando detalles del plan...</div>
              ) : planDetails ? (
                <div className="plan-details" style={{marginTop:12, background:'#fff', border:'1px solid #90caf9', borderRadius:6, padding:10}}>
                  <h5 style={{color:'#1976d2'}}>{planDetails.name || 'Sin nombre'}</h5>
                  {planDetails.description && <p><strong>Descripción:</strong> {planDetails.description}</p>}
                  {planDetails.benefits && <p><strong>Beneficios:</strong> {planDetails.benefits}</p>}
                  {planDetails.price && <p><strong>Precio:</strong> ${planDetails.price}</p>}
                  {/* Puedes agregar más campos según la estructura de la tabla plans */}
                </div>
              ) : (
                <div className="routine-empty">No se encontraron detalles del plan.</div>
              )}
            </div>
          ) : (
            <div className="routine-empty">No hay plan activo.</div>
          )}
        </div>
        <div className="dashboard-section">
          <h2>Mi Rutina de Hoy</h2>
          <div className="today-workout">
            {loadingRoutines ? (
              <div className="routine-loading">Cargando rutina semanal...</div>
            ) : weeklyRoutine ? (
              (() => {
                const daysMap = {
                  0: 'sunday',
                  1: 'monday',
                  2: 'tuesday',
                  3: 'wednesday',
                  4: 'thursday',
                  5: 'friday',
                  6: 'saturday'
                };
                const todayKey = daysMap[new Date().getDay()];
                const todayRoutine = weeklyRoutine[todayKey];
                return todayRoutine ? (
                  <div className="workout-plan">
                    <h3>💪 {todayRoutine.name || 'Rutina de hoy'}</h3>
                    <div className="workout-exercises">
                      {Array.isArray(todayRoutine.exercises) && todayRoutine.exercises.length > 0 ? (
                        todayRoutine.exercises.map((ex, idx) => (
                          <div key={ex.id || idx} className="exercise">
                            <strong>{ex.exercise_name || ex.name}</strong> - {ex.sets || '-'}x{ex.reps || '-'} {ex.weight ? `(${ex.weight}kg)` : ''} {ex.notes ? `- ${ex.notes}` : ''}
                          </div>
                        ))
                      ) : <span style={{color:'#888'}}>Día de descanso o sin ejercicios.</span>}
                    </div>
                    <button className="btn-primary" onClick={() => setShowRoutine(true)}>Ver rutina semanal</button>
                  </div>
                ) : (
                  <div className="workout-plan">
                    <h3>💤 Día de descanso</h3>
                    <div className="workout-exercises">
                      <span style={{color:'#888'}}>No hay ejercicios asignados para hoy.</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="routine-empty">No hay rutina semanal disponible.</div>
            )}
          </div>
        <div className="dashboard-section">
          <h2>Mi Progreso</h2>
          <div className="progress-section">
            <div className="progress-item">
              <span className="progress-label">Peso Objetivo</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '75%'}}></div>
              </div>
              <span className="progress-value">72.5 / 68 kg</span>
            </div>
            
            <div className="progress-item">
              <span className="progress-label">Entrenamientos Mensuales</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '60%'}}></div>
              </div>
              <span className="progress-value">12/20</span>
            </div>

            <div className="progress-item">
              <span className="progress-label">Masa Muscular</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '82%'}}></div>
              </div>
              <span className="progress-value">45.2 kg</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Mis Planes Alimenticios</h2>
          {loadingNutritionPlans ? (
            <div className="routine-loading">Cargando planes alimenticios...</div>
          ) : nutritionPlans.length === 0 ? (
            <div className="routine-empty">No tienes planes alimenticios asignados.</div>
          ) : (
            <div className="nutrition-plans-list">
              {nutritionPlans.map(plan => (
                <div key={plan.id} className="nutrition-plan-card" style={{marginBottom:16, border:'1px solid #e0e7ef', borderRadius:10, padding:16, background:'#f8fafc'}}>
                  <h4 style={{color:'#2563eb',marginBottom:4}}>{plan.title || plan.name}</h4>
                  <div style={{fontSize:'0.98em',color:'#64748b',marginBottom:6}}>{plan.type || 'General'} | {plan.calories ? `${plan.calories} kcal` : ''}</div>
                  <div style={{marginBottom:6}}><strong>Comidas/día:</strong> {plan.meals || 5}</div>
                  <div style={{marginBottom:6}}><strong>Inicio:</strong> {plan.start_date ? new Date(plan.start_date).toLocaleDateString() : '-'}</div>
                  <div style={{marginBottom:6}}><strong>Fin:</strong> {plan.end_date ? new Date(plan.end_date).toLocaleDateString() : '-'}</div>
                  <div style={{marginBottom:6}}><strong>Descripción:</strong> {plan.notes || plan.description || 'Sin descripción'}</div>
                  <div style={{marginBottom:6}}><strong>Macronutrientes:</strong> {plan.protein_grams || 0}g proteínas, {plan.carbs_grams || 0}g carbos, {plan.fat_grams || 0}g grasas</div>
                  <div style={{marginBottom:6}}><strong>Desayuno:</strong> {plan.breakfast || '-'}</div>
                  <div style={{marginBottom:6}}><strong>Media Mañana:</strong> {plan.midmorning || '-'}</div>
                  <div style={{marginBottom:6}}><strong>Almuerzo:</strong> {plan.lunch || '-'}</div>
                  <div style={{marginBottom:6}}><strong>Merienda:</strong> {plan.snack || '-'}</div>
                  <div style={{marginBottom:6}}><strong>Cena:</strong> {plan.dinner || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Logros Recientes</h2>
          <div className="achievements">
            <div className="achievement">
              <span className="achievement-icon">🏆</span>
              <div>
                <strong>10 entrenamientos completados</strong>
                <p>Esta semana has sido muy constante</p>
              </div>
            </div>
            <div className="achievement">
              <span className="achievement-icon">💪</span>
              <div>
                <strong>Nuevo récord en sentadillas</strong>
                <p>85kg - ¡Sigue así!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Ver Rutina Semanal */}
      {showRoutine && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📅 Rutina Semanal Completa</h3>
              <button 
                onClick={() => setShowRoutine(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            {loadingRoutines ? (
              <div className="routine-loading">Cargando rutina semanal...</div>
            ) : weeklyRoutine ? (
              <div>
                <div className="plan-info" style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
                  <h4>📅 Rutina Semanal del Gimnasio</h4>
                  <p><strong>👨‍🏫 Creada por:</strong> Equipo de Entrenadores</p>
                  <p><strong>🎯 Objetivo:</strong> Rutina general para todos los miembros</p>
                  <p><strong>📝 Nota:</strong> Esta es la rutina base del gimnasio. Tu rutina personalizada tiene prioridad.</p>
                </div>
                <div className="weekly-routine-display">
                  {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(key => {
                    const day = weeklyRoutine[key];
                    if (!day) return null;
                    return (
                      <div key={key} style={{marginBottom:16}}>
                        <h5 style={{color:'#1976d2'}}>{day.name || key.charAt(0).toUpperCase()+key.slice(1)}</h5>
                        {Array.isArray(day.exercises) && day.exercises.length > 0 ? (
                          <ul style={{marginLeft:16}}>
                            {day.exercises.map((ex, idx) => (
                              <li key={ex.id || idx}>
                                <strong>{ex.exercise_name || ex.name}</strong> - {ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight}kg)` : ''} {ex.notes ? `- ${ex.notes}` : ''}
                              </li>
                            ))}
                          </ul>
                        ) : <span style={{color:'#888'}}>Día de descanso o sin ejercicios.</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="routine-empty">No hay rutina semanal disponible.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Registrar Peso */}
      {showWeightLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📊 Registro de Peso</h3>
              <button 
                onClick={() => setShowWeightLog(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            
            <div className="weight-log-content">
              <div className="current-stats" style={{ marginBottom: '20px', padding: '15px', background: '#f8f9ff', borderRadius: '8px' }}>
                <h4>📈 Estadísticas Actuales</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                  <div>
                    <strong>Peso Actual:</strong><br/>
                    <span style={{ fontSize: '1.2em', color: '#667eea' }}>72.5 kg</span>
                  </div>
                  <div>
                    <strong>Peso Inicial:</strong><br/>
                    <span>75.0 kg</span>
                  </div>
                  <div>
                    <strong>Objetivo:</strong><br/>
                    <span style={{ color: '#38a169' }}>70.0 kg</span>
                  </div>
                  <div>
                    <strong>Progreso:</strong><br/>
                    <span style={{ color: '#38a169' }}>-2.5 kg ✅</span>
                  </div>
                </div>
              </div>
              
              <div className="add-weight-form" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <h4>➕ Nuevo Registro</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <input 
                    type="number" 
                    placeholder="Peso (kg)" 
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
                <button 
                  className="btn-primary" 
                  style={{ marginTop: '10px', width: '100%' }}
                  onClick={() => {
                    toast.success('✅ Peso registrado exitosamente');
                    setShowWeightLog(false);
                  }}
                >
                  💾 Guardar Registro
                </button>
              </div>
              
              <div className="weight-history">
                <h4>📋 Historial Reciente</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span>📅 05/01/2026</span>
                    <span><strong>72.5 kg</strong></span>
                    <span style={{ color: '#38a169' }}>-0.3 kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span>📅 29/12/2025</span>
                    <span><strong>72.8 kg</strong></span>
                    <span style={{ color: '#38a169' }}>-0.2 kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span>📅 22/12/2025</span>
                    <span><strong>73.0 kg</strong></span>
                    <span style={{ color: '#38a169' }}>-0.5 kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span>📅 15/12/2025</span>
                    <span><strong>73.5 kg</strong></span>
                    <span style={{ color: '#e53e3e' }}>+0.1 kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Plan Nutricional */}
      {showNutrition && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>🍎 Plan Nutricional Personalizado</h3>
              <button 
                onClick={() => setShowNutrition(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            <div className="nutrition-content">
              {nutritionPlans.length === 0 ? (
                <div style={{padding:32, textAlign:'center', color:'#888'}}>No tienes un plan nutricional asignado actualmente.</div>
              ) : (
                <>
                  <div className="nutrition-goals" style={{ marginBottom: '20px', padding: '15px', background: '#f0fff4', borderRadius: '8px', border: '1px solid #38a169' }}>
                    <h4>🎯 Tu Plan: "{nutritionPlans[0].title || nutritionPlans[0].name || 'Plan Nutricional'}"</h4>
                    <p style={{ margin: '5px 0', color: '#2d3748' }}>
                      <strong>📋 Asignado por:</strong> {nutritionPlans[0].coach_name || 'Coach'}
                    </p>
                    <p style={{ margin: '5px 0', color: '#2d3748' }}>
                      <strong>📅 Fecha de inicio:</strong> {nutritionPlans[0].start_date ? new Date(nutritionPlans[0].start_date).toLocaleDateString() : '-'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <strong>Calorías Diarias</strong><br/>
                        <span style={{ fontSize: '1.3em', color: '#38a169' }}>{nutritionPlans[0].calories || '-'} kcal</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <strong>Proteínas</strong><br/>
                        <span style={{ fontSize: '1.3em', color: '#667eea' }}>{nutritionPlans[0].protein_grams || '-'}g</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <strong>Agua Diaria</strong><br/>
                        <span style={{ fontSize: '1.3em', color: '#00b4d8' }}>{nutritionPlans[0].water_liters || '2.5'}L</span>
                      </div>
                    </div>
                  </div>
                  <div className="meal-plan" style={{ display: 'grid', gap: '15px' }}>
                    <div className="meal" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <h5>🌅 Desayuno</h5>
                      <div style={{marginTop:'8px', paddingLeft:'10px'}}>{nutritionPlans[0].breakfast || 'No especificado'}</div>
                    </div>
                    <div className="meal" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <h5>🥙 Media Mañana</h5>
                      <div style={{marginTop:'8px', paddingLeft:'10px'}}>{nutritionPlans[0].midmorning || 'No especificado'}</div>
                    </div>
                    <div className="meal" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <h5>🍽️ Almuerzo</h5>
                      <div style={{marginTop:'8px', paddingLeft:'10px'}}>{nutritionPlans[0].lunch || 'No especificado'}</div>
                    </div>
                    <div className="meal" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <h5>🥤 Merienda</h5>
                      <div style={{marginTop:'8px', paddingLeft:'10px'}}>{nutritionPlans[0].snack || 'No especificado'}</div>
                    </div>
                    <div className="meal" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <h5>🌙 Cena</h5>
                      <div style={{marginTop:'8px', paddingLeft:'10px'}}>{nutritionPlans[0].dinner || 'No especificado'}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                    <h5>💡 Instrucciones de tu Coach:</h5>
                    <div style={{ marginTop: '8px', paddingLeft: '10px' }}>{nutritionPlans[0].notes || nutritionPlans[0].description || 'Sin instrucciones adicionales.'}</div>
                  </div>
                  <div style={{ marginTop: '20px', padding: '15px', background: '#e6fffa', borderRadius: '8px', border: '1px solid #38a169' }}>
                    <h5>📞 ¿Necesitas ajustes en tu plan?</h5>
                    <p style={{ margin: '8px 0' }}>Si sientes hambre excesiva, fatiga o tienes alguna duda, contacta inmediatamente a tu coach.</p>
                    <button 
                      className="btn-primary" 
                      style={{ marginTop: '10px' }}
                      onClick={() => toast.info('📧 Mensaje enviado a tu coach')}
                    >
                      📧 Contactar Coach
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para mostrar mi QR personal */}
      {showMyQR && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Mi Código QR Personal</h3>
              <button 
                onClick={() => setShowMyQR(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '15px', color: '#666' }}>
              <p>🎯 <strong>Instrucciones:</strong> Muestra este código QR al personal del gimnasio para registrar tu entrada/salida</p>
            </div>
            <QRGenerator 
              member={memberData} 
              onClose={() => setShowMyQR(false)}
            />
          </div>
        </div>
      )}

      {/* Estilos responsivos para la tabla de pagos */}
      <style>{`
@media (max-width: 700px) {
  .payments-list table, .payments-list thead, .payments-list tbody, .payments-list th, .payments-list td, .payments-list tr {
    display: block;
    width: 100%;
  }
  .payments-list thead {
    display: none;
  }
  .payments-list tr {
    margin-bottom: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    padding: 8px 0;
  }
  .payments-list td {
    border: none;
    padding: 8px 16px;
    position: relative;
    text-align: left;
  }
  .payments-list td:before {
    content: attr(data-label);
    font-weight: bold;
    color: #1976d2;
    display: block;
    margin-bottom: 2px;
    font-size: 0.97em;
  }
}
`}</style>
    </div>
  );
    </div>
  );
}