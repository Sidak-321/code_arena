import mongoose from "mongoose";

const TestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expectedOutput: { type: String, default: "" },
    hidden: { type: Boolean, default: false }
  },
  { _id: true }
);

const NoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

const SessionSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    interviewerId: { type: String, required: true },
    candidates: [{ type: String }],
    codeSnapshot: { type: String, default: "" },
    languageId: { type: Number, default: 71 },
    editorLocked: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    bestExecutionTimeMs: { type: Number, default: Number.POSITIVE_INFINITY },
    testCases: [TestCaseSchema],
    notes: [NoteSchema],
    startedAt: { type: Date, default: Date.now },
    endedAt: Date
  },
  { timestamps: true }
);

export const Session = mongoose.model("Session", SessionSchema);
