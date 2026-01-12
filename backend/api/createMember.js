// Endpoint backend para crear usuario y perfil en Supabase
// Requiere: npm install @supabase/supabase-js express cors dotenv
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service key, NO la anon/public
);

app.post('/api/create-user', async (req, res) => {
  const {
    email,
    password,
    first_name,
    last_name,
    phone,
    gym_id,
    membership_type,
    status,
    role = 'member',
    speciality,
    experience,
    bio
  } = req.body;
  try {
    // 1. Crear usuario en Auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (userError) return res.status(400).json({ error: userError.message });
    const userId = userData.user.id;

    // 2. Crear perfil en profiles
    const profilePayload = {
      id: userId,
      first_name,
      last_name,
      phone,
      email,
      role,
      gym_id,
      status: status || 'Activo',
    };
    if (role === 'member') {
      profilePayload.membership_type = membership_type;
    } else if (role === 'coach') {
      profilePayload.speciality = speciality;
      profilePayload.experience = experience;
      profilePayload.bio = bio;
    }
    const { error: profileError } = await supabase.from('profiles').insert(profilePayload);
    if (profileError) return res.status(400).json({ error: profileError.message });

    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log('API backend escuchando en puerto', PORT));
