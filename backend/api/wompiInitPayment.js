// Endpoint para registrar referencia y datos de pago antes de redirigir a Wompi
// POST /api/wompi-init-payment
// Body: { gym_id, member_id, plan_id, amount }
// Responde: { reference }

const { supabase } = require('./supabaseClient');
const { v4: uuidv4 } = require('uuid');

module.exports = async function wompiInitPayment(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  try {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const { gym_id, member_id, plan_id, amount } = JSON.parse(body);
      if (!gym_id || !member_id || !plan_id || !amount) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing data' }));
      }
      const reference = uuidv4();
      const { error } = await supabase.from('wompi_pending_payments').insert([
        { reference, gym_id, member_id, plan_id, amount }
      ]);
      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: error.message }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reference }));
    });
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
};
