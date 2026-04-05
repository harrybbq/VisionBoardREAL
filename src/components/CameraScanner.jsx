import { useRef, useEffect, useState } from 'react';

/**
 * CameraScanner — mobile-only camera viewfinder
 *
 * Uses BarcodeDetector (Chrome 88+, Android) for live barcode scanning.
 * Falls back gracefully on unsupported browsers.
 * "Identify Food with AI" captures a frame and sends to the ai-food-detect function.
 *
 * Callbacks:
 *   onBarcode(code: string)  — raw barcode value detected
 *   onAIResult(food: object) — AI-identified food object (matches FoodLogSheet prefill shape)
 *   onError(msg: string)     — camera / AI error message
 */
export default function CameraScanner({ onBarcode, onAIResult, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const foundRef = useRef(false);

  const [status, setStatus] = useState('starting'); // starting | scanning | found | identifying | error
  const [msg, setMsg] = useState('');

  // Init BarcodeDetector
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39', 'itf'],
        });
      } catch {}
    }
  }, []);

  // Start camera stream
  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('scanning');
          if (detectorRef.current) startScanLoop();
        }
      } catch (e) {
        const errMsg = e.name === 'NotAllowedError'
          ? 'Camera permission denied — please allow camera access in your browser settings.'
          : 'Could not access camera. Try the text search instead.';
        setStatus('error');
        setMsg(errMsg);
        onError?.(errMsg);
      }
    }

    start();
    return () => {
      mounted = false;
      stopAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function startScanLoop() {
    async function loop() {
      if (foundRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes.length > 0 && !foundRef.current) {
          foundRef.current = true;
          const raw = codes[0].rawValue;
          stopAll();
          setStatus('found');
          setMsg(`Barcode: ${raw}`);
          onBarcode?.(raw);
          return;
        }
      } catch {}
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  async function handleIdentify() {
    if (!videoRef.current) return;
    setStatus('identifying');
    setMsg('');
    try {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

      const res = await fetch('/.netlify/functions/ai-food-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || 'AI detection failed');
      if (!data.food_name) throw new Error('Could not identify food — point at the packaging or dish');

      setStatus('scanning');
      setMsg('');
      onAIResult?.(data);
    } catch (e) {
      setStatus('scanning');
      setMsg(e.message || 'Identification failed — try again or use text search.');
    }
  }

  const hasBarcodeDetector = !!detectorRef.current;

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', width: '100%', aspectRatio: '4/3' }}>
      {/* Video */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'error' ? 'none' : 'block' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Scan guide */}
      {status === 'scanning' && hasBarcodeDetector && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* Corner brackets */}
          {[['8px','8px','borderTop','borderLeft'],['8px','auto','borderTop','borderRight'],['auto','8px','borderBottom','borderLeft'],['auto','auto','borderBottom','borderRight']].map(([t,r,bv,bh], i) => (
            <div key={i} style={{
              position: 'absolute', top: t === 'auto' ? 'auto' : '20%', bottom: t === 'auto' ? '20%' : 'auto',
              left: r === 'auto' ? 'auto' : '10%', right: r === 'auto' ? '10%' : 'auto',
              width: 24, height: 24, [bv]: '2px solid var(--em)', [bh]: '2px solid var(--em)',
            }} />
          ))}
          {/* Scan line */}
          <div style={{
            position: 'absolute', left: '10%', right: '10%', height: '2px',
            background: 'var(--em)', boxShadow: '0 0 8px var(--em)',
            animation: 'cam-scan 2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Status message bar */}
      {msg && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.72)', padding: '8px 14px', fontSize: '12px', color: status === 'found' ? '#4dc485' : '#fff', fontFamily: 'var(--mono)', textAlign: 'center' }}>
          {msg}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#e05252', fontFamily: 'var(--mono)', fontSize: '13px', lineHeight: 1.6 }}>
          {msg || 'Camera unavailable'}
        </div>
      )}

      {/* Starting spinner */}
      {status === 'starting' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
          Starting camera…
        </div>
      )}

      {/* No BarcodeDetector notice */}
      {status === 'scanning' && !hasBarcodeDetector && (
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <span style={{ background: 'rgba(0,0,0,.65)', color: 'rgba(255,255,255,.8)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontFamily: 'var(--mono)' }}>
            Auto-scan not supported — use AI or text search
          </span>
        </div>
      )}

      {/* AI identify button */}
      {(status === 'scanning' || status === 'identifying') && (
        <button
          onClick={handleIdentify}
          disabled={status === 'identifying'}
          style={{
            position: 'absolute', bottom: msg ? '44px' : '14px', left: '50%', transform: 'translateX(-50%)',
            padding: '9px 20px', borderRadius: 'var(--radius-full)',
            background: status === 'identifying' ? 'rgba(26,122,74,.7)' : 'var(--em)',
            color: '#fff', border: 'none', cursor: status === 'identifying' ? 'default' : 'pointer',
            fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
            boxShadow: '0 2px 12px rgba(0,0,0,.45)', whiteSpace: 'nowrap',
            opacity: status === 'identifying' ? 0.8 : 1,
          }}
        >
          {status === 'identifying' ? '🤖 Identifying…' : '🤖 Identify Food with AI'}
        </button>
      )}
    </div>
  );
}
