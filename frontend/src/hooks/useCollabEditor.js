import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { createSocket } from "../socket/client.js";

const USER_COLORS = ["#f59e0b", "#22c55e", "#38bdf8", "#f43f5e", "#a78bfa"];

export function useCollabEditor({ roomId, userId, role, sessionId, initialCode = "" }) {
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const unbindEditorRef = useRef(() => {});
  const onForceRunRef = useRef(null);
  const [isLocked, setIsLocked] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [cursors, setCursors] = useState([]);

  const userColor = useMemo(() => {
    const idx = Math.abs(
      Array.from(userId || "").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    ) % USER_COLORS.length;
    return USER_COLORS[idx];
  }, [userId]);

  useEffect(() => {
    if (!roomId || !userId) {
      return undefined;
    }

    const socket = createSocket();
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("monaco");

    socketRef.current = socket;
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    socket.on("connect", () => {
      socket.emit("room:join", { roomId, userId, role, sessionId });
    });

    socket.on("presence:joined", ({ userId: joined, role: joinedRole }) => {
      setParticipants((prev) => {
        if (prev.some((x) => x.userId === joined)) {
          return prev;
        }
        return [...prev, { userId: joined, role: joinedRole }];
      });
    });

    socket.on("presence:left", ({ userId: left }) => {
      setParticipants((prev) => prev.filter((x) => x.userId !== left));
      setCursors((prev) => prev.filter((x) => x.userId !== left));
    });

    socket.on("editor:lock", ({ locked }) => {
      setIsLocked(Boolean(locked));
    });
    socket.on("interviewer:force-run", (payload) => {
      onForceRunRef.current?.(payload);
    });

    socket.on("presence:cursor", ({ userId: remoteUserId, position, color }) => {
      setCursors((prev) => {
        const next = prev.filter((x) => x.userId !== remoteUserId);
        next.push({ userId: remoteUserId, position, color });
        return next;
      });
    });

    socket.on("yjs:sync", (update) => {
      Y.applyUpdate(ydoc, Uint8Array.from(update));
    });

    socket.on("yjs:update", ({ update }) => {
      Y.applyUpdate(ydoc, Uint8Array.from(update));
    });

    const onDocUpdate = (update, origin) => {
      if (origin === "remote") {
        return;
      }
      socket.emit("yjs:update", { roomId, update: Array.from(update) });
    };

    ydoc.on("update", onDocUpdate);

    return () => {
      ydoc.off("update", onDocUpdate);
      unbindEditorRef.current?.();
      ydoc.destroy();
      socket.disconnect();
    };
  }, [roomId, userId, role, sessionId, initialCode]);

  function bindEditor({ editor }) {
    const ytext = ytextRef.current;
    if (!ytext) {
      return;
    }

    let isApplyingRemote = false;
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const pushToEditor = () => {
      const yValue = ytext.toString();
      if (yValue === model.getValue()) {
        return;
      }
      const position = editor.getPosition();
      isApplyingRemote = true;
      model.setValue(yValue);
      if (position) {
        editor.setPosition(position);
      }
      isApplyingRemote = false;
    };

    const yObserver = () => pushToEditor();
    ytext.observe(yObserver);
    pushToEditor();

    const disposable = model.onDidChangeContent(() => {
      if (isApplyingRemote) {
        return;
      }
      const next = model.getValue();
      ydocRef.current.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, next);
      }, "local");
    });

    unbindEditorRef.current = () => {
      ytext.unobserve(yObserver);
      disposable.dispose();
    };
  }

  function emitCursor(position) {
    socketRef.current?.emit("presence:cursor", { roomId, position, color: userColor });
  }

  function emitProctor(kind, metadata = {}) {
    socketRef.current?.emit("proctor:event", { roomId, kind, metadata });
  }

  function emitForceRun() {
    socketRef.current?.emit("interviewer:force-run", { roomId });
  }

  function setOnForceRun(handler) {
    onForceRunRef.current = handler;
  }

  function setEditorLocked(locked) {
    socketRef.current?.emit("editor:lock", { roomId, locked });
  }

  function on(event, handler) {
    socketRef.current?.on(event, handler);
  }

  function off(event, handler) {
    socketRef.current?.off(event, handler);
  }

  function emit(event, payload) {
    socketRef.current?.emit(event, payload);
  }

  return {
    socket: socketRef.current,
    getSocket: () => socketRef.current,
    ydoc: ydocRef.current,
    userColor,
    isLocked,
    participants,
    cursors,
    bindEditor,
    emitCursor,
    emitProctor,
    emitForceRun,
    setOnForceRun,
    setEditorLocked,
    on,
    off,
    emit
  };
}
