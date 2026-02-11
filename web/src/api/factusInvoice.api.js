// Obtener factura específica por número
export async function getFactusInvoiceByNumber(number) {
  if (!number) throw new Error('Número de factura requerido');
  const { data } = await axios.get(`http://localhost:4001/factus/invoice/${number}`);
  return data;
}
import axios from 'axios';

const FACTUS_API_URL = 'http://localhost:4001/api'; // Ajusta la URL según tu backend

// Crear factura con Factus
export async function createFactusInvoice(payment_id) {
  console.log('[FACTUS][FRONTEND] Payload enviado a backend:', JSON.stringify({ payment_id }, null, 2));
  const { data } = await axios.post(`${FACTUS_API_URL}/factus-invoice`, { payment_id });
  console.log('[FACTUS][FRONTEND] Respuesta recibida del backend:', JSON.stringify(data, null, 2));
  return data;
}

// Obtener referencias de Factus
export async function getFactusReferences() {
  const { data } = await axios.get(`${FACTUS_API_URL}/references`);
  return data;
}

// Obtener PDF de factura
export async function getFactusInvoicePDF(invoiceId) {
  const { data } = await axios.get(`${FACTUS_API_URL}/invoice/${invoiceId}/pdf`, { responseType: 'blob' });
  return data;
}

// Obtener XML de factura
export async function getFactusInvoiceXML(invoiceId) {
  const { data } = await axios.get(`${FACTUS_API_URL}/invoice/${invoiceId}/xml`, { responseType: 'blob' });
  return data;
}

// Obtener eventos de factura
export async function getFactusInvoiceEvents(invoiceId) {
  const { data } = await axios.get(`${FACTUS_API_URL}/invoice/${invoiceId}/events`);
  return data;
}
