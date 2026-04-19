import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

export function useWebRTC({ roomId, userId, socketApi }) {
  const peerConnectionsRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const joinedRef = useRef(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  const iceServers = useMemo(() => DEFAULT_ICE_SERVERS, []);

  const upsertRemoteStream = useCallback((socketId, stream, remoteUserId) => {
    setRemoteStreams((prev) => {
      const next = prev.filter((x) => x.socketId !== socketId);
      next.push({ socketId, stream, remoteUserId });
      return next;
    });
  }, []);

  const removeRemoteStream = useCallback((socketId) => {
    setRemoteStreams((prev) => prev.filter((x) => x.socketId !== socketId));
  }, []);

  const getOrCreatePeerConnection = useCallback(
    (targetSocketId, targetUserId) => {
      if (peerConnectionsRef.current.has(targetSocketId)) {
        return peerConnectionsRef.current.get(targetSocketId);
      }

      const pc = new RTCPeerConnection({ iceServers });

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketApi.emit("webrtc:ice-candidate", {
            roomId,
            to: targetSocketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          upsertRemoteStream(targetSocketId, stream, targetUserId);
        }
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          pc.close();
          peerConnectionsRef.current.delete(targetSocketId);
          removeRemoteStream(targetSocketId);
        }
      };

      peerConnectionsRef.current.set(targetSocketId, pc);
      return pc;
    },
    [iceServers, removeRemoteStream, roomId, socketApi, upsertRemoteStream]
  );

  const flushPendingIce = useCallback(async (socketId, pc) => {
    const pending = pendingIceRef.current.get(socketId) || [];
    for (const candidate of pending) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore invalid ICE candidate fragments.
      }
    }
    pendingIceRef.current.delete(socketId);
  }, []);

  const createOfferForPeer = useCallback(
    async (targetSocketId, targetUserId) => {
      const pc = getOrCreatePeerConnection(targetSocketId, targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketApi.emit("webrtc:offer", {
        roomId,
        to: targetSocketId,
        offer
      });
    },
    [getOrCreatePeerConnection, roomId, socketApi]
  );

  const startMedia = useCallback(async () => {
    if (localStreamRef.current) {
      socketApi.emit("webrtc:join", { roomId });
      return localStreamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsMicOn(true);
    setIsCamOn(true);
    setIsStarted(true);
    socketApi.emit("webrtc:join", { roomId });
    return stream;
  }, [roomId, socketApi]);

  const stopMedia = useCallback(() => {
    for (const pc of peerConnectionsRef.current.values()) {
      pc.close();
    }
    peerConnectionsRef.current.clear();
    pendingIceRef.current.clear();
    setRemoteStreams([]);

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsStarted(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }
    const next = !isMicOn;
    for (const track of localStreamRef.current.getAudioTracks()) {
      track.enabled = next;
    }
    setIsMicOn(next);
  }, [isMicOn]);

  const toggleCam = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }
    const next = !isCamOn;
    for (const track of localStreamRef.current.getVideoTracks()) {
      track.enabled = next;
    }
    setIsCamOn(next);
  }, [isCamOn]);

  useEffect(() => {
    if (!roomId || !userId) {
      return undefined;
    }

    const onUserJoined = async ({ socketId, userId: remoteUserId }) => {
      if (!localStreamRef.current || socketId === socketApi.getSocket?.()?.id) {
        return;
      }
      try {
        await createOfferForPeer(socketId, remoteUserId);
      } catch {
        // No-op; peer can re-negotiate on next event.
      }
    };

    const onOffer = async ({ from, fromUserId, offer }) => {
      if (!localStreamRef.current) {
        return;
      }
      const pc = getOrCreatePeerConnection(from, fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingIce(from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketApi.emit("webrtc:answer", {
        roomId,
        to: from,
        answer
      });
    };

    const onAnswer = async ({ from, answer }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (!pc) {
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingIce(from, pc);
    };

    const onIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current.get(from);
      const ice = new RTCIceCandidate(candidate);
      if (!pc || !pc.remoteDescription) {
        const list = pendingIceRef.current.get(from) || [];
        list.push(ice);
        pendingIceRef.current.set(from, list);
        return;
      }
      await pc.addIceCandidate(ice);
    };

    const onUserLeft = ({ socketId }) => {
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      removeRemoteStream(socketId);
    };

    socketApi.on("webrtc:user-joined", onUserJoined);
    socketApi.on("webrtc:offer", onOffer);
    socketApi.on("webrtc:answer", onAnswer);
    socketApi.on("webrtc:ice-candidate", onIceCandidate);
    socketApi.on("webrtc:user-left", onUserLeft);

    return () => {
      socketApi.off("webrtc:user-joined", onUserJoined);
      socketApi.off("webrtc:offer", onOffer);
      socketApi.off("webrtc:answer", onAnswer);
      socketApi.off("webrtc:ice-candidate", onIceCandidate);
      socketApi.off("webrtc:user-left", onUserLeft);
    };
  }, [
    createOfferForPeer,
    flushPendingIce,
    getOrCreatePeerConnection,
    removeRemoteStream,
    roomId,
    socketApi,
    userId
  ]);

  useEffect(() => {
    joinedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!roomId || joinedRef.current || !socketApi.getSocket?.()) {
      return;
    }
    socketApi.emit("webrtc:join", { roomId });
    joinedRef.current = true;
  }, [roomId, socketApi]);

  useEffect(
    () => () => {
      stopMedia();
    },
    [stopMedia]
  );

  return {
    localStream,
    remoteStreams,
    isMicOn,
    isCamOn,
    isStarted,
    startMedia,
    stopMedia,
    toggleMic,
    toggleCam
  };
}
