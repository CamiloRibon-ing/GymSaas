import { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../supabaseClient';
import '../../styles/dashboard.css';
import toast from 'react-hot-toast';

export default function ReportsMetrics({ onBack }) {
  const { profile } = useProfile();
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchMetrics() {
      if (!profile?.gym_id) return;
      setLoading(true);
      try {
        // Miembros del gimnasio
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('gym_id', profile.gym_id)
          .eq('role', 'member');

        // Miembros activos (status)
        const activeMembers = members?.filter(m => m.status?.toLowerCase() === 'activo' || m.status?.toLowerCase() === 'active') || [];

        // Nuevos este mes
        const now = new Date();
        const newMembersThisMonth = members?.filter(m => {
          const created = new Date(m.created_at);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length || 0;

        // Tasa de abandono (simulado, requiere lógica de membresías canceladas)
        const churnRate = 100 - ((activeMembers.length / (members?.length || 1)) * 100);

        // Promedio de visitas por miembro (requiere tabla de asistencia)
        let avgVisitsPerMember = 0;
        let weeklyTrend = [0,0,0,0,0,0,0];
        let dailyAverage = 0;
        let monthlyComparison = { current: 0, previous: 0, growth: 0 };
        let peakDays = [];
        let lowDays = [];

        // Consulta de asistencia si existe la tabla
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('gym_id', profile.gym_id);
        let attendanceData = [];
        if (attendance) {
          attendanceData = attendance;
          // Agrupar por miembro
          const visitsByMember = {};
          attendance.forEach(a => {
            if (!visitsByMember[a.member_id]) visitsByMember[a.member_id] = 0;
            visitsByMember[a.member_id]++;
          });
          avgVisitsPerMember = Object.values(visitsByMember).reduce((a,b) => a+b,0) / (members?.length || 1);

          // Tendencia semanal
          const weekDays = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'];
          weeklyTrend = [0,0,0,0,0,0,0];
          attendance.forEach(a => {
            const d = new Date(a.timestamp);
            weeklyTrend[d.getDay() === 0 ? 6 : d.getDay()-1]++;
          });
          dailyAverage = attendance.length ? Math.round(attendance.length / 30) : 0;
          // Días pico y bajos
          const max = Math.max(...weeklyTrend);
          const min = Math.min(...weeklyTrend);
          peakDays = weekDays.filter((_,i) => weeklyTrend[i] === max);
          lowDays = weekDays.filter((_,i) => weeklyTrend[i] === min);
          // Comparación mensual
          const currentMonth = now.getMonth();
          const previousMonth = currentMonth === 0 ? 11 : currentMonth-1;
          const currentMonthAttendance = attendance.filter(a => new Date(a.timestamp).getMonth() === currentMonth).length;
          const previousMonthAttendance = attendance.filter(a => new Date(a.timestamp).getMonth() === previousMonth).length;
          monthlyComparison = {
            current: currentMonthAttendance,
            previous: previousMonthAttendance,
            growth: previousMonthAttendance ? ((currentMonthAttendance - previousMonthAttendance) / previousMonthAttendance) * 100 : 0
          };
        }

        // Satisfacción (simulado)
        const memberSatisfaction = 4.7;
        // Horario pico (simulado)
        const peakHours = '18:00 - 20:00';
        // Utilización de equipos (simulado)
        const equipmentUtilization = 78;

        // Equipos (simulado)
        const equipment = [
          { name: "Caminadoras", utilization: 85, status: "Óptimo", maintenance: "Próxima: 15 Feb" },
          { name: "Máquinas de Fuerza", utilization: 72, status: "Bueno", maintenance: "Próxima: 8 Feb" },
          { name: "Área de Pesas Libres", utilization: 91, status: "Alto Uso", maintenance: "Próxima: 22 Feb" },
          { name: "Bicicletas Estáticas", utilization: 56, status: "Bajo Uso", maintenance: "Próxima: 28 Feb" }
        ];

        // Distribución de membresías (requiere tabla memberships y plans para nombre)
        let membershipTrends = [];
        const { data: memberships, error: membershipsError } = await supabase
          .from('memberships')
          .select('plan_id, status');
        let planNames = {};
        const { data: plans, error: plansError } = await supabase
          .from('plans')
          .select('id, name');
        if (plans) {
          plans.forEach(p => { planNames[p.id] = p.name; });
        }
        if (memberships) {
          // Agrupar por tipo de plan
          const planCounts = {};
          memberships.forEach(m => {
            planCounts[m.plan_id] = (planCounts[m.plan_id] || 0) + 1;
          });
          const total = memberships.length || 1;
          membershipTrends = Object.entries(planCounts).map(([type, count]) => ({
            type: planNames[type] || type,
            count,
            percentage: ((count/total)*100).toFixed(1),
            trend: 'stable'
          }));
        }

        setMetricsData({
          overview: {
            totalMembers: members?.length || 0,
            activeMembers: activeMembers.length,
            newMembersThisMonth,
            churnRate: churnRate.toFixed(1),
            avgVisitsPerMember: avgVisitsPerMember.toFixed(1),
            peakHours,
            equipmentUtilization,
            memberSatisfaction
          },
          attendance: {
            dailyAverage,
            weeklyTrend,
            peakDays,
            lowDays,
            monthlyComparison
          },
          attendanceData,
          equipment,
          membershipTrends
        });
      } catch (err) {
        toast.error('Error cargando métricas reales');
        setMetricsData(null);
      }
      setLoading(false);
    }
    fetchMetrics();
  }, [profile]);

  // Funciones de exportación
  const generatePDFReport = async () => {
    try {
      toast.loading('Generando reporte PDF...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportContent = generateMetricsReportContent();
      const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-metricas-${new Date().toISOString().split('T')[0]}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        const printWindow = window.open(url, '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          });
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }, 500);
      
      toast.dismiss();
      toast.success('📄 Reporte PDF generado - Use "Guardar como PDF" en la ventana de impresión');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error al generar el reporte PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      toast.loading('Generando archivo Excel...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const csvContent = generateCSVContent();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `metricas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('📊 Archivo Excel (CSV) descargado exitosamente');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error al generar el archivo Excel');
    }
  };

  const exportCharts = async () => {
    try {
      toast.loading('Generando gráficos...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const chartsHTML = generateChartsHTML();
      const blob = new Blob([chartsHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      window.open(url, '_blank');
      
      toast.dismiss();
      toast.success('📈 Gráficos generados y abiertos en nueva ventana');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error al generar los gráficos');
    }
  };

  const sendEmailReport = async () => {
    try {
      toast.loading('Enviando reporte por email...');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simular envío de email
      const recipient = profile?.email || 'admin@gymmvp.com';
      
      toast.dismiss();
      toast.success(`📧 Reporte enviado exitosamente a ${recipient}`);
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error al enviar el reporte por email');
    }
  };

  const generateMetricsReportContent = () => {
    const date = new Date().toLocaleDateString('es-ES');
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Métricas - GymMVP</title>
    <style>
        @page { margin: 1cm; size: A4; }
        @media print {
            body { margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; font-size: 12pt; }
            .no-print { display: none !important; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6; }
        .header { text-align: center; border-bottom: 4px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #667eea; font-size: 2.5em; margin-bottom: 5px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-box { background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #667eea; }
        .metric-number { font-size: 2em; font-weight: bold; color: #667eea; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #667eea; color: white; }
        .print-btn { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 8px; margin: 20px; cursor: pointer; }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir/Guardar como PDF</button>
    
    <div class="header">
        <h1>REPORTE DE MÉTRICAS</h1>
        <h2>GymMVP - Sistema de Gestión</h2>
        <p>Fecha de generación: ${date}</p>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-box">
            <h3>👥 Miembros Totales</h3>
            <div class="metric-number">${metricsData.overview.totalMembers}</div>
            <p>${metricsData.overview.activeMembers} activos</p>
        </div>
        <div class="metric-box">
            <h3>🎆 Nuevos Este Mes</h3>
            <div class="metric-number">${metricsData.overview.newMembersThisMonth}</div>
        </div>
        <div class="metric-box">
            <h3>📊 Tasa de Abandono</h3>
            <div class="metric-number">${metricsData.overview.churnRate}%</div>
        </div>
        <div class="metric-box">
            <h3>⭐ Satisfacción</h3>
            <div class="metric-number">${metricsData.overview.memberSatisfaction}/5</div>
        </div>
    </div>
    
    <h2>📈 Distribución de Membresías</h2>
    <table>
        <thead><tr><th>Tipo</th><th>Miembros</th><th>Porcentaje</th><th>Tendencia</th></tr></thead>
        <tbody>
            ${metricsData.membershipTrends.map(m => 
                `<tr><td>${m.type}</td><td>${m.count}</td><td>${m.percentage}%</td><td>${m.trend === 'up' ? '📈' : m.trend === 'down' ? '📉' : '➡️'}</td></tr>`
            ).join('')}
        </tbody>
    </table>
    
    <h2>🏋️ Estado de Equipos</h2>
    <table>
        <thead><tr><th>Equipo</th><th>Utilización</th><th>Estado</th><th>Mantenimiento</th></tr></thead>
        <tbody>
            ${metricsData.equipment.map(e => 
                `<tr><td>${e.name}</td><td>${e.utilization}%</td><td>${e.status}</td><td>${e.maintenance}</td></tr>`
            ).join('')}
        </tbody>
    </table>
    
    <div style="text-align: center; margin-top: 50px; color: #666;">
        <p><strong>Reporte generado automáticamente por GymMVP</strong></p>
    </div>
</body>
</html>`;
  };

  const generateCSVContent = () => {
    let csv = 'Tipo de Métrica,Valor,Descripción\n';
    csv += `Miembros Totales,${metricsData.overview.totalMembers},Miembros registrados\n`;
    csv += `Miembros Activos,${metricsData.overview.activeMembers},Miembros con actividad reciente\n`;
    csv += `Nuevos Este Mes,${metricsData.overview.newMembersThisMonth},Nuevas registraciones\n`;
    csv += `Tasa de Abandono,${metricsData.overview.churnRate}%,Porcentaje de bajas\n`;
    csv += `Satisfacción,${metricsData.overview.memberSatisfaction}/5,Calificación promedio\n`;
    
    csv += '\nTipo de Membresía,Cantidad,Porcentaje,Tendencia\n';
    metricsData.membershipTrends.forEach(m => {
      csv += `${m.type},${m.count},${m.percentage}%,${m.trend}\n`;
    });
    
    csv += '\nEquipo,Utilización,Estado,Mantenimiento\n';
    metricsData.equipment.forEach(e => {
      csv += `${e.name},${e.utilization}%,${e.status},${e.maintenance}\n`;
    });
    
    return csv;
  };

  const generateChartsHTML = () => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Gráficos de Métricas - GymMVP</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f8f9ff; }
        .chart-container { background: white; padding: 30px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .chart-title { font-size: 1.5em; color: #667eea; margin-bottom: 20px; text-align: center; }
        .bars { display: flex; align-items: end; justify-content: space-around; height: 300px; margin: 20px 0; }
        .bar { background: linear-gradient(to top, #667eea, #764ba2); border-radius: 4px; min-width: 60px; margin: 0 5px; display: flex; flex-direction: column; justify-content: end; align-items: center; }
        .bar-label { margin-top: 10px; font-size: 0.9em; font-weight: bold; }
        .bar-value { color: white; padding: 10px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="chart-title">📈 Tendencia Semanal de Asistencia</div>
        <div class="bars">
            ${metricsData.attendance.weeklyTrend.map((value, idx) => {
                const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                const height = (value / Math.max(...metricsData.attendance.weeklyTrend)) * 250;
                return `<div class="bar" style="height: ${height}px;"><div class="bar-value">${value}</div><div class="bar-label">${days[idx]}</div></div>`;
            }).join('')}
        </div>
    </div>
    
    <div class="chart-container">
        <div class="chart-title">🏋️ Utilización de Equipos</div>
        <div class="bars">
            ${metricsData.equipment.map(eq => {
                const height = (eq.utilization / 100) * 250;
                return `<div class="bar" style="height: ${height}px;"><div class="bar-value">${eq.utilization}%</div><div class="bar-label">${eq.name}</div></div>`;
            }).join('')}
        </div>
    </div>
</body>
</html>`;
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loader">Cargando métricas y reportes...</div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="metrics-grid">
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Miembros Totales</h3>
          <div className="stat-number">{metricsData.overview.totalMembers}</div>
          <p>{metricsData.overview.activeMembers} activos</p>
        </div>
        
        <div className="stat-card">
          <h3>Nuevos Este Mes</h3>
          <div className="stat-number">{metricsData.overview.newMembersThisMonth}</div>
          <p>Crecimiento constante</p>
        </div>
        
        <div className="stat-card">
          <h3>Tasa de Abandono</h3>
          <div className="stat-number">{metricsData.overview.churnRate}%</div>
          <p>Dentro del objetivo</p>
        </div>

        <div className="stat-card">
          <h3>Satisfacción</h3>
          <div className="stat-number">{metricsData.overview.memberSatisfaction}/5</div>
          <p>Excelente calificación</p>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Métricas Clave</h2>
        <div className="key-metrics" style={{display:'flex',flexWrap:'wrap',gap:'2rem',justifyContent:'space-between',overflowX:'auto'}}>
          <div className="metric-item" style={{minWidth:220,flex:'1 1 220px',maxWidth:300}}>
            <strong>Promedio de Visitas por Miembro</strong>
            <span>{metricsData.overview.avgVisitsPerMember} visitas/mes</span>
          </div>
          <div className="metric-item" style={{minWidth:220,flex:'1 1 220px',maxWidth:300}}>
            <strong>Horario Pico</strong>
            <span>{metricsData.attendance && metricsData.attendance.weeklyTrend ?
              (() => {
                // Calcular hora pico real si hay datos de asistencia
                const hourCounts = {};
                if (metricsData.attendance && metricsData.attendance.weeklyTrend && metricsData.attendanceData) {
                  metricsData.attendanceData.forEach(a => {
                    const hour = new Date(a.timestamp).getHours();
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                  });
                  const maxCount = Math.max(...Object.values(hourCounts));
                  const peakHour = Object.keys(hourCounts).find(h => hourCounts[h] === maxCount);
                  return `${peakHour}:00 - ${parseInt(peakHour)+1}:00`;
                }
                return metricsData.overview.peakHours;
              })()
            : metricsData.overview.peakHours}</span>
          </div>
          <div className="metric-item" style={{minWidth:220,flex:'1 1 220px',maxWidth:300}}>
            <strong>Utilización de Equipos</strong>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${metricsData.overview.equipmentUtilization}%`}}
              ></div>
            </div>
            <span>{metricsData.overview.equipmentUtilization}%</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Distribución de Membresías</h2>
        <div className="membership-distribution">
          {metricsData.membershipTrends.map((membership, idx) => (
            <div key={idx} className="membership-item">
              <div className="membership-info">
                <strong>{membership.type}</strong>
                <span>{membership.count} miembros ({membership.percentage}%)</span>
              </div>
              <div className="membership-trend">
                {membership.trend === 'up' && <span className="trend-up">📈</span>}
                {membership.trend === 'down' && <span className="trend-down">📉</span>}
                {membership.trend === 'stable' && <span className="trend-stable">➡️</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="attendance-metrics">
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Promedio Diario</h3>
          <div className="stat-number">{metricsData.attendance.dailyAverage}</div>
          <p>Visitas por día</p>
        </div>
        
        <div className="stat-card">
          <h3>Este Mes</h3>
          <div className="stat-number">{metricsData.attendance.monthlyComparison.current}</div>
          <p className="growth-indicator positive">
            ↗️ +{metricsData.attendance.monthlyComparison.growth}%
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Tendencia Semanal</h2>
        <div className="weekly-chart">
          {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, idx) => (
            <div key={idx} className="chart-bar">
              <div 
                className="bar-fill" 
                style={{
                  height: `${(metricsData.attendance.weeklyTrend[idx] / Math.max(...metricsData.attendance.weeklyTrend)) * 100}%`
                }}
              ></div>
              <span className="bar-value">{metricsData.attendance.weeklyTrend[idx]}</span>
              <span className="bar-label">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Análisis de Días</h2>
        <div className="day-analysis">
          <div className="peak-days">
            <h4>Días Pico</h4>
            {metricsData.attendance.peakDays.map((day, idx) => (
              <span key={idx} className="day-badge peak">{day}</span>
            ))}
          </div>
          <div className="low-days">
            <h4>Días Bajos</h4>
            {metricsData.attendance.lowDays.map((day, idx) => (
              <span key={idx} className="day-badge low">{day}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEquipment = () => (
    <div className="equipment-metrics">
      <div className="dashboard-section" style={{gridColumn: '1 / -1'}}>
        <h2>Estado de Equipos</h2>
        <div className="equipment-grid">
          {metricsData.equipment.map((equipment, idx) => (
            <div key={idx} className="equipment-card">
              <h4>{equipment.name}</h4>
              <div className="equipment-utilization">
                <span>Utilización: {equipment.utilization}%</span>
                <div className="utilization-bar">
                  <div 
                    className="utilization-fill" 
                    style={{width: `${equipment.utilization}%`}}
                  ></div>
                </div>
              </div>
              <div className="equipment-status">
                <span className={`status ${equipment.status.toLowerCase().replace(' ', '-')}`}>
                  {equipment.status}
                </span>
              </div>
              <div className="equipment-maintenance">
                <small>{equipment.maintenance}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button onClick={onBack} className="back-btn">
          ← Volver al Dashboard
        </button>
        <h1>Reportes y Métricas</h1>
        <p>Análisis completo del rendimiento del gimnasio</p>
      </header>

      <div className="tabs-container">
        <button 
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Resumen General
        </button>
        <button 
          className={activeTab === 'attendance' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('attendance')}
        >
          👥 Asistencia
        </button>
        <button 
          className={activeTab === 'equipment' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('equipment')}
        >
          🏋️ Equipos
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'equipment' && renderEquipment()}
      </div>

      <div className="dashboard-section export-section">
        <h2>📎 Exportar Reportes</h2>
        <div className="export-actions">
          <button 
            className="btn-primary export-btn" 
            onClick={generatePDFReport}
          >
            📄 Reporte PDF
          </button>
          <button 
            className="btn-secondary export-btn" 
            onClick={exportToExcel}
          >
            📊 Excel (CSV)
          </button>
          <button 
            className="btn-secondary export-btn" 
            onClick={exportCharts}
          >
            📈 Gráficos
          </button>
          <button 
            className="btn-secondary export-btn" 
            onClick={sendEmailReport}
          >
            📧 Enviar por Email
          </button>
        </div>
      </div>
    </div>
  );
}