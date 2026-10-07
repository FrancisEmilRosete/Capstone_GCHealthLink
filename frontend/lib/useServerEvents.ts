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

// Setup Pusher connection once
if (typeof window !== 'undefined' && !(window as any).Echo && process.env.NEXT_PUBLIC_PUSHER_APP_KEY) {
  (window as any).Pusher = Pusher;
  (window as any).Echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER,
    forceTLS: true,
    withCredentials: true,
    authEndpoint: `${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || window.localStorage.getItem('gchl_api_base')?.replace(/\/+$/, '') || `http://${typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'}:8000`}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: 'Bearer cookie-auth',
        Accept: 'application/json',
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

    const onQueue = (e: any) => callbackRef.current('queue', e);
    const onVisits = (e: any) => callbackRef.current('visits', e);

    if (topics.includes('queue')) {
      echo.channel('clinic.queue').listen('.QueueUpdated', onQueue);
    }

    if (topics.includes('visits')) {
      echo.channel('clinic.visits').listen('.VisitsUpdated', onVisits);
    }

    return () => {
      // Remove only this hook's handlers; other components share the channels.
      if (topics.includes('queue')) {
        echo.channel('clinic.queue').stopListening('.QueueUpdated', onQueue);
      }
      if (topics.includes('visits')) {
        echo.channel('clinic.visits').stopListening('.VisitsUpdated', onVisits);
      }
    };
  }, [topicsKey]);
}
