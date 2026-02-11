import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getGymMembersForQR } from '../../api/attendance.api';
import jsQR from 'jsqr';

export default function QRScanner({ onScan, gymId }) {
  const [isScanning, setIsScanning] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [realMembers, setRealMembers] = useState([]);
  const [scanStatus, setScanStatus] = useState('idle'); // idle, success, error
  const [recentScans, setRecentScans] = useState([]);
  const [lastScanTime, setLastScanTime] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cargar miembros reales al montar
  useEffect(() => {
    async function fetchMembers() {
      const gym = gymId || (window.localStorage && window.localStorage.getItem('gym_id'));
      if (!gym) {
        toast.error('No se encontró el ID del gimnasio');
        return;
      }
      const res = await getGymMembersForQR(gym);
      if (res.success) {
        setRealMembers(res.members);
      } else {
        toast.error('Error cargando miembros reales');
      }
    }
    fetchMembers();
  }, [gymId]);

  const startCamera = async () => {
    setLoadingCamera(true);
    try {
      setIsScanning(true);
      // Detectar si es móvil
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      let videoConstraints = { width: { ideal: 640 }, height: { ideal: 480 } };
      if (isMobile) {
        videoConstraints.facingMode = { ideal: 'environment' };
      }
      // Solicitar cámara solo tras interacción del usuario
      if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) {
        toast.error('Este navegador no soporta acceso a la cámara');
        setLoadingCamera(false);
        setScanStatus('camera-error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        toast.success('📱 Cámara activada - Apunte al código QR');
        setLoadingCamera(false);
        startQRDetection();
      }
    } catch (error) {
      let msg = '❌ Error al acceder a la cámara';
      if (error && error.name) {
        if (error.name === 'NotAllowedError') {
          msg = 'Permiso de cámara denegado. Permite el acceso en el navegador.';
        } else if (error.name === 'NotFoundError') {
          msg = 'No se encontró ninguna cámara conectada.';
        } else if (error.name === 'NotReadableError') {
          msg = 'La cámara está siendo usada por otra aplicación.';
        } else if (error.name === 'OverconstrainedError') {
          msg = 'No se encontró cámara que cumpla los requisitos.';
        } else if (error.message) {
          msg += ': ' + error.message;
        }
      }
      toast.error(msg);
      setIsScanning(false);
      setLoadingCamera(false);
      setScanStatus('camera-error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    toast.success('📱 Cámara desactivada');
  };

  const startQRDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let lastQR = null;
    let lastScan = '';
    const scanInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          // Feedback visual: marco verde si detecta, rojo si no
          setScanStatus('success');
          // Bloqueo de duplicados: solo escanea si han pasado 3 segundos
          if (code.data !== lastScan && Date.now() - lastScanTime > 3000) {
            lastScan = code.data;
            setLastScanTime(Date.now());
            // Sonido/vibración
            if (window.navigator.vibrate) window.navigator.vibrate(200);
            const audio = new window.AudioContext();
            const beep = audio.createOscillator();
            beep.type = 'sine';
            beep.frequency.value = 880;
            beep.connect(audio.destination);
            beep.start();
            setTimeout(() => beep.stop(), 120);
            // Historial de escaneos
            setRecentScans(prev => [{ data: code.data, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
            toast.success('🎯 QR detectado');
            onScan(code.data);
          }
        } else {
          setScanStatus('error');
        }
      }
    }, 300);
    return () => clearInterval(scanInterval);
  };

  // Simulación: escanear un miembro real aleatorio de la BD
  const handleVideoClick = () => {
    // Eliminar simulación: no hacer nada al hacer clic en el video
    // El escaneo debe depender solo de la lectura real del QR por la cámara
    return;
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) {
      toast.error('❌ Ingrese un código válido');
      return;
    }
    try {
      let qrData;
      // Buscar por ID corto, ID tipo M001, o número
      let member = null;
      if (manualInput.match(/^M\d{3}$/)) {
        // Buscar por shortId generado
        member = realMembers.find(m => m.shortId === manualInput);
      } else if (manualInput.match(/^[a-f0-9]{6}$/i)) {
        member = realMembers.find(m => (m.shortId || '').toLowerCase() === manualInput.toLowerCase());
      } else if (/^\d+$/.test(manualInput)) {
        // Buscar por número secuencial
        const idx = parseInt(manualInput, 10) - 1;
        if (idx >= 0 && idx < realMembers.length) {
          member = realMembers[idx];
        }
      } else if (manualInput.startsWith('{')) {
        qrData = manualInput;
        toast.success('🎯 JSON QR procesado');
      }
      if (member) {
        qrData = JSON.stringify({
          t: 'gym',
          memberDbId: member.id,
          gymId: member.gymId || member.gym_id,
          n: member.name,
          e: member.email,
          p: member.membership,
          ts: Date.now(),
          exp: Date.now() + (365 * 24 * 60 * 60 * 1000),
          h: (member.shortId || '').toLowerCase()
        });
        toast.success(`🎯 ID procesado: ${member.shortId || member.id} - ${member.name}`);
      } else if (!qrData) {
        toast.error('❌ Miembro no encontrado');
        return;
      }
      onScan(qrData);
      setManualInput('');
    } catch (error) {
      toast.error('❌ Formato de código inválido');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="qr-scanner-container">
      <div className="dashboard-section">
        <h2>📱 Escáner de Códigos QR</h2>
        <div className="scanner-area">
          <div className="camera-container">
            {isScanning ? (
              <div className="camera-view">
                {loadingCamera && (
                  <div className="camera-loader">
                    <div className="loader"></div>
                    <p>Activando cámara...</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  onClick={handleVideoClick}
                  className="camera-video"
                  autoPlay
                  playsInline
                  muted
                  style={{ border: scanStatus === 'success' ? '4px solid #38a169' : scanStatus === 'error' ? '4px solid #e53e3e' : '4px solid #ddd', transition: 'border 0.2s' }}
                />
                <canvas
                  ref={canvasRef}
                  className="camera-canvas"
                  style={{ display: 'none' }}
                />
                <div className="scan-overlay">
                  <div className="scan-box">
                    <div className="scan-corners"></div>
                    <p>Posicione el código QR dentro del marco</p>
                    <small>👆 Haga clic para simular escaneo</small>
                  </div>
                </div>
              </div>
            ) : (
              <div className="camera-placeholder">
                <div className="camera-icon">📱</div>
                <h3>Escáner QR Desactivado</h3>
                <p>Active la cámara para comenzar a escanear códigos QR</p>
                <button onClick={startCamera} className="btn-primary" style={{ marginTop: 10 }}>🔄 Reintentar Cámara</button>
              </div>
            )}
          </div>
          {scanStatus === 'camera-error' && (
            <div style={{color:'red',background:'#fff3f3',padding:'1em',borderRadius:'8px',margin:'1em 0',textAlign:'center'}}>
              <p>❌ No se pudo acceder a la cámara.<br/>Permite el acceso en tu navegador móvil.<br/>Si bloqueaste el permiso, revisa la configuración y vuelve a intentarlo.</p>
              <button className="btn-primary" onClick={startCamera} style={{marginTop:'10px'}}>🔄 Reintentar acceso a cámara</button>
            </div>
          )}
          <div className="scanner-controls">
            {!isScanning ? (
              <button 
                onClick={startCamera} 
                className="btn-primary scanner-btn"
              >
                📷 Activar Cámara
              </button>
            ) : (
              <button 
                onClick={stopCamera} 
                className="btn-secondary scanner-btn"
              >
                🚫 Desactivar Cámara
              </button>
            )}
          </div>
        </div>
        {/* Historial de escaneos recientes */}
        {recentScans.length > 0 && (
          <div className="recent-scans" style={{ marginTop: 20 }}>
            <h4>Últimos escaneos</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem' }}>
              {recentScans.map((scan, idx) => {
                let info = null;
                try {
                  info = typeof scan.data === 'string' ? JSON.parse(scan.data) : scan.data;
                } catch {
                  info = null;
                }
                return (
                  <div key={idx} className="scan-card" style={{
                    background: 'linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 12px rgba(102,126,234,0.08)',
                    padding: '1.2rem 1.5rem',
                    minWidth: 260,
                    maxWidth: 340,
                    flex: '1 1 260px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <span style={{ fontSize: '1.5em', color: '#667eea' }}>📄</span>
                      <span style={{ color: '#38a169', fontWeight: 600 }}>{scan.time}</span>
                    </div>
                    {info ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '1.1em', color: '#2d3a4a' }}>{info.n || 'Miembro'}</div>
                        <div style={{ color: '#667eea', fontSize: '0.98em' }}>Membresía: <strong>{info.p || '-'}</strong></div>
                        <div style={{ color: '#4a5568', fontSize: '0.97em' }}>Email: <span style={{ color: '#764ba2' }}>{info.e || '-'}</span></div>
                        <div style={{ color: '#4a5568', fontSize: '0.97em' }}>ID: <span style={{ color: '#667eea' }}>{info.memberDbId || info.id || '-'}</span></div>
                        <div style={{ color: '#4a5568', fontSize: '0.97em' }}>Gimnasio: <span style={{ color: '#667eea' }}>{info.gymId || '-'}</span></div>
                        <div style={{ color: '#2d3a4a', fontWeight: 500, fontSize: '1em' }}>
                          Estado: <span style={{ color: info.t === 'gym' ? '#38a169' : '#e53e3e', fontWeight: 600 }}>{info.t === 'gym' ? 'Entrada/Salida registrada' : 'Desconocido'}</span>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.95em' }}>Hora escaneo: <strong>{scan.time}</strong></div>
                      </>
                    ) : (
                      <div style={{ color: '#e53e3e', fontWeight: 600 }}>Formato no reconocido</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Entrada manual eliminada: ahora el registro manual se realiza desde la pestaña correspondiente en QRAttendance.jsx */}

      {/*
        <div className="dashboard-section">
          <h2>🧪 Modo de Prueba - IDs Cortos</h2>
          <p>Botones para simular escaneo de diferentes usuarios con formato nuevo</p>
          <div className="test-buttons">
            {realMembers.map((member, idx) => (
              <button
                key={member.id}
                onClick={() => {
                  const qrData = JSON.stringify({
                    t: 'gym',
                    id: member.shortId || member.id,
                    n: member.name,
                    e: member.email,
                    p: member.membership,
                    g: member.gymId,
                    ts: Date.now(),
                    exp: Date.now() + (365 * 24 * 60 * 60 * 1000),
                    h: (member.shortId || '').toLowerCase()
                  });
                  onScan(qrData);
                }}
                className="btn-test"
              >
                {member.name} ({member.shortId || member.id} - {member.membership})
              </button>
            ))}
          </div>
        </div>
      */}
    </div>
  );
}