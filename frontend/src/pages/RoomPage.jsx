import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  addNote,
  createRoom,
  joinRoom,
  runCode,
  submitCode,
  updateTestCases
} from "../api/client.js";
import EditorPane from "../components/EditorPane.jsx";
import InterviewerPanel from "../components/InterviewerPanel.jsx";
import ProctoringTracker from "../components/ProctoringTracker.jsx";
import TestRunnerPanel from "../components/TestRunnerPanel.jsx";
import VideoPanel from "../components/VideoPanel.jsx";
import { useCollabEditor } from "../hooks/useCollabEditor.js";
import { useWebRTC } from "../hooks/useWebRTC.js";

export default function RoomPage() {
  const [userId, setUserId] = useState(`user-${Math.floor(Math.random() * 10000)}`);
  const [role, setRole] = useState("interviewer");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [roomId, setRoomId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [languageId, setLanguageId] = useState(63);
  const [initialCode, setInitialCode] = useState("");
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const editorRef = useRef(null);

  const collab = useCollabEditor({
    roomId,
    userId,
    role,
    sessionId,
    initialCode
  });

  const hasRoom = useMemo(() => Boolean(roomId && sessionId), [roomId, sessionId]);
  const rtc = useWebRTC({
    roomId,
    userId,
    socketApi: collab
  });

  useEffect(() => {
    if (!hasRoom) {
      return undefined;
    }
    collab.setOnForceRun(() => onSubmit());
    return () => collab.setOnForceRun(null);
  }, [hasRoom]);

  async function onCreateRoom() {
    const data = await createRoom({ userId, role: "interviewer", languageId });
    setRole("interviewer");
    setRoomId(data.roomId);
    setSessionId(data.sessionId);
    setRoomIdInput(data.roomId);
  }

  async function onJoinRoom() {
    const data = await joinRoom({ roomId: roomIdInput, userId, role });
    setRoomId(data.roomId);
    setSessionId(data.sessionId);
    setLanguageId(data.languageId);
    setInitialCode(data.codeSnapshot || "");
  }

  function getSourceCode() {
    return editorRef.current?.getValue?.() || "";
  }

  async function onRun(stdin) {
    const data = await runCode({
      roomId,
      actorId: userId,
      source_code: getSourceCode(),
      language_id: languageId,
      stdin
    });
    setRunResult(data);
  }

  async function onSubmit() {
    const data = await submitCode({
      roomId,
      actorId: userId,
      source_code: getSourceCode(),
      language_id: languageId
    });
    setSubmitResult(data);
  }

  async function onSaveTestCases(testCases) {
    await updateTestCases(roomId, { actorId: userId, testCases });
  }

  async function onAddNote(text) {
    if (!text.trim()) {
      return;
    }
    await addNote(roomId, { actorId: userId, text });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <h1 className="text-2xl font-bold">Interview Arena Room</h1>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <input
            className="rounded bg-slate-950 p-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
          />
          <select
            className="rounded bg-slate-950 p-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="interviewer">Interviewer</option>
            <option value="candidate">Candidate</option>
          </select>
          <input
            className="rounded bg-slate-950 p-2 text-sm"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Room ID"
          />
          <button
            className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            onClick={onCreateRoom}
          >
            Create Room
          </button>
          <button
            className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900"
            onClick={onJoinRoom}
          >
            Join Room
          </button>
        </div>
        {hasRoom && (
          <p className="mt-3 text-sm text-slate-300">
            Session: {sessionId} | Room: {roomId} | Role: {role} | Locked:{" "}
            {String(collab.isLocked)}
          </p>
        )}
        {hasRoom && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {collab.participants.map((member) => (
              <span key={`p-${member.userId}`} className="rounded bg-slate-800 px-2 py-1 text-slate-200">
                {member.userId} ({member.role})
              </span>
            ))}
            {collab.cursors.map((cursor) => (
              <span
                key={cursor.userId}
                className="rounded px-2 py-1"
                style={{ backgroundColor: cursor.color, color: "#0f172a" }}
              >
                {cursor.userId}: L{cursor.position?.lineNumber} C{cursor.position?.column}
              </span>
            ))}
          </div>
        )}
      </div>

      {hasRoom && (
        <div className="mt-5 space-y-4">
          <VideoPanel
            localStream={rtc.localStream}
            remoteStreams={rtc.remoteStreams}
            isStarted={rtc.isStarted}
            isMicOn={rtc.isMicOn}
            isCamOn={rtc.isCamOn}
            onStart={async () => {
              try {
                setMediaError("");
                await rtc.startMedia();
              } catch (error) {
                setMediaError(error?.message || "Failed to access mic/camera");
              }
            }}
            onStop={rtc.stopMedia}
            onToggleMic={rtc.toggleMic}
            onToggleCam={rtc.toggleCam}
          />
          {mediaError && <p className="rounded bg-red-950 p-3 text-sm text-red-200">{mediaError}</p>}

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section>
            <EditorPane
              languageId={languageId}
              isLocked={collab.isLocked}
              onMount={(editor) => {
                editorRef.current = editor;
                collab.bindEditor({ editor });
              }}
              onCursorMove={(position) => collab.emitCursor(position)}
            />
            <div className="mt-3 flex gap-3 text-sm">
              <Link className="rounded bg-slate-800 px-3 py-2" to={`/replay/${sessionId}`}>
                Open Replay
              </Link>
              <Link className="rounded bg-slate-800 px-3 py-2" to={`/scorecard/${sessionId}`}>
                Open Scorecard
              </Link>
            </div>
          </section>

          <section className="space-y-4">
            <TestRunnerPanel
              onRun={onRun}
              onSubmit={onSubmit}
              runResult={runResult}
              submitResult={submitResult}
            />
            {role === "interviewer" && (
              <InterviewerPanel
                roomId={roomId}
                actorId={userId}
                onSaveTestCases={onSaveTestCases}
                onAddNote={onAddNote}
                onToggleLock={collab.setEditorLocked}
                onForceRun={collab.emitForceRun}
              />
            )}
          </section>
          </div>
        </div>
      )}

      {hasRoom && <ProctoringTracker emitProctor={collab.emitProctor} />}
    </main>
  );
}
