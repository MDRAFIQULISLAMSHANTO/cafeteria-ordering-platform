"use client";

import { useEffect, useRef, useState } from "react";

// Scan a customer's QR code with the device camera (counter tablet or phone).
// Uses the browser's built-in BarcodeDetector where available (Chrome on
// Android/macOS), otherwise decodes frames with jsQR. A USB scanner that types
// into the lookup box still works as before.

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export function QrCamera({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // the camera starts once; the latest callback is read through a ref
  const handler = useRef(onCode);
  useEffect(() => { handler.current = onCode; }, [onCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError("Camera not available. Allow camera access, or type the order number instead.");
        return;
      }
      const v = video.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});

      const Native = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const native = Native ? new Native({ formats: ["qr_code"] }) : null;
      const jsQR = native ? null : (await import("jsqr")).default;

      const tick = async () => {
        if (stopped) return;
        if (v.readyState >= 2 && v.videoWidth) {
          let value: string | null = null;
          if (native) {
            const found = await native.detect(v).catch(() => []);
            value = found[0]?.rawValue ?? null;
          } else if (jsQR) {
            const w = 480;
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            value = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
          if (value) {
            stopped = true;
            navigator.vibrate?.(60);
            handler.current(value);
            return;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-kds-bar">
      <div className="relative aspect-[4/3] w-full bg-kds-bg">
        <video ref={video} playsInline muted className="h-full w-full object-cover" aria-label="Camera view for scanning the customer's QR code" />
        {!error && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[58%] w-[58%] max-w-72 rounded-2xl border-4 border-primary-ink/90 shadow-[0_0_0_9999px_var(--o-overlay)]" />
          </div>
        )}
        {error && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-kds-btn-ink">{error}</p>}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="o-hint">Point the camera at the customer&apos;s QR code</span>
        <button type="button" className="staff-btn" onClick={onClose}>Close camera</button>
      </div>
    </div>
  );
}
