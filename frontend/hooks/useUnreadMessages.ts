import { useEffect, useState } from 'react';
import { getEcho } from '@/lib/echo';

export function useUnreadMessages(userId: number | string | null | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const echo = getEcho();
    if (!userId || !echo) return;

    // Listen to the private user channel
    const channel = (window as any).Echo.private(`App.Models.User.${userId}`);

    const handler = (event: any) => {
      setUnreadCount(event.unreadCount);
    };

    channel.listen('.UnreadCountUpdated', handler);

    return () => {
      channel.stopListening('.UnreadCountUpdated', handler);
    };
  }, [userId]);

  return { unreadCount, setUnreadCount };
}
