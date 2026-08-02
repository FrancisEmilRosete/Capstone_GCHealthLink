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
    const token = getToken();
    if (!token || typeof window === 'undefined') return;

    // Use robust polling instead of SSE (EventSource) since backend is standard PHP-FPM
    const intervalId = setInterval(() => {
      for (const topic of topics) {
        callbackRef.current(topic, {});
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey]);
}
