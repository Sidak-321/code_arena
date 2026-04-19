import { Session } from "../models/Session.js";
import { getReplayEvents } from "../services/eventService.js";

export async function getReplay(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    const events = await getReplayEvents(sessionId);
    return res.json({
      session: {
        sessionId: session._id,
        roomId: session.roomId,
        languageId: session.languageId,
        startedAt: session.startedAt,
        endedAt: session.endedAt
      },
      timeline: events
    });
  } catch (error) {
    return next(error);
  }
}
