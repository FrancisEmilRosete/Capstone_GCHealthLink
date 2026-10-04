/**
 * useServerEvents
 * ─────────────────────────────────────────────────────────
 * Subscribes to the backend SSE stream and calls a callback whenever
 * one of the specified event topics fires.  Automatically reconnects
 * on drop (browser handles native EventSource reconnection).
 *
 * Usage:
 *   useServerEvents(['queue', 'visits'], () => { void refetch(); });
 */
'use client';

import { useEffect, useRef } from 'react';
import { getToken } from '@/lib/auth';
import { API_PREFIX } from '@/lib/api';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Setup Reverb connection once
if (typeof window !== 'undefined' && !(window as any).Echo && process.env.NEXT_PUBLIC_REVERB_APP_KEY) {
  (window as any).Pusher = Pusher;
  (window as any).Echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: process.env.NEXT_PUBLIC_REVERB_PORT ? Number(process.env.NEXT_PUBLIC_REVERB_PORT) : 8080,
    wssPort: process.env.NEXT_PUBLIC_REVERB_PORT ? Number(process.env.NEXT_PUBLIC_REVERB_PORT) : 8080,
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${window.localStorage.getItem('gchl_api_base')?.replace(/\/+$/, '') || 'http://127.0.0.1:8000'}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: 'Bearer cookie-auth',
      }
    }
  });
}

type SseCallback = (topic: string, data: unknown) => void;

let resolvedBase: string | null = null;

function getApiBase(): string {
  if (resolvedBase) return resolvedBase;
  // Reuse the cached base that api.ts discovers at runtime.
  const cached =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('gchl_api_base')
      : null;
  resolvedBase = cached ? cached.replace(/\/+$/, '') : '';
  return resolvedBase;
}

export function useServerEvents(
  topics: string[],
  callback: SseCallback,
): void {
  const callbackRef = useRef<SseCallback>(callback);
  callbackRef.current = callback;

  const topicsKey = topics.slice().sort().join(',');

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).Echo) return;
    const echo = (window as any).Echo;

    if (topics.includes('queue')) {
      echo.channel('clinic.queue').listen('.QueueUpdated', (e: any) => {
        callbackRef.current('queue', e);
      });
    }

    if (topics.includes('visits')) {
      echo.channel('clinic.visits').listen('.VisitsUpdated', (e: any) => {
        callbackRef.current('visits', e);
      });
    }

    return () => {
      // We don't strictly echo.leave() here to avoid breaking other components 
      // listening to the same public channels, but we could if we tracked instances.
    };
  }, [topicsKey]);
}
