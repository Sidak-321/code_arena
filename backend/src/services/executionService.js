import { ExecutionLog } from "../models/ExecutionLog.js";
import { Session } from "../models/Session.js";
import { appendEvent } from "./eventService.js";
import { executeCode } from "./judge0Service.js";

function normalizeOutput(value = "") {
  return String(value).replace(/\r\n/g, "\n").trim();
}

export async function runSingleExecution({
  session,
  actorId,
  sourceCode,
  languageId,
  stdin
}) {
  const result = await executeCode({ sourceCode, languageId, stdin });

  const execution = await ExecutionLog.create({
    sessionId: session._id,
    roomId: session.roomId,
    actorId,
    sourceCode,
    languageId,
    stdin,
    stdout: result.stdout,
    stderr: result.stderr,
    compileOutput: result.compileOutput,
    status: result.status,
    executionTimeMs: result.executionTimeMs,
    memoryKb: result.memoryKb
  });

  await appendEvent({
    sessionId: session._id,
    roomId: session.roomId,
    actorId,
    eventType: "code_execution",
    payload: {
      executionId: execution._id.toString(),
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      memoryKb: result.memoryKb
    }
  });

  return execution;
}

export async function runTestCasesSequentially({
  session,
  actorId,
  sourceCode,
  languageId,
  includeHidden = false
}) {
  const selected = session.testCases.filter((x) => includeHidden || !x.hidden);
  const outcomes = [];
  let passed = 0;
  let totalTime = 0;
  let peakMemory = 0;

  for (const testCase of selected) {
    const execution = await runSingleExecution({
      session,
      actorId,
      sourceCode,
      languageId,
      stdin: testCase.input
    });

    const actual = normalizeOutput(execution.stdout);
    const expected = normalizeOutput(testCase.expectedOutput);
    const didPass = actual === expected && !execution.stderr && !execution.compileOutput;
    if (didPass) {
      passed += 1;
    }

    totalTime += Number(execution.executionTimeMs || 0);
    peakMemory = Math.max(peakMemory, Number(execution.memoryKb || 0));

    outcomes.push({
      testCaseId: testCase._id.toString(),
      hidden: testCase.hidden,
      input: includeHidden ? undefined : testCase.input,
      expectedOutput: includeHidden ? undefined : testCase.expectedOutput,
      actualOutput: execution.stdout,
      stderr: execution.stderr,
      compileOutput: execution.compileOutput,
      passed: didPass,
      executionTimeMs: execution.executionTimeMs,
      memoryKb: execution.memoryKb
    });
  }

  const attempts = Number(session.attempts || 0) + 1;
  const bestExecutionTimeMs = Math.min(
    Number(session.bestExecutionTimeMs || Number.POSITIVE_INFINITY),
    totalTime || Number.POSITIVE_INFINITY
  );

  await Session.updateOne(
    { _id: session._id },
    {
      $set: {
        codeSnapshot: sourceCode,
        languageId,
        bestExecutionTimeMs,
        updatedAt: new Date()
      },
      $inc: { attempts: 1 }
    }
  );

  await ExecutionLog.create({
    sessionId: session._id,
    roomId: session.roomId,
    actorId,
    sourceCode,
    languageId,
    stdin: "",
    stdout: "",
    stderr: "",
    compileOutput: "",
    status: "Test Suite Complete",
    executionTimeMs: totalTime,
    memoryKb: peakMemory,
    passedTests: passed,
    totalTests: outcomes.length
  });

  await appendEvent({
    sessionId: session._id,
    roomId: session.roomId,
    actorId,
    eventType: "test_run",
    payload: {
      passed,
      total: outcomes.length,
      attempts,
      totalTime,
      peakMemory
    }
  });

  return {
    passed,
    total: outcomes.length,
    attempts,
    totalTime,
    peakMemory,
    outcomes
  };
}
