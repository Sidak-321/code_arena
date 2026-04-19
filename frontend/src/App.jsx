import { Link, Navigate, Route, Routes } from "react-router-dom";
import RoomPage from "./pages/RoomPage.jsx";
import ReplayPage from "./pages/ReplayPage.jsx";
import ScorecardPage from "./pages/ScorecardPage.jsx";

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold">Live Coding Interview Arena</h1>
      <p className="mt-3 text-slate-300">
        Real-time collaborative coding with Judge0 execution, replay timeline, and scorecard analytics.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/room" className="rounded bg-amber-500 px-4 py-2 font-semibold text-slate-900">
          Open Arena
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room" element={<RoomPage />} />
      <Route path="/replay/:sessionId" element={<ReplayPage />} />
      <Route path="/scorecard/:sessionId" element={<ScorecardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
