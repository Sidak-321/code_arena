import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchScorecard } from "../api/client.js";
import ScorecardView from "../components/ScorecardView.jsx";

export default function ScorecardPage() {
  const { sessionId } = useParams();
  const [scorecard, setScorecard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchScorecard(sessionId)
      .then(setScorecard)
      .catch((e) => setError(e.response?.data?.error || e.message));
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/room" className="text-sm text-amber-300">
        Back to Room
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Post Interview Scorecard</h1>
      {error && <p className="mt-3 rounded bg-red-950 p-3 text-red-200">{error}</p>}
      <div className="mt-4">
        <ScorecardView scorecard={scorecard} />
      </div>
    </main>
  );
}
