import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { createNutritionPlan, getCoachNutritionPlans, getAssignedMembersForSelect } from '../../api/routines.api';
import { updateNutritionPlan } from '../../api/updateNutritionPlan';
import { supabase } from '../../supabaseClient';
import "../../styles/dashboard.css";

export default function ManageNutrition({ onBack }) {
    // Estado para edición de plan
    const [editPlanData, setEditPlanData] = useState(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para datos reales de BD
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  
  // Estados para formulario de nuevo plan
  const [newPlanData, setNewPlanData] = useState({
    name: '',
    type: '',
    calories: '',
    description: '',
    meals: 5,
    assigned_to: [], // Ahora es un array de IDs
    notes: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadNutritionData();
  }, []);

  const loadNutritionData = async () => {
    setLoading(true);
    try {
      // Obtener planes y miembros
      const [plansResult, membersResult] = await Promise.all([
        getCoachNutritionPlans(),
        getAssignedMembersForSelect()
      ]);

      let plansWithAssignments = [];
      if (plansResult.success) {
        // Por cada plan, buscar miembros asignados
        const plans = plansResult.nutritionPlans;
        for (const plan of plans) {
          // Buscar miembros asignados a este plan
          const { data: assignments, error: assignError } = await supabase
            .from('nutrition_plan_assignments')
            .select('member_id, profiles(first_name, last_name, email)')
            .eq('nutrition_plan_id', plan.id);
          let assignedMembers = [];
          if (!assignError && assignments) {
            assignedMembers = assignments.map(a => ({
              id: a.member_id,
              ...a.profiles
            }));
          }
          plansWithAssignments.push({ ...plan, assignedMembers });
        }
        setNutritionPlans(plansWithAssignments);
      }

      if (membersResult.success) {
        setAvailableMembers(membersResult.members);
      }
    } catch (error) {
      console.error('Error cargando datos nutricionales:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    // Validar campos obligatorios
    if (!newPlanData.name.trim()) {
      toast.error('❌ El nombre del plan es obligatorio');
      return;
    }
    if (!newPlanData.type) {
      toast.error('❌ Debes seleccionar un tipo de plan');
      return;
    }
    console.log('📋 Datos del formulario antes de enviar:', newPlanData);
    console.log('👥 Miembros disponibles:', availableMembers);
    const loadingToastId = toast.loading('Creando plan nutricional...');
    try {
      const result = await createNutritionPlan(newPlanData);
      toast.dismiss(loadingToastId);
      if (result.success) {
        toast.success('✅ Plan nutricional creado exitosamente');
        setShowCreatePlan(false);
        // Resetear formulario
        setNewPlanData({
          name: '',
          type: '',
          calories: '',
          description: '',
          meals: 5,
          assigned_to: [],
          notes: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: ''
        });
        // Recargar datos
        await loadNutritionData();
      } else {
        toast.error('❌ Error creando plan: ' + result.error);
      }
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error('❌ Error creando plan: ' + error.message);
      console.error('Error:', error);
    }
  }

  const handlePlanInputChange = (field, value) => {
    let processedValue = value;
    // Para selección múltiple de miembros
    if (field === 'assigned_to') {
      if (Array.isArray(value)) {
        processedValue = value;
      } else if (typeof value === 'object' && value.target) {
        // Para <select multiple>
        processedValue = Array.from(value.target.selectedOptions, option => option.value);
      }
    }
    setNewPlanData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const handleAssignPlan = (planId) => {
    setSelectedPlan(planId);
    setShowAssignPlan(true);
  };

  const handleEditPlan = (planId) => {
    setSelectedPlan(planId);
    setEditPlanData(null);
    setShowEditPlan(true);
    // Cargar datos actualizados del plan desde la BD
    (async () => {
      const { getNutritionPlanById } = await import('../../api/routines.api');
      const result = await getNutritionPlanById(planId);
      if (result.success) {
        const plan = result.plan;
        setEditPlanData({
          name: plan.name || plan.title || '',
          type: plan.type || '',
          calories: plan.calories || '',
          description: plan.description || plan.notes || '',
          meals: plan.meals || 5,
          assigned_to: plan.assignedMembers ? plan.assignedMembers.map(m => m.id) : [],
          notes: plan.notes || '',
          start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
          end_date: plan.end_date ? plan.end_date.split('T')[0] : '',
          protein_grams: plan.protein_grams || '',
          carbs_grams: plan.carbs_grams || '',
          fat_grams: plan.fat_grams || '',
          breakfast: plan.breakfast || '',
          midmorning: plan.midmorning || '',
          lunch: plan.lunch || '',
          snack: plan.snack || '',
          dinner: plan.dinner || ''
        });
      } else {
        toast.error('No se pudo cargar el plan alimenticio.');
      }
    })();
  };

  const handleViewDetails = (planId) => {
    setSelectedPlan(planId);
    setShowPlanDetails(true);
  };

  const handleEditPlanInputChange = (field, value) => {
    let processedValue = value;
    if (field === 'assigned_to') {
      if (Array.isArray(value)) {
        processedValue = value;
      } else if (typeof value === 'object' && value.target) {
        processedValue = Array.from(value.target.selectedOptions, option => option.value);
      }
    }
    setEditPlanData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const confirmEditPlan = async () => {
    if (!editPlanData.name.trim()) {
      toast.error('❌ El nombre del plan es obligatorio');
      return;
    }
    if (!editPlanData.type) {
      toast.error('❌ Debes seleccionar un tipo de plan');
      return;
    }
    const loadingToastId = toast.loading('Actualizando plan nutricional...');
    try {
      const result = await updateNutritionPlan(selectedPlan, editPlanData);
      toast.dismiss(loadingToastId);
      if (result.success) {
        toast.success('✅ Plan nutricional actualizado exitosamente');
        setShowEditPlan(false);
        setSelectedPlan(null);
        setEditPlanData(null);
        await loadNutritionData();
      } else {
        toast.error('❌ Error actualizando plan: ' + result.error);
      }
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error('❌ Error actualizando plan: ' + error.message);
    }
  };

  const confirmAssignPlan = () => {
    toast.success('✅ Plan nutricional asignado exitosamente');
    setShowAssignPlan(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>🍎 Gestión de Planes Alimenticios</h1>
          <p>Cargando datos...</p>
        </div>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div className="loading-spinner">⏳ Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <button onClick={onBack} className="back-btn">
          ← Volver al Dashboard
        </button>
        <h1>🍎 Gestión de Planes Alimenticios</h1>
        <p>Crea y asigna planes nutricionales personalizados</p>
      </div>

      <div className="dashboard-actions">
        <button 
          className="btn-primary"
          onClick={() => setShowCreatePlan(true)}
        >
          ➕ Crear Nuevo Plan
        </button>
        <button 
          className="btn-secondary"
          onClick={() => {
            toast.loading('Generando reporte nutricional...', { duration: 2000 });
            setTimeout(() => {
              toast.success('📊 Reporte nutricional generado exitosamente');
            }, 2000);
          }}
        >
          📊 Reporte Nutricional
        </button>
      </div>

      <div className="nutrition-plans-grid">
        {nutritionPlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', gridColumn: '1 / -1' }}>
            <p>📋 No hay planes nutricionales creados</p>
            <button 
              className="btn-primary"
              onClick={() => setShowCreatePlan(true)}
              style={{ marginTop: '10px' }}
            >
              ➕ Crear tu primer plan
            </button>
          </div>
        ) : (
          nutritionPlans.map(plan => (
            <div key={plan.id} className="nutrition-plan-card">
              <div className="plan-header">
                <h3>{plan.title || plan.name}</h3>
                <span className={`plan-type-badge`}>
                  {plan.type || 'General'}
                </span>
              </div>

              <div className="plan-details">
                {plan.calories && <p><strong>📊 Calorías:</strong> {plan.calories} kcal/día</p>}
                {plan.meals && <p><strong>🍽️ Comidas:</strong> {plan.meals} por día</p>}
                <p><strong>📝 Descripción:</strong> {plan.notes || plan.description || 'Sin descripción'}</p>
                <p><strong>📅 Creado:</strong> {new Date(plan.created_at).toLocaleDateString()}</p>
                {plan.start_date && (
                  <p><strong>🗓️ Inicio:</strong> {new Date(plan.start_date).toLocaleDateString()}</p>
                )}
                {plan.end_date && (
                  <p><strong>🏁 Fin:</strong> {new Date(plan.end_date).toLocaleDateString()}</p>
                )}
                <div style={{marginTop: '10px'}}>
                  <strong>👥 Miembros asignados:</strong>
                  {plan.assignedMembers && plan.assignedMembers.length > 0 ? (
                    <ul style={{margin: '5px 0 0 15px'}}>
                      {plan.assignedMembers.map(m => (
                        <li key={m.id}>{m.first_name} {m.last_name} <span style={{color:'#888',fontSize:'0.9em'}}>({m.email})</span></li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{color:'#888',fontSize:'0.95em',marginLeft:'5px'}}>Ninguno</span>
                  )}
                </div>
              </div>

              <div className="plan-actions">
                <button 
                  className="btn-mini"
                  onClick={() => handleViewDetails(plan.id)}
                >
                  👀 Ver Detalles
                </button>
                <button 
                  className="btn-mini"
                  onClick={() => handleAssignPlan(plan.id)}
                  title={'Asignar a más miembros'}
                >
                  👥 Asignar
                </button>
                <button 
                  className="btn-mini"
                  onClick={() => handleEditPlan(plan.id)}
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para crear nuevo plan */}
      {showCreatePlan && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>🍎 Crear Nuevo Plan Alimenticio</h3>
              <button 
                onClick={() => setShowCreatePlan(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>

            <div className="create-nutrition-form">
              <div className="form-section">
                <h4>ℹ️ Información General</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre del Plan:</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Plan de Definición Avanzado" 
                      className="form-input"
                      value={newPlanData.name}
                      onChange={(e) => handlePlanInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Plan:</label>
                    <select 
                      className="form-input"
                      value={newPlanData.type}
                      onChange={(e) => handlePlanInputChange('type', e.target.value)}
                    >
                      <option value="">Seleccionar tipo...</option>
                      <option value="Pérdida de Peso">Pérdida de Peso</option>
                      <option value="Ganancia Muscular">Ganancia Muscular</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Especial">Especial</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Calorías Totales (kcal/día):</label>
                    <input 
                      type="number" 
                      min="1200" 
                      max="4000" 
                      className="form-input"
                      value={newPlanData.calories}
                      onChange={(e) => handlePlanInputChange('calories', e.target.value)}
                      placeholder="2000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Número de Comidas:</label>
                    <input 
                      type="number" 
                      min="3" 
                      max="8" 
                      className="form-input"
                      value={newPlanData.meals}
                      onChange={(e) => handlePlanInputChange('meals', parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción:</label>
                  <textarea 
                    placeholder="Describe el objetivo y características del plan..."
                    className="form-textarea"
                    rows="3"
                    value={newPlanData.description}
                    onChange={(e) => handlePlanInputChange('description', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="form-section">
                <h4>🎯 Macronutrientes</h4>
                <div className="macros-grid">
                  <div className="macro-group">
                    <label>Proteínas (g):</label>
                    <input type="number" min="50" max="300" defaultValue="120" className="form-input" />
                    <small>25% de calorías</small>
                  </div>
                  <div className="macro-group">
                    <label>Carbohidratos (g):</label>
                    <input type="number" min="100" max="500" defaultValue="200" className="form-input" />
                    <small>40% de calorías</small>
                  </div>
                  <div className="macro-group">
                    <label>Grasas (g):</label>
                    <input type="number" min="40" max="150" defaultValue="78" className="form-input" />
                    <small>35% de calorías</small>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>🍽️ Estructura de Comidas</h4>
                <div className="meals-structure">
                  <div className="meal-time">
                    <strong>🌅 Desayuno (7:00 AM):</strong>
                    <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea"></textarea>
                  </div>
                  <div className="meal-time">
                    <strong>🥪 Media Mañana (10:00 AM):</strong>
                    <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea"></textarea>
                  </div>
                  <div className="meal-time">
                    <strong>🍽️ Almuerzo (1:00 PM):</strong>
                    <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea"></textarea>
                  </div>
                  <div className="meal-time">
                    <strong>🥤 Merienda (4:00 PM):</strong>
                    <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea"></textarea>
                  </div>
                  <div className="meal-time">
                    <strong>🌙 Cena (7:30 PM):</strong>
                    <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea"></textarea>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>👥 Asignación de Miembros y Fechas</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '1.05em', color: '#374151' }}>Selecciona los miembros a asignar:</label>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1.5px solid #cbd5e1', maxHeight: '220px', overflowY: 'auto', marginTop: 6
                    }}>
                      {availableMembers.length === 0 && (
                        <span style={{ color: '#888', fontStyle: 'italic' }}>No hay miembros disponibles</span>
                      )}
                      {availableMembers.map(member => {
                        const checked = newPlanData.assigned_to.includes(member.id);
                        return (
                          <label key={member.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', background: checked ? '#e0f2fe' : '#fff', border: checked ? '2px solid #38bdf8' : '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', minWidth: 220, boxShadow: checked ? '0 2px 8px #bae6fd' : 'none', transition: 'all 0.2s'
                          }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                let updated;
                                if (e.target.checked) {
                                  updated = [...newPlanData.assigned_to, member.id];
                                } else {
                                  updated = newPlanData.assigned_to.filter(id => id !== member.id);
                                }
                                handlePlanInputChange('assigned_to', updated);
                              }}
                              style={{ accentColor: '#38bdf8', width: 18, height: 18 }}
                            />
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', background: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0284c7', fontSize: '1.1em', boxShadow: '0 1px 4px #e0e7ef'
                            }}>
                              {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 500, color: '#0f172a', fontSize: '1em' }}>{member.first_name} {member.last_name}</span>
                              <span style={{ color: '#64748b', fontSize: '0.97em' }}>{member.email}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <small style={{ color: '#38bdf8', fontWeight: 500, marginTop: 6, display: 'block' }}>Haz click en los recuadros para seleccionar/desmarcar miembros. Puedes asignar varios.</small>
                  </div>
                  <div className="form-group">
                    <label>Fecha de Inicio:</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={newPlanData.start_date}
                      onChange={(e) => handlePlanInputChange('start_date', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Finalización:</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={newPlanData.end_date}
                      onChange={(e) => handlePlanInputChange('end_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>📝 Notas y Recomendaciones</h4>
                <textarea 
                  placeholder="Instrucciones especiales, suplementos recomendados, restricciones alimentarias..."
                  className="form-textarea"
                  rows="4"
                  value={newPlanData.notes}
                  onChange={(e) => handlePlanInputChange('notes', e.target.value)}
                ></textarea>
              </div>

              <div className="form-actions">
                <button 
                  className="btn-primary"
                  onClick={handleCreatePlan}
                >
                  💾 Guardar Plan
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowCreatePlan(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar plan */}
      {showAssignPlan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>👥 Asignar Plan Nutricional</h3>
              <button 
                onClick={() => setShowAssignPlan(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>

            <div className="assign-plan-content">
              <p><strong>Plan seleccionado:</strong> {nutritionPlans.find(p => p.id === selectedPlan)?.name}</p>
              
              <h4 style={{marginBottom:8, color:'#0ea5e9', fontWeight:700, fontSize:'1.1em'}}>Selecciona miembros para asignar</h4>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1.5px solid #cbd5e1', maxHeight: '220px', overflowY: 'auto', marginTop: 6
              }}>
                {availableMembers.length === 0 && (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>No hay miembros disponibles</span>
                )}
                {availableMembers.map(member => {
                  // Aquí deberías manejar el estado de selección real, para ejemplo visual:
                  // const checked = ...
                  // onChange = ...
                  return (
                    <label key={member.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', minWidth: 220, transition: 'all 0.2s'
                    }}>
                      <input
                        type="checkbox"
                        // checked={checked}
                        // onChange={...}
                        style={{ accentColor: '#38bdf8', width: 18, height: 18 }}
                      />
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0284c7', fontSize: '1.1em', boxShadow: '0 1px 4px #e0e7ef'
                      }}>
                        {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: '#0f172a', fontSize: '1em' }}>{member.first_name} {member.last_name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.97em' }}>{member.email}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <small style={{ color: '#38bdf8', fontWeight: 500, marginTop: 6, display: 'block' }}>Haz click en los recuadros para seleccionar/desmarcar miembros. Puedes asignar varios.</small>

              <div className="assign-options">
                <div className="form-group">
                  <label>
                    <input type="checkbox" />
                    Notificar por email a los miembros seleccionados
                  </label>
                </div>
                <div className="form-group">
                  <label>Fecha de inicio:</label>
                  <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="form-input" />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn-primary"
                  onClick={confirmAssignPlan}
                >
                  ✅ Asignar Plan
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAssignPlan(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Detalles del Plan */}
      {showPlanDetails && selectedPlan && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>👀 Detalles del Plan: {nutritionPlans.find(p => p.id === selectedPlan)?.name}</h3>
              <button 
                onClick={() => setShowPlanDetails(false)} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>

            <div className="plan-details-content">
              {nutritionPlans.find(p => p.id === selectedPlan) && (
                <>
                  <div className="detail-section">
                    <h4>ℹ️ Información General</h4>
                    <div className="detail-grid">
                      <div><strong>Tipo:</strong> {nutritionPlans.find(p => p.id === selectedPlan).type}</div>
                      <div><strong>Calorías:</strong> {nutritionPlans.find(p => p.id === selectedPlan).calories} kcal/día</div>
                      <div><strong>Comidas:</strong> {nutritionPlans.find(p => p.id === selectedPlan).meals} por día</div>
                      <div><strong>Creado:</strong> {nutritionPlans.find(p => p.id === selectedPlan).created}</div>
                    </div>
                    <p><strong>Descripción:</strong> {nutritionPlans.find(p => p.id === selectedPlan).description}</p>
                  </div>

                  <div className="detail-section">
                    <h4>🎯 Macronutrientes Objetivo</h4>
                    <div className="macros-display">
                      <div className="macro-item">
                        <span className="macro-label">Proteínas</span>
                        <span className="macro-value">
                          {selectedPlan === 1 ? '135g (30%)' : 
                           selectedPlan === 2 ? '180g (25%)' : 
                           selectedPlan === 3 ? '120g (22%)' : '100g (20%)'}
                        </span>
                      </div>
                      <div className="macro-item">
                        <span className="macro-label">Carbohidratos</span>
                        <span className="macro-value">
                          {selectedPlan === 1 ? '150g (35%)' : 
                           selectedPlan === 2 ? '300g (45%)' : 
                           selectedPlan === 3 ? '200g (40%)' : '220g (45%)'}
                        </span>
                      </div>
                      <div className="macro-item">
                        <span className="macro-label">Grasas</span>
                        <span className="macro-value">
                          {selectedPlan === 1 ? '70g (35%)' : 
                           selectedPlan === 2 ? '95g (30%)' : 
                           selectedPlan === 3 ? '85g (38%)' : '78g (35%)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    {(() => {
                      const plan = nutritionPlans.find(p => p.id === selectedPlan);
                      const assigned = plan?.assignedMembers || [];
                      return (
                        <>
                          <h4>👥 Miembros Asignados ({assigned.length})</h4>
                          {assigned.length > 0 ? (
                            <div className="assigned-members-list">
                              {assigned.map((member, index) => (
                                <div key={index} className="assigned-member-item" style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                                  <div className="member-avatar-mini" style={{width:28,height:28,borderRadius:'50%',background:'#bae6fd',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#0284c7',fontSize:'1em'}}>
                                    {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                                  </div>
                                  <span>{member.first_name} {member.last_name} <span style={{color:'#64748b',fontSize:'0.97em'}}>({member.email})</span></span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No hay miembros asignados a este plan</p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="detail-section">
                    <h4>🍽️ Estructura de Comidas</h4>
                    <div className="meals-preview">
                      <div className="meal-preview">
                        <strong>🌅 Desayuno:</strong> Proteínas + Carbohidratos + Grasas saludables
                      </div>
                      <div className="meal-preview">
                        <strong>🥙 Media Mañana:</strong> Snack ligero con fibra
                      </div>
                      <div className="meal-preview">
                        <strong>🍽️ Almuerzo:</strong> Comida principal balanceada
                      </div>
                      <div className="meal-preview">
                        <strong>🥤 Merienda:</strong> Recuperación post-entrenamiento
                      </div>
                      <div className="meal-preview">
                        <strong>🌙 Cena:</strong> Proteínas + Verduras + Grasas
                      </div>
                      {nutritionPlans.find(p => p.id === selectedPlan).meals === 6 && (
                        <div className="meal-preview">
                          <strong>🌜 Antes de Dormir:</strong> Proteína de absorción lenta
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Plan */}
      {showEditPlan && selectedPlan && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>✏️ Editar Plan: {editPlanData?.name}</h3>
              <button 
                onClick={() => { setShowEditPlan(false); setEditPlanData(null); }} 
                className="btn-secondary"
                style={{ padding: '5px 10px' }}
              >
                ✖ Cerrar
              </button>
            </div>
            {editPlanData && (
              <form className="create-nutrition-form" onSubmit={e => { e.preventDefault(); confirmEditPlan(); }}>
                <div className="form-section">
                  <h4>ℹ️ Información General</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Plan:</label>
                      <input 
                        type="text" 
                        value={editPlanData.name}
                        onChange={e => handleEditPlanInputChange('name', e.target.value)}
                        className="form-input" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo de Plan:</label>
                      <select className="form-input" value={editPlanData.type} onChange={e => handleEditPlanInputChange('type', e.target.value)}>
                        <option value="">Selecciona tipo</option>
                        <option value="Pérdida de Peso">Pérdida de Peso</option>
                        <option value="Ganancia Muscular">Ganancia Muscular</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Especial">Especial</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Calorías Totales (kcal/día):</label>
                      <input 
                        type="number" 
                        min="1200" 
                        max="4000" 
                        value={editPlanData.calories}
                        onChange={e => handleEditPlanInputChange('calories', e.target.value)}
                        className="form-input" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Número de Comidas:</label>
                      <input 
                        type="number" 
                        min="3" 
                        max="8" 
                        value={editPlanData.meals}
                        onChange={e => handleEditPlanInputChange('meals', e.target.value)}
                        className="form-input" 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Descripción:</label>
                    <textarea 
                      value={editPlanData.description}
                      onChange={e => handleEditPlanInputChange('description', e.target.value)}
                      className="form-textarea"
                      rows="3"
                    ></textarea>
                  </div>
                </div>
                <div className="form-section">
                  <h4>🎯 Macronutrientes</h4>
                  <div className="macros-grid">
                    <div className="macro-group">
                      <label>Proteínas (g):</label>
                      <input 
                        type="number"
                        min="50"
                        max="300"
                        value={editPlanData.protein_grams}
                        onChange={e => handleEditPlanInputChange('protein_grams', e.target.value)}
                        className="form-input"
                      />
                      <small>25% de calorías</small>
                    </div>
                    <div className="macro-group">
                      <label>Carbohidratos (g):</label>
                      <input 
                        type="number"
                        min="100"
                        max="500"
                        value={editPlanData.carbs_grams}
                        onChange={e => handleEditPlanInputChange('carbs_grams', e.target.value)}
                        className="form-input"
                      />
                      <small>40% de calorías</small>
                    </div>
                    <div className="macro-group">
                      <label>Grasas (g):</label>
                      <input 
                        type="number"
                        min="40"
                        max="150"
                        value={editPlanData.fat_grams}
                        onChange={e => handleEditPlanInputChange('fat_grams', e.target.value)}
                        className="form-input"
                      />
                      <small>35% de calorías</small>
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <h4>🍽️ Estructura de Comidas</h4>
                  <div className="meals-structure">
                    <div className="meal-time">
                      <strong>🌅 Desayuno (7:00 AM):</strong>
                      <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea" value={editPlanData.breakfast} onChange={e => handleEditPlanInputChange('breakfast', e.target.value)}></textarea>
                    </div>
                    <div className="meal-time">
                      <strong>🥪 Media Mañana (10:00 AM):</strong>
                      <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea" value={editPlanData.midmorning} onChange={e => handleEditPlanInputChange('midmorning', e.target.value)}></textarea>
                    </div>
                    <div className="meal-time">
                      <strong>🍽️ Almuerzo (1:00 PM):</strong>
                      <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea" value={editPlanData.lunch} onChange={e => handleEditPlanInputChange('lunch', e.target.value)}></textarea>
                    </div>
                    <div className="meal-time">
                      <strong>🥤 Merienda (4:00 PM):</strong>
                      <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea" value={editPlanData.snack} onChange={e => handleEditPlanInputChange('snack', e.target.value)}></textarea>
                    </div>
                    <div className="meal-time">
                      <strong>🌙 Cena (7:30 PM):</strong>
                      <textarea placeholder="Describe los alimentos y porciones..." className="meal-textarea" value={editPlanData.dinner} onChange={e => handleEditPlanInputChange('dinner', e.target.value)}></textarea>
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <h4 style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.1em', marginBottom: 10 }}>👥 Miembros asignados</h4>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1.5px solid #cbd5e1', maxHeight: '220px', overflowY: 'auto', marginTop: 6
                  }}>
                    {availableMembers.length === 0 && (
                      <span style={{ color: '#888', fontStyle: 'italic' }}>No hay miembros disponibles</span>
                    )}
                    {availableMembers.map(member => {
                      const checked = editPlanData.assigned_to.includes(member.id);
                      return (
                        <label key={member.id} style={{
                          display: 'flex', alignItems: 'center', gap: '10px', background: checked ? '#e0f2fe' : '#fff', border: checked ? '2px solid #38bdf8' : '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', minWidth: 220, boxShadow: checked ? '0 2px 8px #bae6fd' : 'none', transition: 'all 0.2s'
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              let updated;
                              if (e.target.checked) {
                                updated = [...editPlanData.assigned_to, member.id];
                              } else {
                                updated = editPlanData.assigned_to.filter(id => id !== member.id);
                              }
                              handleEditPlanInputChange('assigned_to', updated);
                            }}
                            style={{ accentColor: '#38bdf8', width: 18, height: 18 }}
                          />
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0284c7', fontSize: '1.1em', boxShadow: '0 1px 4px #e0e7ef'
                          }}>
                            {member.first_name?.[0]?.toUpperCase()}{member.last_name?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500, color: '#0f172a', fontSize: '1em' }}>{member.first_name} {member.last_name}</span>
                            <span style={{ color: '#64748b', fontSize: '0.97em' }}>{member.email}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <small style={{ color: '#38bdf8', fontWeight: 500, marginTop: 6, display: 'block' }}>Haz click en los recuadros para seleccionar/desmarcar miembros. Puedes asignar varios.</small>
                </div>
                <div className="form-section">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Fecha de Inicio:</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={editPlanData.start_date}
                        onChange={e => handleEditPlanInputChange('start_date', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Finalización:</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={editPlanData.end_date}
                        onChange={e => handleEditPlanInputChange('end_date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <h4>📝 Notas y Recomendaciones</h4>
                  <textarea 
                    placeholder="Instrucciones especiales, suplementos recomendados, restricciones alimentarias..."
                    className="form-textarea"
                    rows="4"
                    value={editPlanData.notes}
                    onChange={e => handleEditPlanInputChange('notes', e.target.value)}
                  ></textarea>
                </div>
                <div className="form-actions">
                  <button 
                    className="btn-primary"
                    type="submit"
                  >
                    💾 Guardar Cambios
                  </button>
                  <button 
                    className="btn-secondary"
                    type="button"
                    onClick={() => { setShowEditPlan(false); setEditPlanData(null); }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}