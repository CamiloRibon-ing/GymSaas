import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkoutById } from '../../api/workouts.api';
import { toast } from 'react-hot-toast';
import '../../styles/dashboard.css';

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkout() {
      setLoading(true);
      try {
        const data = await getWorkoutById(id);
        setWorkout(data);
      } catch (err) {
        toast.error('Error cargando rutina');
      }
      setLoading(false);
    }
    if (id) fetchWorkout();
  }, [id]);

  if (loading) {
    return <div className="dashboard"><div className="loader">Cargando rutina...</div></div>;
  }

  if (!workout) {
    return <div className="dashboard"><div>No se encontró la rutina.</div></div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button onClick={() => navigate(-1)} className="back-btn">← Volver</button>
        <h1>{workout.title || workout.name}</h1>
        <p>{workout.description}</p>
      </header>
      <div className="dashboard-content">
        <h2>Ejercicios</h2>
        {workout.exercises && workout.exercises.length > 0 ? (
          <ul className="exercises-list">
            {workout.exercises.map((ex, idx) => (
              <li key={idx}>
                <strong>{ex.name}</strong> - {ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight})` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <div>No hay ejercicios registrados.</div>
        )}
      </div>
    </div>
  );
}
