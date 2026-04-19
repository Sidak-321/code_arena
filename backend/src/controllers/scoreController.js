import { generateScorecard } from "../services/scoreService.js";
import { Session } from "../models/Session.js";

export async function getScorecard(req, res, next) {
  try {
    const { sessionId } = req.params;
    const scorecard = await generateScorecard(sessionId);
    await Session.updateOne({ _id: sessionId }, { $set: { endedAt: new Date() } });
    return res.json(scorecard);
  } catch (error) {
    return next(error);
  }
}
