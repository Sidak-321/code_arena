import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { validateRoomPayload, validateRunPayload } from "../middleware/validators.js";
import { addNote, createRoom, joinRoom, upsertTestCases } from "../controllers/roomController.js";
import { runCode, submitCode } from "../controllers/executionController.js";
import { getReplay } from "../controllers/replayController.js";
import { getScorecard } from "../controllers/scoreController.js";

const router = Router();

const runLimiter = rateLimit({
  windowMs: env.runRateLimitWindowMs,
  max: env.runRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/health", (_, res) => res.json({ ok: true }));
router.post("/create-room", validateRoomPayload, createRoom);
router.post("/join-room", validateRoomPayload, joinRoom);
router.post("/run-code", runLimiter, validateRunPayload, runCode);
router.post("/submit-code", runLimiter, validateRunPayload, submitCode);
router.post("/room/:roomId/test-cases", upsertTestCases);
router.post("/room/:roomId/notes", addNote);
router.get("/replay/:sessionId", getReplay);
router.get("/scorecard/:sessionId", getScorecard);

export default router;
