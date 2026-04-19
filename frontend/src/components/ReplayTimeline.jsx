import { useMemo, useState } from "react";

export default function ReplayTimeline({ timeline }) {
  const [index, setIndex] = useState(0);
  const current = timeline[index];

  const grouped = useMemo(() => timeline.slice(0, index + 1), [timeline, index]);

  if (!timeline?.length) {
    return <p className="text-slate-300">No replay events.</p>;
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-arena-panel p-4">
      <h2 className="text-xl font-semibold">Event Replay</h2>
      <input
        className="mt-3 w-full"
        type="range"
        min={0}
        max={timeline.length - 1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
      />
      <div className="mt-3 rounded bg-slate-950 p-3 text-sm">
        <p>Event #{current.sequence}</p>
        <p>Type: {current.eventType}</p>
        <p>Actor: {current.actorId}</p>
        <pre className="mt-2 text-xs">{JSON.stringify(current.payload, null, 2)}</pre>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Replayed {grouped.length} of {timeline.length} events
      </p>
    </section>
  );
}
