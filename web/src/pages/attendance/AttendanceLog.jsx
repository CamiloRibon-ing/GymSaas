import { useState } from 'react';

export default function AttendanceLog({ attendanceData }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('today');

  // Mapeo para adaptar los datos de la BD al formato esperado por el componente
  const mappedData = (attendanceData || []).map(entry => {
    // Suponiendo que hay un campo exit_timestamp en la BD, si no existe, se deja null
    const entryTime = entry.timestamp;
    const exitTime = entry.exit_timestamp || null;
    // Mostrar nombre del miembro correctamente
    const memberName = entry.member ? `${entry.member.first_name} ${entry.member.last_name}` : entry.member_id;
    // Calcular duración desde el campo INTERVAL (en milisegundos)
    let duration = null;
    if (entry.duration) {
      // Si duration es '90000 milliseconds', convertir a minutos/horas
      const msMatch = entry.duration.match(/(\d+) milliseconds/);
      if (msMatch) {
        const ms = parseInt(msMatch[1], 10);
        const diffHours = Math.floor(ms / (1000 * 60 * 60));
        const diffMinutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        duration = diffHours > 0 ? `${diffHours}h ${diffMinutes}m` : `${diffMinutes}m`;
      } else {
        duration = entry.duration;
      }
    } else if (entryTime && exitTime) {
      const diffMs = new Date(exitTime) - new Date(entryTime);
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      duration = diffHours > 0 ? `${diffHours}h ${diffMinutes}m` : `${diffMinutes}m`;
    }
    // Traducir correctamente el estado para el filtro de salida
    let status = 'completed';
    if (entry.action_type === 'entrada' && !entry.exit_timestamp) {
      status = 'inside';
    }
    return {
      memberName,
      memberId: entry.member_id, // UUID real de la BD
      id: entry.id, // UUID real de la BD
      memberType: entry.member?.membership_type || 'Básico',
      entryTime,
      exitTime,
      duration,
      status
    };
  });

  const filteredData = mappedData.filter(entry => {
    // Filtro por estado
    if (filterStatus !== 'all' && entry.status !== filterStatus) {
      return false;
    }

    // Filtro por fecha
    const entryDate = new Date(entry.entryTime);
    const today = new Date();
    
    if (filterDate === 'today') {
      return entryDate.toDateString() === today.toDateString();
    } else if (filterDate === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entryDate >= weekAgo;
    } else if (filterDate === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return entryDate >= monthAgo;
    }

    return true;
  });

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timeString) => {
    return new Date(timeString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      inside: { text: 'Dentro', class: 'status-inside', icon: '🔴' },
      completed: { text: 'Completado', class: 'status-completed', icon: '✅' },
      expired: { text: 'Vencido', class: 'status-expired', icon: '⚠️' }
    };

    const config = statusConfig[status] || statusConfig.completed;
    
    return (
      <span className={`status-badge ${config.class}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  const getMemberTypeBadge = (type) => {
    const typeConfig = {
      'VIP': { class: 'member-vip', icon: '👑' },
      'Premium': { class: 'member-premium', icon: '⭐' },
      'Básico': { class: 'member-basic', icon: '🏃' }
    };

    const config = typeConfig[type] || typeConfig['Básico'];
    
    return (
      <span className={`member-badge ${config.class}`}>
        {config.icon} {type}
      </span>
    );
  };

  return (
    <div className="attendance-log-container">
      <div className="dashboard-section">
        <div className="log-header">
          <h2>📋 Registro de Asistencias</h2>
          
          <div className="log-filters">
            <div className="filter-group">
              <label>Estado:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos</option>
                <option value="inside">Dentro</option>
                <option value="completed">Completados</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Período:</label>
              <select 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
                className="filter-select"
              >
                <option value="today">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>
        </div>

        <div className="attendance-summary">
          <div className="summary-stat">
            <strong>{filteredData.length}</strong>
            <span>Total Registros</span>
          </div>
          <div className="summary-stat">
            <strong>{filteredData.filter(entry => entry.status === 'inside').length}</strong>
            <span>Actualmente Dentro</span>
          </div>
          <div className="summary-stat">
            <strong>{filteredData.filter(entry => entry.status === 'completed').length}</strong>
            <span>Sesiones Completadas</span>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="empty-state">
            <p>📊 No hay registros para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="attendance-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>👤 Miembro</th>
                  <th>🎫 Membresía</th>
                  <th>📅 Fecha</th>
                  <th>🚪 Entrada</th>
                  <th>🚶 Salida</th>
                  <th>⏱️ Duración</th>
                  <th>📊 Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry) => (
                  <tr key={entry.memberId + '-' + (entry.entryTime || '')} className="attendance-row">
                    <td className="member-cell">
                      <div className="member-info">
                        <strong>{entry.memberName}</strong>
                        <small>ID: {entry.memberId}</small>
                      </div>
                    </td>
                    
                    <td>
                      {getMemberTypeBadge(entry.memberType)}
                    </td>
                    
                    <td className="date-cell">
                      {formatDate(entry.entryTime)}
                    </td>
                    
                    <td className="time-cell entry-time">
                      {formatTime(entry.entryTime)}
                    </td>
                    
                    <td className="time-cell exit-time">
                      {formatTime(entry.exitTime)}
                    </td>
                    
                    <td className="duration-cell">
                      {entry.duration || '-'}
                    </td>
                    
                    <td>
                      {getStatusBadge(entry.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}