import { env } from "../config/env.js";

export function validateRunPayload(req, res, next) {
  const { source_code, language_id } = req.body;
  if (!source_code || typeof source_code !== "string") {
    return res.status(400).json({ error: "source_code is required" });
  }
  if (source_code.length > env.maxSourceSize) {
    return res.status(400).json({ error: "source_code exceeds MAX_SOURCE_SIZE" });
  }
  if (!language_id || Number.isNaN(Number(language_id))) {
    return res.status(400).json({ error: "language_id must be numeric" });
  }
  return next();
}

export function validateRoomPayload(req, res, next) {
  const { userId, role } = req.body;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required" });
  }
  if (role && !["interviewer", "candidate"].includes(role)) {
    return res.status(400).json({ error: "role must be interviewer or candidate" });
  }
  return next();
}
