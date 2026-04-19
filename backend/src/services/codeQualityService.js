import { ESLint } from "eslint";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

async function runEslint(sourceCode) {
  const eslint = new ESLint({
    overrideConfig: {
      languageOptions: { ecmaVersion: "latest", sourceType: "module" },
      rules: {
        "no-unused-vars": "warn",
        "no-undef": "error",
        "no-unreachable": "error",
        complexity: ["warn", 12]
      }
    }
  });
  const [result] = await eslint.lintText(sourceCode);
  return {
    errors: result.errorCount || 0,
    warnings: result.warningCount || 0
  };
}

async function runPylint(sourceCode) {
  const tmpFile = path.join(os.tmpdir(), `arena-${Date.now()}.py`);
  await fs.writeFile(tmpFile, sourceCode, "utf8");
  try {
    const { stdout } = await execFileAsync("python", [
      "-m",
      "pylint",
      tmpFile,
      "--output-format=json",
      "--score=n"
    ]);
    const parsed = stdout?.trim() ? JSON.parse(stdout) : [];
    const errors = parsed.filter((x) => x.type === "error" || x.type === "fatal").length;
    const warnings = parsed.filter((x) => x.type === "warning" || x.type === "refactor").length;
    return { errors, warnings };
  } catch {
    return { errors: 0, warnings: 0 };
  } finally {
    await fs.rm(tmpFile, { force: true });
  }
}

function longestFunctionLength(sourceCode) {
  const lines = sourceCode.split("\n");
  let longest = 0;
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/(function\s+\w+|\w+\s*=\s*\(?.*\)?\s*=>|def\s+\w+\s*\()/u.test(line)) {
      start = i;
    }
    if (start !== -1 && /^\s*\}/u.test(line)) {
      longest = Math.max(longest, i - start + 1);
      start = -1;
    }
  }
  return longest;
}

function maxNestingDepth(sourceCode) {
  const lines = sourceCode.split("\n");
  let depth = 0;
  let maxDepth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^(if|for|while|switch|try|elif|else if|else)\b/u.test(line)) {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    }
    if (/^\s*\}/u.test(rawLine) || /^return\b/u.test(line) || /^break\b/u.test(line)) {
      depth = Math.max(0, depth - 1);
    }
  }
  return maxDepth;
}

function modularityScore(sourceCode) {
  const functionCount = (sourceCode.match(/(function\s+\w+|=>\s*\{|def\s+\w+\s*\()/gu) || []).length;
  if (functionCount >= 3) {
    return 100;
  }
  if (functionCount === 2) {
    return 70;
  }
  if (functionCount === 1) {
    return 45;
  }
  return 20;
}

function getRuleScore(sourceCode) {
  let score = 100;
  const longestFn = longestFunctionLength(sourceCode);
  const depth = maxNestingDepth(sourceCode);
  const modularity = modularityScore(sourceCode);

  if (longestFn > 50) {
    score -= 20;
  }
  if (depth > 4) {
    score -= 20;
  }
  score = (score * 0.5) + (modularity * 0.5);
  return clamp(0, score, 100);
}

export async function getCodeQuality({ sourceCode, languageName }) {
  let linter = { errors: 0, warnings: 0 };
  const lang = (languageName || "").toLowerCase();

  if (["javascript", "js", "typescript", "ts"].includes(lang)) {
    linter = await runEslint(sourceCode);
  } else if (["python", "py"].includes(lang)) {
    linter = await runPylint(sourceCode);
  }

  const linterScore = clamp(0, 100 - ((linter.errors * 10) + (linter.warnings * 5)), 100);
  const ruleScore = getRuleScore(sourceCode);
  const codeQuality = clamp(0, (0.6 * linterScore) + (0.4 * ruleScore), 100);

  return {
    codeQuality,
    linterScore,
    ruleScore,
    lint: linter
  };
}
