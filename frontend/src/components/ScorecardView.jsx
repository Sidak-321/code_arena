export default function ScorecardView({ scorecard }) {
  if (!scorecard) {
    return null;
  }
  return (
    <section className="rounded-xl border border-slate-800 bg-arena-panel p-5">
      <h2 className="text-2xl font-bold">Final Score: {scorecard.finalScore}</h2>
      <pre className="mt-4 rounded bg-slate-950 p-3 text-sm">
{JSON.stringify(scorecard.breakdown, null, 2)}
      </pre>
    </section>
  );
}
