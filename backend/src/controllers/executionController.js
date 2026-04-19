import { Session } from "../models/Session.js";
import { runSingleExecution, runTestCasesSequentially } from "../services/executionService.js";

export async function runCode(req, res, next) {
  try {
    const { roomId, actorId, source_code, language_id, stdin = "" } = req.body;
    const session = await Session.findOne({ roomId });
    if (!session) {
      return res.status(404).json({ error: "Room not found" });
    }
    const execution = await runSingleExecution({
      session,
      actorId: actorId || "anonymous",
      sourceCode: source_code,
      languageId: Number(language_id),
      stdin
    });
    return res.status(200).json({
      stdout: execution.stdout,
      stderr: execution.stderr,
      compileOutput: execution.compileOutput,
      status: execution.status,
      executionTimeMs: execution.executionTimeMs,
      memoryKb: execution.memoryKb
    });
  } catch (error) {
    return next(error);
  }
}

export async function submitCode(req, res, next) {
  try {
    const { roomId, actorId, source_code, language_id } = req.body;
    const session = await Session.findOne({ roomId });
    if (!session) {
      return res.status(404).json({ error: "Room not found" });
    }
    if (!session.testCases.length) {
      return res.status(400).json({ error: "No test cases configured in room" });
    }

    const testRun = await runTestCasesSequentially({
      session,
      actorId: actorId || "anonymous",
      sourceCode: source_code,
      languageId: Number(language_id),
      includeHidden: true
    });

    return res.status(200).json({
      passRate: `${testRun.passed}/${testRun.total}`,
      passed: testRun.passed,
      total: testRun.total,
      attempts: testRun.attempts,
      executionTimeMs: testRun.totalTime,
      memoryKb: testRun.peakMemory,
      outcomes: testRun.outcomes
    });
  } catch (error) {
    return next(error);
  }
}
