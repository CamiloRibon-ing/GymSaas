import axios from 'axios';

const FACTUS_API_URL = 'http://localhost:4001/factus';

// Obtener pagos realizados con Factus, permitiendo filtros
export async function getFactusPayments(filters = {}) {
  // Construir query string con los filtros válidos
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(`filter[${key}]`, value);
    }
  });
  const url = `${FACTUS_API_URL}/payments${params.toString() ? '?' + params.toString() : ''}`;
  const { data } = await axios.get(url);
  return data;
}
