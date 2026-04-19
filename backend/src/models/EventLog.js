import mongoose from "mongoose";

const EventLogSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    roomId: { type: String, required: true, index: true },
    sequence: { type: Number, required: true },
    eventType: { type: String, required: true, index: true },
    actorId: { type: String, default: "system" },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

EventLogSchema.index({ roomId: 1, sequence: 1 }, { unique: true });

export const EventLog = mongoose.model("EventLog", EventLogSchema);
