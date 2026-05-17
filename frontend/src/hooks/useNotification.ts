import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

interface NotificationData {
  senderName: string;
  messagePreview: string;
  avatar?: string;
  chatId: string;
}

export function useNotification() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const playSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch { /* autoplay blocked */ }
  }, []);

  const showNotification = useCallback((data: NotificationData) => {
    // Skip if currently viewing that chat
    const match = location.pathname.match(/\/chat\/(\d+)/);
    const currentChatId = match?.[1];
    if (currentChatId && String(data.chatId) === currentChatId) return;

    setNotification(data);
    setIsVisible(true);
    playSound();

    // Background system notification
    if (document.visibilityState === 'hidden' && permission === 'granted') {
      try {
        new Notification(data.senderName, { body: data.messagePreview, icon: '/favicon.svg', tag: data.chatId });
      } catch { /* */ }
    }
  }, [permission, playSound, location.pathname]);

  const hideNotification = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Listen for socket messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: any) => {
      if (!msg.senderId || !msg.content) return;
      if (msg.senderId === user?.id) return; // skip self messages
      const preview = msg.type === 'image' ? '[图片]' : msg.type === 'voice' ? '[语音]' : msg.content.slice(0, 40);
      const peerId = msg.receiverId || msg.senderId;
      showNotification({
        senderName: msg.sender?.nickname || msg.sender?.username || '新消息',
        messagePreview: preview,
        avatar: msg.sender?.avatar,
        chatId: peerId,
      });
    };
    socket.on('message:receive', handler);
    return () => { socket.off('message:receive', handler); };
  }, [socket, showNotification]);

  return { notification, isVisible, showNotification, hideNotification, permission, requestPermission };
}
