import { useEffect, useState } from 'react';
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

export function useUnreadMessages(userId: number | string | null | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId || !(window as any).Echo) return;

    // Listen to the private user channel
    const channel = (window as any).Echo.private(`App.Models.User.${userId}`);

    channel.listen('.UnreadCountUpdated', (event: any) => {
      console.log('Instant update received via WebSockets!', event);
      setUnreadCount(event.unreadCount);
    });

    return () => {
      channel.stopListening('.UnreadCountUpdated');
    };
  }, [userId]);

  return { unreadCount, setUnreadCount };
}
