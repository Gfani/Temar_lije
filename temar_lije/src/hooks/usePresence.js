import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/constants';

/**
 * usePresence Hook
 * Tracks real-time presence (online/offline status) of users, updating every 5 seconds.
 */
export function usePresence(socket, currentUserId) {
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const socketRef = useRef(socket);
  socketRef.current = socket;

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/presence`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.onlineUserIds)) {
          setOnlineUserIds(new Set(data.onlineUserIds));
        }
      }
    } catch (err) {
      // silently ignore presence network hiccups
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPresence();

    // 5-second polling interval for online/offline updates
    const interval = setInterval(() => {
      fetchPresence();
      if (socketRef.current && currentUserId) {
        socketRef.current.emit('heartbeat', { userId: currentUserId });
      }
    }, 5000);

    // Socket real-time presence listener
    if (socketRef.current) {
      socketRef.current.on('presenceUpdate', (data) => {
        if (Array.isArray(data?.onlineUserIds)) {
          setOnlineUserIds(new Set(data.onlineUserIds));
        }
      });
      if (currentUserId) {
        socketRef.current.emit('heartbeat', { userId: currentUserId });
      }
    }

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.off('presenceUpdate');
      }
    };
  }, [fetchPresence, currentUserId]);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      if (currentUserId && userId === currentUserId) return true;
      return onlineUserIds.has(userId) || onlineUserIds.has(String(userId));
    },
    [onlineUserIds, currentUserId]
  );

  return { onlineUserIds, isUserOnline };
}
