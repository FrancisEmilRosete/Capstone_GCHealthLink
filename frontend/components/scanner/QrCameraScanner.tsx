/**
 * QR HID SCANNER INPUT COMPONENT
 * -----------------------------------------------------------------
 * Captures keyboard-wedge scanner input from a connected QR scanner
 * (USB/Bluetooth HID mode). Most scanners type the QR payload then
 * send Enter/Tab as a suffix.
 *
 * Props:
 *   onScan  -> called with the scanned QR string on submit
 *   active  -> set to false to pause listening (default: true)
 */

'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface QrHidScannerProps {
  onScan:   (text: string) => void;
  active?:  boolean;
}

export default function QrHidScanner({
  onScan,
  active = true,
}: QrHidScannerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [scanValue, setScanValue] = useState('');

  useEffect(() => {
    if (!active || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
  }, [active]);

  function submitScan(rawValue: string) {
    const value = rawValue.trim();
    if (!value || !active) return;
    setScanValue('');
    onScan(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      submitScan(scanValue);
    }
  }

  return (
    <div
      className="relative w-full max-w-sm mx-auto"
      onClick={() => {
        if (active) inputRef.current?.focus();
      }}
    >
      <div
        className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-teal-50 via-white to-cyan-50 border border-teal-100"
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-52 h-52">
          <span className="absolute top-0 left-0  w-9 h-9 border-t-[3px] border-l-[3px] border-teal-400 rounded-tl-xl" />
          <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-teal-400 rounded-tr-xl" />
          <span className="absolute bottom-0 left-0  w-9 h-9 border-b-[3px] border-l-[3px] border-teal-400 rounded-bl-xl" />
          <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-teal-400 rounded-br-xl" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/90 px-4 py-2 shadow-sm border border-teal-100 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Scanner Ready</p>
              <p className="text-[11px] text-gray-500 mt-1">Scan using connected QR scanner</p>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        value={scanValue}
        onChange={(event) => setScanValue(event.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        disabled={!active}
        className="absolute inset-0 opacity-0"
        aria-label="QR scanner input"
      />
    </div>
  );
}
