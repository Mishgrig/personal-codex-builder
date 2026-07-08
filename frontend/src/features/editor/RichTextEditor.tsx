import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import { FontSize } from "./fontSizeExtension";

interface RichTextEditorProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

const FONT_STEPS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [fontSize, setFontSize] = useState("14");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write the living text of this card...",
      }),
      FontSize,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-body",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="editor-shell loading">Preparing editor…</div>;
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <select
          className="toolbar-select"
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
                ? "h2"
                : editor.isActive("heading", { level: 3 })
                  ? "h3"
                  : editor.isActive("bulletList")
                    ? "bullet"
                    : editor.isActive("orderedList")
                      ? "ordered"
                      : "body"
          }
          onChange={(event) => {
            const next = event.target.value;
            if (next === "body") {
              editor.chain().focus().setParagraph().run();
              return;
            }
            if (next === "bullet") {
              editor.chain().focus().toggleBulletList().run();
              return;
            }
            if (next === "ordered") {
              editor.chain().focus().toggleOrderedList().run();
              return;
            }
            editor.chain().focus().toggleHeading({ level: Number(next.replace("h", "")) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="h1">Title (H1)</option>
          <option value="h2">Heading (H2)</option>
          <option value="h3">Subheading (H3)</option>
          <option value="body">Body text</option>
          <option value="bullet">Bulleted list</option>
          <option value="ordered">Numbered list</option>
        </select>

        <div className="font-size-group">
          <button className="icon-button" title="Smaller text" onClick={() => applyFont(editor, fontSize, setFontSize, -1)}>
            -
          </button>
          <input
            className="font-size-input"
            value={fontSize}
            onChange={(event) => {
              setFontSize(event.target.value);
              editor.chain().focus().setFontSize(`${event.target.value}px`).run();
            }}
          />
          <button className="icon-button" title="Larger text" onClick={() => applyFont(editor, fontSize, setFontSize, 1)}>
            +
          </button>
          <select
            className="toolbar-select compact"
            value={fontSize}
            onChange={(event) => {
              setFontSize(event.target.value);
              editor.chain().focus().setFontSize(`${event.target.value}px`).run();
            }}
          >
            {FONT_STEPS.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
        </div>

        <button className={editor.isActive("bold") ? "toolbar-button active" : "toolbar-button"} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </button>
        <button className={editor.isActive("italic") ? "toolbar-button active" : "toolbar-button"} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </button>
        <button className={editor.isActive("underline") ? "toolbar-button active" : "toolbar-button"} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </button>
        <button className={editor.isActive("strike") ? "toolbar-button active" : "toolbar-button"} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </button>
        <button className={editor.isActive("bulletList") ? "toolbar-button active" : "toolbar-button"} title="Bulleted list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </button>
        <button className={editor.isActive("orderedList") ? "toolbar-button active" : "toolbar-button"} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </button>
        <label className="color-input-shell" title="Text color">
          <input type="color" defaultValue="#f0efe6" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} />
        </label>
        <label className="color-input-shell highlight" title="Highlight color">
          <input type="color" defaultValue="#d8a026" onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()} />
        </label>
        <button
          className="toolbar-button"
          title="Clear format"
          onClick={() => editor.chain().focus().unsetHighlight().unsetColor().unsetAllMarks().run()}
        >
          Clear format
        </button>
        <button className="toolbar-button" title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </button>
        <button className="toolbar-button" title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function applyFont(editor: NonNullable<ReturnType<typeof useEditor>>, fontSize: string, setFontSize: (value: string) => void, delta: number) {
  const next = String(Math.max(8, Number(fontSize || "14") + delta));
  setFontSize(next);
  editor.chain().focus().setFontSize(`${next}px`).run();
}
