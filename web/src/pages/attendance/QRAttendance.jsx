import { useState, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useProfile } from '../../hooks/useProfile';
import QRScanner from './QRScanner';
import AttendanceLog from './AttendanceLog';
import '../../styles/dashboard.css';
import toast from 'react-hot-toast';
import { getGymMembersForQR, registerAttendance, validateQRAndGetMember, getAttendanceLog } from '../../api/attendance.api';
import { registerExit } from '../../api/attendance.api';

export default function QRAttendance({ onBack }) {
    // Estado para mostrar el botón de salida localmente tras registrar entrada
    const [localExitMembers, setLocalExitMembers] = useState([]);
    const [loadingSkeleton, setLoadingSkeleton] = useState(true);
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState('scanner');
  const [attendanceData, setAttendanceData] = useState([]);
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [realMembers, setRealMembers] = useState([]); // Miembros reales del sistema
  const [stats, setStats] = useState({
    todayTotal: 0,
    currentInside: 0,
    peakTime: '18:00',
    averageStay: '1.5h'
  });
  const gymId = profile?.gym_id || (window.localStorage && window.localStorage.getItem('gym_id'));

  useEffect(() => {
    // Eliminado: notificación innecesaria por gymId faltante
  }, [gymId]);

  // Cargar miembros reales y asistencias desde la base de datos
  useEffect(() => {
    async function fetchMembersAndAttendance() {
      if (!gymId) return;
      const res = await getGymMembersForQR(gymId);
      if (res.success) {
        setRealMembers(res.members);
        setStats(prev => ({ ...prev, todayTotal: res.members.length }));
      }
      // Consultar historial real de asistencias
      const attRes = await getAttendanceLog(gymId);
      if (attRes.success) setAttendanceData(attRes.attendance);
      setLoadingSkeleton(false);
    }
    fetchMembersAndAttendance();
  }, [gymId]);

  // Función para buscar miembro real por ID (soporta múltiples formatos)
  const findMemberById = (memberId) => {
    console.log('🔍 Buscando miembro:', memberId, 'En lista:', realMembers.length, 'miembros');
    
    let memberNumber, shortId;
    
    // Extraer número o ID corto del input
    if (typeof memberId === 'string') {
      if (memberId.startsWith('M')) {
        // Formato M001 -> 1
        memberNumber = parseInt(memberId.substring(1));
        console.log('📝 Formato M### detectado, número extraído:', memberNumber);
      } else if (memberId.length === 6) {
        // Formato de ID corto (últimos 6 caracteres del UUID)
        shortId = memberId;
        console.log('🔑 ID corto detectado:', shortId);
      } else if (/^\d+$/.test(memberId)) {
        // Número simple como string
        memberNumber = parseInt(memberId);
        console.log('🔢 Número simple detectado:', memberNumber);
      } else {
        // Intentar como ID corto
        shortId = memberId;
        console.log('🔑 Intentando como ID corto:', shortId);
      }
    } else {
      memberNumber = parseInt(memberId);
      console.log('🔢 Número entero:', memberNumber);
    }
    
    // Buscar por número secuencial
    if (memberNumber) {
      const member = realMembers.find(m => m.id === memberNumber && m.role === 'member');
      console.log('🔍 Búsqueda por número:', memberNumber, 'Resultado:', member ? '✅ Encontrado' : '❌ No encontrado');
      if (member && member.status === 'Activo') {
        console.log('✅ Miembro activo encontrado:', member.name);
        return member;
      }
    }
    
    // Buscar por ID corto (últimos 6 caracteres del UUID)
    if (shortId) {
      const member = realMembers.find(m => m.shortId === shortId && m.role === 'member');
      console.log('🔍 Búsqueda por ID corto:', shortId, 'Resultado:', member ? '✅ Encontrado' : '❌ No encontrado');
      if (member && member.status === 'Activo') {
        console.log('✅ Miembro activo encontrado por ID corto:', member.name);
        return member;
      }
    }
    
    console.log('❌ Miembro no encontrado para:', memberId);
    return null;
  };

  // Eliminar datos simulados de asistencia y usar solo los reales

  // Registrar asistencia real en la base de datos
  const handleQRScan = async (qrData) => {
    try {
      const result = await validateQRAndGetMember(qrData);
      if (!result.success || !result.member) {
        toast.error(`❌ ${result.error || 'Miembro no encontrado o inactivo en el sistema'}`);
        return;
      }
      const realMember = result.member;
      // Buscar si tiene entrada activa (sin salida)
      const attRes = await getAttendanceLog(gymId);
      let activeEntry = null;
      if (attRes.success && attRes.attendance) {
        activeEntry = attRes.attendance.find(a => a.member_id === realMember.id && a.action_type === 'entrada' && !a.exit_timestamp);
      }
      if (activeEntry) {
        // Registrar salida y calcular duración
        const exitRes = await registerExit(activeEntry.id);
        if (exitRes.success) {
          const duration = exitRes.attendance.duration;
          toast.success(`👋 ¡Salida registrada! ${realMember.name} estuvo ${duration} en el gimnasio.`);
          // Refrescar historial
          const attRes2 = await getAttendanceLog(gymId);
          if (attRes2.success) setAttendanceData(attRes2.attendance);
          setStats(prev => ({
            ...prev,
            currentInside: Math.max(prev.currentInside - 1, 0)
          }));
        } else {
          toast.error('❌ Error registrando salida');
        }
      } else {
        // Registrar entrada
        const res = await registerAttendance(realMember.id, 'entrada');
        if (res.success && gymId) {
          // Refrescar historial automáticamente tras registrar entrada
          const attRes2 = await getAttendanceLog(gymId);
          if (attRes2.success) setAttendanceData(attRes2.attendance);
          setLiveAttendance(prev => [
            ...prev,
            {
              memberId: realMember.id,
              memberName: realMember.name,
              entryTime: new Date().toLocaleTimeString()
            }
          ]);
          setStats(prev => ({
            ...prev,
            currentInside: prev.currentInside + 1
          }));
          toast.success(`🎯 ¡Bienvenido(a), ${realMember.name}! (${realMember.id}) - Plan: ${realMember.membership}`);
        } else {
          toast.error('❌ Error registrando asistencia');
        }
      }
    } catch (error) {
      toast.error('❌ Error al procesar código QR');
      console.error('Error parsing QR:', error);
    }
  };

  const calculateDuration = (entryTime, exitTime) => {
    const diffMs = exitTime - entryTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  return (
    <div className="attendance-panel">
      <div className="attendance-header">
        <button className="back-btn" onClick={onBack}>← Volver</button>
        <h1>Registro de Asistencia por QR</h1>
      </div>
      <div className="attendance-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', marginBottom: '1.5rem', paddingLeft: '0.2rem' }}>
        <button className={`attendance-tab${activeTab === 'scanner' ? ' active' : ''}`} onClick={() => setActiveTab('scanner')}>Escanear QR</button>
        <button className={`attendance-tab${activeTab === 'manual' ? ' active' : ''}`} onClick={() => setActiveTab('manual')}>📝 Registro Manual</button>
        <button className={`attendance-tab${activeTab === 'live' ? ' active' : ''}`} onClick={() => setActiveTab('live')}>🔴 En Tiempo Real</button>
        <button className={`attendance-tab${activeTab === 'log' ? ' active' : ''}`} onClick={() => setActiveTab('log')}>📋 Registro Completo</button>
      </div>
      <div className="attendance-content">
        {gymId ? (
          <>
            {activeTab === 'scanner' && (
              <QRScanner onScan={handleQRScan} gymId={gymId} realMembers={realMembers} />
            )}
            {activeTab === 'manual' && (
              <div className="manual-attendance-section dashboard-section">
                <h2>📝 Registro Manual de Asistencia</h2>
                <p>Si el escaneo de QR falla, selecciona un miembro para registrar su asistencia manualmente.</p>
                <div style={{ maxHeight: 350, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 10, background: '#fafbfc' }}>
                  <table style={{ width: '100%', fontSize: '1em' }}>
                    <thead>
                      <tr style={{ background: '#f0f4ff' }}>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Estado</th>
                        <th>Asistencia</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSkeleton ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td><Skeleton width={100} /></td>
                            <td><Skeleton width={120} /></td>
                            <td><Skeleton width={80} /></td>
                            <td><Skeleton width={60} /></td>
                            <td><Skeleton width={60} /></td>
                            <td><Skeleton width={120} /></td>
                          </tr>
                        ))
                      ) : (
                        realMembers.filter(m => m.status === 'Activo').map(member => {
                          // LOG TEMPORAL PARA DEPURAR
                          console.log('Miembro:', member.name, 'ID:', member.id);
                          console.log('attendanceData:', attendanceData);
                          // Buscar el registro más reciente de entrada sin salida para este miembro
                          const memberEntries = attendanceData
                            .filter(entry => entry.member_id === member.id && entry.action_type === 'entrada' && !entry.exit_timestamp)
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                          let lastEntry = memberEntries.length > 0 ? memberEntries[0] : null;
                          let asistenciaEstado = lastEntry ? 'Dentro' : 'Fuera';
                          let insideEntry = lastEntry;
                          // Mostrar botón de salida si el miembro está en localExitMembers
                          const showLocalExit = localExitMembers.includes(member.id);
                          // Obtener el id real del registro de asistencia (de la base de datos)
                          const attendanceDbId = insideEntry && insideEntry.id ? insideEntry.id : null;
                          return (
                            <tr key={member.id}>
                              <td>{member.name}</td>
                              <td>{member.email}</td>
                              <td>{member.membership}</td>
                              <td>{member.status}</td>
                              <td>{asistenciaEstado}</td>
                              <td>
                                {(!insideEntry && !showLocalExit) ? (
                                  <button
                                    className="btn-primary"
                                    style={{ fontSize: '0.95em', padding: '4px 10px' }}
                                    onClick={async () => {
                                      const res = await registerAttendance(member.id, 'entrada');
                                      if (res.success && gymId) {
                                        // Refrescar historial automáticamente tras registrar entrada
                                        const attRes = await getAttendanceLog(gymId);
                                        if (attRes.success) setAttendanceData(attRes.attendance);
                                        setLiveAttendance(prev => [
                                          ...prev,
                                          {
                                            memberId: member.id,
                                            memberName: member.name,
                                            entryTime: new Date().toLocaleTimeString()
                                          }
                                        ]);
                                        setStats(prev => ({
                                          ...prev,
                                          currentInside: prev.currentInside + 1
                                        }));
                                        setLocalExitMembers(prev => [...prev, member.id]);
                                        toast.success(`✅ Asistencia registrada para ${member.name}`);
                                      } else {
                                        toast.error('❌ Error registrando asistencia');
                                      }
                                    }}
                                  >
                                    Registrar Entrada
                                  </button>
                                ) : (
                                  <button
                                    className="btn-secondary"
                                    style={{ fontSize: '0.95em', padding: '4px 10px' }}
                                    onClick={() => {
                                      (async () => {
                                        const res = await registerExit(attendanceDbId);
                                        if (res.success && gymId) {
                                          // Refrescar historial automáticamente tras registrar salida
                                          const attRes = await getAttendanceLog(gymId);
                                          if (attRes.success) setAttendanceData(attRes.attendance);
                                          setLiveAttendance(prev => prev.filter(live => live.memberId !== member.id));
                                          setStats(prev => ({
                                            ...prev,
                                            currentInside: Math.max(prev.currentInside - 1, 0)
                                          }));
                                          setLocalExitMembers(prev => prev.filter(id => id !== member.id));
                                          toast.success(`👋 Salida registrada para ${member.name}.`);
                                        } else {
                                          toast.error('❌ Error registrando salida');
                                        }
                                      })();
                                    }}
                                  >
                                    Registrar Salida
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'live' && (
              <div className="live-attendance-section">
                <div className="dashboard-section">
                  <h2>🔴 Personas Actualmente en el Gimnasio</h2>
                  {liveAttendance.length === 0 ? (
                    <div className="empty-state">
                      <p>🏃‍♂️ No hay personas registradas dentro del gimnasio</p>
                    </div>
                  ) : (
                    <div className="live-attendance-list">
                      {liveAttendance.map((person, idx) => (
                        <div key={idx} className="live-attendance-item">
                          <div className="person-info">
                            <strong>{person.memberName}</strong>
                            <span className="member-id">ID: {person.memberId}</span>
                          </div>
                          <div className="entry-time">
                            <span>Entrada: {person.entryTime}</span>
                            <div className="status-indicator online"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'log' && (
              <AttendanceLog attendanceData={attendanceData} realMembers={realMembers} gymId={gymId} />
            )}
          </>
        ) : (
          <div className="no-gymid-warning">
            <p>⚠️ No se encontró el ID del gimnasio. Selecciona un gimnasio en tu perfil para continuar.</p>
          </div>
        )}
      </div>
    </div>
  );
}