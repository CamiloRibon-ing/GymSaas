// Endpoint para migrar miembro pendiente a profiles y crear usuario en Auth
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/api/migrate-pending-member', async (req, res) => {
  const { pendingId, password } = req.body;
  try {
    // 1. Obtener datos del miembro pendiente
    const { data: pending, error: getError } = await supabase
      .from('pending_members')
      .select('*')
      .eq('id', pendingId)
      .single();
    if (getError || !pending) return res.status(400).json({ error: 'Miembro pendiente no encontrado' });

    // 2. Crear usuario en Auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: pending.email,
      password,
      email_confirm: true
    });
    if (userError) return res.status(400).json({ error: userError.message });
    const userId = userData.user.id;

    // 3. Crear perfil en profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      first_name: pending.first_name,
      last_name: pending.last_name,
      phone: pending.phone,
      email: pending.email,
      role: 'member',
      gym_id: pending.gym_id,
      membership_type: pending.membership_type,
      status: 'Activo'
    });
    if (profileError) return res.status(400).json({ error: profileError.message });

    // 4. Eliminar de pending_members
    const { error: delError } = await supabase.from('pending_members').delete().eq('id', pendingId);
    if (delError) return res.status(400).json({ error: delError.message });

    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/migrate-pending-coach', async (req, res) => {
  const { temp_id, email, password } = req.body;
  try {
    // 1. Obtener datos del coach pendiente
    const { data: pending, error: getError } = await supabase
      .from('pending_coaches')
      .select('*')
      .eq('temp_id', temp_id)
      .single();
    if (getError || !pending) return res.status(400).json({ error: 'Coach pendiente no encontrado' });

    // 2. Crear usuario en Auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (userError) return res.status(400).json({ error: userError.message });
    const userId = userData.user.id;

    // 3. Crear perfil en profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      first_name: pending.first_name,
      last_name: pending.last_name,
      phone: pending.phone,
      email: pending.email,
      role: 'coach',
      gym_id: pending.gym_id,
      speciality: pending.speciality,
      experience: pending.experience,
      bio: pending.bio,
      status: 'Activo'
    });
    if (profileError) return res.status(400).json({ error: profileError.message });

    // 4. Eliminar de pending_coaches
    const { error: delError } = await supabase.from('pending_coaches').delete().eq('temp_id', temp_id);
    if (delError) return res.status(400).json({ error: delError.message });

    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log('API backend escuchando en puerto', PORT));
