import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchReplay } from "../api/client.js";
import ReplayTimeline from "../components/ReplayTimeline.jsx";

export default function ReplayPage() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReplay(sessionId)
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || e.message));
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/room" className="text-sm text-amber-300">
        Back to Room
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Replay Session</h1>
      {error && <p className="mt-3 rounded bg-red-950 p-3 text-red-200">{error}</p>}
      {data && (
        <div className="mt-4">
          <ReplayTimeline timeline={data.timeline} />
        </div>
      )}
    </main>
  );
}
