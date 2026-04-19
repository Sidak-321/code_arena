import { v4 as uuidv4 } from "uuid";
import { Session } from "../models/Session.js";
import { appendEvent } from "../services/eventService.js";

export async function createRoom(req, res, next) {
  try {
    const { userId, languageId = 63 } = req.body;
    const roomId = uuidv4();

    const session = await Session.create({
      roomId,
      interviewerId: userId,
      languageId,
      candidates: [],
      codeSnapshot: "",
      testCases: []
    });

    await appendEvent({
      sessionId: session._id,
      roomId,
      actorId: userId,
      eventType: "room_created",
      payload: { languageId }
    });

    res.status(201).json({
      roomId,
      sessionId: session._id,
      role: "interviewer"
    });
  } catch (error) {
    next(error);
  }
}

export async function joinRoom(req, res, next) {
  try {
    const { roomId, userId, role = "candidate" } = req.body;
    const session = await Session.findOne({ roomId });
    if (!session) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (role === "candidate" && !session.candidates.includes(userId)) {
      session.candidates.push(userId);
    }
    await session.save();

    await appendEvent({
      sessionId: session._id,
      roomId,
      actorId: userId,
      eventType: "room_joined",
      payload: { role }
    });

    return res.status(200).json({
      roomId,
      sessionId: session._id,
      languageId: session.languageId,
      codeSnapshot: session.codeSnapshot,
      editorLocked: session.editorLocked,
      role
    });
  } catch (error) {
    return next(error);
  }
}

export async function upsertTestCases(req, res, next) {
  try {
    const { roomId } = req.params;
    const { actorId, testCases } = req.body;
    const session = await Session.findOne({ roomId });
    if (!session) {
      return res.status(404).json({ error: "Room not found" });
    }
    if (!Array.isArray(testCases)) {
      return res.status(400).json({ error: "testCases must be an array" });
    }
    session.testCases = testCases;
    await session.save();

    await appendEvent({
      sessionId: session._id,
      roomId,
      actorId,
      eventType: "testcases_updated",
      payload: {
        count: testCases.length,
        hiddenCount: testCases.filter((x) => x.hidden).length
      }
    });

    return res.json({ ok: true, testCases: session.testCases });
  } catch (error) {
    return next(error);
  }
}

export async function addNote(req, res, next) {
  try {
    const { roomId } = req.params;
    const { actorId, text } = req.body;
    const session = await Session.findOne({ roomId });
    if (!session) {
      return res.status(404).json({ error: "Room not found" });
    }
    session.notes.push({ text, createdBy: actorId });
    await session.save();

    const note = session.notes[session.notes.length - 1];
    await appendEvent({
      sessionId: session._id,
      roomId,
      actorId,
      eventType: "note_added",
      payload: { noteId: note._id.toString(), text }
    });

    return res.status(201).json({ note });
  } catch (error) {
    return next(error);
  }
}
