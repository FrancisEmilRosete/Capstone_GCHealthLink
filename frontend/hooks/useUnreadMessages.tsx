'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getEcho } from '@/lib/echo';
import { getUserId, getToken } from '@/lib/auth';
import { api } from '@/lib/api';

interface UnreadMessagesContextType {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  markAllRead: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
  markAllRead: () => {},
});

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const userId = isClient ? getUserId() : null;
  const token = isClient ? getToken() : null;

  // 1. Initial Sync on mount
  useEffect(() => {
    if (token) {
      api.get<{ success: boolean; count: number }>('/messages/unread-count', token)
        .then(res => setUnreadCount(res.count ?? 0))
        .catch(() => {});
    }
  }, [token]);

  // 2. Exact state update from event listener
  useEffect(() => {
    const echo = getEcho();
    if (!userId || !echo) return;

    const channel = echo.private(`App.Models.User.${userId}`);
    const handler = (event: any) => {
      // 2. Exact State Update to the count provided by backend
      setUnreadCount(event.unreadCount);
    };

    channel.listen('.UnreadCountUpdated', handler);
    return () => {
      channel.stopListening('.UnreadCountUpdated', handler);
    };
  }, [userId]);

  const markAllRead = useCallback(() => {
    // 3. Mark as Read Logic: instantly set local unreadCount state to 0
    setUnreadCount(0);
    if (token) {
      // Send an asynchronous request to the backend
      api.patch('/messages/read-all', {}, token).catch(() => {});
    }
  }, [token]);

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, setUnreadCount, markAllRead }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

// 4. Role-Agnostic Context hook
export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}
