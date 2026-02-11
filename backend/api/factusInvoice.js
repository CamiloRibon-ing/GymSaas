import http from 'http';
import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const FACTUS_API_URL = process.env.FACTUS_API_URL || 'https://api-sandbox.factus.com.co';
const FACTUS_CLIENT_ID = process.env.FACTUS_CLIENT_ID || 'a0d7bbad-70f0-4eb1-83cd-5d95f0fb3c70';
const FACTUS_CLIENT_SECRET = process.env.FACTUS_CLIENT_SECRET || 'xcBRjfoZbt0aHcZ1vN3fFzx6hERg2zM5Fcg0i4xM';
const FACTUS_EMAIL = process.env.FACTUS_EMAIL || 'sandbox@factus.com.co';
const FACTUS_PASSWORD = process.env.FACTUS_PASSWORD || 'sandbox2024%';

// Cache de token FACTUS
let cachedToken = null;
let tokenExpiresAt = null;


async function getFactusToken() {
  const url = `${FACTUS_API_URL}/oauth/token`;
  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('client_id', FACTUS_CLIENT_ID);
  formData.append('client_secret', FACTUS_CLIENT_SECRET);
  formData.append('username', FACTUS_EMAIL);
  formData.append('password', FACTUS_PASSWORD);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });
  if (!res.ok) {
    throw new Error(`Error autenticando con FACTUS: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { access_token, expires_in, ... }
}

// Obtener token válido (usa cache si aún es válido)
async function getValidFactusToken() {
  const now = Date.now();
  // Si hay token en cache y no ha expirado (con 5 min de margen), usarlo
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt - 5 * 60 * 1000) {
    console.log('[FACTUS][TOKEN] Usando token en cache');
    return cachedToken;
  }
  // Si no, solicitar nuevo token
  console.log('[FACTUS][TOKEN] Solicitando nuevo token');
  const tokenData = await getFactusToken();
  cachedToken = tokenData.access_token;
  // expires_in viene en segundos (600 = 10 min según doc, pero dice 1 hora)
  tokenExpiresAt = now + (tokenData.expires_in || 3600) * 1000;
  return cachedToken;
}

const PORT = process.env.PORT || 4001;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fenwlslpsfyvplrbafqb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getMunicipalityByName(name, token) {
  const url = `${FACTUS_API_URL}/v1/municipalities?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error(`Error consultando municipio: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data && data.data.length > 0 ? data.data[0] : null;
}

async function createFactusInvoice(invoiceData, token) {
  const url = `${FACTUS_API_URL}/v1/bills/validate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(invoiceData)
  });
  if (!res.ok) {
    throw new Error(`Error creando factura en FACTUS: ${res.status} ${await res.text()}`);
  }
  return res.json();
}


