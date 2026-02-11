import { useState, useEffect } from 'react';
import WompiWidgetButton from './WompiWidgetButton';
import { getWompiSignature, simulateNequiResult } from '../api/wompiSignature.api';
import { wompiInitPayment } from '../api/wompiInitPayment.api';

export default function WompiWidgetWithSignature({ plansList, membersList, publicKey, onCancel }) {
  // Evitar renderizar si no hay datos suficientes
  if (!membersList.length || !membersList[0].gym_id) {
    return <div>Cargando datos de miembros...</div>;
  }
  const gymId = membersList[0].gym_id;
  const [selectedMemberId, setSelectedMemberId] = useState(membersList[0].id);
  const [selectedPlanId, setSelectedPlanId] = useState(plansList[0]?.id || '');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nequiStatus, setNequiStatus] = useState(null);
  const [reference, setReference] = useState('');
  const selectedPlan = plansList.find(p => p.id === selectedPlanId) || plansList[0];
  // Limpiar puntos y comas del precio antes de convertir a número
  const cleanPrice = selectedPlan && typeof selectedPlan.price === 'string'
    ? selectedPlan.price.replace(/[.,]/g, '')
    : selectedPlan?.price;
  const amountInCents = selectedPlan
    ? Math.round(Number(cleanPrice) * 100)
    : 100000;


  // Registra la referencia y datos en el backend y luego genera la firma
  useEffect(() => {
    async function initAndSign() {
      setLoading(true);
      setSignature('');
      setReference('');
      try {
        // 1. Registrar referencia y datos en backend
        const ref = await wompiInitPayment({
          gym_id: gymId,
          member_id: selectedMemberId,
          plan_id: selectedPlanId,
          amount: amountInCents / 100 // Guardar en pesos, no en centavos
        });
        setReference(ref);
        // 2. Generar firma con la referencia
        const sig = await getWompiSignature({ amountInCents, currency: 'COP', reference: ref });
        setSignature(sig);
      } catch (err) {
        console.error('[WOMPI] Error inicializando pago:', err);
      }
      setLoading(false);
    }
    if (selectedPlan && selectedMemberId && selectedPlanId) {
      initAndSign();
    }
    // eslint-disable-next-line
  }, [selectedMemberId, selectedPlanId, amountInCents]);

  // Validar número Nequi y mostrar resultado esperado
  const handlePhoneChange = async (e) => {
    const value = e.target.value;
    setPhoneNumber(value);
    if (value.length >= 10) {
      const status = await simulateNequiResult(value);
      setNequiStatus(status);
    } else {
      setNequiStatus(null);
    }
  };

  if (!publicKey || !publicKey.startsWith('pub_')) {
    return <div style={{color:'red',margin:'1em 0',fontWeight:'bold'}}>No se ha configurado una llave pública válida de Wompi.</div>;
  }
  // Log antes de renderizar el widget
  console.log('[WOMPI] Render widget', {
    amountInCents,
    currency: 'COP',
    reference,
    signature
  });
  return (
    <div>
      <div style={{margin:'1em 0'}}>
        <label style={{fontWeight:'bold',marginBottom:8,display:'block'}}>Selecciona un miembro:</label>
        <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} style={{width:'100%',padding:'8px',borderRadius:8}}>
          {membersList.map(m => (
            <option key={m.id} value={m.id}>{m.name} {m.email ? `- ${m.email}` : ''}</option>
          ))}
        </select>
      </div>
      <div style={{margin:'1em 0'}}>
        <label style={{fontWeight:'bold',marginBottom:8,display:'block'}}>Selecciona un plan:</label>
        <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} style={{width:'100%',padding:'8px',borderRadius:8}}>
          {plansList.map(plan => (
            <option key={plan.id} value={plan.id}>{plan.name} - ${Number(plan.price).toLocaleString()}</option>
          ))}
        </select>
      </div>
      <div style={{margin:'1em 0'}}>
        <label style={{fontWeight:'bold',marginBottom:8,display:'block'}}>Número Nequi (pruebas):</label>
        <input
          type="text"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="3991111111 (aprobada), 3992222222 (declinada)"
          style={{width:'100%',padding:'8px',borderRadius:8,border:'1px solid #ccc'}}
          maxLength={10}
        />
        {nequiStatus && (
          <div style={{marginTop:8,fontWeight:'bold',color: nequiStatus==='APPROVED' ? 'green' : nequiStatus==='DECLINED' ? 'orange' : 'red'}}>
            Resultado esperado: {nequiStatus === 'APPROVED' ? 'Transacción APROBADA' : nequiStatus === 'DECLINED' ? 'Transacción DECLINADA' : 'Transacción ERROR'}
          </div>
        )}
      </div>
      {loading ? (
        <div style={{margin:'1em 0'}}>Generando firma de integridad...</div>
      ) : (typeof signature === 'string' && signature.length === 64) ? (
        <WompiWidgetButton
          publicKey={publicKey}
          amountInCents={amountInCents}
          reference={reference}
          integritySignature={signature}
        />
      ) : (
        <div style={{margin:'1em 0',color:'red'}}>No se pudo generar la firma.</div>
      )}
      <button className="btn-secondary" style={{flex:1,marginTop:12}} onClick={onCancel}>Cancelar</button>
    </div>
  );
}