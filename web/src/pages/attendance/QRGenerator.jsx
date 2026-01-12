import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

export default function QRGenerator({ member, onClose }) {
  const [qrDataURL, setQrDataURL] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrData, setQrData] = useState(null);

  // Logs eliminados para producción

  // Generar datos únicos del QR para el miembro
  const generateQRData = (memberData) => {
    // Usar gym_id real del miembro, nunca por defecto
    const gymId = memberData.gym_id;
    const qrData = {
      t: 'gym',
      memberDbId: memberData.id, // UUID real del miembro
      gymId: gymId, // ID real del gimnasio
      n: memberData.name,
      e: memberData.email || 'no-email@gym.com',
      p: memberData.membership || 'Básico',
      ts: Date.now(),
      exp: Date.now() + (365 * 24 * 60 * 60 * 1000),
      h: generateSecurityHash(memberData)
    };
    return JSON.stringify(qrData);
  };

  // Generar hash de seguridad único
  const generateSecurityHash = (memberData) => {
    const dataString = `${memberData.id}-${memberData.name.slice(0,3)}`;
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 4); // Hash más corto
  };

  // Generar QR Code real
  const generateQR = async () => {
    //
    if (!member) {
      toast.error('❌ Datos de miembro no válidos');
      return;
    }
    const gymId = member.gym_id;
    if (!gymId) {
      toast.error('❌ El miembro no tiene un gimnasio asignado. No se puede generar el QR.');
      return;
    }
    setIsGenerating(true);
    try {
      const qrDataString = generateQRData(member);
      setQrData(qrDataString); // Guardar los datos del QR
      // Opciones del QR Code
      const qrOptions = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#1a202c',
          light: '#ffffff'
        },
        width: 300
      };

      // Generar QR Code como Data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrDataString, qrOptions);
      setQrDataURL(qrCodeDataURL);
      setQrGenerated(true); // Establecer que el QR fue generado
      toast.success(`🎯 QR generado para ${member.name}`);
      
    } catch (error) {
      toast.error('Error al generar el código QR');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataURL) return;
    
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `QR-${member.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('📥 QR descargado exitosamente');
  };

  const printQR = () => {
    if (!qrDataURL) return;
    
    const printWindow = window.open('', '_blank');
    const memberName = member.name;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR de Asistencia - ${memberName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-card {
              border: 3px solid #667eea;
              border-radius: 15px;
              padding: 30px;
              margin: 20px auto;
              max-width: 400px;
              background: white;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              border-radius: 10px;
              margin-bottom: 20px;
            }
            .member-name {
              font-size: 1.5rem;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .member-details {
              font-size: 0.9rem;
              opacity: 0.9;
            }
            .qr-image {
              margin: 20px 0;
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              padding: 15px;
              background: #f8f9ff;
            }
            .instructions {
              background: #f0f4ff;
              border: 2px solid #667eea;
              border-radius: 10px;
              padding: 15px;
              margin-top: 20px;
            }
            .instructions h4 {
              color: #667eea;
              margin-top: 0;
            }
            .validity {
              color: #4a5568;
              font-size: 0.8rem;
              margin-top: 15px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="header">
              <div class="member-name">${memberName}</div>
              <div class="member-details">
                📧 ${member.email}<br>
                📱 ${member.phone || 'N/A'}<br>
                💪 Plan: ${member.membership || 'Básico'}
              </div>
            </div>
            
            <div class="qr-image">
              <img src="${qrDataURL}" alt="QR Code" style="max-width: 250px; width: 100%;" />
            </div>
            
            <div class="instructions">
              <h4>📱 Instrucciones de Uso</h4>
              <p>1. Presenta este QR en recepción</p>
              <p>2. El personal escaneará tu código</p>
              <p>3. Se registrará tu entrada/salida automáticamente</p>
            </div>
            
            <div class="validity">
              ✅ Código válido hasta: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br>
              🔒 ID Único: ${member.id} | 🏢 Gimnasio ID: GYM_MVP_001
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    
    toast.success('🖨️ Preparando impresión...');
  };

  const sendToMember = () => {
    // Simular envío por email/WhatsApp
    toast.loading('📧 Enviando QR al miembro...');
    
    setTimeout(() => {
      toast.dismiss();
      toast.success(`✅ QR enviado a ${qrData.memberName} por email y WhatsApp`);
    }, 2000);
  };

  // Función para copiar los datos del QR al portapapeles
  const copyQRData = () => {
    if (!qrData) {
      toast.error('No hay datos de QR disponibles');
      return;
    }
    
    navigator.clipboard.writeText(JSON.stringify(qrData, null, 2))
      .then(() => {
        toast.success('📋 Datos del QR copiados al portapapeles');
      })
      .catch(() => {
        toast.error('❌ Error al copiar al portapapeles');
      });
  };

  return (
    <div className="qr-generator-container">
      <h4>🎯 Generar QR de Acceso</h4>
      
      {member ? (
        <div className="member-info-card">
          <h3>👤 {member.name}</h3>
          <div className="member-details">
            <div className="member-detail-item">
              <strong>ID:</strong> {member.id}
            </div>
            <div className="member-detail-item">
              <strong>Tipo:</strong> {member.membership || 'Básico'}
            </div>
            <div className="member-detail-item">
              <strong>Email:</strong> {member.email || 'No disponible'}
            </div>
            <div className="member-detail-item">
              <strong>Gimnasio UUID:</strong> {member.gym_id || <span style={{color:'red'}}>No asignado</span>}
            </div>
          </div>
          {(!member.gym_id) && (
            <div style={{color:'red',marginTop:'1em',fontWeight:'bold'}}>
              ⚠️ Este miembro no tiene un gimnasio asignado.<br/>
              No se puede generar el QR sin gym_id.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '2rem', color: 'red' }}>
          <h3>Error: No se encontraron datos del miembro</h3>
          <p>Member prop: {JSON.stringify(member)}</p>
        </div>
      )}

      {!qrGenerated ? (
        <div className="generate-section">
          <p>Genere un código QR único para este miembro que permitirá registrar su asistencia automáticamente.</p>
          <button 
            onClick={generateQR} 
            className="btn-primary generate-btn"
            disabled={!member || !member.gym_id}
            style={(!member || !member.gym_id) ? {opacity:0.5,cursor:'not-allowed'} : {}}
          >
            🎯 Generar Código QR
          </button>
          {(!member || !member.gym_id) && (
            <div style={{color:'red',marginTop:'0.5em'}}>
              No se puede generar el QR: falta gym_id.<br/>
              Verifica que el perfil tenga un gimnasio asignado.
            </div>
          )}
        </div>
      ) : (
        <div className="qr-result-section">
          <div className="qr-display">
            <div className="qr-visual">
              {qrDataURL ? (
                <img 
                  src={qrDataURL} 
                  alt="QR Code" 
                  style={{ 
                    maxWidth: '200px', 
                    width: '100%',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px',
                    background: 'white'
                  }}
                />
              ) : (
                <div className="qr-placeholder">
                  <p>Generando QR...</p>
                </div>
              )}
            </div>
            
            <div className="qr-info">
              <h4>✅ QR Generado Exitosamente</h4>
              {qrData && (
                <>
                  <p><strong>ID miembro (UUID):</strong> {JSON.parse(qrData).memberDbId}</p>
                  <p><strong>ID gimnasio (UUID):</strong> {JSON.parse(qrData).gymId}</p>
                  <p><strong>Nombre:</strong> {JSON.parse(qrData).n}</p>
                  <p><strong>Email:</strong> {JSON.parse(qrData).e}</p>
                  <p><strong>Plan:</strong> {JSON.parse(qrData).p}</p>
                  <p><strong>Hash:</strong> {JSON.parse(qrData).h}</p>
                  <p><strong>Válido hasta:</strong> {new Date(JSON.parse(qrData).exp).toLocaleDateString('es-ES')}</p>
                  <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#666' }}>
                    <strong>📋 Para pruebas manuales:</strong><br/>
                    <code style={{ background: '#f0f0f0', padding: '2px 4px', display:'block', marginTop:'4px' }}>{qrData}</code>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="qr-actions">
            <button onClick={downloadQR} className="btn-primary">
              📥 Descargar QR
            </button>
            
            <button onClick={printQR} className="btn-secondary">
              🖨️ Imprimir Tarjeta
            </button>
            
            <button onClick={sendToMember} className="btn-secondary">
              📧 Enviar al Miembro
            </button>
            
            <button onClick={copyQRData} className="btn-secondary">
              📋 Copiar Datos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}