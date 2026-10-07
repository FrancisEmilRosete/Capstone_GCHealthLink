import { useEffect } from 'react';
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
    authEndpoint: `${window.localStorage.getItem('gchl_api_base')?.replace(/\/+$/, '') || `http://${typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'}:8000`}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: 'Bearer cookie-auth',
      }
    }
  });
}

export function useUserPing(userId: number | string | null | undefined, callback: (type: string) => void) {
  const callbackRef = require('react').useRef(callback);

  require('react').useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!userId || !(window as any).Echo) return;

    // Listen to the private user channel
    const channel = (window as any).Echo.private(`App.Models.User.${userId}`);

    channel.listen('.UserPinged', (event: any) => {
      console.log('WebSockets Ping Received:', event.type);
      if (callbackRef.current) callbackRef.current(event.type);
    });

    return () => {
      channel.stopListening('.UserPinged');
    };
  }, [userId]);
}
