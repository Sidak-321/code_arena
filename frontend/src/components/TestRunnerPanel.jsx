import { useState } from "react";

export default function TestRunnerPanel({ onRun, onSubmit, runResult, submitResult }) {
  const [stdin, setStdin] = useState("");

  return (
    <section className="rounded-xl border border-slate-800 bg-arena-panel p-4">
      <h2 className="text-lg font-semibold">Execution</h2>
      <textarea
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
        className="mt-3 h-24 w-full rounded bg-slate-900 p-2 text-sm"
        placeholder="stdin"
      />
      <div className="mt-3 flex gap-2">
        <button
          className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={() => onRun(stdin)}
        >
          Run Code
        </button>
        <button
          className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={onSubmit}
        >
          Submit
        </button>
      </div>

      {runResult && (
        <pre className="mt-4 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-xs">
{JSON.stringify(runResult, null, 2)}
        </pre>
      )}
      {submitResult && (
        <pre className="mt-4 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-xs">
{JSON.stringify(submitResult, null, 2)}
        </pre>
      )}
    </section>
  );
}
