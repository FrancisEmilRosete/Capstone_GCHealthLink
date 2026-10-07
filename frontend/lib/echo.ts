/**
 * Shared Laravel Echo (Pusher) client
 * ──────────────────────────────────────────────────────────────
 * Single place where the realtime connection is created so every hook
 * shares ONE socket.
 *
 * Private channels need to be authorized by POST /api/broadcasting/auth.
 * pusher-js's built-in XHR authorizer does NOT send cookies to another
 * domain (Vercel → Render), so the HttpOnly `auth_token` cookie never
 * reached Laravel and every private subscription failed with 403.
 * We use a custom authorizer built on fetch(..., { credentials: 'include' }).
 */
'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { API_BASE, API_PREFIX } from '@/lib/api';

type AuthCallback = (error: Error | null, data: { auth: string; channel_data?: string } | null) => void;

declare global {
  interface Window {
    Pusher?: typeof Pusher;
    Echo?: Echo<'pusher'>;
  }
}

function authEndpoint(): string {
  return `${API_BASE}${API_PREFIX}/broadcasting/auth`;
}

export function getEcho(): Echo<'pusher'> | null {
  if (typeof window === 'undefined') return null;
  if (window.Echo) return window.Echo;

  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  if (!key) {
    console.warn('[realtime] NEXT_PUBLIC_PUSHER_APP_KEY is not set — realtime disabled.');
    return null;
  }

  window.Pusher = Pusher;

  window.Echo = new Echo({
    broadcaster: 'pusher',
    key,
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'ap1',
    forceTLS: true,
    // Custom authorizer so the HttpOnly auth cookie is sent cross-origin.
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: AuthCallback) => {
        fetch(authEndpoint(), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
        })
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(`Broadcast auth failed (${res.status}) for ${channel.name}`);
            }
            return res.json();
          })
          .then((data) => callback(null, data))
          .catch((err: Error) => {
            console.error('[realtime]', err.message);
            callback(err, null);
          });
      },
    }),
  } as any);

  return window.Echo;
}
