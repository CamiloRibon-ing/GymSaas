import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from "nodemailer";

const WOMPI_INTEGRITY_SECRET = 'test_integrity_UMZM0gHwqP5l9ZwO6lEzIcxIfOnNRweM';
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fenwlslpsfyvplrbafqb.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbndsc2xwc2Z5dnBscmJhZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjYwMTMsImV4cCI6MjA4MzQwMjAxM30.qJHoxBMWhLeS9vTxSs4vbtpTK7Xwi55SDSZZDHx4nkU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function generateSignature({ amountInCents, currency, reference }) {
  const stringToSign = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
  return crypto.createHash('sha256').update(stringToSign).digest('hex');
}

const server = http.createServer((req, res) => {
  function setCORSHeaders() {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  setCORSHeaders();

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Endpoint: enviar correo de aprobación/rechazo
  if (req.method === 'POST' && req.url === '/api/send-gym-approval-email') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { to, gymName, approved } = JSON.parse(body);
        console.log('[EMAIL][SEND] Datos recibidos:', { to, gymName, approved });
        if (!to || !gymName) {
          console.error('[EMAIL][SEND] Faltan datos obligatorios');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Faltan datos obligatorios' }));
        }
        const smtpConfig = {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'santiago.fontalvo@cecar.edu.co',
            pass: 'bbgj luoy yrxi pwep'
          }
        };
        const fromEmail = 'noreply@joyeriaklatee.com';
        const fromName = 'GymMVP';
        const transporter = nodemailer.createTransport(smtpConfig);
        const imageUrl = 'https://res.cloudinary.com/dczdtij3q/image/upload/v1768442914/Captura_de_pantalla_2026-01-14_161616_eubuf8.png';
        let subject, html;
        if (approved) {
          subject = '¡Tu gimnasio ha sido aprobado!';
          html = `<div style="background:#f5faff;padding:0;margin:0;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;box-shadow:0 2px 16px #1976d211;overflow:hidden;"><div style="background:#1976d2;padding:24px 0;text-align:center;"><img src='${imageUrl}' alt='GymMVP' style='max-width:180px;border-radius:12px;margin-bottom:12px;' /><h1 style='color:#fff;font-size:28px;font-weight:800;margin:0;'>¡Felicitaciones!</h1></div><div style="padding:32px 28px;"><p style="font-size:18px;color:#222;margin-bottom:18px;">Tu gimnasio <b style='color:#1976d2'>${gymName}</b> ha sido <b style='color:#38a169'>aprobado</b> por el equipo de GymMVP.</p><p style="font-size:16px;color:#64748b;margin-bottom:18px;">Ya puedes acceder al sistema como administrador y comenzar a gestionar tu gimnasio.</p><div style="background:#e3e9f7;padding:18px;border-radius:10px;color:#1976d2;font-weight:600;font-size:16px;text-align:center;">Bienvenido a la comunidad GymMVP</div></div><div style="background:#f5faff;padding:18px 0;text-align:center;color:#64748b;font-size:14px;">Este correo fue generado automáticamente por GymMVP</div></div></div>`;
        } else {
          subject = 'Solicitud rechazada';
          html = `<div style="background:#f5faff;padding:0;margin:0;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;box-shadow:0 2px 16px #e5393522;overflow:hidden;"><div style="background:#e53935;padding:24px 0;text-align:center;"><img src='${imageUrl}' alt='GymMVP' style='max-width:180px;border-radius:12px;margin-bottom:12px;' /><h1 style='color:#fff;font-size:28px;font-weight:800;margin:0;'>Solicitud rechazada</h1></div><div style="padding:32px 28px;"><p style="font-size:18px;color:#222;margin-bottom:18px;">Tu solicitud para el gimnasio <b style='color:#e53935'>${gymName}</b> fue <b style='color:#e53935'>rechazada</b> por el equipo de GymMVP.</p><p style="font-size:16px;color:#64748b;margin-bottom:18px;">Si tienes dudas o deseas más información, contáctanos y te ayudaremos.</p><div style="background:#ffeaea;padding:18px;border-radius:10px;color:#e53935;font-weight:600;font-size:16px;text-align:center;">Gracias por tu interés en GymMVP</div></div><div style="background:#f5faff;padding:18px 0;text-align:center;color:#64748b;font-size:14px;">Este correo fue generado automáticamente por GymMVP</div></div></div>`;
        }
        await transporter.sendMail({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          html
        });
        console.log('[EMAIL][SEND] Correo enviado correctamente a', to);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('[EMAIL][SEND] Error enviando correo:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Endpoint: crear usuario admin en Supabase
  if (req.method === 'POST' && req.url === '/api/create-admin') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, password, user_metadata } = JSON.parse(body);
        console.log('[ADMIN][CREATE] Body recibido:', { email, password, user_metadata });
        if (!email || !password) {
          console.error('[ADMIN][CREATE] Email o password faltante');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Email y password requeridos' }));
        }
        // Usar la service_role key desde variable de entorno
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const SUPABASE_PROJECT_URL = 'https://fenwlslpsfyvplrbafqb.supabase.co';
        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[ADMIN][CREATE] Service role key no configurada');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Service role key no configurada en el backend' }));
        }
        const axios = await import('axios');
        try {
          const response = await axios.default.post(
            `${SUPABASE_PROJECT_URL}/auth/v1/admin/users`,
            {
              email,
              password,
              user_metadata: user_metadata || {},
              email_confirm: true
            },
            {
              headers: {
                apiKey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
          console.log('[ADMIN][CREATE] Respuesta Supabase:', response.data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response.data));
        } catch (error) {
          console.error('[ADMIN][CREATE] Error Supabase:', error.response?.data || error.message, error);
          res.writeHead(error.response?.status || 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.response?.data || error.message }));
        }
      } catch (error) {
        console.error('[ADMIN][CREATE] Error parsing body:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  // Endpoint: inicializar pago y registrar referencia
  if (req.method === 'POST' && req.url === '/api/wompi-init-payment') {
    console.log('[WOMPI][BACKEND] Recibida solicitud de inicialización de pago');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
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
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Endpoint: generar firma para Wompi
  if (req.method === 'POST' && req.url === '/api/wompi-signature') {
    console.log('[WOMPI][BACKEND] Recibida solicitud de firma Wompi');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { amountInCents, currency, reference } = JSON.parse(body);
        if (!amountInCents || !currency || !reference) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Faltan datos requeridos.' }));
        }
        const signature = generateSignature({ amountInCents, currency, reference });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signature }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido.' }));
      }
    });
    return;
  }

  // Endpoint: webhook de Wompi
  if (req.method === 'POST' && req.url === '/api/wompi-webhook') {
    console.log('[WOMPI][BACKEND] Recibido webhook de Wompi');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        if (event.event === 'transaction.updated' && event.data.transaction.status === 'APPROVED') {
          const tx = event.data.transaction;
          const reference = tx.reference;
          const amount = tx.amount_in_cents / 100;
          const currency = tx.currency;
          const status = tx.status;
          const payment_method = tx.payment_method_type;
          const paid_at = tx.processed_at;
          let gymId = null, memberId = null, planId = null;
          const { data: pending } = await supabase
            .from('wompi_pending_payments')
            .select('*')
            .eq('reference', reference)
            .maybeSingle();
          if (pending) {
            gymId = pending.gym_id;
            memberId = pending.member_id;
            planId = pending.plan_id;
            console.log('[WOMPI][BACKEND] Datos recuperados de wompi_pending_payments:', pending);
          } else {
            console.error('[WOMPI][BACKEND] No se encontró la referencia en wompi_pending_payments:', reference);
          }
          let paidAtValue = paid_at && !isNaN(Date.parse(paid_at)) ? new Date(paid_at).toISOString() : new Date().toISOString();
          if (gymId && memberId && planId) {
            const { error } = await supabase.from('payments').insert([
              {
                gym_id: gymId,
                member_id: memberId,
                amount: amount,
                payment_type: 'mensualidad',
                plan_id: planId,
                reference: reference,
                status: 'completed', // status fijo para payments
                paid_at: paidAtValue,
                currency: currency,
                payment_method: payment_method,
                transaction_id: tx.id || null,
                raw_webhook: JSON.stringify(event)
              }
            ]);
            if (error) {
              console.error('[WOMPI][BACKEND] Error insertando pago en payments:', error.message);
            } else {
              console.log('[WOMPI][BACKEND] Pago registrado en payments:', reference);
              console.log('[WOMPI][BACKEND] Datos insertados en payments:', {
                gym_id: gymId,
                member_id: memberId,
                amount: amount,
                payment_type: 'mensualidad',
                plan_id: planId,
                reference: reference,
                status: 'completed',
                paid_at: paidAtValue,
                currency: currency,
                payment_method: payment_method,
                transaction_id: tx.id || null,
                raw_webhook: JSON.stringify(event)
              });
              // Eliminar registro de la tabla temporal
              const { error: deleteError } = await supabase
                .from('wompi_pending_payments')
                .delete()
                .eq('reference', reference);
              if (deleteError) {
                console.error('[WOMPI][BACKEND] Error eliminando registro de wompi_pending_payments:', deleteError.message);
              } else {
                console.log('[WOMPI][BACKEND] Registro eliminado de wompi_pending_payments:', reference);
              }
            }
          } else {
            console.log('[WOMPI][BACKEND] No se pudo extraer gymId/memberId/planId de la referencia:', reference);
          }
        }
        res.writeHead(200);
        res.end('OK');
      } catch (err) {
        res.writeHead(400);
        res.end('Error');
      }
    });
    return;
  }

  // Endpoint de prueba Nequi
  if (req.method === 'POST' && req.url === '/api/wompi-nequi-test') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { phone_number } = JSON.parse(body);
        let status = 'ERROR';
        if (phone_number === '3991111111') status = 'APPROVED';
        else if (phone_number === '3992222222') status = 'DECLINED';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido.' }));
      }
    });
    return;
  }

  // 404 para rutas desconocidas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Probar conexión a Supabase al iniciar
supabase.from('payments').select('id').limit(1)
  .then(({ error }) => {
    if (error) {
      console.error('❌ Error de conexión a Supabase:', error.message);
    } else {
      console.log('✅ Conexión a Supabase exitosa');
    }
  });

server.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
  // LOGS en los endpoints principales
  console.log('[WOMPI][BACKEND] Servidor iniciado en puerto', PORT);
});
