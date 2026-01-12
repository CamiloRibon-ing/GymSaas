
import { useState, useEffect } from 'react';
import { getWeeklyRoutine, getMemberPersonalRoutines } from '../../api/routines.api';
import { getNutritionPlansForMember } from '../../api/nutrition.api';
import { useProfile } from "../../hooks/useProfile";
import DashboardNav from "../../components/layout/DashboardNav";
import QRGenerator from '../attendance/QRGenerator';
import "../../styles/dashboard.css";
import "../../styles/routine-tabs.css";

export default function MemberDashboard() {
  const { profile } = useProfile();
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

  // Crear datos del miembro actual para el QR, incluyendo gym_id
  const memberData = {
    id: profile?.id || 1,
    name: `${profile?.first_name || 'Usuario'} ${profile?.last_name || ''}`.trim(),
    email: profile?.email || 'usuario@gym.com',
    membership: 'Premium',
    status: 'Activo',
    gym_id: profile?.gym_id
  };

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
          <div className="stat-number">18</div>
          <p>Membresía activa</p>
        </div>

        <div className="stat-card">
          <h3>Mi Coach</h3>
          <div className="stat-number">✅</div>
          <p>David Pérez</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Mi Rutina de Hoy</h2>
          <div className="today-workout">
            <div className="workout-plan">
              <h3>💪 Entrenamiento de Fuerza</h3>
              <div className="workout-exercises">
                <div className="exercise">Sentadillas - 4 series x 12 reps</div>
                <div className="exercise">Press de banca - 4 series x 10 reps</div>
                <div className="exercise">Peso muerto - 3 series x 8 reps</div>
                <div className="exercise">Pull-ups - 3 series x 6 reps</div>
              </div>
              <button className="btn-primary">Iniciar Entrenamiento</button>
            </div>
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
          <div className="quick-actions">
            <div className="action-btn" onClick={() => setShowMyQR(true)}>
              <span>📱</span>
              <div>Mi Código QR</div>
            </div>
            <div className="action-btn" onClick={() => setShowRoutine(true)}>
              <span>💪</span>
              <div>Ver Mi Rutina</div>
            </div>
            <div className="action-btn" onClick={() => setShowWeightLog(true)}>
              <span>📊</span>
              <div>Registrar Peso</div>
            </div>
            <div className="action-btn" onClick={() => setShowNutrition(true)}>
              <span>🍎</span>
              <div>Plan Nutricional</div>
            </div>
            {/* Contactar Coach temporalmente oculto */}
          </div>
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

      {/* Modal para Ver Mi Rutina */}
      {showRoutine && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>💪 Mi Rutina de Entrenamiento</h3>
              <button 
                onClick={() => setShowRoutine(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            
            {/* Pestañas de rutina */}
            <div className="routine-tabs">
              <button 
                className={`routine-tab ${activeRoutineTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveRoutineTab('personal')}
              >
                🎯 Mi Rutina Personalizada
              </button>
              <button 
                className={`routine-tab ${activeRoutineTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveRoutineTab('general')}
              >
                📅 Rutina Semanal General
              </button>
            </div>

            {/* Contenido de rutina personal */}
            {activeRoutineTab === 'personal' && (
              <div className="routine-section">
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
            )}

            {/* Contenido de rutina semanal general */}
            {activeRoutineTab === 'general' && (
              <div className="routine-section">
                {loadingRoutines ? (
                  <div className="routine-loading">Cargando rutina semanal general...</div>
                ) : weeklyRoutine ? (
                  <div>
                    <div className="plan-info" style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
                      <h4>📅 Rutina Semanal del Gimnasio</h4>
                      <p><strong>👨‍🏫 Creada por:</strong> Equipo de Entrenadores</p>
                      <p><strong>🎯 Objetivo:</strong> Rutina general para todos los miembros</p>
                      <p><strong>📝 Nota:</strong> Esta es la rutina base del gimnasio. Tu rutina personalizada tiene prioridad.</p>
                    </div>
                    <div className="weekly-routine-display">
                      {/* Renderizar días y ejercicios de la rutina semanal general */}
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
                                    <strong>{ex.exercise_name}</strong> - {ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight}kg)` : ''} {ex.notes ? `- ${ex.notes}` : ''}
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
                  <div className="routine-empty">No hay rutina semanal general disponible.</div>
                )}
              </div>
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
    </div>
  );
}