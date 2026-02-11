const BACKEND_URL = 'http://localhost:3001'; // Cambia a tu IP si accedes desde otra máquina

// Simula el resultado de Nequi según el número de prueba de Wompi
export async function simulateNequiResult(phoneNumber) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/wompi-nequi-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber })
    });
    if (!res.ok) throw new Error('Error en simulación Nequi');
    const data = await res.json();
    return data.status;
  } catch (err) {
    console.error('Error simulando resultado Nequi:', err);
    return 'ERROR';
  }
}
// web/src/api/wompiSignature.api.js
// Función para obtener la firma de integridad desde el backend

export async function getWompiSignature({ amountInCents, currency, reference }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/wompi-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amountInCents, currency, reference }),
    });
    if (!res.ok) throw new Error('Error obteniendo la firma');
    const data = await res.json();
    return data.signature;
  } catch (err) {
    console.error('Error al obtener la firma Wompi:', err);
    return null;
  }
}

// Elimina cualquier import de nodemailer en archivos del frontend
