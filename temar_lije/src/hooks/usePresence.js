import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/constants';

/**
 * usePresence Hook
 * Tracks real-time presence (online/offline status) of all students & teachers, updating every 5 seconds.
 */
export function usePresence(providedSocket, currentUserId, currentUserEmail) {
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const socketRef = useRef(providedSocket);
  const internalSocketRef = useRef(null);

  const sendHeartbeat = useCallback(async () => {
    const id = currentUserId || currentUserEmail;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.onlineUserIds)) {
          setOnlineUserIds(new Set(data.onlineUserIds));
        }
      }
    } catch (err) {
      // silently ignore network jitter
    }
  }, [currentUserId, currentUserEmail]);

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
      // ignore
    }
  }, []);

  useEffect(() => {
    // 1. Initial presence check & immediate heartbeat
    fetchPresence();
    sendHeartbeat();

    // 2. 5-second interval for ongoing presence updates & heartbeat
    const interval = setInterval(() => {
      fetchPresence();
      sendHeartbeat();

      const activeSocket = socketRef.current || internalSocketRef.current;
      if (activeSocket) {
        activeSocket.emit('heartbeat', { userId: currentUserId || currentUserEmail });
      }
    }, 5000);

    // 3. Setup socket listeners (either provided socket or fallback global socket)
    let socket = providedSocket;
    if (!socket) {
      const localToken = localStorage.getItem('temar_token');
      socket = io(API_BASE_URL.replace('/api', ''), {
        transports: ['websocket', 'polling'],
        auth: { token: localToken, userId: currentUserId || currentUserEmail },
      });
      internalSocketRef.current = socket;
    }

    if (socket) {
      socket.on('presenceUpdate', (data) => {
        if (Array.isArray(data?.onlineUserIds)) {
          setOnlineUserIds(new Set(data.onlineUserIds));
        }
      });
      socket.emit('heartbeat', { userId: currentUserId || currentUserEmail });
    }

    return () => {
      clearInterval(interval);
      if (internalSocketRef.current) {
        internalSocketRef.current.disconnect();
        internalSocketRef.current = null;
      }
    };
  }, [fetchPresence, sendHeartbeat, providedSocket, currentUserId, currentUserEmail]);

  const isUserOnline = useCallback(
    (userId, userEmail) => {
      if (!userId && !userEmail) return false;
      const strId = userId ? String(userId) : '';
      const strEmail = userEmail ? String(userEmail).toLowerCase() : '';

      return (
        onlineUserIds.has(strId) ||
        (strEmail && onlineUserIds.has(strEmail)) ||
        (currentUserId && strId === String(currentUserId)) ||
        (currentUserEmail && strEmail === String(currentUserEmail).toLowerCase())
      );
    },
    [onlineUserIds, currentUserId, currentUserEmail]
  );

  return { onlineUserIds, isUserOnline };
}
