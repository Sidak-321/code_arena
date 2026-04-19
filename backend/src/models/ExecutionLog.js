import mongoose from "mongoose";

const ExecutionLogSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    roomId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    languageId: { type: Number, required: true },
    sourceCode: { type: String, required: true },
    stdin: { type: String, default: "" },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    compileOutput: { type: String, default: "" },
    status: { type: String, default: "Unknown" },
    executionTimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 }
    ,
    passedTests: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const ExecutionLog = mongoose.model("ExecutionLog", ExecutionLogSchema);
