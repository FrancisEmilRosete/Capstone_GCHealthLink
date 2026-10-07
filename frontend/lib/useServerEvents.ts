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
import { getEcho } from '@/lib/echo';

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
