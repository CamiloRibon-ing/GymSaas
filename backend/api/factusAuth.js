// backend/api/factusAuth.js
// Endpoint para obtener el token de autenticación de FACTUS

import fetch from 'node-fetch';

const FACTUS_API_URL = process.env.FACTUS_API_URL;
const FACTUS_CLIENT_ID = process.env.FACTUS_CLIENT_ID;
const FACTUS_CLIENT_SECRET = process.env.FACTUS_CLIENT_SECRET;
const FACTUS_EMAIL = process.env.FACTUS_EMAIL;
const FACTUS_PASSWORD = process.env.FACTUS_PASSWORD;

async function getFactusToken() {
  const url = `${FACTUS_API_URL}/api/auth/login`;
  const body = {
    email: FACTUS_EMAIL,
    password: FACTUS_PASSWORD,
    client_id: FACTUS_CLIENT_ID,
    client_secret: FACTUS_CLIENT_SECRET
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Error autenticando con FACTUS: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { access_token, ... }
}

export { getFactusToken };