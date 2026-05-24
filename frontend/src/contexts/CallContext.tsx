import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import CallScreen from '../components/CallScreen';
import { type CallStatus } from '../hooks/useWebRTC';
import { getCallReadinessError, getRtcConfig } from '../utils/rtcConfig';

interface CallContextValue {
  callStatus: CallStatus;
  startCall: (targetId: string) => void;
}

const CallContext = createContext<CallContextValue>({
  callStatus: 'idle',
  startCall: () => {},
});

const CALL_TIMEOUT = 30000;

export function CallProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerAvatar, setCallerAvatar] = useState('');

  const callStatusRef = useRef(callStatus);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  const cleanup = useCallback(() => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (audioRef.current) { audioRef.current.srcObject = null; }
    pendingCandidatesRef.current = [];
    setCallStatus('idle');
    setIsMuted(false);
    setPeerId('');
    setCallerName('');
    setCallerAvatar('');
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const createPeerConnection = useCallback((targetId: string) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const pc = new RTCPeerConnection(getRtcConfig());

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', { targetId, signal: { candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        if (audioRef.current) audioRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        toast('通话连接中断', 'error');
        cleanup();
      }
    };

    pc.onicecandidateerror = () => {
      console.warn('[Echo call] ICE candidate error. Check TURN/STUN configuration.');
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, toast, cleanup]);

  const drainPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    for (const candidate of pendingCandidatesRef.current) {
      try { await pc.addIceCandidate(candidate); } catch { /* ignore */ }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // Outgoing call
  const startCall = useCallback(async (targetId: string) => {
    const readinessError = getCallReadinessError();
    if (readinessError) {
      toast(readinessError, 'error');
      return;
    }

    if (!socket?.connected) {
      toast('连接已断开，请稍后再试', 'error');
      return;
    }
    if (!targetId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setPeerId(targetId);
      setCallerName('');
      setCallerAvatar('');
      setCallStatus('calling');

      socket.emit('call:request', {
        receiverId: targetId,
        callerName: user?.nickname || user?.username || '未知',
        callerAvatar: user?.avatar || '',
      }, (res: any) => {
        if (!res?.ok) {
          toast(res?.message || '呼叫失败', 'error');
          cleanup();
        }
      });

      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current === 'calling') {
          toast('对方未接听', 'error');
          socket?.emit('call:hangup', { targetId });
          cleanup();
        }
      }, CALL_TIMEOUT);
    } catch {
      toast('麦克风权限被拒绝，请检查设置', 'error');
      setCallStatus('idle');
    }
  }, [socket, user, toast, cleanup]);

  const acceptCall = useCallback(async () => {
    const readinessError = getCallReadinessError();
    if (readinessError) {
      toast(readinessError, 'error');
      socket?.emit('call:reject', { targetId: peerId });
      cleanup();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setCallStatus('connected');
      socket?.emit('call:accept', { targetId: peerId });
      createPeerConnection(peerId);
    } catch {
      toast('麦克风权限被拒绝', 'error');
      socket?.emit('call:reject', { targetId: peerId });
      cleanup();
    }
  }, [socket, peerId, toast, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    socket?.emit('call:reject', { targetId: peerId });
    cleanup();
  }, [socket, peerId, cleanup]);

  const hangupCall = useCallback(() => {
    socket?.emit('call:hangup', { targetId: peerId });
    cleanup();
  }, [socket, peerId, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Global socket listeners
  useEffect(() => {
    if (!socket) return;

    const onInvite = (data: { senderId: string; callerName: string; callerAvatar: string }) => {
      if (callStatusRef.current !== 'idle') return; // busy
      setPeerId(data.senderId);
      setCallerName(data.callerName || '未知');
      setCallerAvatar(data.callerAvatar || '');
      setCallStatus('receiving');
    };

    const onAccepted = async () => {
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      setCallStatus('connected');
      const pc = createPeerConnection(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:signal', { targetId: peerId, signal: { sdp: offer } });
      } catch {
        toast('通话建立失败', 'error');
      }
    };

    const onRejected = () => { toast('对方已拒绝', 'info'); cleanup(); };
    const onHangedup = () => { cleanup(); };

    const onSignal = async (data: { senderId: string; signal: any }) => {
      if (data.senderId !== peerId) return;
      const pc = peerConnectionRef.current || createPeerConnection(peerId);

      try {
        if (data.signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          await drainPendingCandidates(pc);
          if (pc.remoteDescription?.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:signal', { targetId: peerId, signal: { sdp: answer } });
          }
        } else if (data.signal.candidate) {
          const candidate = new RTCIceCandidate(data.signal.candidate);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch { /* ignore */ }
    };

    socket.on('call:invite', onInvite);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:hangedup', onHangedup);
    socket.on('webrtc:signal', onSignal);

    return () => {
      socket.off('call:invite', onInvite);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:hangedup', onHangedup);
      socket.off('webrtc:signal', onSignal);
    };
  }, [socket, peerId, createPeerConnection, cleanup, drainPendingCandidates, toast]);

  return (
    <CallContext.Provider value={{ callStatus, startCall }}>
      {children}
      <audio ref={audioRef} autoPlay className="hidden" />
      <CallScreen
        status={callStatus}
        peerName={callerName || (peerId ? '对方' : '')}
        peerAvatar={callerAvatar || undefined}
        isMuted={isMuted}
        onAccept={acceptCall}
        onReject={rejectCall}
        onHangup={hangupCall}
        onToggleMute={toggleMute}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
