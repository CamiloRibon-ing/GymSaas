import { useState, useEffect } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';

const COLORS = ['#38d39f', '#667eea', '#f9d423', '#ff5858', '#f857a6', '#43e97b'];

// Tooltip personalizado para pastel
const renderCustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{background:'#fff',padding:'0.7em 1.1em',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',fontWeight:600}}>
        {payload[0].name}: <span style={{color:payload[0].color}}>${payload[0].value.toLocaleString()}</span>
      </div>
    );
  }
  return null;
};

// Tooltip personalizado para barras
const renderCustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{background:'#fff',padding:'0.7em 1.1em',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',fontWeight:600}}>
        <div>{label}</div>
        {payload.map((entry, idx) => (
          <div key={idx} style={{color:entry.color}}>
            {entry.name}: {entry.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import '../../styles/dashboard.css';

export default function ViewRevenue({ onBack }) {
  const { profile } = useProfile();
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
    const [showRegisterPayment, setShowRegisterPayment] = useState(false);
    const [membersList, setMembersList] = useState([]);
    const [plansList, setPlansList] = useState([]);
    const [registerForm, setRegisterForm] = useState({ member_id: '', payment_type: 'mensualidad', amount: '', plan_id: '', notes: '' });
    const [registerLoading, setRegisterLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    // Cargar planes reales del gimnasio
    async function fetchPlans() {
      if (!profile?.gym_id) return;
      const { data: plans, error } = await supabase
        .from('plans')
        .select('id, name, price, duration_days')
        .eq('gym_id', profile.gym_id)
        .eq('active', true);
      if (plans) setPlansList(plans);
    }
    fetchPlans();

    // Cargar miembros y sus planes actuales
    async function fetchMembersWithPlans() {
      if (!profile?.gym_id) return;
      // Traer miembros activos del gimnasio
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('gym_id', profile.gym_id)
        .eq('role', 'member');

      // Traer membresías activas
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, user_id, plan_id, start_date, end_date, status, plans(name, price, duration_days)')
        .eq('gym_id', profile.gym_id)
        .eq('status', 'active');

      // Relacionar miembros con membresía y calcular días restantes
      const today = new Date();
      const memberRows = (members || []).map(m => {
        const membership = (memberships || []).find(mem => mem.user_id === m.id);
        let daysLeft = null, planName = '', planStart = '', planEnd = '', planId = '', planAmount = '';
        if (membership) {
          planName = membership.plans?.name || '';
          planStart = membership.start_date;
          planEnd = membership.end_date;
          planId = membership.plan_id;
          planAmount = membership.plans?.price || '';
          if (planEnd) {
            daysLeft = Math.max(0, Math.ceil((new Date(planEnd) - today) / (1000*60*60*24)));
          }
        }
        return {
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          email: m.email,
          plan: planName,
          planStart,
          planEnd,
          daysLeft,
          planId,
          planAmount,
        };
      });
      setMembersList(memberRows);
    }
    fetchMembersWithPlans();
        // Cargar miembros para el formulario de registro de pagos
        async function fetchMembers() {
          if (!profile?.gym_id) return;
          const { data: members, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('gym_id', profile.gym_id)
            .eq('role', 'member');
          if (members) setMembersList(members);
        }
        fetchMembers();
    async function fetchRevenue() {
      if (!profile?.gym_id) return;
      setLoading(true);
      try {
        // Consultar pagos reales
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*, profiles:member_id(first_name, last_name, email), plans:plan_id(name, price, duration_days)')
          .eq('gym_id', profile.gym_id);

        let transactions = [];
        if (payments) {
          transactions = payments.map((p) => {
            // Calcular días restantes para mensualidad
            let daysLeft = null;
            if (p.payment_type === 'mensualidad' && p.valid_until) {
              const today = new Date();
              const end = new Date(p.valid_until);
              daysLeft = Math.max(0, Math.ceil((end - today) / (1000*60*60*24)));
            }
            return {
              id: p.id,
              member: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : p.member_id,
              email: p.profiles?.email || '',
              plan: p.plans?.name || (p.payment_type === 'rutina_normal' ? 'Rutina Normal' : ''),
              amount: p.amount,
              type: p.payment_type,
              date: p.paid_at || p.created_at,
              status: p.status || 'Completado',
              valid_until: p.valid_until,
              daysLeft,
            };
          });
        }

        // Calcular ingresos por periodo
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth-1;
        const lastMonthYear = lastMonth === 11 ? currentYear-1 : currentYear;

        const filterByPeriod = (tx, period) => {
          const d = new Date(tx.date);
          if (period === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          if (period === 'year') return d.getFullYear() === currentYear;
          return true;
        };

        const currentMonthTx = transactions.filter(tx => filterByPeriod(tx, 'month'));
        const lastMonthTx = transactions.filter(tx => {
          const d = new Date(tx.date);
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
        const yearToDateTx = transactions.filter(tx => filterByPeriod(tx, 'year'));

        // Sumar ingresos
        const sumAmount = arr => arr.reduce((a,b) => a + (b.amount || 0), 0);
        const currentMonthTotal = sumAmount(currentMonthTx);
        const lastMonthTotal = sumAmount(lastMonthTx);
        const yearToDateTotal = sumAmount(yearToDateTx);

        // Sumar membresías
        const sumMemberships = arr => arr.filter(tx => tx.type === 'Membresía').reduce((a,b) => a + (b.amount || 0), 0);
        const currentMonthMemberships = sumMemberships(currentMonthTx);
        const lastMonthMemberships = sumMemberships(lastMonthTx);
        const yearToDateMemberships = sumMemberships(yearToDateTx);

        // Sumar entrenamiento personal y suplementos (simulado)
        const sumType = (arr, type) => arr.filter(tx => tx.type === type).reduce((a,b) => a + (b.amount || 0), 0);
        const currentMonthPersonalTraining = sumType(currentMonthTx, 'Entrenamiento Personal');
        const lastMonthPersonalTraining = sumType(lastMonthTx, 'Entrenamiento Personal');
        const yearToDatePersonalTraining = sumType(yearToDateTx, 'Entrenamiento Personal');
        const currentMonthSupplements = sumType(currentMonthTx, 'Suplementos');
        const lastMonthSupplements = sumType(lastMonthTx, 'Suplementos');
        const yearToDateSupplements = sumType(yearToDateTx, 'Suplementos');

        // Calcular transacciones
        const currentMonthTransactions = currentMonthTx.length;
        const lastMonthTransactions = lastMonthTx.length;
        const yearToDateTransactions = yearToDateTx.length;

        // Calcular crecimiento mensual
        const monthlyGrowth = lastMonthTotal ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

        // Agrupar ingresos por plan vendido y otros tipos
        const planSources = {};
        transactions.forEach(tx => {
          // Si es mensualidad y tiene plan, agrupar por nombre de plan
          if (tx.type === 'mensualidad' && tx.plan) {
            if (!planSources[tx.plan]) planSources[tx.plan] = 0;
            planSources[tx.plan] += tx.amount || 0;
          } else if (tx.type === 'Entrenamiento Personal' || tx.type === 'personal') {
            if (!planSources['Entrenamiento Personal']) planSources['Entrenamiento Personal'] = 0;
            planSources['Entrenamiento Personal'] += tx.amount || 0;
          } else if (tx.type === 'Suplementos' || tx.type === 'suplemento') {
            if (!planSources['Suplementos']) planSources['Suplementos'] = 0;
            planSources['Suplementos'] += tx.amount || 0;
          } else if (tx.type === 'rutina_normal' || tx.type === 'Rutina Normal') {
            if (!planSources['Rutina Normal']) planSources['Rutina Normal'] = 0;
            planSources['Rutina Normal'] += tx.amount || 0;
          }
        });
        // Convertir a arreglo y calcular porcentaje
        const topSources = Object.entries(planSources).map(([source, amount]) => ({
          source,
          amount,
          percentage: currentMonthTotal ? ((amount/currentMonthTotal)*100).toFixed(1) : 0
        }));

        // Datos mensuales para gráfico (simulado)
        const monthlyData = [
          { month: 'Ene', revenue: 0, members: 0 },
          { month: 'Feb', revenue: 0, members: 0 },
          { month: 'Mar', revenue: 0, members: 0 },
          { month: 'Apr', revenue: 0, members: 0 },
          { month: 'May', revenue: 0, members: 0 },
          { month: 'Jun', revenue: 0, members: 0 }
        ];
        // Si hay datos, llenar
        transactions.forEach(tx => {
          const d = new Date(tx.date);
          const idx = d.getMonth();
          if (monthlyData[idx]) {
            monthlyData[idx].revenue += tx.amount || 0;
            if (tx.type === 'Membresía') monthlyData[idx].members++;
          }
        });

        // Métodos de pago (simulado)
        const paymentMethods = [
          { method: 'Tarjeta de Crédito', amount: currentMonthTotal * 0.6, percentage: 60 },
          { method: 'Transferencia', amount: currentMonthTotal * 0.3, percentage: 30 },
          { method: 'Efectivo', amount: currentMonthTotal * 0.1, percentage: 10 }
        ];

        // Pagos pendientes (simulado)
        // Nueva lógica: miembros con membresía vencida y sin pago registrado para el nuevo periodo
        const pendingMembers = membersList.filter(m => {
          // Considerar pendiente si no tiene plan o días restantes <= 0
          return !m.plan || m.daysLeft === null || m.daysLeft <= 0;
        });
        setPendingPayments(pendingMembers.map((m, idx) => ({
          id: m.id,
          member: m.name,
          amount: m.planAmount || '',
          type: m.plan || 'Membresía',
          dueDate: m.planEnd || '',
          daysOverdue: m.planEnd ? Math.max(0, Math.floor((now - new Date(m.planEnd)) / (1000*60*60*24))) : '',
          phone: m.phone || '',
          email: m.email || ''
        })));

        setRevenueData({
          currentMonth: {
            total: currentMonthTotal,
            memberships: currentMonthMemberships,
            personalTraining: currentMonthPersonalTraining,
            supplements: currentMonthSupplements,
            transactions: currentMonthTransactions
          },
          lastMonth: {
            total: lastMonthTotal,
            memberships: lastMonthMemberships,
            personalTraining: lastMonthPersonalTraining,
            supplements: lastMonthSupplements,
            transactions: lastMonthTransactions
          },
          yearToDate: {
            total: yearToDateTotal,
            memberships: yearToDateMemberships,
            personalTraining: yearToDatePersonalTraining,
            supplements: yearToDateSupplements,
            transactions: yearToDateTransactions
          },
          recentTransactions: transactions.slice(0, 5),
          monthlyGrowth,
          topSources,
          monthlyData,
          paymentMethods
        });
      } catch (err) {
        toast.error('Error cargando ingresos reales');
        setRevenueData(null);
      }
      setLoading(false);
    }
    fetchRevenue();
  }, [profile, selectedPeriod]);

  const getCurrentData = () => {
    if (!revenueData) return null;
    
    switch(selectedPeriod) {
      case 'month': return revenueData.currentMonth;
      case 'year': return revenueData.yearToDate;
      default: return revenueData.currentMonth;
    }
  };

  const generatePDFReport = async () => {
    try {
      toast.loading('Generando reporte PDF...');
      
      // Simular generación de PDF
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Crear contenido del PDF
      const reportContent = generateReportContent();
      
      // Crear blob para PDF optimizado
      const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-ingresos-${new Date().toISOString().split('T')[0]}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Simular clic y limpiar
      link.click();
      document.body.removeChild(link);
      
      // Abrir en nueva ventana para imprimir como PDF
      setTimeout(() => {
        const printWindow = window.open(url, '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          });
        }
        
        // Limpiar URL después de un tiempo
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);
      }, 500);
      
      toast.dismiss();
      toast.success('📄 Archivo PDF generado - Use "Guardar como PDF" en la ventana de impresión');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Error al generar el reporte');
      console.error('Error generando PDF:', error);
    }
  };

  const generateReportContent = () => {
    const currentData = getCurrentData();
    const date = new Date().toLocaleDateString('es-ES');
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Ingresos - GymMVP</title>
    <style>
        @page { 
            margin: 1cm; 
            size: A4;
        }
        @media print {
            body { 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                font-size: 12pt;
            }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            .header { page-break-inside: avoid; }
            .section { page-break-inside: avoid; margin-bottom: 20px; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .chart-container { height: 250px; }
        }
        body { 
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
            margin: 20px; 
            color: #333; 
            line-height: 1.6; 
            background: white;
        }
        .header { 
            text-align: center; 
            border-bottom: 4px solid #667eea; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
            background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
            padding: 20px;
            border-radius: 10px;
        }
        .header h1 { 
            color: #667eea; 
            margin-bottom: 5px; 
            font-size: 2.5em; 
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .header h2 { 
            color: #4a5568; 
            font-size: 1.5em; 
            margin: 10px 0;
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px; 
        }
        .stat-box { 
            background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%); 
            padding: 25px; 
            border-radius: 12px; 
            border-left: 6px solid #667eea; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-box h3 { 
            margin: 0 0 10px 0; 
            color: #4a5568; 
            font-size: 1.1em; 
            font-weight: 600;
        }
        .stat-number { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 5px; 
            display: block;
        }
        .stat-box p { 
            margin: 0; 
            color: #666; 
            font-size: 0.9em; 
            font-weight: 500;
        }
        .section { 
            margin-bottom: 40px; 
            page-break-inside: avoid; 
            background: white;
            border-radius: 10px;
            padding: 20px;
            border: 1px solid #e2e8f0;
        }
        .section h2 { 
            color: #2d3748; 
            border-bottom: 3px solid #e2e8f0; 
            padding-bottom: 10px; 
            font-size: 1.8em; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        th, td { 
            padding: 15px 12px; 
            text-align: left; 
            border-bottom: 1px solid #e2e8f0; 
        }
        th { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            font-size: 0.9em;
        }
        tr:nth-child(even) { 
            background: #f8f9fa; 
        }
        .chart-container { 
            height: 300px; 
            background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%); 
            border-radius: 12px; 
            margin: 20px 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            border: 2px solid #e2e8f0;
            padding: 20px;
        }
        .chart-content { 
            text-align: center; 
            color: #4a5568; 
        }
        .chart-title { 
            font-size: 1.5em; 
            font-weight: bold; 
            margin-bottom: 15px; 
            color: #667eea; 
        }
        .trend-data { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); 
            gap: 15px; 
            margin-top: 15px; 
        }
        .trend-item { 
            padding: 15px; 
            background: white; 
            border-radius: 8px; 
            text-align: center;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .trend-item strong {
            color: #667eea;
            font-size: 1.1em;
        }
        .footer { 
            text-align: center; 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 2px solid #e2e8f0; 
            color: #666;
            background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
            padding: 20px;
            border-radius: 10px;
        }
        .print-btn { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            margin: 20px;
            font-size: 1em;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        }
        .print-btn:hover { 
            background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-completed { background: #48bb78; color: white; }
        .status-pending { background: #ed8936; color: white; }
        .percentage-badge { 
            background: #9f7aea; 
            color: white; 
            padding: 4px 10px; 
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .amount-highlight { 
            color: #667eea; 
            font-weight: bold; 
            font-size: 1.1em;
        }
        .analysis-box {
            background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
            border: 2px solid #81e6d9;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .analysis-box h3 {
            color: #234e52;
            margin-bottom: 15px;
            font-size: 1.2em;
        }
        .analysis-list {
            list-style: none;
            padding: 0;
        }
        .analysis-list li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(129, 230, 217, 0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            color: #234e52;
        }
        .analysis-list li::before {
            content: "✓";
            background: #48bb78;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            font-weight: bold;
            flex-shrink: 0;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir/Guardar como PDF</button>
    
    <div class="header">
        <h1>REPORTE DE INGRESOS</h1>
        <h2>GymMVP - Sistema de Gestión</h2>
        <p style="font-size: 1.1em; color: #4a5568;">Fecha de generación: ${date}</p>
        <p style="color: #667eea; font-weight: bold;">Período: ${selectedPeriod === 'month' ? 'Este Mes' : 'Este Año'}</p>
    </div>
    
    <div class="summary">
        <div class="stat-box">
            <h3>💰 Ingresos Totales</h3>
            <div class="stat-number">$${currentData.total.toLocaleString()}</div>
            <p>Crecimiento: +${revenueData.monthlyGrowth}%</p>
        </div>
        <div class="stat-box">
            <h3>📊 Transacciones</h3>
            <div class="stat-number">${currentData.transactions}</div>
            <p>Pagos procesados</p>
        </div>
        <div class="stat-box">
            <h3>👥 Membresías</h3>
            <div class="stat-number">$${currentData.memberships.toLocaleString()}</div>
            <p>${((currentData.memberships / currentData.total) * 100).toFixed(1)}% del total</p>
        </div>
        <div class="stat-box">
            <h3>🏋️ Entrenamiento</h3>
            <div class="stat-number">$${currentData.personalTraining.toLocaleString()}</div>
            <p>${((currentData.personalTraining / currentData.total) * 100).toFixed(1)}% del total</p>
        </div>
    </div>
    
    <div class="section">
        <h2>💼 Fuentes de Ingreso</h2>
        <table>
            <thead>
                <tr><th>Fuente</th><th>Monto</th><th>Porcentaje</th><th>Tendencia</th></tr>
            </thead>
            <tbody>
                ${revenueData.topSources.map(source => 
                    `<tr>
                        <td><strong>${source.source}</strong></td>
                        <td class="amount-highlight">$${source.amount.toLocaleString()}</td>
                        <td><span class="percentage-badge">${source.percentage}%</span></td>
                        <td>📈 Positiva</td>
                    </tr>`
                ).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <h2>💳 Transacciones Recientes</h2>
        <table>
            <thead>
                <tr><th>Cliente</th><th>Monto</th><th>Tipo</th><th>Fecha</th><th>Estado</th></tr>
            </thead>
            <tbody>
                ${revenueData.recentTransactions.map(tx => {
                    const statusClass = tx.status === 'Completado' ? 'status-completed' : 'status-pending';
                    return `<tr>
                        <td><strong>${tx.member}</strong></td>
                        <td class="amount-highlight">$${tx.amount}</td>
                        <td>${tx.type}</td>
                        <td>${new Date(tx.date).toLocaleDateString('es-ES')}</td>
                        <td><span class="status-badge ${statusClass}">${tx.status}</span></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <h2>💰 Métodos de Pago</h2>
        <table>
            <thead>
                <tr><th>Método</th><th>Monto</th><th>Porcentaje</th><th>Popularidad</th></tr>
            </thead>
            <tbody>
                ${revenueData.paymentMethods.map((method, idx) => {
                    const popularity = idx === 0 ? '⭐⭐⭐' : idx === 1 ? '⭐⭐' : '⭐';
                    return `<tr>
                        <td><strong>${method.method}</strong></td>
                        <td class="amount-highlight">$${method.amount.toLocaleString()}</td>
                        <td><span class="percentage-badge">${method.percentage}%</span></td>
                        <td>${popularity}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="chart-container">
        <div class="chart-content">
            <div class="chart-title">📈 Tendencia de Ingresos Mensuales</div>
            <p style="margin-bottom: 20px;">Evolución de ingresos en los últimos 6 meses</p>
            <div class="trend-data">
                ${revenueData.monthlyData.map(data => 
                    `<div class="trend-item"><strong>${data.month}</strong><br>$${data.revenue.toLocaleString()}<br><small>${data.members} miembros</small></div>`
                ).join('')}
            </div>
        </div>
    </div>
    
    <div class="analysis-box">
        <h3>📊 Análisis y Proyecciones</h3>
        <ul class="analysis-list">
            <li><strong>Ingreso promedio por transacción:</strong> $${(currentData.total / currentData.transactions).toLocaleString()}</li>
            <li><strong>Proyección mensual:</strong> $${(currentData.total * 1.078).toLocaleString()}</li>
            <li><strong>Crecimiento interanual:</strong> +23.4%</li>
            <li><strong>Meta del mes:</strong> ${currentData.total > 45000 ? '✅ Alcanzada' : '⏳ En progreso'}</li>
            <li><strong>Eficiencia de cobros:</strong> 94.7%</li>
            <li><strong>Retención de clientes:</strong> 87.3%</li>
        </ul>
    </div>
    
    <div class="footer">
        <p><strong>📋 Reporte generado automáticamente por GymMVP</strong></p>
        <p>🏋️‍♂️ Sistema de Gestión de Gimnasios | 📧 Para más información, contacte al administrador</p>
        <p style="font-size: 0.9em; color: #999;">Documento confidencial - Solo para uso interno</p>
    </div>
</body>
</html>`;
  };

  // Función para registrar pago
  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
        try {
          if (!registerForm.member_id || !registerForm.amount || !registerForm.plan_id) {
            toast.error('Complete todos los campos obligatorios');
            setRegisterLoading(false);
            return;
          }
          // Solo registrar el pago si no es membresía, o si es membresía y el usuario no tiene una activa
          const plan = plansList.find(p => p.id === registerForm.plan_id);
          let canRegister = true;
          if (plan && plan.duration_days && plan.duration_days >= 28) {
            // Verificar membresía activa
            const now = new Date();
            const { data: activeMemberships, error: activeError } = await supabase
              .from('memberships')
              .select('id, end_date')
              .eq('user_id', registerForm.member_id)
              .eq('gym_id', profile.gym_id)
              .eq('status', 'active');
            const hasActive = (activeMemberships || []).some(m => new Date(m.end_date) >= now);
            if (hasActive) {
              toast.error('El usuario ya tiene una membresía activa. No se puede registrar la venta de una nueva membresía hasta que termine la actual.');
              canRegister = false;
            }
          }
          if (!canRegister) {
            setRegisterLoading(false);
            return;
          }
          // Registrar el pago
          const { data, error } = await supabase
            .from('payments')
            .insert([{
              member_id: registerForm.member_id,
              amount: Number(registerForm.amount),
              payment_type: 'mensualidad',
              plan_id: registerForm.plan_id,
              notes: registerForm.notes || '',
              gym_id: profile.gym_id,
              status: 'Completado',
              paid_at: new Date().toISOString(),
            }]);
          if (error) {
            toast.error('Error al registrar el pago');
          } else {
            // Si es membresía, crearla
            if (plan && plan.duration_days && plan.duration_days >= 28) {
              let startDate = new Date();
              let endDate = new Date();
              endDate.setDate(startDate.getDate() + Number(plan.duration_days));
              await supabase.from('memberships').insert([
                {
                  user_id: registerForm.member_id,
                  plan_id: registerForm.plan_id,
                  gym_id: profile.gym_id,
                  start_date: startDate.toISOString(),
                  end_date: endDate.toISOString(),
                  status: 'active',
                }
              ]);
            }

            // Fetch membresía actualizada del miembro
            const { data: memberships, error: membershipsError } = await supabase
              .from('memberships')
              .select('id, user_id, plan_id, start_date, end_date, status, plans(name, price, duration_days)')
              .eq('gym_id', profile.gym_id)
              .eq('user_id', registerForm.member_id)
              .eq('status', 'active')
              .order('end_date', { ascending: false })
              .limit(1);

            let memberUpdate = {
              plan: '',
              planStart: '',
              planEnd: '',
              daysLeft: null,
              planId: '',
              planAmount: '',
            };
            if (memberships && memberships.length > 0) {
              const membership = memberships[0];
              const today = new Date();
              let daysLeft = null;
              if (membership.end_date) {
                daysLeft = Math.max(0, Math.ceil((new Date(membership.end_date) - today) / (1000*60*60*24)));
              }
              memberUpdate = {
                plan: membership.plans?.name || '',
                planStart: membership.start_date,
                planEnd: membership.end_date,
                daysLeft,
                planId: membership.plan_id,
                planAmount: membership.plans?.price || '',
              };
            }

            setMembersList(prev =>
              prev.map(m =>
                m.id === registerForm.member_id
                  ? {
                      ...m,
                      ...memberUpdate
                    }
                  : m
              )
            );
            toast.success('Pago registrado correctamente');
            setShowRegisterPayment(false);
            setRegisterForm({ member_id: '', payment_type: 'mensualidad', amount: '', plan_id: '', notes: '' });
          }
    } catch (err) {
      toast.error('Error inesperado al registrar el pago');
    }
    setRegisterLoading(false);
  };

  const handleMarkAsPaid = (paymentId) => {
    setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
    toast.success('Pago marcado como completado');
  };

  const handleSendReminder = (payment) => {
    toast.success(`Recordatorio enviado a ${payment.member}`);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loader">Cargando datos de ingresos...</div>
        </div>
      </div>
    );
  }

  const currentData = getCurrentData();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button onClick={onBack} className="back-btn">
          ← Volver al Dashboard
        </button>
        <h1>Ver Ingresos</h1>
        <p>Análisis financiero y reportes de ingresos</p>
      </header>

      <div className="period-selector">
        <button 
          className={selectedPeriod === 'month' ? 'active' : ''}
          onClick={() => setSelectedPeriod('month')}
        >
          Este Mes
        </button>
        <button 
          className={selectedPeriod === 'year' ? 'active' : ''}
          onClick={() => setSelectedPeriod('year')}
        >
          Este Año
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card revenue">
          <h3>Ingresos Totales</h3>
          <div className="stat-number">${currentData.total.toLocaleString()}</div>
          <p className="growth-indicator positive">
            ↗️ +{revenueData.monthlyGrowth}% vs mes anterior
          </p>
        </div>
        <div className="stat-card">
          <h3>Membresías</h3>
          <div className="stat-number">${currentData.memberships.toLocaleString()}</div>
          <p>{((currentData.memberships / currentData.total) * 100).toFixed(1)}% del total</p>
        </div>
        <div className="stat-card">
          <h3>Entrenamiento Personal</h3>
          <div className="stat-number">${currentData.personalTraining.toLocaleString()}</div>
          <p>{((currentData.personalTraining / currentData.total) * 100).toFixed(1)}% del total</p>
        </div>
        <div className="stat-card">
          <h3>Transacciones</h3>
          <div className="stat-number">{currentData.transactions}</div>
          <p>Pagos procesados</p>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Miembros y Planes Actuales */}
        <div className="dashboard-section members-plans-section">
          <h2>Miembros y Planes Actuales</h2>
          <div style={{overflowX:'auto',marginBottom:'2em'}}>
            <table style={{minWidth:'700px',width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#f8f9fa'}}>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Miembro</th>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Email</th>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Plan Actual</th>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Fecha Registro</th>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Vence</th>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Días Restantes</th>
                  <th style={{padding:'10px 8px',fontWeight:'bold'}}>Registrar Rutina</th>
                </tr>
              </thead>
              <tbody>
                {membersList.map(m => (
                  <tr key={m.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                    <td style={{padding:'8px'}}>{m.name}</td>
                    <td style={{padding:'8px'}}>{m.email}</td>
                    <td style={{padding:'8px'}}>{m.plan ? m.plan : <span style={{color:'red'}}>Sin plan</span>}</td>
                    <td style={{padding:'8px'}}>{m.planStart ? new Date(m.planStart).toLocaleDateString() : '-'}</td>
                    <td style={{padding:'8px'}}>{m.planEnd ? new Date(m.planEnd).toLocaleDateString() : '-'}</td>
                    <td style={{padding:'8px',textAlign:'center'}}>
                      {m.daysLeft !== null ? (
                        <span className={
                          m.daysLeft > 20 ? 'days-badge-green' :
                          m.daysLeft > 10 ? 'days-badge-yellow' :
                          'days-badge-red'
                        }>
                          {m.daysLeft}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{padding:'8px',textAlign:'center'}}>
                      <button className="btn-primary" style={{fontSize:'0.95em',padding:'4px 10px'}} onClick={() => {
                        setShowRegisterPayment(true);
                        setRegisterForm(f => ({
                          ...f,
                          member_id: m.id,
                          plan_id: '',
                          amount: '',
                          notes: ''
                        }));
                      }}>
                        Registrar Pago
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fuentes de Ingreso */}
        <div className="dashboard-section revenue-sources-section">
          <h2>Fuentes de Ingreso</h2>
          <div className="revenue-sources">
            {revenueData.topSources.map((source, idx) => (
              <div key={idx} className="source-item">
                <div className="source-info">
                  <strong>{source.source}</strong>
                  <span>${source.amount.toLocaleString()}</span>
                </div>
                <div className="source-progress">
                  <div 
                    className="source-fill" 
                    style={{width: `${source.percentage}%`}}
                  ></div>
                </div>
                <span className="source-percentage">{source.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transacciones Recientes */}
        <div className="dashboard-section transactions-section">
          <h2>Transacciones Recientes</h2>
          <div className="transactions-list">
            {revenueData.recentTransactions.map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <strong>{transaction.member}</strong>
                  <span className="transaction-type">{transaction.type}</span>
                </div>
                <div className="transaction-details">
                  <span className="transaction-amount">
                    ${transaction.amount}
                  </span>
                  <span className="transaction-date">
                    {new Date(transaction.date).toLocaleDateString()}
                  </span>
                  <span className={`transaction-status ${transaction.status.toLowerCase()}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparación Mensual */}
        <div className="dashboard-section comparison-section">
          <h2>Comparación Mensual</h2>
          <div className="comparison-chart">
            <div className="comparison-item">
              <div className="comparison-label">Este Mes</div>
              <div className="comparison-bar">
                <div 
                  className="comparison-fill current" 
                  style={{width: '100%'}}
                ></div>
              </div>
              <div className="comparison-value">
                ${revenueData.currentMonth.total.toLocaleString()}
              </div>
            </div>
            <div className="comparison-item">
              <div className="comparison-label">Mes Anterior</div>
              <div className="comparison-bar">
                <div 
                  className="comparison-fill previous" 
                  style={{
                    width: `${(revenueData.lastMonth.total / revenueData.currentMonth.total) * 100}%`
                  }}
                ></div>
              </div>
              <div className="comparison-value">
                ${revenueData.lastMonth.total.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="dashboard-section actions-section">
          <h2>Acciones Rápidas</h2>
          <div className="revenue-actions">
            <button onClick={() => setShowRegisterPayment(true)} className="btn-primary">
              💵 Registrar Pago
            </button>
            <button onClick={generatePDFReport} className="btn-primary">
              📊 Generar Reporte
            </button>
            <button onClick={() => setShowPendingPayments(true)} className="btn-warning">
              💳 Ver Pagos Pendientes ({pendingPayments.length})
            </button>
            <button onClick={() => setShowDetailedAnalysis(true)} className="btn-info">
              📈 Análisis Detallado
            </button>
            <button onClick={() => toast.success('Datos exportados exitosamente')} className="btn-success">
              🧾 Exportar Datos
            </button>
          </div>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {showRegisterPayment && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div className="modal" style={{maxWidth:'480px',padding:'2.5em 2em',borderRadius:'18px',boxShadow:'0 8px 32px rgba(0,0,0,0.12)'}}>
              <form onSubmit={handleRegisterPayment} style={{display:'flex',flexDirection:'column',gap:'1.2em'}}>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5em'}}>
                  <label htmlFor="member" style={{fontWeight:'500',fontSize:'1.1em'}}>Miembro</label>
                  <select id="member" required value={registerForm.member_id} onChange={e => {
                    const memberId = e.target.value;
                    setRegisterForm(f => ({ ...f, member_id: memberId }));
                  }} style={{padding:'10px',borderRadius:'8px',border:'1px solid #d1d5db',fontSize:'1em'}}>
                    <option value="">Seleccione un miembro...</option>
                    {membersList.map(m => (
                      <option key={m.id} value={m.id}>{m.name} {m.plan ? `- ${m.plan}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5em'}}>
                  <label htmlFor="plan" style={{fontWeight:'500',fontSize:'1.1em'}}>Plan</label>
                  <select id="plan" required value={registerForm.plan_id || ''} onChange={e => {
                    const planId = e.target.value;
                    const plan = plansList.find(p => p.id === planId);
                    setRegisterForm(f => ({ ...f, plan_id: planId, amount: plan ? plan.price : '' }));
                  }} style={{padding:'10px',borderRadius:'8px',border:'1px solid #d1d5db',fontSize:'1em'}}>
                    <option value="">Seleccione un plan...</option>
                    {plansList.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name} - ${Number(plan.price).toLocaleString()}</option>
                    ))}
                  </select>
                  {/* Mostrar descripción y características del plan seleccionado */}
                  {registerForm.plan_id && (
                    <div style={{marginTop:'1em',background:'#f8f9fa',padding:'1em',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                      <strong>Descripción:</strong>
                      <div style={{marginBottom:'0.5em'}}>{plansList.find(p => p.id === registerForm.plan_id)?.description}</div>
                      <strong>Características:</strong>
                      <ul style={{margin:'0.5em 0 0 1em'}}>
                        {plansList.find(p => p.id === registerForm.plan_id)?.name === 'Rutina Normal' && (
                          <>
                            <li>Acceso básico al gimnasio sin plan mensual</li>
                            <li>Uso de equipos</li>
                            <li>Horarios normales</li>
                          </>
                        )}
                        {plansList.find(p => p.id === registerForm.plan_id)?.name === 'Plan Mensual' && (
                          <>
                            <li>Acceso completo</li>
                            <li>Todos los equipos</li>
                            <li>Horarios completos</li>
                          </>
                        )}
                        {plansList.find(p => p.id === registerForm.plan_id)?.name === 'Plan Semipersonalizado' && (
                          <>
                            <li>Todo lo del plan básico</li>
                            <li>Rutinas recomendadas</li>
                            <li>Seguimiento quincenal</li>
                          </>
                        )}
                        {plansList.find(p => p.id === registerForm.plan_id)?.name === 'Plan Personalizado' && (
                          <>
                            <li>Todo lo anterior</li>
                            <li>Entrenador personal</li>
                            <li>Plan nutricional</li>
                            <li>Seguimiento diario</li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5em'}}>
                  <label htmlFor="amount" style={{fontWeight:'500',fontSize:'1.1em'}}>Monto</label>
                  <input 
                    id="amount" 
                    type="number" 
                    required 
                    value={registerForm.amount} 
                    onChange={e => setRegisterForm(f => ({ ...f, amount: e.target.value }))}
                    style={{padding:'10px',borderRadius:'8px',border:'1px solid #d1d5db',fontSize:'1em'}}
                  />
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5em'}}>
                  <label htmlFor="notes" style={{fontWeight:'500',fontSize:'1.1em'}}>Notas</label>
                  <textarea 
                    id="notes" 
                    value={registerForm.notes} 
                    onChange={e => setRegisterForm(f => ({ ...f, notes: e.target.value }))}
                    style={{padding:'10px',borderRadius:'8px',border:'1px solid #d1d5db',fontSize:'1em',height:'100px'}}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={registerLoading}>
                  {registerLoading ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </form>
              <div className="modal-close" onClick={() => setShowRegisterPayment(false)} title="Cerrar">
                &times;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagos Pendientes */}
      {showPendingPayments && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div className="modal" style={{maxWidth:'600px',padding:'2.5em 2em',borderRadius:'18px',boxShadow:'0 8px 32px rgba(0,0,0,0.12)'}}>
              <h3>Pagos Pendientes</h3>
              <div className="pending-payments-list" style={{maxHeight:'400px',overflowY:'auto'}}>
                {pendingPayments.map(payment => (
                  <div key={payment.id} className="payment-item" style={{borderBottom:'1px solid #e2e8f0',padding:'1.5em 0'}}>
                    <div className="payment-info" style={{marginBottom:'0.5em'}}>
                      <strong>{payment.member}</strong> - ${payment.amount}
                    </div>
                    <div className="payment-details">
                      <div className="payment-amount">${payment.amount}</div>
                      <div className="payment-type">{payment.type}</div>
                      <div className="payment-due">
                        Vence: {new Date(payment.dueDate).toLocaleDateString('es-ES')}
                      </div>
                      {payment.daysOverdue > 0 && (
                        <div className="overdue-notice">
                          {payment.daysOverdue} días vencido
                        </div>
                      )}
                    </div>
                    <div className="payment-actions">
                      <button 
                        onClick={() => handleSendReminder(payment)}
                        className="btn-info-small"
                      >
                        📱 Recordatorio
                      </button>
                      <button 
                        onClick={() => handleMarkAsPaid(payment.id)}
                        className="btn-success-small"
                      >
                        ✅ Marcar Pagado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button onClick={() => setShowPendingPayments(false)} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Análisis Detallado */}
      {showDetailedAnalysis && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <h3>Análisis Detallado de Ingresos</h3>
            <div className="detailed-analysis-content" style={{display:'flex',flexDirection:'column',gap:'2em'}}>
              <div className="analysis-section">
                <h4>Distribución de Ingresos</h4>
                <div style={{height:260}}>
                  <ResponsivePie
                    data={revenueData.topSources.map((s,idx)=>({id:s.source,value:s.amount}))}
                    colors={COLORS}
                    margin={{top:40,right:80,bottom:40,left:80}}
                    innerRadius={0.5}
                    padAngle={2}
                    cornerRadius={6}
                    activeOuterRadiusOffset={8}
                    borderWidth={2}
                    borderColor={{from:'color',modifiers:[['darker',0.2]]}}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor="#333"
                    arcLinkLabelsThickness={2}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor={{from:'color',modifiers:[['darker',2]]}}
                    tooltip={({ datum }) => (
                      <div style={{background:'#fff',padding:'0.7em 1.1em',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',fontWeight:600}}>
                        {datum.id}: <span style={{color:datum.color}}>{datum.value.toLocaleString('es-CO',{style:'currency',currency:'COP'})}</span>
                      </div>
                    )}
                  />
                </div>
              </div>
              <div className="analysis-section">
                <h4>Tendencia Mensual de Ventas</h4>
                <div style={{height:260}}>
                  <ResponsiveBar
                    data={revenueData.monthlyData.map(d=>({...d,revenue:parseInt(d.revenue),members:parseInt(d.members)}))}
                    keys={["revenue","members"]}
                    indexBy="month"
                    margin={{top:30,right:20,bottom:60,left:80}}
                    padding={0.25}
                    colors={[COLORS[1],COLORS[0]]}
                    borderRadius={4}
                    axisBottom={{
                      tickSize:5,
                      tickPadding:8,
                      tickRotation:0,
                      legend:'Mes',
                      legendPosition:'middle',
                      legendOffset:40
                    }}
                    axisLeft={{
                      tickSize:5,
                      tickPadding:8,
                      tickRotation:0,
                      legend:'Ventas (COP)',
                      legendPosition:'middle',
                      legendOffset:-60,
                      format:v=>`$ ${v.toLocaleString('es-CO')}`
                    }}
                    label={(d) => d.id === 'revenue' ? `$ ${d.value.toLocaleString('es-CO')}` : d.value}
                    labelSkipWidth={40}
                    labelSkipHeight={20}
                    labelTextColor={{from:'color',modifiers:[['darker',2]]}}
                    animate={true}
                    tooltip={({id,value,index,data,color}) => (
                      <div style={{background:'#fff',padding:'0.7em 1.1em',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',fontWeight:600}}>
                        <div style={{color}}>{id === 'revenue' ? 'Ventas' : 'Nuevas Membresías'}: <span>{id === 'revenue' ? `$ ${value.toLocaleString('es-CO')}` : value}</span></div>
                        <div>Mes: {data.month}</div>
                      </div>
                    )}
                    legends={[{
                      dataFrom:'keys',
                      anchor:'top-right',
                      direction:'column',
                      justify:false,
                      translateX:40,
                      translateY:0,
                      itemsSpacing:8,
                      itemWidth:120,
                      itemHeight:20,
                      itemDirection:'left-to-right',
                      symbolSize:18,
                      symbolShape:'circle',
                      effects:[{on:'hover',style:{itemOpacity:1}}],
                      data:[
                        {id:'revenue',label:'Ventas (COP)',color:COLORS[1]},
                        {id:'members',label:'Nuevas Membresías',color:COLORS[0]}
                      ]
                    }]}
                  />
                </div>
              </div>
              <div className="analysis-section">
                <h4>Métodos de Pago</h4>
                <div style={{height:220}}>
                  <ResponsivePie
                    data={revenueData.paymentMethods.map((m,idx)=>({id:m.method,value:m.amount}))}
                    colors={COLORS}
                    margin={{top:40,right:80,bottom:40,left:80}}
                    innerRadius={0.5}
                    padAngle={2}
                    cornerRadius={6}
                    activeOuterRadiusOffset={8}
                    borderWidth={2}
                    borderColor={{from:'color',modifiers:[['darker',0.2]]}}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor="#333"
                    arcLinkLabelsThickness={2}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor={{from:'color',modifiers:[['darker',2]]}}
                  />
                </div>
              </div>
              <div className="analysis-section">
                <h4>Morosidad: Miembros con Membresía Vencida</h4>
                <div style={{height:220}}>
                  <ResponsiveBar
                    data={pendingPayments.map(p=>({...p,daysOverdue:parseInt(p.daysOverdue)}))}
                    keys={["daysOverdue"]}
                    indexBy="member"
                    margin={{top:40,right:30,bottom:40,left:60}}
                    padding={0.3}
                    colors={[COLORS[3]]}
                    borderRadius={4}
                    axisBottom={{tickSize:5,tickPadding:5,tickRotation:0,legend:'Miembro',legendPosition:'middle',legendOffset:32}}
                    axisLeft={{tickSize:5,tickPadding:5,tickRotation:0,legend:'Días Vencido',legendPosition:'middle',legendOffset:-40}}
                    labelSkipWidth={16}
                    labelSkipHeight={16}
                    labelTextColor={{from:'color',modifiers:[['darker',1.6]]}}
                    animate={true}
                  />
                </div>
              </div>
              <div className="analysis-section">
                <h4>Retención de Clientes</h4>
                <div style={{height:220}}>
                  <ResponsivePie
                    data={[{id:'Activos',value:membersList.filter(m=>m.daysLeft>0).length},{id:'Vencidos',value:membersList.filter(m=>!m.daysLeft||m.daysLeft<=0).length}]}
                    colors={[COLORS[0],COLORS[3]]}
                    margin={{top:40,right:80,bottom:40,left:80}}
                    innerRadius={0.5}
                    padAngle={2}
                    cornerRadius={6}
                    activeOuterRadiusOffset={8}
                    borderWidth={2}
                    borderColor={{from:'color',modifiers:[['darker',0.2]]}}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor="#333"
                    arcLinkLabelsThickness={2}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor={{from:'color',modifiers:[['darker',2]]}}
                  />
                </div>
              </div>
              {/* Métricas clave */}
              <div className="analysis-section">
                <h4>Métricas Clave</h4>
                <div className="key-metrics">
                  <div className="metric-item">
                    <div className="metric-label">Ingreso Promedio por Transacción</div>
                    <div className="metric-value">{currentData.transactions > 0 ? (currentData.total / currentData.transactions).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '$0'}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Proyección Mensual</div>
                    <div className="metric-value">{(currentData.total * 1.078).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Crecimiento Interanual</div>
                    <div className="metric-value">{revenueData && revenueData.monthlyGrowth !== undefined ? `+${revenueData.monthlyGrowth.toFixed(1)}%` : '+0%'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={() => setShowDetailedAnalysis(false)} className="btn-secondary">
                Cerrar
              </button>
              <button onClick={generatePDFReport} className="btn-primary">
                Descargar Reporte Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}