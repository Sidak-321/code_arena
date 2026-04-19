import Editor from "@monaco-editor/react";

const LANGUAGE_MAP = {
  63: "javascript",
  71: "python"
};

export default function EditorPane({
  languageId,
  isLocked,
  onMount,
  onCursorMove
}) {
  return (
    <div className="h-[60vh] overflow-hidden rounded-xl border border-slate-800">
      <Editor
        theme="vs-dark"
        defaultLanguage={LANGUAGE_MAP[languageId] || "javascript"}
        defaultValue=""
        onMount={(editor, monaco) => {
          onMount?.(editor, monaco);
          editor.onDidChangeCursorPosition((event) => onCursorMove?.(event.position));
        }}
        options={{
          readOnly: isLocked,
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 2,
          automaticLayout: true
        }}
      />
    </div>
  );
}
