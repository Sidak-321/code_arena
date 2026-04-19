import * as Y from "yjs";
import { createPatch } from "diff";
import { Session } from "../models/Session.js";
import { appendEvent } from "../services/eventService.js";

const docs = new Map();

function getRoomDoc(roomId) {
  if (!docs.has(roomId)) {
    const doc = new Y.Doc();
    doc.getText("monaco");
    docs.set(roomId, doc);
  }
  return docs.get(roomId);
}

function toUint8Array(update) {
  if (Array.isArray(update)) {
    return Uint8Array.from(update);
  }
  return new Uint8Array(update);
}

export function registerCollabHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId, userId, role = "candidate" }) => {
      const session = await Session.findOne({ roomId });
      if (!session) {
        socket.emit("room:error", { message: "Room not found" });
        return;
      }

      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.role = role;
      socket.data.sessionId = session._id.toString();
      socket.join(roomId);

      const doc = getRoomDoc(roomId);
      if (session.codeSnapshot && doc.getText("monaco").length === 0) {
        doc.getText("monaco").insert(0, session.codeSnapshot || "");
      }

      socket.emit("yjs:sync", Array.from(Y.encodeStateAsUpdate(doc)));
      socket.to(roomId).emit("presence:joined", { userId, role, socketId: socket.id });

      await appendEvent({
        sessionId: session._id,
        roomId,
        actorId: userId,
        eventType: "presence_joined",
        payload: { role }
      });
    });

    socket.on("yjs:update", async ({ roomId, update }) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId || socket.data.roomId !== roomId) {
        return;
      }

      const doc = getRoomDoc(roomId);
      const before = doc.getText("monaco").toString();
      const raw = toUint8Array(update);
      Y.applyUpdate(doc, raw);
      const after = doc.getText("monaco").toString();
      const patch = createPatch("code", before, after, "before", "after");
      socket.to(roomId).emit("yjs:update", { update: Array.from(raw) });

      const session = await Session.findById(sessionId);
      if (session) {
        session.codeSnapshot = doc.getText("monaco").toString();
        await session.save();
      }

      await appendEvent({
        sessionId,
        roomId,
        actorId: socket.data.userId,
        eventType: "code_change",
        payload: { bytes: raw.length, patch }
      });
    });

    socket.on("presence:cursor", async ({ roomId, position, color }) => {
      if (socket.data.roomId !== roomId) {
        return;
      }
      socket.to(roomId).emit("presence:cursor", {
        userId: socket.data.userId,
        position,
        color
      });
      await appendEvent({
        sessionId: socket.data.sessionId,
        roomId,
        actorId: socket.data.userId,
        eventType: "cursor_move",
        payload: { position }
      });
    });

    socket.on("editor:lock", async ({ roomId, locked }) => {
      if (socket.data.role !== "interviewer" || socket.data.roomId !== roomId) {
        return;
      }
      await Session.updateOne({ roomId }, { $set: { editorLocked: Boolean(locked) } });
      io.to(roomId).emit("editor:lock", { locked: Boolean(locked) });
      await appendEvent({
        sessionId: socket.data.sessionId,
        roomId,
        actorId: socket.data.userId,
        eventType: "editor_lock",
        payload: { locked: Boolean(locked) }
      });
    });

    socket.on("interviewer:force-run", async ({ roomId }) => {
      if (socket.data.role !== "interviewer" || socket.data.roomId !== roomId) {
        return;
      }
      io.to(roomId).emit("interviewer:force-run", { requestedBy: socket.data.userId });
      await appendEvent({
        sessionId: socket.data.sessionId,
        roomId,
        actorId: socket.data.userId,
        eventType: "force_run_requested",
        payload: {}
      });
    });

    socket.on("proctor:event", async ({ roomId, kind, metadata = {} }) => {
      if (socket.data.roomId !== roomId) {
        return;
      }
      await appendEvent({
        sessionId: socket.data.sessionId,
        roomId,
        actorId: socket.data.userId,
        eventType: "proctor_signal",
        payload: { kind, metadata }
      });
    });

    socket.on("webrtc:join", ({ roomId }) => {
      if (socket.data.roomId !== roomId) {
        return;
      }
      socket.to(roomId).emit("webrtc:user-joined", {
        userId: socket.data.userId,
        socketId: socket.id
      });
    });

    socket.on("webrtc:offer", ({ roomId, to, offer }) => {
      if (socket.data.roomId !== roomId || !to || !offer) {
        return;
      }
      io.to(to).emit("webrtc:offer", {
        roomId,
        from: socket.id,
        fromUserId: socket.data.userId,
        offer
      });
    });

    socket.on("webrtc:answer", ({ roomId, to, answer }) => {
      if (socket.data.roomId !== roomId || !to || !answer) {
        return;
      }
      io.to(to).emit("webrtc:answer", {
        roomId,
        from: socket.id,
        fromUserId: socket.data.userId,
        answer
      });
    });

    socket.on("webrtc:ice-candidate", ({ roomId, to, candidate }) => {
      if (socket.data.roomId !== roomId || !to || !candidate) {
        return;
      }
      io.to(to).emit("webrtc:ice-candidate", {
        roomId,
        from: socket.id,
        fromUserId: socket.data.userId,
        candidate
      });
    });

    socket.on("disconnect", async () => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        return;
      }
      socket.to(roomId).emit("presence:left", {
        userId: socket.data.userId,
        socketId: socket.id
      });
      socket.to(roomId).emit("webrtc:user-left", {
        userId: socket.data.userId,
        socketId: socket.id
      });
      await appendEvent({
        sessionId: socket.data.sessionId,
        roomId,
        actorId: socket.data.userId,
        eventType: "presence_left",
        payload: {}
      });
    });
  });
}
