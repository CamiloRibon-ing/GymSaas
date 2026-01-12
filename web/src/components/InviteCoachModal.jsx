import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function InviteCoachModal({ coach, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(coach.email || '');
  const [password, setPassword] = useState('TempPassword123!');

  const handleInviteCoach = async () => {
    if (!email) {
      alert('Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      // Paso 1: Crear usuario usando signUp (método público)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: window.location.origin + '/login'
        }
      });

      if (authError) {
        console.error('Error creando usuario auth:', authError);
        alert('Error al crear usuario: ' + authError.message);
        return;
      }

      // Paso 2: Crear perfil en tabla profiles (si el usuario se creó exitosamente)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            gym_id: coach.gym_id || coach.gymId,
            role: 'coach',
            first_name: coach.name.split(' ')[0],
            last_name: coach.name.split(' ').slice(1).join(' ')
          });

        if (profileError) {
          console.error('Error creando perfil:', profileError);
          // No es crítico si falla, el perfil se puede crear después
        }
      }

      // Paso 3: Actualizar gym_members para marcar como pendiente de confirmación
      const { error: updateError } = await supabase
        .from('gym_members')
        .update({
          email: email,
          status: 'Invitado - Pendiente confirmación'
        })
        .eq('id', coach.id);

      if (updateError) {
        console.error('Error actualizando gym_members:', updateError);
        alert('Error al actualizar coach: ' + updateError.message);
        return;
      }

      alert('Invitación enviada exitosamente. El coach recibirá un email para confirmar su cuenta.');
      onSuccess && onSuccess();
      onClose();

    } catch (error) {
      console.error('Error general:', error);
      alert('Error al invitar coach: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Invitar Coach a Autenticación</h3>
        
        <div className="coach-info">
          <p><strong>Coach:</strong> {coach.name}</p>
          <p><strong>Especialidad:</strong> {coach.speciality}</p>
        </div>

        <div className="form-group">
          <label>Email para Login:</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@gym.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Contraseña Temporal:</label>
          <input 
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña temporal"
          />
          <small>El coach deberá cambiar esta contraseña al primer login</small>
        </div>

        <div className="instructions">
          <h4>Proceso de Invitación:</h4>
          <ol>
            <li>Se enviará una invitación de registro al email especificado</li>
            <li>El coach recibirá un email de confirmación de Supabase</li>
            <li>Debe hacer clic en el enlace del email para activar su cuenta</li>
            <li>Después podrá hacer login con este email y contraseña</li>
            <li>Comparte la contraseña temporal de manera segura con el coach</li>
          </ol>
          <div className="warning">
            <strong>Importante:</strong> El coach debe confirmar su email antes de poder acceder al sistema.
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleInviteCoach} 
            className="btn-primary"
            disabled={loading || !email}
          >
            {loading ? 'Invitando...' : 'Invitar Coach'}
          </button>
        </div>
      </div>
    </div>
  );
}