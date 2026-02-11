// API para inicializar pago Wompi desde el frontend
import axios from 'axios';

export async function wompiInitPayment({ gym_id, member_id, plan_id, amount }) {
  const res = await axios.post('/api/wompi-init-payment', {
    gym_id, member_id, plan_id, amount
  });
  return res.data.reference;
}
