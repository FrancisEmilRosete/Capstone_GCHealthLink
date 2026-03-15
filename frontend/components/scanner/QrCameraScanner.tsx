/**
 * QR CAMERA SCANNER COMPONENT
 * ──────────────────────────────────────────────────────────────
 * Wraps the `html5-qrcode` library in a React component.
 * Renders a live camera viewfinder that automatically decodes
 * QR codes and calls `onScan` with the decoded text.
 *
 * Must be a 'use client' component — html5-qrcode is browser-only.
 * Import it with dynamic({ ssr: false }) in the parent page.
 *
 * Props:
 *   onScan   → called with the decoded QR string on success
 *   onError  → optional: called with error messages (non-fatal)
 *   active   → set to false to stop the camera (default: true)
 */

'use client';

import { useEffect, useId, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrCameraScannerProps {
  onScan:   (text: string) => void;
  onError?: (err: string) => void;
  active?:  boolean;
}

// Unique DOM id for the html5-qrcode mount point
const SCANNER_ELEMENT_ID = 'gc-qr-scanner';

export default function QrCameraScanner({
  onScan,
  onError,
  active = true,
}: QrCameraScannerProps) {
  const instanceId = useId();
  const scannerElementId = `${SCANNER_ELEMENT_ID}-${instanceId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunning  = useRef(false);

  useEffect(() => {
    if (!active) {
      void stopScanner();
      return;
    }

    // Small delay so the DOM element is mounted before we attach
    const timer = setTimeout(() => startScanner(), 100);
    return () => {
      clearTimeout(timer);
      void stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function startScanner() {
    if (isRunning.current || scannerRef.current) return;

    try {
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // QR code successfully decoded — stop camera and notify parent
          stopScanner();
          onScan(decodedText);
        },
        (errorMsg) => {
          // Non-fatal scan errors (no QR in frame) — suppress noisy logs
          if (onError && !errorMsg.includes('No MultiFormat Readers')) {
            onError(errorMsg);
          }
        },
      );
      isRunning.current = true;
    } catch (err) {
      // Camera permission denied or not available
      if (onError) onError(String(err));
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        if (isRunning.current) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      isRunning.current = false;
      scannerRef.current = null;
    }
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* html5-qrcode mounts the <video> element inside this div */}
      <div
        id={scannerElementId}
        className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100"
      />

      {/* Teal corner-bracket overlay on top of the live video */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-52 h-52">
          <span className="absolute top-0 left-0  w-9 h-9 border-t-[3px] border-l-[3px] border-teal-400 rounded-tl-xl" />
          <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-teal-400 rounded-tr-xl" />
          <span className="absolute bottom-0 left-0  w-9 h-9 border-b-[3px] border-l-[3px] border-teal-400 rounded-bl-xl" />
          <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-teal-400 rounded-br-xl" />
          {/* Animated scan line */}
          <span className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-scan" />
        </div>
      </div>
    </div>
  );
}
