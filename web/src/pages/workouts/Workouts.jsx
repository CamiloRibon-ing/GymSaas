import { useEffect, useState } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { getWorkoutsByGym } from '../../api/workouts.api';
import { toast } from 'react-hot-toast';
import '../../styles/dashboard.css';

export default function Workouts({ onSelectWorkout }) {
  const { profile } = useProfile();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkouts() {
      setLoading(true);
      try {
        const data = await getWorkoutsByGym(profile.gym_id);
        setWorkouts(data || []);
      } catch (err) {
        toast.error('Error cargando rutinas');
      }
      setLoading(false);
    }
    if (profile?.gym_id) fetchWorkouts();
  }, [profile]);

  if (loading) {
    return <div className="dashboard"><div className="loader">Cargando rutinas...</div></div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Rutinas del Gimnasio</h1>
        <p>Consulta todas las rutinas disponibles</p>
      </header>
      <div className="dashboard-content">
        {workouts.length === 0 ? (
          <div>No hay rutinas registradas.</div>
        ) : (
          <div className="routines-list">
            {workouts.map(w => (
              <div key={w.id} className="routine-card">
                <h3>{w.title || w.name}</h3>
                <p>{w.description}</p>
                <button className="btn-primary" onClick={() => onSelectWorkout && onSelectWorkout(w.id)}>
                  Ver Detalle
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
