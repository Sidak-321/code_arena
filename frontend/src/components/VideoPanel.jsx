import { useEffect, useRef } from "react";

function VideoTile({ label, stream, muted = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-2 py-1 text-xs text-slate-300">{label}</div>
      <video
        ref={ref}
        className="h-44 w-full bg-slate-950 object-cover"
        autoPlay
        playsInline
        muted={muted}
      />
    </div>
  );
}

export default function VideoPanel({
  localStream,
  remoteStreams,
  isStarted,
  isMicOn,
  isCamOn,
  onStart,
  onStop,
  onToggleMic,
  onToggleCam
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-arena-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audio / Video</h2>
        <div className="flex gap-2">
          {!isStarted ? (
            <button
              className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-900"
              onClick={onStart}
            >
              Start AV
            </button>
          ) : (
            <button
              className="rounded bg-rose-500 px-3 py-1.5 text-sm font-semibold text-slate-900"
              onClick={onStop}
            >
              Stop AV
            </button>
          )}
          <button
            className="rounded bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
            onClick={onToggleMic}
            disabled={!isStarted}
          >
            {isMicOn ? "Mute" : "Unmute"}
          </button>
          <button
            className="rounded bg-violet-500 px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
            onClick={onToggleCam}
            disabled={!isStarted}
          >
            {isCamOn ? "Camera Off" : "Camera On"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <VideoTile label="You" stream={localStream} muted />
        {remoteStreams.map((item) => (
          <VideoTile
            key={item.socketId}
            label={item.remoteUserId || item.socketId}
            stream={item.stream}
          />
        ))}
      </div>
    </section>
  );
}
