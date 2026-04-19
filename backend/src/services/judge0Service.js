import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({
  baseURL: env.judge0BaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    ...(env.judge0ApiKey ? { "X-RapidAPI-Key": env.judge0ApiKey } : {}),
    ...(env.judge0ApiHost ? { "X-RapidAPI-Host": env.judge0ApiHost } : {})
  }
});

const POLL_DELAY_MS = 1000;
const MAX_POLLS = 15;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitToJudge0({ source_code, language_id, stdin }) {
  const { data } = await client.post("/submissions?base64_encoded=false&wait=false", {
    source_code,
    language_id,
    stdin
  });
  return data;
}

export async function pollJudge0Result(token) {
  for (let i = 0; i < MAX_POLLS; i += 1) {
    const { data } = await client.get(`/submissions/${token}?base64_encoded=false`);
    if (data.status?.id && ![1, 2].includes(data.status.id)) {
      return data;
    }
    await sleep(POLL_DELAY_MS);
  }
  throw new Error("Judge0 polling timeout");
}

export async function executeCode({ sourceCode, languageId, stdin }) {
  const submission = await submitToJudge0({
    source_code: sourceCode,
    language_id: languageId,
    stdin
  });
  const result = await pollJudge0Result(submission.token);

  return {
    token: submission.token,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    compileOutput: result.compile_output || "",
    status: result.status?.description || "Unknown",
    executionTimeMs: Number(result.time || 0) * 1000,
    memoryKb: Number(result.memory || 0)
  };
}
