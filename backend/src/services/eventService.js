import { Counter } from "../models/Counter.js";
import { EventLog } from "../models/EventLog.js";

async function nextSequence(roomId) {
  const counter = await Counter.findOneAndUpdate(
    { key: `room:${roomId}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
}

export async function appendEvent({ sessionId, roomId, actorId, eventType, payload }) {
  const sequence = await nextSequence(roomId);
  return EventLog.create({
    sessionId,
    roomId,
    sequence,
    actorId,
    eventType,
    payload
  });
}

export async function getReplayEvents(sessionId) {
  return EventLog.find({ sessionId }).sort({ sequence: 1, createdAt: 1 }).lean();
}
