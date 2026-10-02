import { useEffect } from 'react';
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
  });
}

export function useUserPing(userId: number | string | null | undefined, callback: (type: string) => void) {
  useEffect(() => {
    if (!userId || !(window as any).Echo) return;

    // Listen to the private user channel
    const channel = (window as any).Echo.private(`App.Models.User.${userId}`);

    channel.listen('.UserPinged', (event: any) => {
      console.log('WebSockets Ping Received:', event.type);
      callback(event.type);
    });

    return () => {
      (window as any).Echo.leave(`App.Models.User.${userId}`);
    };
  }, [userId, callback]);
}
