import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { startLiveSession as apiStartSession, endLiveSession as apiEndSession, getLiveToken } from '../services/apiClient';

const API_BASE_URL =
  import.meta.env?.VITE_WS_URL ||
  import.meta.env?.VITE_API_URL ||
  'http://localhost:3000';

const LiveClassContext = createContext(null);

export function LiveClassProvider({ children }) {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [activeClassId, setActiveClassId] = useState(null);
  const [activeClassName, setActiveClassName] = useState('Live Classroom');
  const [isTeacher, setIsTeacher] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'User', role: 'Student' });
  const [sessionToken, setSessionToken] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickModal, setQuickModal] = useState(null); // null | 'quiz' | 'materials' | 'attendance'
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [liveSocket, setLiveSocket] = useState(null);

  const socketRef = useRef(null);

  // Clean up socket when active session ends or component unmounts
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.emit('leaveLiveClass', { classId: activeClassId });
        socketRef.current.disconnect();
      } catch (e) {
        console.warn('Socket disconnect notice:', e);
      }
      socketRef.current = null;
      setLiveSocket(null);
    }
  }, [activeClassId]);

  const startSession = useCallback(
    async ({ classId, className = 'Live Classroom', teacher = false, user = { name: 'User' } }) => {
      if (isConnecting) return;
      setIsConnecting(true);
      setSessionError('');
      try {
        const cleanClassId = String(classId || '66666666-6666-4666-8666-666666666666');

        if (teacher) {
          try {
            await apiStartSession(cleanClassId);
          } catch (e) {
            console.warn('Backend start session notice:', e);
          }
        }

        const tokenRes = await getLiveToken(cleanClassId, user?.id || 'user-id');
        const token = tokenRes?.token || 'active-live-token';
        setSessionToken(token);

        // Initialize persistent WebSocket connection for live-class namespace
        const localToken = localStorage.getItem('temar_token');
        const socket = io(`${API_BASE_URL}/live-class`, {
          transports: ['websocket', 'polling'],
          auth: { token: localToken },
          query: { classId: cleanClassId },
        });

        socketRef.current = socket;
        setLiveSocket(socket);

        socket.on('connect', () => {
          socket.emit('joinRoom', { classId: cleanClassId });
          socket.emit('joinLiveSession', { classId: cleanClassId });
        });

        setActiveClassId(cleanClassId);
        setActiveClassName(className);
        setIsTeacher(teacher);
        setCurrentUser(user);
        setIsLiveActive(true);
        setIsMinimized(false);
      } catch (err) {
        console.error('Failed to initialize persistent live class session:', err);
        setSessionError(err.message || 'Could not start live session. Try again.');
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnecting]
  );

  const endSession = useCallback(async () => {
    if (!activeClassId) return;
    try {
      if (isTeacher) {
        try {
          await apiEndSession(activeClassId);
        } catch (e) {
          console.warn('Backend end session notice:', e);
        }
      }
    } finally {
      disconnectSocket();
      setIsLiveActive(false);
      setActiveClassId(null);
      setSessionToken(null);
      setIsMinimized(false);
      setQuickModal(null);
      setSessionError('');
    }
  }, [activeClassId, isTeacher, disconnectSocket]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const openQuickModal = useCallback((type) => {
    setQuickModal(type);
  }, []);

  const closeQuickModal = useCallback(() => {
    setQuickModal(null);
  }, []);

  const value = {
    isLiveActive,
    activeClassId,
    activeClassName,
    isTeacher,
    currentUser,
    sessionToken,
    isMinimized,
    isConnecting,
    sessionError,
    quickModal,
    liveSocket,
    startSession,
    endSession,
    toggleMinimize,
    setIsMinimized,
    openQuickModal,
    closeQuickModal,
    setQuickModal,
  };

  return <LiveClassContext.Provider value={value}>{children}</LiveClassContext.Provider>;
}

export function useLiveClass() {
  const context = useContext(LiveClassContext);
  if (!context) {
    throw new Error('useLiveClass must be used within a LiveClassProvider');
  }
  return context;
}

