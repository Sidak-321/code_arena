import { useEffect, useRef } from "react";

export default function ProctoringTracker({ emitProctor }) {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        emitProctor("tab_hidden", { at: Date.now() });
      }
    };
    const onBlur = () => emitProctor("window_blur", { at: Date.now() });
    const onFocus = () => emitProctor("window_focus", { at: Date.now() });
    const onPaste = () => emitProctor("copy_paste", { at: Date.now(), kind: "paste" });
    const onCopy = () => emitProctor("copy_paste", { at: Date.now(), kind: "copy" });
    const onMove = () => {
      lastActivityRef.current = Date.now();
    };

    const idleInterval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs > 120000) {
        emitProctor("idle", { idleMs });
        lastActivityRef.current = Date.now();
      }
    }, 15000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("paste", onPaste);
    window.addEventListener("copy", onCopy);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);

    return () => {
      clearInterval(idleInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
    };
  }, [emitProctor]);

  return null;
}
