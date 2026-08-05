import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, AlertTriangle } from 'lucide-react';

interface Props {
  onScanned: (token: string) => void;
  onClose: () => void;
}

export function QRScannerModal({ onScanned, onClose }: Props) {
  const tx = (source: string) => source;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState('');
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.play();
        requestAnimationFrame(tick);
      })
      .catch((e) => {
        if (!active) return;
        setErr(e?.name === 'NotAllowedError'
          ? tx('Camera permission denied. Please allow camera access and try again.')
          : tx('Could not access camera. Make sure no other app is using it.'));
      });

    function tick() {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code?.data) {
        setScanning(false);
        cleanup();
        onScanned(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function cleanup() {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    }

    return cleanup;
  }, [onScanned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#111' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-white/70" />
            <span className="text-white text-sm font-semibold">{tx('Scan Customer QR Code')}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative" style={{ aspectRatio: '1 / 1', background: '#000' }}>
          {err ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle size={36} className="text-amber-400" />
              <p className="text-white/80 text-sm">{err}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              {/* Finder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-52 h-52">
                  {/* Corner brackets */}
                  {[['top-0 left-0', 'border-t-2 border-l-2'],
                    ['top-0 right-0', 'border-t-2 border-r-2'],
                    ['bottom-0 left-0', 'border-b-2 border-l-2'],
                    ['bottom-0 right-0', 'border-b-2 border-r-2'],
                  ].map(([pos, border]) => (
                    <div key={pos} className={`absolute w-6 h-6 ${pos} ${border} border-violet-400`} />
                  ))}
                  {scanning && (
                    <div
                      className="absolute left-0 right-0 h-0.5 animate-bounce"
                      style={{ background: 'rgba(139,92,246,0.7)', top: '50%' }}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-white/50 text-xs text-center px-4 py-3">
          {tx('Ask the customer to open their booking and show you the QR code')}
        </p>
      </div>
    </div>
  );
}
