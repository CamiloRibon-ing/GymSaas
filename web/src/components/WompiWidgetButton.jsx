import { useEffect, useRef } from 'react';

export default function WompiWidgetButton({ publicKey, amountInCents, reference, integritySignature }) {
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!publicKey || !publicKey.startsWith('pub_')) return;
    // Limpiar scripts previos
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
    }
    // Log detallado antes de crear el script
    console.log('[WOMPI][WidgetButton] Valores enviados al widget:', {
      'data-public-key': publicKey,
      'data-currency': 'COP',
      'data-amount-in-cents': String(amountInCents),
      'data-reference': reference,
      'data-signature:integrity': integritySignature
    });
    // Crear y agregar el script del widget
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.setAttribute('data-render', 'button');
    script.setAttribute('data-public-key', publicKey);
    script.setAttribute('data-currency', 'COP');
    script.setAttribute('data-amount-in-cents', String(amountInCents));
    script.setAttribute('data-reference', reference);
    if (integritySignature) {
      script.setAttribute('data-signature:integrity', integritySignature);
    }
    widgetRef.current && widgetRef.current.appendChild(script);

    // Cleanup: eliminar script y limpiar el contenedor
    return () => {
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }
    };
  }, [publicKey, amountInCents, reference, integritySignature]);

  if (!publicKey || !publicKey.startsWith('pub_')) {
    return <div style={{color:'red',margin:'1em 0',fontWeight:'bold'}}>No se ha configurado una llave pública válida de Wompi.</div>;
  }
  return (
    <div ref={widgetRef} style={{margin:'1.5em 0'}}></div>
  );
}
