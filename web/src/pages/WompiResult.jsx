import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

function getQueryParams(search) {
  return Object.fromEntries(new URLSearchParams(search));
}

export default function WompiResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = getQueryParams(location.search);
    setReference(params.reference || '');
    if (params.status === 'APPROVED') {
      setStatus('success');
      setMessage('¡Pago aprobado exitosamente!');
      toast.success('Pago aprobado exitosamente');
    } else if (params.status === 'DECLINED') {
      setStatus('error');
      setMessage('El pago fue rechazado.');
      toast.error('El pago fue rechazado');
    } else if (params.status === 'PENDING') {
      setStatus('pending');
      setMessage('El pago está pendiente de confirmación.');
      toast('El pago está pendiente de confirmación');
    } else {
      setStatus('unknown');
      setMessage('No se pudo determinar el estado del pago.');
    }
  }, [location.search]);

  return (
    <div style={{maxWidth:400,margin:'3em auto',padding:'2em',background:'#fff',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.10)'}}>
      <h2>Resultado del Pago Wompi</h2>
      <div style={{fontSize:'1.2em',margin:'1.5em 0'}}>
        <strong>Estado:</strong> {message}
      </div>
      {reference && <div><strong>Referencia:</strong> {reference}</div>}
      <button onClick={() => navigate('/')} style={{marginTop:24,padding:'10px 24px',borderRadius:8,background:'#38d39f',color:'#fff',border:'none',fontWeight:600,cursor:'pointer'}}>Volver al inicio</button>
    </div>
  );
}
