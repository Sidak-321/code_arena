import { Session } from "../models/Session.js";
import { EventLog } from "../models/EventLog.js";
import { ExecutionLog } from "../models/ExecutionLog.js";
import { getCodeQuality } from "./codeQualityService.js";

function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function computeCorrectness(passed, total) {
  if (!total) {
    return 0;
  }
  return (passed / total) * 100;
}

function computeEfficiency(bestTime, userTime) {
  if (!bestTime || !userTime) {
    return 100;
  }
  return clamp(0, 100 * (bestTime / userTime), 100);
}

function computeTimeScore(seconds, k = 0.01) {
  return 100 * Math.exp(-k * seconds);
}

function computeAttemptsScore(attempts) {
  if (!attempts) {
    return 100;
  }
  return 100 / attempts;
}

function computeProctoringScore(events) {
  let penalties = 0;
  for (const event of events) {
    const kind = event.payload?.kind;
    if (kind === "tab_hidden") {
      penalties += 10;
    }
    if (kind === "copy_paste") {
      penalties += 15;
    }
    if (kind === "idle") {
      penalties += 5;
    }
  }
  return Math.max(0, 100 - penalties);
}

export async function generateScorecard(sessionId) {
  const session = await Session.findById(sessionId).lean();
  if (!session) {
    throw new Error("Session not found");
  }

  const executions = await ExecutionLog.find({ sessionId }).sort({ createdAt: 1 }).lean();
  const proctorEvents = await EventLog.find({
    sessionId,
    eventType: "proctor_signal"
  }).lean();
  const lastSubmission = executions[executions.length - 1];

  const passed = Number(lastSubmission?.passedTests || 0);
  const total = Number(lastSubmission?.totalTests || session.testCases.length || 0);
  const correctness = computeCorrectness(passed, total);

  const userTime = Number(lastSubmission?.executionTimeMs || 0);
  const finiteTimes = executions
    .map((x) => Number(x.executionTimeMs || 0))
    .filter((x) => Number.isFinite(x) && x > 0);
  const bestTime = finiteTimes.length ? Math.min(...finiteTimes) : userTime || 1;
  const efficiency = computeEfficiency(bestTime, userTime || bestTime);

  const startedAtMs = new Date(session.startedAt).getTime();
  const endedAtMs = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const timeTakenSeconds = Math.max(1, (endedAtMs - startedAtMs) / 1000);
  const time = computeTimeScore(timeTakenSeconds);

  const attempts = Math.max(1, Number(session.attempts || executions.length || 1));
  const attemptsScore = computeAttemptsScore(attempts);

  const qualityResult = await getCodeQuality({
    sourceCode: session.codeSnapshot || "",
    languageName: String(session.languageId) === "71" ? "python" : "javascript"
  });
  const codeQuality = qualityResult.codeQuality;

  const proctoring = computeProctoringScore(proctorEvents);

  const finalScore = clamp(
    0,
    (0.4 * correctness) +
      (0.15 * efficiency) +
      (0.15 * time) +
      (0.1 * codeQuality) +
      (0.1 * attemptsScore) +
      (0.1 * proctoring),
    100
  );

  return {
    finalScore: Math.round(finalScore),
    breakdown: {
      correctness: round2(correctness),
      efficiency: round2(efficiency),
      time: round2(time),
      quality: round2(codeQuality),
      attempts: round2(attemptsScore),
      proctoring: round2(proctoring)
    },
    metadata: {
      attempts,
      bestTime,
      userTime,
      passed,
      total
    }
  };
}