// Middleware CORS global
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer((req, res) => {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

    // Endpoint: descargar PDF oficial de Factus
    if (req.method === 'GET' && req.url.startsWith('/api/invoice/')) {
      // Soporta: /api/invoice/:number/pdf
      const pdfMatch = req.url.match(/^\/api\/invoice\/(.+)\/pdf$/);
      if (pdfMatch) {
        const invoiceNumber = pdfMatch[1];
        (async () => {
          try {
            const access_token = await getValidFactusToken();
            const factusRes = await fetch(`${FACTUS_API_URL}/v1/bills/download-pdf/${invoiceNumber}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
              }
            });
            if (!factusRes.ok) {
              throw new Error(`Error descargando PDF de Factus: ${factusRes.status} ${await factusRes.text()}`);
            }
            const factusData = await factusRes.json();
            if (!factusData.data || !factusData.data.pdf_base_64_encoded) {
              throw new Error('Respuesta de Factus inválida o sin PDF');
            }
            // Decodificar base64
            const pdfBuffer = Buffer.from(factusData.data.pdf_base_64_encoded, 'base64');
            setCORSHeaders(res);
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${factusData.data.file_name || invoiceNumber}.pdf"`
            });
            res.end(pdfBuffer);
          } catch (err) {
            console.error('[FACTUS][BACKEND] Error al descargar PDF:', err);
            setCORSHeaders(res);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        })();
        return;
      }
    }
  // Ya se maneja CORS y OPTIONS globalmente arriba

  // Endpoint: consultar municipio por nombre
  if (req.method === 'GET' && req.url.startsWith('/api/factus/municipality')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const name = urlObj.searchParams.get('name');
    (async () => {
      try {
        if (!name) {
          setCORSHeaders(res);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Falta parámetro name' }));
        }
        const access_token = await getValidFactusToken();
        const municipality = await getMunicipalityByName(name, access_token);
        if (!municipality) {
          setCORSHeaders(res);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Municipio no encontrado' }));
        }
        setCORSHeaders(res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(municipality));
      } catch (err) {
        setCORSHeaders(res);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    })();
    return;
  }

  // Endpoint: listar facturas/pagos realizados en FACTUS
  if (req.method === 'GET' && req.url === '/factus/payments') {
    (async () => {
      try {
        const access_token = await getValidFactusToken();
        // Consultar facturas en Factus (ajusta la URL según la doc de Factus)
        const factusRes = await fetch(`${FACTUS_API_URL}/v1/bills`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`
          }
        });
        if (!factusRes.ok) {
          throw new Error(`Error consultando facturas en Factus: ${factusRes.status} ${await factusRes.text()}`);
        }
        const factusData = await factusRes.json();
        // factusData.data debe ser un array de facturas
        setCORSHeaders(res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(factusData.data || []));
      } catch (err) {
        console.error('[FACTUS][BACKEND] Error al obtener facturas:', err);
        setCORSHeaders(res);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    })();
    return;
  }

  // Endpoint: descargar XML oficial de Factus
  if (req.method === 'GET' && req.url.startsWith('/api/invoice/')) {
    // Soporta: /api/invoice/:number/xml
    const xmlMatch = req.url.match(/^\/api\/invoice\/(.+)\/xml$/);
    if (xmlMatch) {
      const invoiceNumber = xmlMatch[1];
      (async () => {
        try {
          const access_token = await getValidFactusToken();
          const factusRes = await fetch(`${FACTUS_API_URL}/v1/bills/download-xml/${invoiceNumber}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${access_token}`
            }
          });
          if (!factusRes.ok) {
            throw new Error(`Error descargando XML de Factus: ${factusRes.status} ${await factusRes.text()}`);
          }
          const factusData = await factusRes.json();
          if (!factusData.data || !factusData.data.xml_base_64_encoded) {
            throw new Error('Respuesta de Factus inválida o sin XML');
          }
          // Decodificar base64
          const xmlBuffer = Buffer.from(factusData.data.xml_base_64_encoded, 'base64');
          setCORSHeaders(res);
          res.writeHead(200, {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${factusData.data.file_name || invoiceNumber}.xml"`
          });
          res.end(xmlBuffer);
        } catch (err) {
          console.error('[FACTUS][BACKEND] Error al descargar XML:', err);
          setCORSHeaders(res);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      })();
      return;
    }
  }

  // Endpoint: crear factura electrónica en FACTUS
  if (req.method === 'POST' && req.url === '/api/factus-invoice') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        console.log('[FACTUS][BACKEND] Body recibido:', body);
        const { payment_id } = JSON.parse(body);
        console.log('[FACTUS][BACKEND] payment_id recibido:', payment_id);
        if (!payment_id) {
          console.error('[FACTUS][BACKEND] Error: Falta payment_id');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Falta payment_id' }));
        }
        // 1. Buscar el pago
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', payment_id)
          .maybeSingle();
        if (paymentError || !payment) {
          console.error('[FACTUS][BACKEND] Error: Pago no encontrado', paymentError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Pago no encontrado' }));
        }
        // 2. Buscar el miembro (cliente)
        const { data: member, error: memberError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payment.member_id)
          .maybeSingle();
        if (memberError || !member) {
          console.error('[FACTUS][BACKEND] Error: Miembro no encontrado', memberError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Miembro no encontrado' }));
        }
        // 3. Buscar el plan
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', payment.plan_id)
          .maybeSingle();
        if (planError || !plan) {
          console.error('[FACTUS][BACKEND] Error: Plan no encontrado', planError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Plan no encontrado' }));
        }
        // 4. Buscar el gimnasio y validar estado
        const { data: gym, error: gymError } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', payment.gym_id)
          .maybeSingle();
        if (gymError || !gym) {
          console.error('[FACTUS][BACKEND] Error: Gimnasio no encontrado', gymError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Gimnasio no encontrado' }));
        }
        if (gym.status !== 'active') {
          console.warn(`[FACTUS][BACKEND] Acceso bloqueado: gimnasio ${gym.id} (${gym.name}) está inactivo.`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Acceso restringido: este gimnasio está inactivo o bloqueado.' }));
        }
        // 5. Buscar el admin del gimnasio
        const { data: admins, error: adminError } = await supabase
          .from('profiles')
          .select('*')
          .eq('gym_id', gym.id)
          .eq('role', 'gym_admin');
        const admin = admins && admins.length > 0 ? admins[0] : null;
        if (adminError || !admin) {
          console.error('[FACTUS][BACKEND] Error: Admin no encontrado', adminError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Admin no encontrado' }));
        }
        // 6. Obtener token válido y municipio_id de FACTUS
        const access_token = await getValidFactusToken();
        const municipality = await getMunicipalityByName(gym.city, access_token);
        if (!municipality) {
          console.error('[FACTUS][BACKEND] Error: Municipio no encontrado en FACTUS');
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Municipio no encontrado en FACTUS' }));
        }
        // 7. Armar el JSON de la factura según formato FACTUS
        // Calcular fechas y email válidos antes de armar el objeto
        // Forzar issue_date a la fecha actual de Colombia (UTC-5)
        const now = new Date();
        const colombiaOffset = -5 * 60; // minutos
        const local = new Date(now.getTime() + (colombiaOffset - now.getTimezoneOffset()) * 60000);
        const todayStr = local.toISOString().split('T')[0];
        const paidAt = payment.paid_at ? new Date(payment.paid_at) : local;
        const startDateStr = paidAt.toISOString().split('T')[0];
        const endDateObj = new Date(paidAt);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const endDateStr = endDateObj.toISOString().split('T')[0];
        const validEmail = (typeof member.email === 'string' && /.+@.+\..+/.test(member.email)) ? member.email : 'cliente@gym.com';

        const invoiceData = {
          numbering_range_id: 8,
          reference_code: payment.reference || `GYM-${payment.id}`,
          observation: '',
          payment_form: '1',
          payment_due_date: payment.paid_at ? payment.paid_at.split('T')[0] : '',
          payment_method_code: '10',
          operation_type: 10,
          send_email: false,
          order_reference: {
            reference_code: payment.reference || `GYM-${payment.id}`,
            issue_date: todayStr
          },
          billing_period: {
            start_date: startDateStr,
            start_time: '00:00:00',
            end_date: endDateStr,
            end_time: '23:59:59'
          },
          establishment: {
            name: gym.name,
            address: gym.address,
            phone_number: gym.phone || '123456789',
            email: gym.email || 'admin@gym.com',
            municipality_id: municipality.id ? String(municipality.id) : '980'
          },
          customer: {
            identification: member.identification || '123456789',
            dv: member.dv || '3',
            company: member.company || '',
            trade_name: member.trade_name || '',
            names: `${member.first_name || 'Nombre'} ${member.last_name || 'Apellido'}`,
            address: member.address || gym.address || 'Sin dirección',
            email: validEmail,
            phone: member.phone || '3000000000',
            legal_organization_id: member.legal_organization_id || '2',
            tribute_id: member.tribute_id || '21',
            identification_document_id: member.identification_document_id || '3',
            municipality_id: municipality.id ? String(municipality.id) : '980'
          },
          items: [
            {
              scheme_id: '1',
              note: '',
              code_reference: plan.id ? String(plan.id) : '12345',
              name: plan.name,
              quantity: 1,
              discount_rate: 0,
              price: payment.amount,
              tax_rate: '19.00',
              unit_measure_id: 70,
              standard_code_id: 1,
              is_excluded: 0,
              tribute_id: 1,
              withholding_taxes: [],
              mandate: {
                identification_document_id: 6,
                identification: member.identification || '123456789'
              },
              additional_properties: []
            }
          ]
        };
        console.log('[FACTUS][BACKEND] JSON armado para Factus:', JSON.stringify(invoiceData, null, 2));
        // 8. Enviar la factura a FACTUS
        try {
          const factusResponse = await createFactusInvoice(invoiceData, access_token);
          console.log('[FACTUS][BACKEND] Respuesta de Factus:', JSON.stringify(factusResponse, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ factus: factusResponse }));
        } catch (factusErr) {
          console.error('[FACTUS][BACKEND] Error al crear factura en Factus:', factusErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: factusErr.message }));
        }
      } catch (err) {
        console.error('[FACTUS][BACKEND] Error general:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }


    // 404 para rutas desconocidas
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Servidor FACTUS escuchando en http://localhost:${PORT}`);
});
