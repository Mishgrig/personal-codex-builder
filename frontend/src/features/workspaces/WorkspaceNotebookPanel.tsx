import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, NotebookPen, Save } from "lucide-react";
import type { WorkspaceNotebook } from "../../types/models";

const RichTextEditor = lazy(() =>
  import("../editor/RichTextEditor").then((module) => ({ default: module.RichTextEditor })),
);

interface WorkspaceNotebookPanelProps {
  notebook: WorkspaceNotebook | null;
  visible: boolean;
  onToggleVisible: () => void;
  onSave: (payload: WorkspaceNotebook) => Promise<void>;
}

export function WorkspaceNotebookPanel({
  notebook,
  visible,
  onToggleVisible,
  onSave,
}: WorkspaceNotebookPanelProps) {
  const [draft, setDraft] = useState<WorkspaceNotebook | null>(notebook);

  useEffect(() => {
    setDraft(notebook);
  }, [notebook]);

  if (!visible) {
    return (
      <button className="notebook-reveal" title="Show notebook" onClick={onToggleVisible}>
        <ChevronRight size={16} />
        Notebook
      </button>
    );
  }

  return (
    <aside className="notebook-panel">
      <div className="pane-header">
        <div>
          <h2>Notebook</h2>
          <p>Workspace notes stay local and persist across Atlas and Table View.</p>
        </div>
        <div className="pane-toolbar">
          <button className="icon-button" title="Hide notebook" onClick={onToggleVisible}>
            <ChevronLeft size={16} />
          </button>
          <button
            className="secondary-button"
            title="Save notebook"
            disabled={!draft}
            onClick={() => draft && onSave({ body_json: draft.body_json, body_text: "" })}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
      {draft ? (
        <Suspense fallback={<div className="editor-shell loading">Preparing editor…</div>}>
          <RichTextEditor
            value={draft.body_json}
            onChange={(body_json) => setDraft((current) => (current ? { ...current, body_json } : current))}
          />
        </Suspense>
      ) : (
        <div className="empty-state">
          <NotebookPen size={18} />
          <p>Open a workspace to start writing.</p>
        </div>
      )}
    </aside>
  );
}
