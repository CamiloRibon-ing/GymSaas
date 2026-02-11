// backend/api/wompiWebhook.js
// Endpoint para recibir eventos de Wompi y registrar pagos en la base de datos

const http = require('http');
const { Pool } = require('pg'); // Asumiendo que usas PostgreSQL

const PORT = process.env.WEBHOOK_PORT || 3002;
const pool = new Pool({
  user: 'postgres', // Cambia por tu usuario
  host: 'localhost',
  database: 'gymdb', // Cambia por tu base de datos
  password: 'tu_password',
  port: 5432,
});

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/wompi-webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        // Solo procesar eventos de transacción aprobada
        if (event.event === 'transaction.updated' && event.data.transaction.status === 'APPROVED') {
          const tx = event.data.transaction;
          // Extraer referencia, monto, usuario, plan, etc.
          const reference = tx.reference;
          const amount = tx.amount_in_cents / 100;
          const currency = tx.currency;
          const status = tx.status;
          const payment_method = tx.payment_method_type;
          const paid_at = tx.processed_at;
          // Extraer member_id y plan_id de la referencia generada por el frontend
          // Formato esperado: wompi-<timestamp>-<memberId>-<planId>
          let memberId = null, planId = null;
          const refParts = reference.split('-');
          if (refParts.length >= 5) {
            memberId = refParts[2];
            planId = refParts[3];
          }
          if (memberId && planId) {
            // Registrar el pago en la tabla payments
            await pool.query(
              'INSERT INTO payments (member_id, amount, payment_type, plan_id, reference, status, paid_at, currency, payment_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
              [memberId, amount, 'mensualidad', planId, reference, status, new Date(paid_at).toISOString(), currency, payment_method]
            );
            console.log('Pago registrado en la base de datos:', reference);
          } else {
            console.log('No se pudo extraer memberId/planId de la referencia:', reference);
          }
        }
        res.writeHead(200);
        res.end('OK');
      } catch (err) {
        console.error('Error procesando webhook:', err);
        res.writeHead(400);
        res.end('Error');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Webhook escuchando en http://localhost:${PORT}/api/wompi-webhook`);
});
