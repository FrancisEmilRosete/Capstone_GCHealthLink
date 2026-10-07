import { useEffect } from 'react';
import { getEcho } from '@/lib/echo';

export function useUserPing(userId: number | string | null | undefined, callback: (type: string, data?: any) => void) {
  const callbackRef = require('react').useRef(callback);

  require('react').useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const echo = getEcho();
    if (!userId || !echo) return;

    // Listen to the private user channel
    const channel = (window as any).Echo.private(`App.Models.User.${userId}`);

    const handler = (event: any) => {
      console.log('WebSockets Ping Received:', event.type);
      if (callbackRef.current) callbackRef.current(event.type, event.data);
    };

    channel.listen('.UserPinged', handler);

    return () => {
      // Remove only THIS listener — other components share the same channel.
      channel.stopListening('.UserPinged', handler);
    };
  }, [userId]);
}
