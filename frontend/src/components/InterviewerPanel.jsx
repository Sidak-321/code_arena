import { useState } from "react";

export default function InterviewerPanel({
  roomId,
  actorId,
  onSaveTestCases,
  onAddNote,
  onToggleLock,
  onForceRun
}) {
  const [testCasesJson, setTestCasesJson] = useState(
    JSON.stringify(
      [
        { input: "2\n3", expectedOutput: "5", hidden: false },
        { input: "10\n21", expectedOutput: "31", hidden: true }
      ],
      null,
      2
    )
  );
  const [note, setNote] = useState("");

  return (
    <section className="rounded-xl border border-slate-800 bg-arena-panel p-4">
      <h2 className="text-lg font-semibold">Interviewer Room</h2>
      <p className="mt-1 text-xs text-slate-400">Room: {roomId} | Actor: {actorId}</p>

      <label className="mt-3 block text-sm text-slate-300">Test cases (JSON)</label>
      <textarea
        className="mt-1 h-28 w-full rounded bg-slate-900 p-2 text-xs"
        value={testCasesJson}
        onChange={(e) => setTestCasesJson(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button
          className="rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={() => onSaveTestCases(JSON.parse(testCasesJson))}
        >
          Save Test Cases
        </button>
        <button
          className="rounded bg-rose-400 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={onForceRun}
        >
          Force Run Tests
        </button>
      </div>

      <label className="mt-4 block text-sm text-slate-300">Interviewer notes</label>
      <textarea
        className="mt-1 h-20 w-full rounded bg-slate-900 p-2 text-xs"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button
          className="rounded bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={() => {
            onAddNote(note);
            setNote("");
          }}
        >
          Add Note
        </button>
        <button
          className="rounded bg-violet-400 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={() => onToggleLock(true)}
        >
          Lock Editor
        </button>
        <button
          className="rounded bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-900"
          onClick={() => onToggleLock(false)}
        >
          Unlock Editor
        </button>
      </div>
    </section>
  );
}
